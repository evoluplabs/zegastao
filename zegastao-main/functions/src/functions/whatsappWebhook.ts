// Webhook do WhatsApp — suporta Twilio Sandbox e Meta Cloud API.
// Twilio: POST application/x-www-form-urlencoded (From, Body, NumMedia, MediaUrl0...)
// Meta:   GET (verificação) + POST application/json (events aninhados)
// Identificação do usuário: coleção whatsapp_links/{phone} → uid
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { detectIntent, analyzeMediaIntent } from '../services/whatsapp/intent';
import {
  findUserByPhone,
  verifyPin,
  registerTransaction,
  queryBalance,
  queryBoss,
  querySummary,
  storeDocument,
} from '../services/whatsapp/actions';
import {
  formatByIntent,
  formatGreeting,
  formatAudioReceived,
  formatUnknown,
} from '../services/whatsapp/formatter';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'ze-gastao-verify';
const META_TOKEN   = process.env.WHATSAPP_TOKEN ?? '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';

// ─── Helpers de envio ────────────────────────────────────────────────────────

function twiml(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

async function sendMetaMessage(to: string, body: string): Promise<void> {
  if (!META_TOKEN || !PHONE_NUMBER_ID) return;
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
}

async function downloadMedia(url: string, authHeader?: string): Promise<Buffer> {
  const headers: Record<string, string> = {};
  if (authHeader) headers['Authorization'] = authHeader;
  const r = await fetch(url, { headers });
  return Buffer.from(await r.arrayBuffer());
}

// Baixa mídia do Meta Cloud API (requer token).
async function downloadMetaMedia(mediaId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${META_TOKEN}` },
  });
  const metaJson = await metaRes.json() as { url: string; mime_type: string };
  const buffer = await downloadMedia(metaJson.url, `Bearer ${META_TOKEN}`);
  return { buffer, contentType: metaJson.mime_type };
}

// ─── Processamento da mensagem ───────────────────────────────────────────────

async function processMessage(params: {
  from: string;
  body: string;
  mediaBuffer?: Buffer;
  contentType?: string;
  isTwilio: boolean;
}): Promise<string> {
  const { from, body, mediaBuffer, contentType, isTwilio: _isTwilio } = params;
  const db = getFirestore();

  // Log para análise (sem dados financeiros)
  try {
    await db.collection('whatsapp_messages').add({
      from: from.replace(/\d{4}$/, '****'),  // ofusca últimos 4 dígitos
      hasMedia: !!mediaBuffer,
      contentType: contentType ?? null,
      bodyLength: body.length,
      receivedAt: new Date(),
    });
  } catch { /* não bloqueia */ }

  const uid = await findUserByPhone(from);

  // PIN de vinculação: "vincular 123456"
  const pinMatch = body.match(/vincular\s+(\d{6})/i);
  if (pinMatch) {
    const linkedUid = await verifyPin(from, pinMatch[1]);
    if (linkedUid) {
      return `✅ *WhatsApp vinculado com sucesso!*\n\nAgora você pode registrar gastos direto por aqui. Digite _ajuda_ para ver os comandos.`;
    }
    return `❌ Código inválido ou expirado. Gere um novo código no app: https://zegastao.com.br/profile`;
  }

  if (!uid) {
    return formatGreeting(false);
  }

  // Áudio
  if (contentType?.startsWith('audio/')) {
    return formatAudioReceived();
  }

  // Imagem/documento com mídia
  if (mediaBuffer && contentType?.startsWith('image/')) {
    const mimeType = (contentType.split(';')[0]) as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    const base64 = mediaBuffer.toString('base64');
    const intent = await analyzeMediaIntent(base64, mimeType);
    if (intent.type === 'store_document') {
      await storeDocument(uid, mediaBuffer, contentType, 'image');
      return `📁 *Imagem guardada!*\n\nSua imagem foi salva na Guilda de Documentos com segurança.`;
    }
    if (intent.type === 'register_expense' || intent.type === 'register_income') {
      const ctx = await registerTransaction(uid, intent);
      return formatByIntent(intent.type, ctx, true);
    }
  }

  // PDF/doc enviado
  if (mediaBuffer && contentType && !contentType.startsWith('image/') && !contentType.startsWith('audio/')) {
    const ext = contentType.split('/')[1]?.split(';')[0] ?? 'bin';
    await storeDocument(uid, mediaBuffer, contentType, `document.${ext}`);
    return [
      `📁 *Documento guardado com segurança!*`,
      ``,
      `Seu arquivo foi salvo na Guilda de Documentos.`,
      `Você pode acessá-lo no app quando precisar.`,
      ``,
      `_https://zegastao.com.br/documentos_`,
    ].join('\n');
  }

  // Texto: detecção de intenção
  if (!body.trim()) return formatUnknown();

  const intent = await detectIntent(body);

  switch (intent.type) {
    case 'register_expense':
    case 'register_income':
    case 'register_debt_payment': {
      if (!intent.amount || intent.amount <= 0) {
        return `💬 Qual o valor? Ex: _"gastei *R$50* no mercado"_`;
      }
      const ctx = await registerTransaction(uid, intent);
      return formatByIntent(intent.type, ctx, true);
    }
    case 'query_balance': {
      const ctx = await queryBalance(uid);
      return formatByIntent(intent.type, ctx, true);
    }
    case 'query_boss': {
      const ctx = await queryBoss(uid);
      return formatByIntent(intent.type, ctx, true);
    }
    case 'query_summary': {
      const ctx = await querySummary(uid);
      return formatByIntent(intent.type, ctx, true);
    }
    case 'greeting': {
      return formatGreeting(true);
    }
    default:
      return formatUnknown();
  }
}

