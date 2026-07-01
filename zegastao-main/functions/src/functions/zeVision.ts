// Extração de odds do print da Betano — Tier 1 (OCR+regex, grátis) com fallback
// Tier 2 (Claude Vision). Também o "Desmascarador de Guru" e a validação de prints
// de saque/green (trava de dopamina / liquidação expressa).
// Segue a pirâmide "código antes de IA": só chama o Vision quando o OCR reprova.
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { parseBetanoText, ExtractedSlip, MIN_CONFIDENCE } from '../services/betting/odds-extractor';

const ZE_ENABLED = process.env.ZE_APOSTADOR_ENABLED === 'true';
// Karma (anti-carona) entregue, mas desligado por padrão — liga com volume.
const ZE_KARMA_ENABLED = process.env.ZE_KARMA_ENABLED === 'true';
// us-east1: cluster do Zé Apostador (ver zeApostador.ts) — fora da cota de CPU de south.
const REGION = 'us-east1';

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

// IMPORTANTE: extrai TODOS os jogos visíveis. Preserva nomes COMPLETOS com
// acentos e diacríticos (ex: Bósnia-Herzegovina, Côte d'Ivoire, São Paulo).
const VISION_PROMPT = `Você está lendo um print da casa de apostas Betano.
O print pode mostrar UM jogo aberto (com muitos mercados) ou uma LISTA de jogos (só 1X2).
Extraia TODOS os jogos visíveis e seus mercados/odds.

Responda APENAS com JSON válido (sem markdown, sem texto extra):
{"games":[{"homeTeam":"Nome Completo","awayTeam":"Nome Completo","league":"","matchDate":"YYYY-MM-DD","markets":[{"market":"h2h|totals|btts|corners|cards|shots|fouls","selection":"texto","odd":1.85}]}]}

Regras CRÍTICAS — leia com atenção:
1. NOMES DOS TIMES: preserve o nome EXATO e COMPLETO como aparece na tela — incluindo a PRIMEIRA LETRA e todos os acentos/diacríticos. NUNCA corte letras do início nem do fim. Exemplos corretos: "Bósnia-Herzegovina" (não "ósnia"), "Côte d'Ivoire" (não "te d'Ivoire"), "Estados Unidos" (não "stados Unidos"). Se a imagem mostrar um nome parcial, use o nome completo oficial do país/clube.
2. SEPARAÇÃO DE JOGOS: cada par de times é um jogo separado no array "games". Nunca misture odds de jogos diferentes.
3. "market": h2h = resultado/1X2, totals = total de gols, btts = ambas marcam, corners = escanteios, cards = cartões, shots = chutes, fouls = faltas.
4. "odd": número decimal (ex: 1.45). Se não visível na imagem, omita o objeto de mercado.
5. "matchDate": YYYY-MM-DD se visível, caso contrário omita o campo.
6. Não invente mercados nem odds que não estão na imagem.`;

export interface GamePreview {
  homeTeam: string;
  awayTeam: string;
  league?: string;
  matchDate?: string;
  markets: Array<{ market: string; selection: string; odd: number }>;
}

async function visionExtract(imageBase64: string, mediaType: MediaType): Promise<{ slip: ExtractedSlip; allGames: GamePreview[] }> {
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
    max_tokens: 2000,
    messages: [{ role: 'user', content }],
  });
  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

  // Suporte a formato legado (campo único) e novo (games[])
  const rawGames: Array<{ homeTeam?: string; awayTeam?: string; league?: string; matchDate?: string; markets?: unknown[] }> =
    Array.isArray(parsed.games) ? parsed.games : (parsed.homeTeam ? [parsed] : []);

  function parseMarkets(markets: unknown[]) {
    return markets
      .filter((m): m is { market?: string; selection?: string; odd: number } =>
        !!m && typeof (m as { odd?: unknown }).odd === 'number')
      .map((m) => ({ market: m.market || 'h2h', selection: m.selection || 'Seleção', odd: m.odd }));
  }

  const allGames: GamePreview[] = rawGames
    .filter((g) => g.homeTeam && g.awayTeam)
    .map((g) => {
      const rawDate = typeof g.matchDate === 'string' ? g.matchDate : undefined;
      return {
        homeTeam: g.homeTeam!,
        awayTeam: g.awayTeam!,
        league: g.league || undefined,
        matchDate: rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined,
        markets: Array.isArray(g.markets) ? parseMarkets(g.markets) : [],
      };
    });

  // Primeiro jogo como slip principal (o que tem mais mercados ou o primeiro)
  const primary = rawGames.reduce((best, g) =>
    (Array.isArray(g.markets) ? g.markets.length : 0) > (Array.isArray(best.markets) ? best.markets.length : 0) ? g : best,
    rawGames[0] || {},
  );
  const markets = Array.isArray(primary.markets) ? parseMarkets(primary.markets) : [];
  const rawDate = typeof primary.matchDate === 'string' ? primary.matchDate : undefined;

  const slip: ExtractedSlip = {
    homeTeam: primary.homeTeam || undefined,
    awayTeam: primary.awayTeam || undefined,
    league: primary.league || undefined,
    matchDate: rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined,
    markets,
    confidence: markets.length > 0 ? 0.9 : allGames.length > 0 ? 0.7 : 0.2,
  };
  return { slip, allGames };
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
      const { slip, allGames } = await visionExtract(imageBase64, mediaType || 'image/jpeg');
      await cacheSlip(userId, slip, 'vision');
      // allGames: lista de todos os jogos encontrados no print (para seletor no front)
      return { slip, source: 'vision' as const, allGames };
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
    const ref = db.collection('betting_cache').doc(key);
    const existed = (await ref.get()).exists;
    await ref.set({ payload: slip, source, by: userId, fetchedAt: Timestamp.now(), ttlHours: 1 });
    // Karma: +3 por ser o 1º a printar este jogo (anti-carona), atrás de flag.
    if (ZE_KARMA_ENABLED && !existed) {
      await db.collection('users').doc(userId).collection('betting_mandate').doc('main')
        .set({ karma: FieldValue.increment(3) }, { merge: true }).catch(() => {});
    }
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
    const result = await visionExtract(imageBase64, mediaType || 'image/jpeg').catch(() => null);
    slip = result?.slip ?? null;
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

