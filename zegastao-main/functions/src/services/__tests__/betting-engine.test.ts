import { describe, it, expect } from 'vitest';
import { poissonPmf, estimateLambdas, matchProbabilities } from '../betting/engine/poisson';
import { elo1x2, expectedScore, updateRating } from '../betting/engine/elo';
import { devig, impliedProb, overround } from '../betting/engine/devig';
import { assess, blendProb } from '../betting/engine/value';
import { combineLegs, buildRound, Candidate, RoundPlan, correlationHaircut, combineSameGame, buildSameGameMultiple } from '../betting/engine/multiples';
import { cycleStake } from '../betting/kelly';
import { composeCard, recalcOnRealOdd } from '../betting/card';
import { poissonOverUnder, estimateTotalLambda, DEFAULT_LINES } from '../betting/engine/markets';
import { parseBetanoText, MIN_CONFIDENCE } from '../betting/odds-extractor';
import { parseOverUnder, analyzeExtractedSlip } from '../betting/slip-analyzer';

describe('poisson', () => {
  it('PMF soma ~1 sobre o suporte', () => {
    let sum = 0;
    for (let k = 0; k <= 20; k++) sum += poissonPmf(k, 1.4);
    expect(sum).toBeCloseTo(1, 4);
  });

  it('P(0 gols) = e^-lambda', () => {
    expect(poissonPmf(0, 1.5)).toBeCloseTo(Math.exp(-1.5), 6);
  });

  it('mercados 1X2 somam 1', () => {
    const lambdas = estimateLambdas({
      homeAvgScored: 1.8, homeAvgConceded: 0.9,
      awayAvgScored: 1.0, awayAvgConceded: 1.4,
    });
    const p = matchProbabilities(lambdas);
    expect(p.homeWin + p.draw + p.awayWin).toBeCloseTo(1, 2);
    // mandante mais forte deve ter maior prob de vitória
    expect(p.homeWin).toBeGreaterThan(p.awayWin);
  });

  it('over + under da mesma linha somam ~1', () => {
    const p = matchProbabilities({ home: 1.5, away: 1.2 });
    expect(p.over['2.5'] + p.under['2.5']).toBeCloseTo(1, 2);
  });

  it('lambdas maiores → mais gols esperados e mais Over', () => {
    const low = matchProbabilities({ home: 0.7, away: 0.6 });
    const high = matchProbabilities({ home: 2.2, away: 1.8 });
    expect(high.over['2.5']).toBeGreaterThan(low.over['2.5']);
    expect(high.expectedGoals).toBeGreaterThan(low.expectedGoals);
  });
});

describe('elo', () => {
  it('times iguais → expectativa 0.5', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 6);
  });

  it('1X2 soma 1 e favorece o mais forte + mando', () => {
    const r = elo1x2(1600, 1500);
    expect(r.home + r.draw + r.away).toBeCloseTo(1, 4);
    expect(r.home).toBeGreaterThan(r.away);
  });

  it('updateRating sobe com vitória inesperada', () => {
    const expected = expectedScore(1400, 1600); // azarão
    const novo = updateRating(1400, expected, 1); // venceu
    expect(novo).toBeGreaterThan(1400);
  });
});

describe('devig', () => {
  it('probabilidade implícita = 1/odd', () => {
    expect(impliedProb(2.0)).toBeCloseTo(0.5, 6);
  });

  it('de-vig normaliza para somar 1', () => {
    const clean = devig([2.0, 3.5, 4.0]);
    // cada prob é arredondada a 4 casas, então a soma pode desviar ~0.0001
    expect(clean.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 3);
  });

  it('overround positivo quando a casa embute margem', () => {
    expect(overround([1.9, 1.9])).toBeGreaterThan(0);
  });
});

describe('value', () => {
  it('detecta valor quando prob real > implícita', () => {
    // odd 2.5 (implícita 40%); achamos 50% → valor positivo
    const a = assess(0.5, 2.5);
    expect(a.hasValue).toBe(true);
    expect(a.ev).toBeCloseTo(0.25, 4);
  });

  it('sem valor quando prob real < implícita', () => {
    const a = assess(0.3, 2.5);
    expect(a.hasValue).toBe(false);
    expect(a.ev).toBeLessThan(0);
  });

  it('blend fica entre as duas probabilidades', () => {
    const b = blendProb(0.6, 0.4, 0.5);
    expect(b).toBeCloseTo(0.5, 4);
  });
});

