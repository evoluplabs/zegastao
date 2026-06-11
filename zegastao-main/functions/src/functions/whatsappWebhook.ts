// Webhook do WhatsApp (Fase 1) — compatível com Twilio WhatsApp Sandbox.
// Recebe mensagens e responde com orientação + link para o app.
// Setup: Twilio Console → Messaging → WhatsApp Sandbox → "When a message comes in"
// apontar para a URL desta função. Sem dependências externas (responde TwiML XML).
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const APP_URL = 'https://zegastao.com.br';

function twiml(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

function buildReply(body: string, hasMedia: boolean): string {
  const text = body.toLowerCase().trim();

  if (hasMedia) {
    return (
      `Recebi seu arquivo! 📄\n\n` +
      `Por enquanto, o jeito mais seguro de analisar seu extrato é pelo app:\n\n` +
      `1. Acesse ${APP_URL}/upload\n` +
      `2. Envie o PDF ou CSV do banco\n` +
      `3. Em segundos a IA categoriza tudo\n\n` +
      `É gratuito. Qualquer dúvida, me chama!`
    );
  }

  if (/^(oi|olá|ola|opa|eai|e aí|bom dia|boa tarde|boa noite|menu|ajuda|help)/.test(text)) {
    return (
      `Oi! Sou o Zé Gastão, seu copiloto financeiro. 👋\n\n` +
      `O que posso fazer por você:\n\n` +
      `📊 *Diagnóstico financeiro* — descubra sua situação real\n` +
      `💳 *Plano de quitação* — saia das dívidas mais rápido\n` +
      `📄 *Análise de extrato* — veja para onde vai cada real\n\n` +
      `Tudo gratuito para começar: ${APP_URL}\n\n` +
      `Me manda "extrato" se quiser importar seu extrato do banco.`
    );
  }

  if (/extrato|importar|upload|pdf|csv/.test(text)) {
    return (
      `Para importar seu extrato: 📄\n\n` +
      `1. Acesse ${APP_URL}/upload\n` +
      `2. Escolha seu banco (tem instruções de como exportar)\n` +
      `3. Envie o arquivo — a IA categoriza tudo em segundos\n\n` +
      `Você vai ver exatamente para onde foi cada real. 💪`
    );
  }

  if (/d[ií]vida|devo|cart[ãa]o|juros|negativ|vermelho/.test(text)) {
    return (
      `Entendo — dívida aperta mesmo. Mas tem saída. 💪\n\n` +
      `O Zé Gastão monta um plano de quitação personalizado: mostra qual dívida ` +
      `pagar primeiro e em quanto tempo você fica livre.\n\n` +
      `Comece grátis: ${APP_URL}\n\n` +
      `Leva menos de 3 minutos para configurar.`
    );
  }

  if (/renda extra|bico|ganhar|trabalho/.test(text)) {
    return (
      `Boa! Renda extra acelera tudo. 💰\n\n` +
      `No app, você cadastra suas habilidades e o Zé Gastão sugere ` +
      `bicos personalizados que combinam com você.\n\n` +
      `Veja suas opções: ${APP_URL}`
    );
  }

  return (
    `Boa pergunta! Para uma resposta personalizada baseada na SUA situação ` +
    `financeira, fale com o Copiloto dentro do app — ele conhece suas dívidas, ` +
    `renda e metas:\n\n${APP_URL}/copilot\n\n` +
    `É gratuito para começar. 😊`
  );
}

export const whatsappWebhook = onRequest(
  { region: 'southamerica-east1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    // Twilio envia application/x-www-form-urlencoded
    const from: string = req.body?.From || '';
    const body: string = req.body?.Body || '';
    const numMedia = parseInt(req.body?.NumMedia || '0', 10);

    // Log da conversa para análise posterior (lead capture)
    try {
      const db = getFirestore();
      await db.collection('whatsapp_messages').add({
        from,
        body,
        hasMedia: numMedia > 0,
        receivedAt: new Date(),
      });
    } catch {
      // Log não pode bloquear a resposta
    }

    const reply = buildReply(body, numMedia > 0);
    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml(reply));
  }
);