// ===== Validação de print de saque/green (Tier 1 regex → Tier 2 Vision) =====
// "código antes de IA": tenta validar por palavras-chave + valor no OCR; só usa
// Vision se o OCR não bater. Retorna se encontrou e o valor (quando houver).

function norm2(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

const MONEY_RE = /r?\$?\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)/i;

function findMoney(text: string): number | null {
  const m = text.match(MONEY_RE);
  if (!m) return null;
  const raw = m[1].replace(/[.\s]/g, '').replace(',', '.');
  const n = parseFloat(raw);
  return isFinite(n) && n > 0 ? n : null;
}

const VISION_PROOF_PROMPT = (kind: 'withdrawal' | 'win') =>
  kind === 'withdrawal'
    ? `Este é um print da Betano. Diga se ele confirma um SAQUE/retirada solicitado ou concluído. Responda APENAS JSON: {"valid":true|false,"value":0.0}. value = valor do saque em número, 0 se não achar.`
    : `Este é um print da Betano. Diga se ele mostra uma aposta GANHA (ex.: "Aposta Ganha", "Ganhou", retorno creditado). Responda APENAS JSON: {"valid":true|false,"value":0.0}. value = retorno/prêmio em número, 0 se não achar.`;

async function visionProof(imageBase64: string, mediaType: MediaType, kind: 'withdrawal' | 'win'): Promise<{ valid: boolean; value: number }> {
  const client = new Anthropic();
  const content: Anthropic.MessageParam['content'] = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } } as Anthropic.ImageBlockParam,
    { type: 'text', text: VISION_PROOF_PROMPT(kind) },
  ];
  const response = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 200, messages: [{ role: 'user', content }] });
  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  return { valid: !!parsed.valid, value: typeof parsed.value === 'number' ? parsed.value : 0 };
}

async function validateProof(
  kind: 'withdrawal' | 'win',
  ocrText: string | undefined,
  imageBase64: string | undefined,
  mediaType: MediaType,
): Promise<{ valid: boolean; value: number; source: 'ocr' | 'vision' }> {
  // Tier 1 — palavras-chave no OCR
  if (ocrText && ocrText.trim().length > 2) {
    const t = norm2(ocrText);
    const kw = kind === 'withdrawal'
      ? /saque|retirada|withdrawal/
      : /aposta ganha|ganhou|premio|retorno|aposta vencedora|won/;
    if (kw.test(t)) {
      return { valid: true, value: findMoney(ocrText) || 0, source: 'ocr' };
    }
  }
  // Tier 2 — Vision
  if (imageBase64) {
    const r = await visionProof(imageBase64, mediaType, kind);
    return { ...r, source: 'vision' };
  }
  return { valid: false, value: 0, source: 'ocr' };
}

const ProofSchema = z.object({
  cycleId: z.string().optional(),
  ocrText: z.string().optional(),
  imageBase64: z.string().optional(),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
});

// Trava de dopamina: valida o print de "Saque solicitado" e libera novo ciclo.
export const zeWithdrawalProof = onCall({ region: REGION, timeoutSeconds: 60 }, async (request) => {
  ensureEnabled();
  const userId = requireUid(request);
  const parsed = ProofSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Dados inválidos');
  const { ocrText, imageBase64, mediaType } = parsed.data;

  const proof = await validateProof('withdrawal', ocrText, imageBase64, mediaType || 'image/jpeg')
    .catch(() => ({ valid: false, value: 0, source: 'ocr' as const }));
  if (!proof.valid) {
    throw new HttpsError('failed-precondition', 'Não consegui confirmar o saque no print. Manda a tela de "Saque solicitado" da Betano.');
  }
  // Libera a trava de dopamina no mandato.
  const db = getFirestore();
  await db.collection('users').doc(userId).collection('betting_mandate').doc('main')
    .set({ dopamineLock: false, lastWithdrawalAt: Timestamp.now(), lastWithdrawalValue: proof.value }, { merge: true });
  return { validated: true, value: proof.value, source: proof.source };
});

// Liquidação expressa: valida o print de "Aposta Ganha" e devolve o resultado
// para o app confirmar via zeFeedback (mantém o settle num lugar só).
export const zeSettleByPrint = onCall({ region: REGION, timeoutSeconds: 60 }, async (request) => {
  ensureEnabled();
  requireUid(request);
  const parsed = ProofSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Dados inválidos');
  const { ocrText, imageBase64, mediaType } = parsed.data;
  const proof = await validateProof('win', ocrText, imageBase64, mediaType || 'image/jpeg')
    .catch(() => ({ valid: false, value: 0, source: 'ocr' as const }));
  if (!proof.valid) {
    throw new HttpsError('failed-precondition', 'Não reconheci uma aposta ganha nesse print. Confere se é a tela de "Aposta Ganha" da Betano.');
  }
  return { validated: true, outcome: 'won' as const, payout: proof.value, source: proof.source };
});