// ─── Handler principal ───────────────────────────────────────────────────────

export const whatsappWebhook = onRequest(
  { region: 'southamerica-east1', timeoutSeconds: 30 },
  async (req, res) => {
    // Meta Cloud API: verificação do webhook (GET)
    if (req.method === 'GET') {
      const mode      = req.query['hub.mode'];
      const token     = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
      } else {
        res.status(403).send('Forbidden');
      }
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const isMeta = req.is('application/json');

    // ── Meta Cloud API (JSON) ────────────────────────────────────────────────
    if (isMeta) {
      const body = req.body as {
        object?: string;
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<{
                from: string;
                type: string;
                text?: { body: string };
                audio?: { id: string };
                image?: { id: string };
                document?: { id: string; filename?: string; mime_type: string };
              }>;
            };
          }>;
        }>;
      };

      if (body.object !== 'whatsapp_business_account') {
        res.status(200).send('OK');
        return;
      }

      // Ack imediato (Meta exige 200 em < 20s)
      res.status(200).send('OK');

      const messages = body.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
      for (const msg of messages) {
        try {
          let mediaBuffer: Buffer | undefined;
          let contentType: string | undefined;

          if (msg.audio?.id) {
            const m = await downloadMetaMedia(msg.audio.id);
            mediaBuffer = m.buffer;
            contentType = m.contentType;
          } else if (msg.image?.id) {
            const m = await downloadMetaMedia(msg.image.id);
            mediaBuffer = m.buffer;
            contentType = m.contentType;
          } else if (msg.document?.id) {
            const m = await downloadMetaMedia(msg.document.id);
            mediaBuffer = m.buffer;
            contentType = msg.document.mime_type || m.contentType;
          }

          const reply = await processMessage({
            from: msg.from,
            body: msg.text?.body ?? '',
            mediaBuffer,
            contentType,
            isTwilio: false,
          });

          await sendMetaMessage(msg.from, reply);
        } catch (e) {
          console.error('whatsappWebhook: erro processando mensagem Meta', e);
        }
      }
      return;
    }

    // ── Twilio (urlencoded) ──────────────────────────────────────────────────
    const from: string      = req.body?.From || '';
    const body: string      = req.body?.Body || '';
    const numMedia          = parseInt(req.body?.NumMedia || '0', 10);
    const mediaUrl: string  = req.body?.MediaUrl0 || '';
    const mediaCtype: string = req.body?.MediaContentType0 || '';

    let mediaBuffer: Buffer | undefined;
    if (numMedia > 0 && mediaUrl) {
      try {
        mediaBuffer = await downloadMedia(mediaUrl);
      } catch { /* mídia não essencial */ }
    }

    try {
      const reply = await processMessage({
        from,
        body,
        mediaBuffer,
        contentType: mediaCtype || undefined,
        isTwilio: true,
      });
      res.set('Content-Type', 'text/xml');
      res.status(200).send(twiml(reply));
    } catch (e) {
      console.error('whatsappWebhook: erro Twilio', e);
      res.set('Content-Type', 'text/xml');
      res.status(200).send(twiml('Algo deu errado. Tente novamente em instantes.'));
    }
  },
);
