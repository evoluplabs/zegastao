// Composer do card guiado + recálculo dinâmico ao informar a odd real da Betano.
// Junta o RoundPlan (motor) com os templates (voz do Zé). Determinístico.

import { RoundPlan, RiskLevel } from './engine/multiples';
import { cycleStake } from './kelly';
import {
  marketLabel, legSteps, multipleSteps, roundReasoning,
  understandingSeal, recalcMessage, RecalcStatus,
} from './templates';

export interface GuidedCardLeg {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  market: string;
  marketLabel: string;
  selection: string;
  modelProbPct: number;
  recommendedOdd: number; // odd que encontramos
  minOdd: number;         // piso: abaixo disso não vale
  fairOdd: number;
  steps: string[];
}

export interface GuidedCard {
  type: 'single' | 'multiple';
  legs: GuidedCardLeg[];
  combinedOdd: number;
  combinedProbPct: number;
  evPct: number;
  authLevel: RiskLevel;
  needsSeal: boolean;
  seal?: string;
  reasoning: string;
  steps: string[];
  suggestedStake: number;
  potentialReturn: number; // lucro líquido potencial
  skip: boolean;
}

export function composeCard(plan: RoundPlan, opts: { authLevel: RiskLevel; bankroll: number }): GuidedCard {
  if (plan.skip || plan.legs.length === 0) {
    return {
      type: 'single', legs: [], combinedOdd: 0, combinedProbPct: 0, evPct: 0,
      authLevel: opts.authLevel, needsSeal: false, reasoning: roundReasoning(plan),
      steps: [], suggestedStake: 0, potentialReturn: 0, skip: true,
    };
  }

  const stake = cycleStake({
    probability: plan.combinedProb,
    odd: plan.combinedOdd,
    bankroll: opts.bankroll,
    riskLevel: opts.authLevel,
  });
  const potentialReturn = round2(stake * (plan.combinedOdd - 1));

  const legs: GuidedCardLeg[] = plan.legs.map((l) => {
    const minOdd = round2(Math.min(l.fairOdd, l.marketOdd));
    return {
      fixtureId: l.fixtureId,
      homeTeam: l.homeTeam,
      awayTeam: l.awayTeam,
      league: l.league,
      kickoff: l.kickoff,
      market: l.market,
      marketLabel: marketLabel(l.market),
      selection: l.selection,
      modelProbPct: Math.round(l.modelProb * 100),
      recommendedOdd: l.marketOdd,
      minOdd,
      fairOdd: l.fairOdd,
      steps: legSteps(l.homeTeam, l.awayTeam, l.market, l.selection, minOdd),
    };
  });

  const needsSeal = opts.authLevel === 2;

  return {
    type: plan.type,
    legs,
    combinedOdd: plan.combinedOdd,
    combinedProbPct: Math.round(plan.combinedProb * 100),
    evPct: round2(plan.ev * 100),
    authLevel: opts.authLevel,
    needsSeal,
    seal: needsSeal ? understandingSeal(plan.combinedProb, potentialReturn, stake) : undefined,
    reasoning: roundReasoning(plan),
    steps: plan.type === 'multiple' ? multipleSteps(legs.length) : legs[0].steps,
    suggestedStake: stake,
    potentialReturn,
    skip: false,
  };
}

// ---- Recálculo dinâmico (uma seleção / odd) ----

export interface RecalcResult {
  status: RecalcStatus;
  message: string;
  newStake: number;
  hasValue: boolean;
}

export function recalcOnRealOdd(params: {
  modelProb: number;
  recommendedOdd: number;
  userOdd: number;
  bankroll: number;
  riskLevel: RiskLevel;
  oldStake: number;
}): RecalcResult {
  const { modelProb, recommendedOdd, userOdd, bankroll, riskLevel, oldStake } = params;
  const fairOdd = modelProb > 0 ? 1 / modelProb : Infinity;

  const newStake = cycleStake({ probability: modelProb, odd: userOdd, bankroll, riskLevel });

  // Moonshot (nível 2): sempre -EV; compara só com a odd recomendada
  if (riskLevel === 2) {
    if (userOdd >= recommendedOdd) {
      const status: RecalcStatus = userOdd > recommendedOdd * 1.03 ? 'up' : 'green';
      return { status, message: recalcMessage(status, { oldStake, newStake }), newStake, hasValue: false };
    }
    if (userOdd >= recommendedOdd * 0.8) {
      return { status: 'down', message: recalcMessage('down', { oldStake, newStake }), newStake, hasValue: false };
    }
    return { status: 'lost', message: recalcMessage('lost', {}), newStake: 0, hasValue: false };
  }

  // Apostas de valor (níveis 0/1)
  if (userOdd >= recommendedOdd) {
    const status: RecalcStatus = userOdd > recommendedOdd * 1.03 ? 'up' : 'green';
    return { status, message: recalcMessage(status, { oldStake, newStake }), newStake, hasValue: true };
  }
  if (userOdd > fairOdd) {
    return { status: 'down', message: recalcMessage('down', { oldStake, newStake }), newStake, hasValue: true };
  }
  return { status: 'lost', message: recalcMessage('lost', {}), newStake: 0, hasValue: false };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
