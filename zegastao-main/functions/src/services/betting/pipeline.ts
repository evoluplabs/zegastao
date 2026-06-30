// Pipeline do Zé Apostador 2.0: para cada partida, junta dados (cacheados) →
// motor determinístico (Poisson + Elo + de-vig + valor + calibração) → candidatos.
// Depois o CycleBuilder (multiples.ts) monta a rodada e o card.ts compõe o card.
// Determinístico ponta a ponta. Nenhum número sai de IA.

import { Firestore } from 'firebase-admin/firestore';
import { getCached, cacheKeys, TTL } from './cache';
import { getFixturesByTeam, getOddsForMatch, APIFootballFixture, OddsEvent } from './sports-api';
import { FixtureSummary, leagueAvgGoals } from './fixtures-finder';
import { estimateLambdas, matchProbabilities } from './engine/poisson';
import { elo1x2 } from './engine/elo';
import { devig, impliedProb } from './engine/devig';
import { assess, blendProb } from './engine/value';
import { Candidate } from './engine/multiples';
import { GlobalModel, IndividualModel, ratingOf, calibratedProb, individualMultiplier } from './learning';
import { MarketMultipliers } from './context-agent';

// Reexporta o analisador de print (orquestração multi-mercado a partir da Betano).
export { analyzeExtractedSlip, parseOverUnder } from './slip-analyzer';

interface GoalAverages {
  scored: number;
  conceded: number;
  games: number;
}

async function teamAverages(db: Firestore, teamId: number, date: string): Promise<GoalAverages> {
  if (!teamId) return { scored: 1.2, conceded: 1.2, games: 0 };
  const fixtures = await getCached<APIFootballFixture[]>(
    db, cacheKeys.teamForm(teamId, date), TTL.form,
    () => getFixturesByTeam(teamId, 8).catch(() => [] as APIFootballFixture[]),
  );
  let scored = 0, conceded = 0, games = 0;
  for (const f of fixtures) {
    if (f.goals.home === null || f.goals.away === null) continue;
    const isHome = f.teams.home.id === teamId;
    scored += isHome ? f.goals.home : f.goals.away;
    conceded += isHome ? f.goals.away : f.goals.home;
    games += 1;
  }
  return games
    ? { scored: scored / games, conceded: conceded / games, games }
    : { scored: 1.2, conceded: 1.2, games: 0 };
}

/** Extrai a melhor odd por seleção de um mercado, a partir de todas as casas. */
function bestOddsByMarket(event: OddsEvent, marketKey: string): Map<string, number> {
  const best = new Map<string, number>();
  for (const bk of event.bookmakers) {
    for (const mkt of bk.markets) {
      if (mkt.key !== marketKey) continue;
      for (const o of mkt.outcomes) {
        const cur = best.get(o.name);
        if (cur === undefined || o.price > cur) best.set(o.name, o.price);
      }
    }
  }
  return best;
}

function findEvent(events: OddsEvent[], home: string, away: string): OddsEvent | undefined {
  return events.find(
    (e) =>
      (e.home_team.toLowerCase().includes(home.toLowerCase()) || home.toLowerCase().includes(e.home_team.toLowerCase())) ||
      (e.away_team.toLowerCase().includes(away.toLowerCase()) || away.toLowerCase().includes(e.away_team.toLowerCase())),
  );
}

/**
 * Produz os candidatos (seleções com odd + probabilidade do modelo) de uma
 * partida, nos mercados h2h, totals (2.5) e btts.
 */