function cand(over: Partial<Candidate> = {}): Candidate {
  return {
    fixtureId: Math.random(), homeTeam: 'A', awayTeam: 'B', league: 'X',
    kickoff: '2026-06-24T18:00:00Z', market: 'h2h', selection: 'A',
    modelProb: 0.55, marketOdd: 2.0, fairOdd: 1.82, ev: 0.1, ...over,
  };
}

describe('multiples / CycleBuilder', () => {
  it('combineLegs multiplica odds e probabilidades', () => {
    const r = combineLegs([cand({ marketOdd: 2, modelProb: 0.5 }), cand({ marketOdd: 3, modelProb: 0.4 })]);
    expect(r.combinedOdd).toBeCloseTo(6, 4);
    expect(r.combinedProb).toBeCloseTo(0.2, 4);
    expect(r.ev).toBeCloseTo(0.2 * 6 - 1, 4);
  });

  it('nível 0 retorna aposta simples de maior EV', () => {
    const plan = buildRound([cand({ ev: 0.1 }), cand({ ev: 0.3 })], { riskLevel: 0 });
    expect(plan.type).toBe('single');
    expect(plan.legs).toHaveLength(1);
    expect(plan.legs[0].ev).toBe(0.3);
  });

  it('nível 1 só usa pernas com valor', () => {
    const plan = buildRound(
      [cand({ ev: 0.2 }), cand({ ev: -0.1, modelProb: 0.2 }), cand({ ev: 0.15 })],
      { riskLevel: 1 },
    );
    expect(plan.legs.every((l) => l.ev > 0)).toBe(true);
  });

  it('nível 2 (moonshot) escala até o alvo aceitando EV negativo', () => {
    const cands = Array.from({ length: 6 }, (_, i) =>
      cand({ fixtureId: i, ev: -0.05, modelProb: 0.35, marketOdd: 2.5 }),
    );
    const plan = buildRound(cands, { riskLevel: 2, targetMultiplier: 20 });
    expect(plan.type).toBe('multiple');
    expect(plan.combinedOdd).toBeGreaterThanOrEqual(20);
    // honestidade: o EV do moonshot é negativo
    expect(plan.ev).toBeLessThan(0);
  });

  it('sem candidatos com valor → skip nos níveis conservadores', () => {
    const plan = buildRound([cand({ ev: -0.2, modelProb: 0.1 })], { riskLevel: 0 });
    expect(plan.skip).toBe(true);
    expect(plan.reasonCode).toBe('no_candidates');
  });
});

describe('cycleStake', () => {
  it('níveis com valor usam ½ Kelly limitado a 25% da banca', () => {
    const stake = cycleStake({ probability: 0.6, odd: 2.0, bankroll: 100, riskLevel: 1 });
    expect(stake).toBeGreaterThan(0);
    expect(stake).toBeLessThanOrEqual(25);
  });

  it('moonshot usa fração fixa pequena da banca', () => {
    const stake = cycleStake({ probability: 0.03, odd: 30, bankroll: 10, riskLevel: 2 });
    expect(stake).toBeCloseTo(2, 2); // 20% de 10
  });

  it('banca zerada → stake zero', () => {
    expect(cycleStake({ probability: 0.6, odd: 2, bankroll: 0, riskLevel: 1 })).toBe(0);
  });
});

describe('markets (multi-mercado)', () => {
  it('over + under da mesma linha somam ~1', () => {
    const r = poissonOverUnder(9.5, [8.5, 9.5, 10.5]);
    expect(r.over['9.5'] + r.under['9.5']).toBeCloseTo(1, 4);
  });

  it('lambda maior → mais chance de over', () => {
    const baixo = poissonOverUnder(7, [9.5]);
    const alto = poissonOverUnder(12, [9.5]);
    expect(alto.over['9.5']).toBeGreaterThan(baixo.over['9.5']);
  });

  it('estimateTotalLambda soma as médias dos times', () => {
    expect(estimateTotalLambda(5, 4)).toBeCloseTo(9, 4);
    // multiplicador de contexto (ex: jogo decisivo → mais faltas)
    expect(estimateTotalLambda(5, 4, 1.2)).toBeCloseTo(10.8, 4);
  });

  it('escanteios: ~10 esperados dá over 9.5 perto de 50%', () => {
    const r = poissonOverUnder(estimateTotalLambda(5.2, 5.0), DEFAULT_LINES.corners);
    expect(r.over['9.5']).toBeGreaterThan(0.4);
    expect(r.over['9.5']).toBeLessThan(0.7);
  });
});

