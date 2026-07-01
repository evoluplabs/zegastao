// Detecção de valor: combina a probabilidade do nosso modelo (Poisson/Elo) com a
// probabilidade limpa do mercado (de-vig) e calcula o valor esperado (EV).
// "Valor" = quando achamos que a chance real é maior do que a odd paga sugere.

export interface ValueAssessment {
  modelProb: number;   // probabilidade combinada final (0-1)
  fairOdd: number;     // 1 / modelProb
  marketOdd: number;   // odd oferecida
  ev: number;          // valor esperado por R$1 apostado (modelProb*odd - 1)
  edgePct: number;     // EV em %
  hasValue: boolean;   // ev > 0
}

/**
 * Blend entre a probabilidade do modelo próprio e a do mercado de-vigged.
 * modelWeight=0.5 → média; <0.5 confia mais no mercado; >0.5 no modelo próprio.
 * O mercado costuma ser eficiente, então o default pesa levemente para ele.
 */
export function blendProb(modelProb: number, marketProb: number, modelWeight = 0.5): number {
  const w = clamp(modelWeight, 0, 1);
  const blended = modelProb * w + marketProb * (1 - w);
  return round4(clamp(blended, 0.0001, 0.9999));
}

/** Avalia uma seleção: dada a prob combinada e a odd de mercado, calcula o EV. */
export function assess(modelProb: number, marketOdd: number): ValueAssessment {
  const p = clamp(modelProb, 0.0001, 0.9999);
  const ev = round4(p * marketOdd - 1);
  return {
    modelProb: round4(p),
    fairOdd: round4(1 / p),
    marketOdd: round4(marketOdd),
    ev,
    edgePct: round4(ev * 100),
    hasValue: ev > 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
