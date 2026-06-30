// StatsMultiAgent: médias reais por time de escanteios, cartões, chutes e faltas,
// derivadas de /fixtures/statistics da API-Football. Alimenta o motor multi-mercado
// (engine/markets.ts). Segue "código antes de IA": só lê API e calcula — zero LLM.
//
// Custo: cada jogo passado é 1 request à API-Football. Por isso o resultado por time
// é cacheado 1×/dia em betting_cache (TTL longo) e a amostra é limitada aos últimos
// jogos. No plano grátis (100 req/dia) isso cabe para o beta.

import { Firestore } from 'firebase-admin/firestore';
import { getCached } from './cache';
import { getFixturesByTeam, getFixtureStatistics, APIFootballFixture } from './sports-api';

export interface MarketAverages {
  corners: number; // média por jogo (eventos do próprio time)
  cards: number;   // amarelos + vermelhos
  shots: number;   // total de finalizações
  fouls: number;
  games: number;   // jogos com estatística disponível
}

// Defaults conservadores (médias típicas de futebol) quando não há dado.
const DEFAULTS: MarketAverages = { corners: 5, cards: 2, shots: 11, fouls: 13, games: 0 };

const STATS_TTL_HOURS = 24; // 1×/dia por time
const SAMPLE_FIXTURES = 5;  // limita o nº de chamadas por time

interface StatEntry {
  team?: { id?: number };
  statistics?: Array<{ type?: string; value?: number | string | null }>;
}

function statValue(entry: StatEntry, type: string): number {
  const s = entry.statistics?.find((x) => (x.type || '').toLowerCase() === type.toLowerCase());
  const v = s?.value;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace('%', ''));
    return isFinite(n) ? n : 0;
  }
  return 0;
}

/** Extrai as estatísticas do time `teamId` de uma resposta de /fixtures/statistics. */
function extractTeamStats(raw: unknown, teamId: number): { corners: number; cards: number; shots: number; fouls: number } | null {
  if (!Array.isArray(raw)) return null;
  const entry = (raw as StatEntry[]).find((e) => e.team?.id === teamId);
  if (!entry) return null;
  return {
    corners: statValue(entry, 'Corner Kicks'),
    cards: statValue(entry, 'Yellow Cards') + statValue(entry, 'Red Cards'),
    shots: statValue(entry, 'Total Shots'),
    fouls: statValue(entry, 'Fouls'),
  };
}

/**
 * Médias de mercado de um time, com cache pesado por dia. Lê os últimos jogos
 * finalizados e agrega as estatísticas. Degrada para defaults se a API não cobrir
 * (ex.: Copa do Mundo no plano grátis costuma faltar estatística detalhada).
 */
export async function teamMarketAverages(db: Firestore, teamId: number, date: string): Promise<MarketAverages> {
  if (!teamId) return { ...DEFAULTS };
  return getCached<MarketAverages>(
    db,
    `mkt_avg_team_${teamId}_${date}`,
    STATS_TTL_HOURS,
    async () => {
      const fixtures = await getFixturesByTeam(teamId, SAMPLE_FIXTURES).catch(() => [] as APIFootballFixture[]);
      let c = 0, k = 0, s = 0, f = 0, games = 0;
      for (const fx of fixtures) {
        const stats = await getFixtureStatistics(fx.fixture.id).catch(() => null);
        const t = stats ? extractTeamStats(stats, teamId) : null;
        if (!t) continue;
        c += t.corners; k += t.cards; s += t.shots; f += t.fouls; games += 1;
      }
      if (!games) return { ...DEFAULTS };
      return {
        corners: round2(c / games),
        cards: round2(k / games),
        shots: round2(s / games),
        fouls: round2(f / games),
        games,
      };
    },
  ).catch(() => ({ ...DEFAULTS }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
