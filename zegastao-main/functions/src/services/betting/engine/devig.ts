// De-vig: remove a margem da casa (overround) das odds de um mercado para obter
// a probabilidade "limpa" que o mercado realmente atribui a cada resultado.
// Método proporcional (o mais simples e transparente). Determinístico.

/** Probabilidade implícita bruta de uma odd decimal (inclui a margem). */
export function impliedProb(odd: number): number {
  return odd > 0 ? 1 / odd : 0;
}

/** Soma das probabilidades implícitas - 1, em %. Quanto maior, pior pro apostador. */
export function overround(odds: number[]): number {
  const sum = odds.reduce((acc, o) => acc + impliedProb(o), 0);
  return round4((sum - 1) * 100);
}

/**
 * De-vig proporcional: normaliza as probabilidades implícitas para somarem 1.
 * Retorna as probabilidades limpas na mesma ordem das odds.
 */
export function devig(odds: number[]): number[] {
  const implied = odds.map(impliedProb);
  const sum = implied.reduce((a, b) => a + b, 0);
  if (sum <= 0) return odds.map(() => 0);
  return implied.map((p) => round4(p / sum));
}

/** De-vig de um único par odd↔probabilidade dentro de um mercado completo. */
export function devigSelection(targetOdd: number, allMarketOdds: number[]): number {
  const idx = allMarketOdds.indexOf(targetOdd);
  const clean = devig(allMarketOdds);
  return idx >= 0 ? clean[idx] : round4(impliedProb(targetOdd));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
