// CycleBuilder: monta rodadas (simples ou múltiplas) a partir dos candidatos
// avaliados, respeitando o nível de risco do usuário. É aqui que a alavancagem
// acontece — sempre com o EV real calculado e exposto (a honestidade é da
// camada de template; aqui só os números).

export interface Candidate {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  market: string;      // chave de máquina: 'h2h' | 'totals' | 'btts'
  selection: string;   // exibição: 'Brasil', 'Over 2.5', 'Sim'
  modelProb: number;   // 0-1, do motor (NUNCA de IA)
  marketOdd: number;
  fairOdd: number;
  ev: number;          // por R$1
}

export interface CombinedResult {
  combinedOdd: number;
  combinedProb: number;
  ev: number;
}

/** Combina pernas assumindo independência (aproximação padrão de mercado). */
export function combineLegs(legs: Candidate[]): CombinedResult {
  if (legs.length === 0) return { combinedOdd: 0, combinedProb: 0, ev: -1 };
  const combinedOdd = legs.reduce((acc, l) => acc * l.marketOdd, 1);
  const combinedProb = legs.reduce((acc, l) => acc * l.modelProb, 1);
  return {
    combinedOdd: round2(combinedOdd),
    combinedProb: round4(combinedProb),
    ev: round4(combinedProb * combinedOdd - 1),
  };
}

export type RiskLevel = 0 | 1 | 2 | 3;

export interface RoundPlan {
  type: 'single' | 'multiple';
  legs: Candidate[];
  combinedOdd: number;
  combinedProb: number;
  ev: number;
  skip: boolean;
  reasonCode:
    | 'value_single'
    | 'value_multiple'
    | 'moonshot'
    | 'moonshot_capped'
    | 'no_candidates';
}

const MAX_LEGS: Record<number, number> = { 0: 1, 1: 3, 2: 6, 3: 3 };

/** Mantém só a melhor perna (maior EV) por partida. */
function dedupeByFixture(cands: Candidate[]): Candidate[] {
  const best = new Map<number, Candidate>();
  for (const c of cands) {
    const cur = best.get(c.fixtureId);
    if (!cur || c.ev > cur.ev) best.set(c.fixtureId, c);
  }
  return [...best.values()];
}

export function buildRound(
  candidates: Candidate[],
  opts: { riskLevel: RiskLevel; targetMultiplier?: number; maxLegs?: number },
): RoundPlan {
  // Nível 3 (pré-autorizado) usa a magnitude moderada por padrão
  const level = opts.riskLevel === 3 ? 1 : opts.riskLevel;
  const maxLegs = opts.maxLegs ?? MAX_LEGS[level];
  const pool = dedupeByFixture(candidates);
  const valueCands = pool.filter((c) => c.ev > 0).sort((a, b) => b.ev - a.ev);

  if (pool.length === 0) {
    return emptyPlan('no_candidates');
  }

  // ----- Nível 0: conservador — aposta simples de maior valor -----
  if (level === 0) {
    if (valueCands.length === 0) return emptyPlan('no_candidates');
    return finalize([valueCands[0]], 'value_single');
  }

  // ----- Nível 1: moderado — múltipla curta só com valor -----
  if (level === 1) {
    const legs = valueCands.slice(0, maxLegs);
    if (legs.length === 0) return emptyPlan('no_candidates');
    return finalize(legs, legs.length > 1 ? 'value_multiple' : 'value_single');
  }

  // ----- Nível 2: moonshot — alcança o alvo, aceitando EV negativo -----
  const target = opts.targetMultiplier && opts.targetMultiplier > 1 ? opts.targetMultiplier : 10;
  const legs: Candidate[] = [];

  // 1) Entram primeiro as pernas com valor
  for (const c of valueCands) {
    if (legs.length >= maxLegs) break;
    legs.push(c);
    if (combineLegs(legs).combinedOdd >= target) {
      return finalize(legs, 'moonshot');
    }
  }

  // 2) Para subir até o alvo, adiciona as maiores odds restantes (neutras/negativas)
  const rest = pool
    .filter((c) => !legs.includes(c))
    .sort((a, b) => b.marketOdd - a.marketOdd);
  for (const c of rest) {
    if (legs.length >= maxLegs) break;
    legs.push(c);
    if (combineLegs(legs).combinedOdd >= target) {
      return finalize(legs, 'moonshot');
    }
  }

  if (legs.length === 0) return emptyPlan('no_candidates');
  // Não chegou no alvo nem com o máximo de pernas
  return finalize(legs, 'moonshot_capped');
}

function finalize(legs: Candidate[], reasonCode: RoundPlan['reasonCode']): RoundPlan {
  const combined = combineLegs(legs);
  return {
    type: legs.length > 1 ? 'multiple' : 'single',
    legs,
    combinedOdd: combined.combinedOdd,
    combinedProb: combined.combinedProb,
    ev: combined.ev,
    skip: false,
    reasonCode,
  };
}

function emptyPlan(reasonCode: RoundPlan['reasonCode']): RoundPlan {
  return { type: 'single', legs: [], combinedOdd: 0, combinedProb: 0, ev: -1, skip: true, reasonCode };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
