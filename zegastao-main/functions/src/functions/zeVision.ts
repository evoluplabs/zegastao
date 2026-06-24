// Extração de odds do print da Betano — Tier 1 (OCR+regex, grátis) com fallback
// Tier 2 (Claude Vision). Também o "Desmascarador de Guru" e a validação de prints
// de saque/green (trava de dopamina / liquidação expressa).
// Segue a pirâmide "código antes de IA": só chama o Vision quando o OCR reprova.
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { parseBetanoText, ExtractedSlip, MIN_CONFIDENCE } from '../services/betting/odds-extractor';

const ZE_ENABLED = process.env.ZE_APOSTADOR_ENABLED === 'true';
const REGION = 'southamerica-east1';

function ensureEnabled() {
  if (!ZE_ENABLED) throw new HttpsError('not-found', 'Zé Apostador ainda não está disponível.');
}
function requireUid(request: CallableRequest): string {
  const u = request.auth?.uid;
  if (!u) throw new HttpsError('unauthenticated', 'Não autenticado');
  return u;
}

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp';

const ExtractSchema = z.object({
  ocrText: z.string().optional(),          // Tier 1 (texto vindo do OCR no front)
  imageBase64: z.string().optional(),      // Tier 2 (imagem já pré-processada)
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
});

const VISION_PROMPT = `Você está lendo um print da casa de apostas Betano. Extraia TODOS os mercados visíveis e suas odds.
Responda APENAS com JSON válido:
{"homeTeam":"","awayTeam":"","league":"","markets":[{"market":"h2h|totals|btts|corners|cards|shots|fouls|other","selection":"texto curto da seleção","odd":1.85}]}
Regras: "market" usa exatamente uma das chaves listadas (escanteios=corners, cartões=cards, chutes=shots, faltas=fouls, ambas marcam=btts, resultado/1x2=h2h, total de gols=totals). odd como número decimal. Não invente mercados que não estão na imagem.`;

async function visionExtract(imageBase64: string, mediaType: MediaType): Promise<ExtractedSlip> {
  const client = new Anthropic();
  const content: Anthropic.MessageParam['content'] = [
    {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: imageBase64 },
    } as Anthropic.ImageBlockParam,
    { type: 'text', text: VISION_PROMPT },
  ];
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content }],
  });
  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  const markets = Array.isArray(parsed.markets)
    ? parsed.markets
        .filter((m: unknown): m is { market: string; selection: string; odd: number } =>
          !!m && typeof (m as { odd?: unknown }).odd === 'number')
        .map((m: { market?: string; selection?: string; odd: number }) => ({
          market: m.market || 'other',
          selection: m.selection || 'Seleção',
          odd: m.odd,
        }))
    : [];
  return {
    homeTeam: parsed.homeTeam || undefined,
    awayTeam: parsed.awayTeam || undefined,
    league: parsed.league || undefined,
    markets,
    confidence: markets.length > 0 ? 0.9 : 0.2,
  };
}

// ===== zeExtractOdds: cascata OCR → Vision =====
export const zeExtractOdds = onCall({ region: REGION, timeoutSeconds: 60 }, async (request) => {
  ensureEnabled();
  const userId = requireUid(request);
  const parsed = ExtractSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message || 'Dados inválidos');
  const { ocrText, imageBase64, mediaType } = parsed.data;

  // Tier 1 — OCR + regex (grátis)
  if (ocrText && ocrText.trim().length > 2) {
    const slip = parseBetanoText(ocrText);
    if (slip.confidence >= MIN_CONFIDENCE) {
      await cacheSlip(userId, slip, 'ocr');
      return { slip, source: 'ocr' as const };
    }
  }

  // Tier 2 — Claude Vision (só quando o OCR reprova)
  if (imageBase64) {
    try {
      const slip = await visionExtract(imageBase64, mediaType || 'image/jpeg');
      await cacheSlip(userId, slip, 'vision');
      return { slip, source: 'vision' as const };
    } catch (e) {
      throw new HttpsError('internal', `Não consegui ler o print. Tente um print mais nítido. (${e instanceof Error ? e.message : 'erro'})`);
    }
  }

  throw new HttpsError('invalid-argument', 'Envie o texto do OCR ou a imagem do print.');
});

// "Waze das Odds": guarda o que foi lido para a comunidade reaproveitar.
async function cacheSlip(userId: string, slip: ExtractedSlip, source: string): Promise<void> {
  if (!slip.homeTeam || !slip.awayTeam) return;
  try {
    const db = getFirestore();
    const date = new Date().toISOString().slice(0, 10);
    const key = `odds_${norm(slip.homeTeam)}_${norm(slip.awayTeam)}_${date}`;
    await db.collection('betting_cache').doc(key).set({
      payload: slip, source, by: userId, fetchedAt: Timestamp.now(), ttlHours: 1,
    });
  } catch {
    // cache é best-effort
  }
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// ===== zeGuruAudit: Desmascarador de bilhete de tipster =====
const GuruSchema = z.object({
  ocrText: z.string().optional(),
  imageBase64: z.string().optional(),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
});

export const zeGuruAudit = onCall({ region: REGION, timeoutSeconds: 60 }, async (request) => {
  ensureEnabled();
  requireUid(request);
  const parsed = GuruSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Dados inválidos');
  const { ocrText, imageBase64, mediaType } = parsed.data;

  let slip: ExtractedSlip | null = null;
  if (ocrText && ocrText.trim().length > 2) {
    const t = parseBetanoText(ocrText);
    if (t.confidence >= MIN_CONFIDENCE) slip = t;
  }
  if (!slip && imageBase64) {
    slip = await visionExtract(imageBase64, mediaType || 'image/jpeg').catch(() => null);
  }
  if (!slip || slip.markets.length === 0) {
    throw new HttpsError('failed-precondition', 'Não consegui ler o bilhete. Manda um print mais nítido.');
  }

  // Odd combinada do bilhete e prob. implícita "crua" (com a margem da casa embutida).
  const combinedOdd = slip.markets.reduce((acc, m) => acc * m.odd, 1);
  const impliedProb = combinedOdd > 0 ? 1 / combinedOdd : 0;
  // Margem aproximada: assume ~6% de vig por perna (honestamente declarado como estimativa).
  const fairProb = slip.markets.reduce((acc, m) => acc * Math.min(0.999, (1 / m.odd) / 1.06), 1);
  const houseEdgePct = Math.max(0, Math.round((1 - impliedProb / Math.max(fairProb, 1e-9)) * 100));

  return {
    legs: slip.markets.length,
    combinedOdd: round2(combinedOdd),
    realChancePct: Math.round(fairProb * 100 * 100) / 100,
    houseEdgePct,
  };
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
