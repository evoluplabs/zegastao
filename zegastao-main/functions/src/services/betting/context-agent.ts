// ContextAgent: a "malandragem" qualitativa. Converte o contexto do jogo em
// multiplicadores de ajuste por mercado (gols/escanteios/cartões/chutes/faltas).
//
// Pirâmide "código antes de IA":
//  - Tier 0 (sempre): multiplicadores determinísticos a partir do peso do jogo
//    (decisivo/importante/neutro/irrelevante), derivado da tabela — zero custo.
//  - Tier web (best-effort, atrás de flag): Claude com web search pesquisa lesões
//    de última hora, perfil do árbitro (tendência de cartões), clima. Ajusta os
//    multiplicadores dentro de limites e devolve um resumo honesto. Se a busca
//    falhar/indisponível, mantém o Tier 0 — nunca quebra o pipeline.
import Anthropic from '@anthropic-ai/sdk';
import { Firestore } from 'firebase-admin/firestore';
import { getCached } from './cache';
import { runMatchContextAgent } from './match-context-agent';
import { MarketFamily } from './engine/markets';

const WEB_SEARCH_ENABLED = process.env.ZE_WEB_SEARCH_ENABLED === 'true';
const MULT_MIN = 0.8;
const MULT_MAX = 1.25;

export type MarketMultipliers = Record<MarketFamily, number>;

export interface MatchContext {
  multipliers: MarketMultipliers;
  stakeLevel: 'decisive' | 'important' | 'neutral' | 'irrelevant';
  summary: string;   // pt-BR, honesto, para o card/sublegenda
  searched: boolean; // se a web search rodou de fato
}

// Tier 0 — multiplicadores por peso do jogo. Jogo decisivo tende a mais
// faltas/cartões e menos gols (tenso); jogo irrelevante, menos intensidade.
const BASE_BY_STAKE: Record<MatchContext['stakeLevel'], MarketMultipliers> = {
  decisive:   { goals: 0.97, corners: 1.05, cards: 1.18, shots: 1.03, fouls: 1.18 },
  important:  { goals: 1.00, corners: 1.02, cards: 1.08, shots: 1.00, fouls: 1.08 },
  neutral:    { goals: 1.00, corners: 1.00, cards: 1.00, shots: 1.00, fouls: 1.00 },
  irrelevant: { goals: 0.95, corners: 0.97, cards: 0.90, shots: 0.95, fouls: 0.90 },
};

function clampMult(n: number): number {
  if (!isFinite(n)) return 1;
  return Math.min(MULT_MAX, Math.max(MULT_MIN, n));
}

function neutral(): MarketMultipliers {
  return { goals: 1, corners: 1, cards: 1, shots: 1, fouls: 1 };
}

/**
 * Resolve o contexto do jogo (cacheado por jogo/dia). Sempre devolve algo útil:
 * no mínimo os multiplicadores do Tier 0. A web search é um bônus best-effort.
 */
export async function resolveMatchContext(params: {
  db: Firestore;
  fixtureId: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  leagueId: number;
  date: string; // YYYY-MM-DD
}): Promise<MatchContext> {
  const { db, fixtureId, date } = params;
  return getCached<MatchContext>(
    db,
    `ctx_${fixtureId}_${date}`,
    24,
    () => buildContext(params),
  ).catch(() => ({ multipliers: neutral(), stakeLevel: 'neutral', summary: '', searched: false }));
}

async function buildContext(params: {
  homeTeam: string; homeTeamId: number; awayTeam: string; awayTeamId: number;
  leagueId: number; date: string;
}): Promise<MatchContext> {
  const { homeTeam, homeTeamId, awayTeam, awayTeamId, leagueId, date } = params;

  // Tier 0 — peso do jogo (reusa o agente de contexto por tabela já existente).
  let stakeLevel: MatchContext['stakeLevel'] = 'neutral';
  let baseSummary = '';
  try {
    const mc = await runMatchContextAgent(homeTeam, homeTeamId, awayTeam, awayTeamId, leagueId, date);
    stakeLevel = mc.stakeLevel;
    baseSummary = mc.bettingImplications || mc.summary || '';
  } catch {
    // segue com 'neutral'
  }
  const multipliers: MarketMultipliers = { ...BASE_BY_STAKE[stakeLevel] };

  // Tier web — best-effort.
  if (!WEB_SEARCH_ENABLED) {
    return { multipliers, stakeLevel, summary: baseSummary, searched: false };
  }
  try {
    const web = await webSearchAdjust(homeTeam, awayTeam, date);
    if (web) {
      (Object.keys(multipliers) as MarketFamily[]).forEach((m) => {
        multipliers[m] = clampMult(multipliers[m] * (web.adjust[m] ?? 1));
      });
      return {
        multipliers,
        stakeLevel,
        summary: web.summary || baseSummary,
        searched: true,
      };
    }
  } catch {
    // web search indisponível (SDK/modelo) — mantém Tier 0
  }
  return { multipliers, stakeLevel, summary: baseSummary, searched: false };
}

interface WebAdjustment {
  adjust: Partial<MarketMultipliers>;
  summary: string;
}

// Tipo mínimo da server-tool de web search (não dependemos dos tipos do SDK, que
// variam por versão). O cast garante compilação em qualquer versão instalada.
const WEB_SEARCH_TOOLS = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }];

const WEB_PROMPT = (home: string, away: string, date: string) =>
  `Pesquise notícias recentes (até ${date}) sobre o jogo ${home} x ${away}: lesões/suspensões de titulares, perfil do árbitro (tendência de cartões), clima/gramado e clássico/rivalidade.
Responda APENAS com JSON:
{"summary":"resumo honesto em pt-BR, 2 frases","adjust":{"goals":1.0,"corners":1.0,"cards":1.0,"shots":1.0,"fouls":1.0}}
Em "adjust", use valores entre 0.85 e 1.2 (1.0 = sem efeito). Ex.: árbitro rigoroso/clássico → cards e fouls > 1.0; muitos desfalques ofensivos → goals e shots < 1.0. Não invente; se não achar nada, use 1.0.`;

async function webSearchAdjust(home: string, away: string, date: string): Promise<WebAdjustment | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    messages: [{ role: 'user', content: WEB_PROMPT(home, away, date) }],
    // cast: a server-tool pode não existir nos tipos da versão instalada do SDK
    tools: WEB_SEARCH_TOOLS as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming['tools'],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as { summary?: string; adjust?: Record<string, number> };
  const adjust: Partial<MarketMultipliers> = {};
  for (const m of ['goals', 'corners', 'cards', 'shots', 'fouls'] as MarketFamily[]) {
    const v = parsed.adjust?.[m];
    if (typeof v === 'number') adjust[m] = clampMult(v);
  }
  return { adjust, summary: parsed.summary || '' };
}