describe('odds-extractor (Tier 1 OCR→regex)', () => {
  const sample = `Flamengo x Vasco
Brasileirao Serie A
Resultado Final
Flamengo 1.85
Empate 3.40
Vasco 4.20
Escanteios - Total
Mais de 9.5 1.90
Menos de 9.5 1.90
Ambas Marcam
Sim 1.72
Nao 2.05`;

  it('extrai times, mercados e odds de um print limpo', () => {
    const slip = parseBetanoText(sample);
    expect(slip.homeTeam).toMatch(/Flamengo/);
    expect(slip.awayTeam).toMatch(/Vasco/);
    const markets = new Set(slip.markets.map((m) => m.market));
    expect(markets.has('h2h')).toBe(true);
    expect(markets.has('corners')).toBe(true);
    expect(markets.has('btts')).toBe(true);
    expect(slip.confidence).toBeGreaterThanOrEqual(MIN_CONFIDENCE);
  });

  it('odds extraídas são números plausíveis', () => {
    const slip = parseBetanoText(sample);
    expect(slip.markets.every((m) => m.odd > 1 && m.odd < 1000)).toBe(true);
    const corners = slip.markets.filter((m) => m.market === 'corners');
    expect(corners.length).toBeGreaterThanOrEqual(2);
  });

  it('texto vazio/ruído → confiança baixa (cai pro Vision)', () => {
    expect(parseBetanoText('').confidence).toBeLessThan(MIN_CONFIDENCE);
    expect(parseBetanoText('asdf qwer').confidence).toBeLessThan(MIN_CONFIDENCE);
  });
});

describe('card / composeCard', () => {
  it('múltipla de valor gera card sem selo', () => {
    const plan = buildRound(
      [cand({ fixtureId: 1, ev: 0.2, modelProb: 0.6, marketOdd: 2 }), cand({ fixtureId: 2, ev: 0.15, modelProb: 0.55, marketOdd: 2.1 })],
      { riskLevel: 1 },
    );
    const card = composeCard(plan, { authLevel: 1, bankroll: 50 });
    expect(card.type).toBe('multiple');
    expect(card.needsSeal).toBe(false);
    expect(card.suggestedStake).toBeGreaterThan(0);
    expect(card.steps.length).toBeGreaterThan(0);
  });

  it('moonshot (nível 2) exige selo de entendimento', () => {
    const cands = Array.from({ length: 6 }, (_, i) =>
      cand({ fixtureId: i, ev: -0.05, modelProb: 0.35, marketOdd: 2.5 }),
    );
    const plan = buildRound(cands, { riskLevel: 2, targetMultiplier: 20 });
    const card = composeCard(plan, { authLevel: 2, bankroll: 10 });
    expect(card.needsSeal).toBe(true);
    expect(card.seal).toBeTruthy();
  });

  it('plano vazio gera card de skip', () => {
    const empty: RoundPlan = { type: 'single', legs: [], combinedOdd: 0, combinedProb: 0, ev: -1, skip: true, reasonCode: 'no_candidates' };
    const card = composeCard(empty, { authLevel: 0, bankroll: 50 });
    expect(card.skip).toBe(true);
  });
});

describe('recalcOnRealOdd', () => {
  const base = { modelProb: 0.55, recommendedOdd: 2.0, bankroll: 50, riskLevel: 1 as const, oldStake: 5 };

  it('odd igual ou melhor → green', () => {
    expect(recalcOnRealOdd({ ...base, userOdd: 2.0 }).status).toBe('green');
  });

  it('odd bem acima → up', () => {
    expect(recalcOnRealOdd({ ...base, userOdd: 2.3 }).status).toBe('up');
  });

  it('odd caiu mas ainda acima da justa → down', () => {
    // fairOdd = 1/0.55 ≈ 1.818; odd 1.9 está entre justa e recomendada
    const r = recalcOnRealOdd({ ...base, userOdd: 1.9 });
    expect(r.status).toBe('down');
    expect(r.hasValue).toBe(true);
  });

  it('odd abaixo da justa → lost (sem valor)', () => {
    const r = recalcOnRealOdd({ ...base, userOdd: 1.7 });
    expect(r.status).toBe('lost');
    expect(r.newStake).toBe(0);
  });
});

