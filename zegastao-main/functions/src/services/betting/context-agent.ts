// ContextAgent: a "malandragem" qualitativa. Converte o contexto do jogo em
// multiplicadores de ajuste por mercado (gols/escanteios/cartões/chutes/faltas).
//
// Pirâmide "código antes de IA":
//  - Tier 0 (sempre): multiplicadores determinísticos a partir do peso do jogo
//    (decisivo/importante/neutro/irrelevante), derivado da tabela — zero custo.
//  - Tier web (fonte PRIMÁRIA quando disponível, atrás de flag): Claude com web
//    search pesquisa lesões de última hora, perfil do árbitro, clima e peso do
//    jogo (Copa do Mundo final, etc). Tem prioridade sobre Tier 0 — pode
//    sobrescrever stakeLevel e usa range mais amplo [0.7, 1.4]. Roda em paralelo
//    com o Tier 0. Fallback para Tier 0 se busca falhar/indisponível.
import Anthropic from '@anthropic-ai/sdk';
import { Firestore } from 'firebase-admin/firestore';
import { getCached } from './cache';
import { runMatchContextAgent } from './match-context-agent';
import { MarketFamily } from './engine/markets';

const WEB_SEARCH_ENABLED = process.env.ZE_WEB_SEARCH_ENABLED === 'true';

// Tier 0 (sem web search): range conservador
const T0_MIN = 0.8;
const T0_MAX = 1.25;
// Tier web (com web search): range amplo — mais confiança
const WEB_MIN = 0.7;
const WEB_MAX = 1.4;

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

function clamp(n: number, min: number, max: number): number {
  if (!isFinite(n)) return 1;
  return Math.min(max, Math.max(min, n));
}

function neutral(): MarketMultipliers {
  return { goals: 1, corners: 1, cards: 1, shots: 1, fouls: 1 };
}

/**
 * Resolve o contexto do jogo (cacheado por jogo/dia). Sempre devolve algo útil:
 * no mínimo os multiplicadores do Tier 0. A web search é FONTE PRIMÁRIA quando
 * disponível — traz lesões, árbitro, clima e peso real do jogo da Copa.
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

  // Tier 0 e Tier web rodam em PARALELO — melhor latência, web é fonte primária.
  const [mcResult, webResult] = await Promise.allSettled([
    runMatchContextAgent(homeTeam, homeTeamId, awayTeam, awayTeamId, leagueId, date),
    WEB_SEARCH_ENABLED
      ? webSearchContext(homeTeam, awayTeam, date)
      : Promise.resolve(null),
  ]);

  // Stakelevels do Tier 0 (determinístico por tabela)
  let stakeLevel: MatchContext['stakeLevel'] = 'neutral';
  let baseSummary = '';
  if (mcResult.status === 'fulfilled') {
    stakeLevel = mcResult.value.stakeLevel;
    baseSummary = mcResult.value.bettingImplications || mcResult.value.summary || '';
  }

  // Multiplicadores base do Tier 0
  const multipliers: MarketMultipliers = { ...BASE_BY_STAKE[stakeLevel] };

  // Tier web — FONTE PRIMÁRIA: lesões, árbitro, clima, Copa do Mundo 2026
  if (webResult.status === 'fulfilled' && webResult.value) {
    const web = webResult.value;
    // Web search pode sobrescrever stakeLevel quando a tabela não captura
    // (ex: final da Copa que não tem ranking convencional → decisive)
    if (web.stakeLevel) {
      stakeLevel = web.stakeLevel;
      Object.assign(multipliers, BASE_BY_STAKE[stakeLevel]);
    }
    // Aplica ajustes com prioridade e range mais amplo (confiança na pesquisa)
    for (const m of Object.keys(multipliers) as MarketFamily[]) {
      const adj = web.adjust[m];
      if (adj !== undefined) {
        multipliers[m] = clamp(multipliers[m] * adj, WEB_MIN, WEB_MAX);
      }
    }
    return { multipliers, stakeLevel, summary: web.summary || baseSummary, searched: true };
  }

  // Sem web search — mantém Tier 0 com range conservador
  for (const m of Object.keys(multipliers) as MarketFamily[]) {
    multipliers[m] = clamp(multipliers[m], T0_MIN, T0_MAX);
  }
  return { multipliers, stakeLevel, summary: baseSummary, searched: false };
}

interface WebContext {
  adjust: Partial<MarketMultipliers>;
  stakeLevel: MatchContext['stakeLevel'] | null;
  summary: string;
}

const WEB_PROMPT = (home: string, away: string, date: string) =>
  `Pesquise notícias recentes (até ${date}) sobre o jogo ${home} x ${away}.

Pode ser Copa do Mundo 2026 ou outro campeonato. Busque:
1. Lesões ou suspensões de titulares confirmadas
2. Perfil do árbitro escalado (rigoroso/permissivo, tendência de cartões)
3. Condições climáticas e estado do gramado
4. Peso do jogo (final, semifinal, fase eliminatória, grupo sem nada em jogo)
5. Histórico de rivalidade (clássico regional/nacional)

Responda APENAS com JSON válido:
{"summary":"resumo em pt-BR, 2 frases, honesto","stakeLevel":"decisive|important|neutral|irrelevant|null","adjust":{"goals":1.0,"corners":1.0,"cards":1.0,"shots":1.0,"fouls":1.0}}

Regras adjust: 0.7–1.4 (1.0 = sem efeito detectado). Exemplos: árbitro rigoroso/clássico → cards e fouls > 1.0; final Copa/jogo decisivo → cards 1.2, fouls 1.2; desfalques ofensivos importantes → goals < 1.0, shots < 1.0. Use null para stakeLevel se incerto. Se não achar info confiável, use 1.0 e stakeLevel null.`;

async function webSearchContext(home: string, away: string, date: string): Promise<WebContext | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: WEB_PROMPT(home, away, date) }],
    // web_search_20250305 é um server-tool nativo da Anthropic — cast para
    // compatibilidade de tipos entre versões do SDK
    tools: [{ type: 'web_search_20250305', max_uses: 5 }] as unknown as Anthropic.Messages.Tool[],
  });
  // O response pode conter blocos server_tool_use/web_search_tool_result
  // internamente; filtramos só os text blocks que trazem o JSON final.
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as {
    summary?: string;
    stakeLevel?: string;
    adjust?: Record<string, number>;
  };
  const adjust: Partial<MarketMultipliers> = {};
  for (const m of ['goals', 'corners', 'cards', 'shots', 'fouls'] as MarketFamily[]) {
    const v = parsed.adjust?.[m];
    if (typeof v === 'number') adjust[m] = v;
  }
  const validLevels: MatchContext['stakeLevel'][] = ['decisive', 'important', 'neutral', 'irrelevant'];
  const stakeLevel = validLevels.includes(parsed.stakeLevel as MatchContext['stakeLevel'])
    ? (parsed.stakeLevel as MatchContext['stakeLevel'])
    : null;
  return { adjust, stakeLevel, summary: parsed.summary || '' };
}
