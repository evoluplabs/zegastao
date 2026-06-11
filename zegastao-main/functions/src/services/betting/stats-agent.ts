// Agente de Estatísticas: deriva o perfil ofensivo/defensivo de cada time a
// partir dos jogos recentes (gols marcados/sofridos, taxa de BTTS e de Over 2.5).
// Base quantitativa para mercados de gols (totals) e ambas marcam (btts).
//
// Nota de engenharia: o endpoint /fixtures/statistics da API-Football só existe
// para jogos JÁ disputados e custaria 1 chamada por partida — inviável no plano
// gratuito (100 req/dia) rodando até 5 jogos por objetivo. Por isso derivamos as
// estatísticas dos resultados recentes (2 chamadas via getFixturesByTeam), que é
// confiável e barato.
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

export async function runStatsAgent(
  homeTeamId: number,
  homeTeam: string,
  awayTeamId: number,
  awayTeam: string
): Promise<StatsOutput> {
  const [homeFixtures, awayFixtures] = await Promise.all([
    getFixturesByTeam(homeTeamId, 8).catch(() => [] as APIFootballFixture[]),
    getFixturesByTeam(awayTeamId, 8).catch(() => [] as APIFootballFixture[]),
  ]);

  const home = aggregateGoals(homeFixtures, homeTeamId);
  const away = aggregateGoals(awayFixtures, awayTeamId);

  const combined = [...homeFixtures, ...awayFixtures];
  const { btts, over25 } = rates(combined);

  // Perfil de gols esperado: soma do ataque de um com a defesa do outro
  const projectedGoals =
    (home.avgScored + away.avgConceded) / 2 + (away.avgScored + home.avgConceded) / 2;
  let expectedGoalsProfile: StatsOutput['expectedGoalsProfile'] = 'medium';
  if (projectedGoals >= 3) expectedGoalsProfile = 'high';
  else if (projectedGoals <= 2) expectedGoalsProfile = 'low';

  const profileLabel =
    expectedGoalsProfile === 'high' ? 'jogo tende a ser de muitos gols'
    : expectedGoalsProfile === 'low' ? 'jogo tende a ser truncado, poucos gols'
    : 'expectativa de gols moderada';

  const noData = home.games === 0 && away.games === 0;
  const summary = noData
    ? 'ESTATÍSTICAS: dados de jogos recentes indisponíveis para projeção quantitativa.'
    : `ESTATÍSTICAS (médias dos jogos recentes):
${homeTeam}: ${home.avgScored.toFixed(1)} gols marcados / ${home.avgConceded.toFixed(1)} sofridos por jogo (${home.games} jogos).
${awayTeam}: ${away.avgScored.toFixed(1)} gols marcados / ${away.avgConceded.toFixed(1)} sofridos por jogo (${away.games} jogos).
BTTS recente: ${btts}% dos jogos. Over 2.5: ${over25}% dos jogos.
Projeção: ~${projectedGoals.toFixed(1)} gols — ${profileLabel}.`;

  return {
    homeAvgScored: parseFloat(home.avgScored.toFixed(2)),
    homeAvgConceded: parseFloat(home.avgConceded.toFixed(2)),
    awayAvgScored: parseFloat(away.avgScored.toFixed(2)),
    awayAvgConceded: parseFloat(away.avgConceded.toFixed(2)),
    bttsRate: btts,
    over25Rate: over25,
    expectedGoalsProfile,
    summary,
  };
}
