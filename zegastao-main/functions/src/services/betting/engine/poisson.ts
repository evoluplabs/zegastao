// Modelo de Poisson para gols. A partir do número esperado de gols (lambda) de
// cada time, deriva as probabilidades de todos os mercados de gols/resultado.
// 100% determinístico — nenhum número aqui sai de IA.

/** PMF de Poisson: P(X = k) para média lambda. */
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  // e^-lambda * lambda^k / k!
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

export interface GoalLambdas {
  home: number;
  away: number;
}

/**
 * Estima o número esperado de gols de cada time combinando o ataque de um com a
 * defesa do outro, em relação à média de gols da liga. Pequeno bônus de mando.
 */
export function estimateLambdas(params: {
  homeAvgScored: number;
  homeAvgConceded: number;
  awayAvgScored: number;
  awayAvgConceded: number;
  leagueAvgGoals?: number; // gols médios por time por jogo na liga
  homeAdvantage?: number;  // multiplicador de mando (ex: 1.1)
}): GoalLambdas {
  const leagueAvg = params.leagueAvgGoals && params.leagueAvgGoals > 0 ? params.leagueAvgGoals : 1.35;
  const homeAdv = params.homeAdvantage ?? 1.1;

  // Força ofensiva/defensiva relativa à média da liga
  const homeAttack = params.homeAvgScored / leagueAvg;
  const homeDefense = params.homeAvgConceded / leagueAvg;
  const awayAttack = params.awayAvgScored / leagueAvg;
  const awayDefense = params.awayAvgConceded / leagueAvg;

  const home = Math.max(0.15, homeAttack * awayDefense * leagueAvg * homeAdv);
  const away = Math.max(0.15, awayAttack * homeDefense * leagueAvg);
  return { home, away };
}

export interface MatchProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  bttsYes: number;
  bttsNo: number;
  over: Record<string, number>;  // chave = linha (ex: "1.5", "2.5", "3.5")
  under: Record<string, number>;
  topScorelines: Array<{ score: string; prob: number }>;
  expectedGoals: number;
}

const DEFAULT_LINES = [0.5, 1.5, 2.5, 3.5, 4.5];

/**
 * Constrói a matriz de placares P(home=i, away=j) assumindo independência entre
 * os ataques (aproximação padrão de mercado) e deriva todos os mercados.
 */
export function matchProbabilities(
  lambdas: GoalLambdas,
  maxGoals = 10,
  lines: number[] = DEFAULT_LINES,
): MatchProbabilities {
  const homePmf: number[] = [];
  const awayPmf: number[] = [];
  for (let i = 0; i <= maxGoals; i++) {
    homePmf[i] = poissonPmf(i, lambdas.home);
    awayPmf[i] = poissonPmf(i, lambdas.away);
  }

  let homeWin = 0, draw = 0, awayWin = 0;
  let bttsYes = 0;
  const overCount: Record<string, number> = {};
  lines.forEach((l) => (overCount[l.toFixed(1)] = 0));
  const scorelines: Array<{ score: string; prob: number }> = [];

  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const p = homePmf[i] * awayPmf[j];
      if (p <= 0) continue;
      if (i > j) homeWin += p;
      else if (i === j) draw += p;
      else awayWin += p;
      if (i > 0 && j > 0) bttsYes += p;
      const total = i + j;
      for (const l of lines) {
        if (total > l) overCount[l.toFixed(1)] += p;
      }
      scorelines.push({ score: `${i}-${j}`, prob: p });
    }
  }

  const over: Record<string, number> = {};
  const under: Record<string, number> = {};
  for (const l of lines) {
    const key = l.toFixed(1);
    over[key] = round4(overCount[key]);
    under[key] = round4(1 - overCount[key]);
  }

  scorelines.sort((a, b) => b.prob - a.prob);

  return {
    homeWin: round4(homeWin),
    draw: round4(draw),
    awayWin: round4(awayWin),
    bttsYes: round4(bttsYes),
    bttsNo: round4(1 - bttsYes),
    over,
    under,
    topScorelines: scorelines.slice(0, 5).map((s) => ({ score: s.score, prob: round4(s.prob) })),
    expectedGoals: round4(lambdas.home + lambdas.away),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
