// Ratings de força (estilo Elo) → probabilidades 1X2.
// Usado como segundo sinal, combinado com o Poisson (engine/value.ts).
// Determinístico. O rating de cada time é mantido no modelo coletivo e
// atualizado no job noturno conforme os resultados reais chegam.

export const DEFAULT_RATING = 1500;
export const HOME_ADVANTAGE = 65; // pontos de Elo de mando de campo

/** Expectativa de pontuação (vitória=1, empate=0.5) do time A contra B. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/** Atualiza um rating após um resultado (actual: 1 vitória, 0.5 empate, 0 derrota). */
export function updateRating(rating: number, expected: number, actual: number, k = 20): number {
  return Math.round(rating + k * (actual - expected));
}

export interface Result1x2 {
  home: number;
  draw: number;
  away: number;
}

/**
 * Converte a diferença de rating em probabilidades 1X2.
 * O empate é modelado por um fator que decresce conforme os times se distanciam
 * em força (jogos parelhos empatam mais). Heurística honesta — calibrada pelo
 * aprendizado coletivo com o tempo.
 */
export function elo1x2(
  ratingHome: number,
  ratingAway: number,
  homeAdvantage = HOME_ADVANTAGE,
): Result1x2 {
  const diff = ratingHome + homeAdvantage - ratingAway;
  // Expectativa combinada (vitória + meio empate) do mandante
  const expHome = expectedScore(ratingHome + homeAdvantage, ratingAway);

  // Probabilidade de empate: base ~28%, cai com o desequilíbrio de força
  const drawProb = clamp(0.28 - Math.abs(diff) / 4000, 0.12, 0.30);

  // expHome = home + draw/2  →  home = expHome - draw/2
  let home = expHome - drawProb / 2;
  let away = 1 - drawProb - home;

  home = clamp(home, 0.01, 0.98);
  away = clamp(away, 0.01, 0.98);
  const sum = home + drawProb + away;

  return {
    home: round4(home / sum),
    draw: round4(drawProb / sum),
    away: round4(away / sum),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
