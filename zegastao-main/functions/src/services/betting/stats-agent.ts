// Agente de Estatísticas: deriva o perfil ofensivo/defensivo de cada time a
// partir dos jogos recentes (gols marcados/sofridos, taxa de BTTS e de Over 2.5).
// Base quantitativa para mercados de gols (totals) e ambas marcam (btts).
//
// Nota de engenharia: o endpoint /fixtures/statistics da API-Football só existe
// para jogos JÁ disputados e custaria 1 chamada por partida — inviável no plano
// gratuito (100 req/dia) rodando até 5 jogos por objetivo. Por isso derivamos as
// estatísticas dos resultados recentes (2 chamadas via getFixturesByTeam), que é
// confiável e barato.
//
// Fallback Copa/print-first: quando teamId=0 (sem ID no API-Football, ex: jogos
// da Copa uplodados via print), usa Claude com conhecimento histórico de seleções
// para estimar médias reais. Isso alimenta o motor Poisson em vez dos defaults
// 1.2/1.2 que assumem igualdade absoluta entre qualquer par de times.
import Anthropic from '@anthropic-ai/sdk';
import { getFixturesByTeam, APIFootballFixture } from './sports-api';

export interface StatsOutput {
  homeAvgScored: number;
  homeAvgConceded: number;
  awayAvgScored: number;
  awayAvgConceded: number;
  bttsRate: number;   // 0-100, % dos jogos recentes (somados) com ambas marcando
  over25Rate: number; // 0-100, % dos jogos recentes com 3+ gols
  expectedGoalsProfile: 'high' | 'medium' | 'low';
  summary: string;    // pt-BR para o Consolidador
  source: 'api' | 'inferred';
}

interface TeamGoals {
  avgScored: number;
  avgConceded: number;
  games: number;
}

function aggregateGoals(fixtures: APIFootballFixture[], teamId: number): TeamGoals {
  let scored = 0;
  let conceded = 0;
  let games = 0;
  for (const f of fixtures) {
    if (f.goals.home === null || f.goals.away === null) continue;
    const isHome = f.teams.home.id === teamId;
    scored += isHome ? f.goals.home : f.goals.away;
    conceded += isHome ? f.goals.away : f.goals.home;
    games += 1;
  }
  return {
    avgScored: games ? scored / games : 0,
    avgConceded: games ? conceded / games : 0,
    games,
  };
}

function rates(fixtures: APIFootballFixture[]): { btts: number; over25: number } {
  let valid = 0;
  let btts = 0;
  let over25 = 0;
  for (const f of fixtures) {
    if (f.goals.home === null || f.goals.away === null) continue;
    valid += 1;
    if (f.goals.home > 0 && f.goals.away > 0) btts += 1;
    if (f.goals.home + f.goals.away >= 3) over25 += 1;
  }
  if (!valid) return { btts: 0, over25: 0 };
  return {
    btts: Math.round((btts / valid) * 100),
    over25: Math.round((over25 / valid) * 100),
  };
}

function clamp(v: unknown, min: number, max: number): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return isFinite(n) ? Math.max(min, Math.min(max, n)) : (min + max) / 2;
}