export async function analyzeFixture(params: {
  db: Firestore;
  fixture: FixtureSummary;
  sportKey: string;
  oddsEvents: OddsEvent[];
  model: GlobalModel;
  individual: IndividualModel;
  context?: MarketMultipliers; // ajuste qualitativo (peso do jogo, lesões, árbitro)
  // Médias pré-computadas (ex.: via resolveTeamAverages) para quando teamId=0
  overrideAverages?: { home: GoalAverages; away: GoalAverages };
}): Promise<Candidate[]> {
  const { db, fixture, sportKey, oddsEvents, model, individual, context, overrideAverages } = params;
  const { homeTeam, awayTeam, homeTeamId, awayTeamId, kickoff, leagueName } = fixture;

  const event = findEvent(oddsEvents, homeTeam, awayTeam);
  if (!event) return []; // sem odds não dá pra avaliar valor

  const [home, away] = overrideAverages
    ? [overrideAverages.home, overrideAverages.away]
    : await Promise.all([
        teamAverages(db, homeTeamId, fixture.kickoff.slice(0, 10)),
        teamAverages(db, awayTeamId, fixture.kickoff.slice(0, 10)),
      ]);

  const goalsMult = context?.goals ?? 1;
  const lambdas = estimateLambdas({
    homeAvgScored: home.scored * goalsMult, homeAvgConceded: home.conceded,
    awayAvgScored: away.scored * goalsMult, awayAvgConceded: away.conceded,
    leagueAvgGoals: leagueAvgGoals(sportKey),
  });
  const mp = matchProbabilities(lambdas);
  const eloP = elo1x2(ratingOf(model, homeTeamId), ratingOf(model, awayTeamId));

  // Mistura Poisson (gols) com Elo (resultado) para o 1X2
  const poissonWeight = home.games >= 4 && away.games >= 4 ? 0.5 : 0.3;
  const p1x2 = {
    home: mp.homeWin * poissonWeight + eloP.home * (1 - poissonWeight),
    draw: mp.draw * poissonWeight + eloP.draw * (1 - poissonWeight),
    away: mp.awayWin * poissonWeight + eloP.away * (1 - poissonWeight),
  };

  const candidates: Candidate[] = [];
  const base = { fixtureId: fixture.fixtureId, homeTeam, awayTeam, league: leagueName, kickoff };

  // ---- h2h (1X2) ----
  const h2h = bestOddsByMarket(event, 'h2h');
  if (h2h.size >= 2) {
    const odds = [...h2h.values()];
    const cleanByName = new Map<string, number>();
    const names = [...h2h.keys()];
    const clean = devig(odds);
    names.forEach((n, i) => cleanByName.set(n, clean[i]));

    pushCandidate(candidates, base, 'h2h', event.home_team, h2h.get(event.home_team), p1x2.home, cleanByName.get(event.home_team), model, individual);
    pushCandidate(candidates, base, 'h2h', event.away_team, h2h.get(event.away_team), p1x2.away, cleanByName.get(event.away_team), model, individual);
    const drawOdd = h2h.get('Draw');
    if (drawOdd) pushCandidate(candidates, base, 'h2h', 'Empate', drawOdd, p1x2.draw, cleanByName.get('Draw'), model, individual);
  }

  // ---- btts ----
  const btts = bestOddsByMarket(event, 'btts');
  if (btts.size >= 2) {
    const clean = devig([...btts.values()]);
    const names = [...btts.keys()];
    const byName = new Map<string, number>();
    names.forEach((n, i) => byName.set(n, clean[i]));
    pushCandidate(candidates, base, 'btts', 'Ambas marcam: Sim', btts.get('Yes'), mp.bttsYes, byName.get('Yes'), model, individual);
    pushCandidate(candidates, base, 'btts', 'Ambas marcam: Não', btts.get('No'), mp.bttsNo, byName.get('No'), model, individual);
  }

  // ---- totals (linha 2.5 aproximada) ----
  const totals = bestOddsByMarket(event, 'totals');
  if (totals.size >= 2) {
    const clean = devig([...totals.values()]);
    const names = [...totals.keys()];
    const byName = new Map<string, number>();
    names.forEach((n, i) => byName.set(n, clean[i]));
    pushCandidate(candidates, base, 'totals', 'Mais de 2.5 gols', totals.get('Over'), mp.over['2.5'], byName.get('Over'), model, individual);
    pushCandidate(candidates, base, 'totals', 'Menos de 2.5 gols', totals.get('Under'), mp.under['2.5'], byName.get('Under'), model, individual);
  }

  return candidates;
}

function pushCandidate(
  out: Candidate[],
  base: { fixtureId: number; homeTeam: string; awayTeam: string; league: string; kickoff: string },
  market: string,
  selection: string,
  marketOdd: number | undefined,
  modelRawProb: number,
  marketCleanProb: number | undefined,
  model: GlobalModel,
  individual: IndividualModel,
): void {
  if (!marketOdd || marketOdd <= 1) return;
  const marketProb = marketCleanProb ?? impliedProb(marketOdd);
  // calibração coletiva + blend com o mercado
  const calibrated = calibratedProb(model, market, modelRawProb);
  const blended = blendProb(calibrated, marketProb);
  // nudge individual no ranking (não muda a prob, mas o EV efetivo de ordenação)
  const mult = individualMultiplier(individual, market);
  const a = assess(blended, marketOdd);
  out.push({
    ...base,
    market,
    selection,
    modelProb: a.modelProb,
    marketOdd: a.marketOdd,
    fairOdd: a.fairOdd,
    ev: a.ev * mult,
  });
}

/** Busca as odds de uma liga (The Odds API), com cache curto. */
export async function getCachedOdds(db: Firestore, sportKey: string, date: string): Promise<OddsEvent[]> {
  return getCached<OddsEvent[]>(
    db, `odds_${sportKey}_${date}`, 2,
    () => getOddsForMatch(sportKey).catch(() => [] as OddsEvent[]),
  );
}