describe('SGM (múltipla no mesmo jogo)', () => {
  it('haircut de correlação cresce com pernas e satura em 25%', () => {
    expect(correlationHaircut(1)).toBe(0);
    expect(correlationHaircut(2)).toBeCloseTo(0.06, 4);
    expect(correlationHaircut(3)).toBeCloseTo(0.12, 4);
    expect(correlationHaircut(10)).toBe(0.25); // saturado
  });

  it('combineSameGame puxa a prob. para baixo vs. independência', () => {
    const legs = [cand({ marketOdd: 2, modelProb: 0.5 }), cand({ marketOdd: 2, modelProb: 0.5 })];
    const indep = combineLegs(legs);
    const sgm = combineSameGame(legs);
    expect(sgm.combinedProb).toBeLessThan(indep.combinedProb); // honestidade da correlação
  });

  it('usa a odd final da Betano quando fornecida (verdade do mercado)', () => {
    const legs = [cand({ marketOdd: 2, modelProb: 0.5 }), cand({ marketOdd: 3, modelProb: 0.4 })];
    const sgm = combineSameGame(legs, 4.5); // Betano deu 4.5 (não os 6.0 do produto)
    expect(sgm.combinedOdd).toBe(4.5);
  });

  it('buildSameGameMultiple marca sameGame e exige selo no card', () => {
    const legs = [
      cand({ fixtureId: 7, market: 'corners', selection: 'Mais de 9.5', marketOdd: 1.9, modelProb: 0.55 }),
      cand({ fixtureId: 7, market: 'cards', selection: 'Mais de 4.5', marketOdd: 2.1, modelProb: 0.5 }),
    ];
    const plan = buildSameGameMultiple(legs, { betanoFinalOdd: 3.6 });
    expect(plan.reasonCode).toBe('sgm');
    expect(plan.sameGame).toBe(true);
    expect(plan.usedBetanoOdd).toBe(true);
    const card = composeCard(plan, { authLevel: 1, bankroll: 50 });
    expect(card.needsSeal).toBe(true); // SGM sempre pede selo
    expect(card.seal).toBeTruthy();
  });
});

describe('slip-analyzer (orquestração multi-mercado a partir do print)', () => {
  it('parseOverUnder lê lado e linha em pt-BR e inglês', () => {
    expect(parseOverUnder('Mais de 9.5')).toEqual({ side: 'over', line: 9.5 });
    expect(parseOverUnder('Menos de 2.5 gols')).toEqual({ side: 'under', line: 2.5 });
    expect(parseOverUnder('Over 24.5')).toEqual({ side: 'over', line: 24.5 });
    expect(parseOverUnder('Vencedor: Flamengo')).toBeNull();
  });

  it('gera candidatos de escanteios/cartões com EV a partir de médias reais', () => {
    const slip = {
      homeTeam: 'Flamengo', awayTeam: 'Vasco', league: 'Brasileirão',
      markets: [
        { market: 'corners', selection: 'Mais de 9.5', odd: 1.9 },
        { market: 'corners', selection: 'Menos de 9.5', odd: 1.9 },
        { market: 'cards', selection: 'Mais de 4.5', odd: 2.2 },
        { market: 'h2h', selection: 'Flamengo', odd: 1.7 }, // ignorado (vai no pipeline de gols)
      ],
      confidence: 0.9,
    };
    const avgs = { corners: 6, cards: 2.5, shots: 13, fouls: 14, games: 5 };
    const cands = analyzeExtractedSlip({
      slip, fixtureId: 1, homeAvgs: avgs, awayAvgs: avgs,
      context: { goals: 1, corners: 1, cards: 1, shots: 1, fouls: 1 },
    });
    // só mercados estatísticos modeláveis (corners x2 + cards x1), h2h fica de fora
    expect(cands.length).toBe(3);
    expect(cands.every((c) => ['corners', 'cards'].includes(c.market))).toBe(true);
    expect(cands.every((c) => c.modelProb > 0 && c.modelProb < 1)).toBe(true);
  });

  it('multiplicador de contexto > 1 aumenta a prob. de over de cartões', () => {
    const slip = {
      homeTeam: 'A', awayTeam: 'B',
      markets: [{ market: 'cards', selection: 'Mais de 4.5', odd: 2.0 }],
      confidence: 0.9,
    };
    const avgs = { corners: 5, cards: 2.5, shots: 12, fouls: 13, games: 5 };
    const neutro = analyzeExtractedSlip({ slip, fixtureId: 1, homeAvgs: avgs, awayAvgs: avgs, context: { goals: 1, corners: 1, cards: 1, shots: 1, fouls: 1 } });
    const decisivo = analyzeExtractedSlip({ slip, fixtureId: 1, homeAvgs: avgs, awayAvgs: avgs, context: { goals: 1, corners: 1, cards: 1.18, shots: 1, fouls: 1 } });
    expect(decisivo[0].modelProb).toBeGreaterThan(neutro[0].modelProb);
  });
});