/** Fallback via Claude quando não há teamId real (Copa, print-first). */
async function inferStatsViaClaude(
  homeTeam: string,
  awayTeam: string,
  league: string,
): Promise<StatsOutput> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: 'Você é um analista esportivo com amplo conhecimento de estatísticas de futebol internacional. Responda APENAS com JSON válido, sem texto extra.',
    messages: [{
      role: 'user',
      content: `Com base no histórico recente de "${homeTeam}" e "${awayTeam}" em "${league}" (Copa do Mundo, eliminatórias ou nível similar), estime:
- Média de gols marcados por jogo (últimas 10-15 partidas em competições de nível equivalente)
- Média de gols sofridos por jogo (idem)
- Taxa estimada de "ambas marcam" (0-100)
- Taxa estimada de Over 2.5 gols (0-100)
- Resumo analítico em 80 palavras

Responda APENAS JSON:
{"homeAvgScored":X.X,"homeAvgConceded":X.X,"awayAvgScored":X.X,"awayAvgConceded":X.X,"bttsRate":XX,"over25Rate":XX,"summary":"..."}`,
    }],
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
  const p = JSON.parse(raw.replace(/```json|```/g, '').trim());

  const homeAvgScored = clamp(p.homeAvgScored, 0.3, 3.5);
  const homeAvgConceded = clamp(p.homeAvgConceded, 0.3, 3.0);
  const awayAvgScored = clamp(p.awayAvgScored, 0.3, 3.5);
  const awayAvgConceded = clamp(p.awayAvgConceded, 0.3, 3.0);
  const bttsRate = clamp(p.bttsRate, 0, 100);
  const over25Rate = clamp(p.over25Rate, 0, 100);
  const projectedGoals =
    (homeAvgScored + awayAvgConceded) / 2 + (awayAvgScored + homeAvgConceded) / 2;
  const expectedGoalsProfile: StatsOutput['expectedGoalsProfile'] =
    projectedGoals >= 3 ? 'high' : projectedGoals <= 2 ? 'low' : 'medium';

  return {
    homeAvgScored, homeAvgConceded,
    awayAvgScored, awayAvgConceded,
    bttsRate, over25Rate,
    expectedGoalsProfile,
    summary: typeof p.summary === 'string'
      ? `ESTATÍSTICAS (inferidas — ${homeTeam}/${awayTeam}): ${p.summary}`
      : `ESTATÍSTICAS (inferidas): ${homeTeam} ${homeAvgScored.toFixed(1)} gols/jogo, ${awayTeam} ${awayAvgScored.toFixed(1)} gols/jogo. BTTS: ${bttsRate}%. Over 2.5: ${over25Rate}%.`,
    source: 'inferred',
  };
}

export async function runStatsAgent(
  homeTeamId: number,
  homeTeam: string,
  awayTeamId: number,
  awayTeam: string,
  league?: string,
): Promise<StatsOutput> {
  // Caminho 1: API-Football — teamId real → fixtures recentes → stats determinísticas.
  if (homeTeamId !== 0 && awayTeamId !== 0) {
    const [homeFixtures, awayFixtures] = await Promise.all([
      getFixturesByTeam(homeTeamId, 8).catch(() => [] as APIFootballFixture[]),
      getFixturesByTeam(awayTeamId, 8).catch(() => [] as APIFootballFixture[]),
    ]);

    const home = aggregateGoals(homeFixtures, homeTeamId);
    const away = aggregateGoals(awayFixtures, awayTeamId);

    if (home.games >= 3 || away.games >= 3) {
      const combined = [...homeFixtures, ...awayFixtures];
      const { btts, over25 } = rates(combined);
      const projectedGoals =
        (home.avgScored + away.avgConceded) / 2 + (away.avgScored + home.avgConceded) / 2;
      const expectedGoalsProfile: StatsOutput['expectedGoalsProfile'] =
        projectedGoals >= 3 ? 'high' : projectedGoals <= 2 ? 'low' : 'medium';
      const profileLabel =
        expectedGoalsProfile === 'high' ? 'jogo tende a ser de muitos gols'
        : expectedGoalsProfile === 'low' ? 'jogo tende a ser truncado, poucos gols'
        : 'expectativa de gols moderada';
      return {
        homeAvgScored: parseFloat(home.avgScored.toFixed(2)),
        homeAvgConceded: parseFloat(home.avgConceded.toFixed(2)),
        awayAvgScored: parseFloat(away.avgScored.toFixed(2)),
        awayAvgConceded: parseFloat(away.avgConceded.toFixed(2)),
        bttsRate: btts,
        over25Rate: over25,
        expectedGoalsProfile,
        summary: `ESTATÍSTICAS (API-Football):
${homeTeam}: ${home.avgScored.toFixed(1)} gols marcados / ${home.avgConceded.toFixed(1)} sofridos por jogo (${home.games} jogos).
${awayTeam}: ${away.avgScored.toFixed(1)} gols marcados / ${away.avgConceded.toFixed(1)} sofridos por jogo (${away.games} jogos).
BTTS recente: ${btts}% dos jogos. Over 2.5: ${over25}% dos jogos.
Projeção: ~${projectedGoals.toFixed(1)} gols — ${profileLabel}.`,
        source: 'api',
      };
    }
  }

  // Caminho 2 (fallback): teamId=0 ou API sem dados suficientes.
  // Usa Claude com conhecimento histórico de seleções/clubes para estimar médias reais.
  // Garante que o motor Poisson receba priors realistas em vez de 1.2/1.2 para todos.
  return inferStatsViaClaude(homeTeam, awayTeam, league || 'Copa do Mundo');
}
