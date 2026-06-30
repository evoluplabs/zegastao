// Motor multi-mercado: além de gols, modela escanteios, cartões, chutes e faltas.
// A soma de dois Poisson independentes (eventos do mandante + do visitante) é um
// Poisson da soma — então o TOTAL de um mercado é modelado por um único lambda.
// 100% determinístico. Alimentado por médias reais (agents/stats-multi.ts).
import { poissonPmf } from './poisson';

export type MarketFamily = 'goals' | 'corners' | 'cards' | 'shots' | 'fouls';

export interface OverUnderProbs {
  over: Record<string, number>;   // chave = linha (ex: "9.5")
  under: Record<string, number>;
  expectedTotal: number;
}

/** Estima o lambda do TOTAL do mercado a partir das médias dos dois times. */
export function estimateTotalLambda(homeAvgFor: number, awayAvgFor: number, contextMult = 1): number {
  return Math.max(0.1, (homeAvgFor + awayAvgFor) * contextMult);
}

/**
 * Probabilidade de over/under para cada linha, dado o lambda do total.
 * Para linha x.5: over = P(X >= x+1) = 1 - P(X <= x).
 */
export function poissonOverUnder(lambdaTotal: number, lines: number[], maxK = 60): OverUnderProbs {
  const lt = Math.max(0.01, lambdaTotal);
  const pmf: number[] = [];
  for (let k = 0; k <= maxK; k++) pmf[k] = poissonPmf(k, lt);

  const over: Record<string, number> = {};
  const under: Record<string, number> = {};
  for (const line of lines) {
    const threshold = Math.floor(line); // over = X > threshold
    let cumLE = 0;
    for (let k = 0; k <= threshold && k <= maxK; k++) cumLE += pmf[k];
    const pOver = clamp(1 - cumLE, 0, 1);
    const key = line.toFixed(1);
    over[key] = round4(pOver);
    under[key] = round4(1 - pOver);
  }
  return { over, under, expectedTotal: round4(lt) };
}

/** Probabilidade de um time específico fazer mais/menos que uma linha (team totals). */
export function teamOverUnder(teamLambda: number, lines: number[]): OverUnderProbs {
  return poissonOverUnder(teamLambda, lines);
}

// Linhas padrão de mercado por família (a Betano costuma ofertar em torno disso).
export const DEFAULT_LINES: Record<MarketFamily, number[]> = {
  goals: [0.5, 1.5, 2.5, 3.5, 4.5],
  corners: [7.5, 8.5, 9.5, 10.5, 11.5],
  cards: [2.5, 3.5, 4.5, 5.5],
  shots: [18.5, 20.5, 22.5, 24.5],
  fouls: [18.5, 20.5, 22.5, 24.5],
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
