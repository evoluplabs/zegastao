// Kelly Criterion para gerenciamento de banca.
// Usamos ½ Kelly (mais conservador) para apostas esportivas.

export function kellyFraction(probability: number, odd: number): number {
  // Kelly = (p * b - q) / b  onde b = odd - 1, p = prob. estimada, q = 1 - p
  const b = odd - 1;
  const q = 1 - probability;
  const kelly = (probability * b - q) / b;
  return Math.max(0, kelly); // nunca negativo
}

export function halfKelly(probability: number, odd: number): number {
  return kellyFraction(probability, odd) * 0.5;
}

// Dado o bankroll semanal e a análise, sugere o valor a apostar
export function suggestedStake(
  probability: number,
  odd: number,
  weeklyBudget: number,
  weeklyStaked: number
): number {
  const remaining = weeklyBudget - weeklyStaked;
  if (remaining <= 0) return 0;

  const fraction = halfKelly(probability, odd);
  const raw = fraction * weeklyBudget;

  // Nunca mais que 25% do budget por aposta e nunca mais que o restante
  const capped = Math.min(raw, weeklyBudget * 0.25, remaining);
  return Math.max(0, parseFloat(capped.toFixed(2)));
}

// Calcula probabilidade implícita a partir de uma odd decimal
export function impliedProbability(odd: number): number {
  return 1 / odd;
}

// Verifica se existe value (probabilidade estimada > implícita)
export function hasValue(estimatedProb: number, odd: number): boolean {
  return estimatedProb > impliedProbability(odd);
}

// Margem da casa (overround) a partir de um conjunto de odds
export function houseMargin(odds: number[]): number {
  const sum = odds.reduce((acc, o) => acc + 1 / o, 0);
  return parseFloat(((sum - 1) * 100).toFixed(2));
}
