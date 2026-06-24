// Motor de aprendizado em 2 níveis.
//  • Individual (users/{uid}/betting_learning/individual): em quais mercados ESTE
//    usuário + o Zé acertam mais → ajusta o ranking de candidatos para ele.
//  • Coletivo (betting_learning_global/model): ratings de força dos times (Elo) e
//    calibração por mercado (corrige viés do modelo), agregados de forma anônima.
//
// Cold-start: sem dados, tudo cai no neutro (rating 1500, fator 1.0) e o sistema
// roda 100% pela matemática. Conforme o feedback chega, calibra.

import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { DEFAULT_RATING, expectedScore, updateRating } from './engine/elo';

// ---------- Modelo coletivo ----------

export interface MarketCalibration {
  n: number;            // apostas avaliadas
  hits: number;         // acertos
  predictedSum: number; // soma das probabilidades previstas
  factor: number;       // multiplicador de correção aplicado ao modelProb
}

export interface GlobalModel {
  ratings: Record<string, number>;              // teamId → rating
  calibration: Record<string, MarketCalibration>; // market → calibração
  updatedAt?: Timestamp;
}

const GLOBAL_REF = ['betting_learning_global', 'model'] as const;

export async function getGlobalModel(db: Firestore): Promise<GlobalModel> {
  try {
    const snap = await db.collection(GLOBAL_REF[0]).doc(GLOBAL_REF[1]).get();
    if (snap.exists) {
      const d = snap.data() as Partial<GlobalModel>;
      return { ratings: d.ratings ?? {}, calibration: d.calibration ?? {} };
    }
  } catch {
    // sem modelo → neutro
  }
  return { ratings: {}, calibration: {} };
}

export async function saveGlobalModel(db: Firestore, model: GlobalModel): Promise<void> {
  await db.collection(GLOBAL_REF[0]).doc(GLOBAL_REF[1]).set({
    ratings: model.ratings,
    calibration: model.calibration,
    updatedAt: Timestamp.now(),
  });
}

export function ratingOf(model: GlobalModel, teamId: number | string): number {
  return model.ratings[String(teamId)] ?? DEFAULT_RATING;
}

/** Aplica a calibração coletiva a uma probabilidade do modelo para um mercado. */
export function calibratedProb(model: GlobalModel, market: string, prob: number): number {
  const c = model.calibration[market];
  const factor = c && c.n >= 10 ? c.factor : 1;
  return clamp(prob * factor, 0.0001, 0.9999);
}

/** Atualiza ratings Elo dos dois times a partir de um resultado real (1X2). */
export function applyResultToRatings(
  model: GlobalModel,
  homeTeamId: number,
  awayTeamId: number,
  outcome: 'home' | 'draw' | 'away',
  k = 20,
): void {
  const rh = ratingOf(model, homeTeamId);
  const ra = ratingOf(model, awayTeamId);
  const expHome = expectedScore(rh, ra);
  const actualHome = outcome === 'home' ? 1 : outcome === 'draw' ? 0.5 : 0;
  model.ratings[String(homeTeamId)] = updateRating(rh, expHome, actualHome, k);
  model.ratings[String(awayTeamId)] = updateRating(ra, 1 - expHome, 1 - actualHome, k);
}

/** Atualiza a calibração de um mercado com um resultado de aposta. */
export function applyResultToCalibration(
  model: GlobalModel,
  market: string,
  predictedProb: number,
  hit: boolean,
): void {
  const c = model.calibration[market] ?? { n: 0, hits: 0, predictedSum: 0, factor: 1 };
  c.n += 1;
  c.hits += hit ? 1 : 0;
  c.predictedSum += predictedProb;
  // fator = taxa real de acerto / probabilidade média prevista (corrige viés)
  const realRate = c.hits / c.n;
  const avgPredicted = c.predictedSum / c.n;
  c.factor = avgPredicted > 0 ? clamp(realRate / avgPredicted, 0.5, 1.5) : 1;
  model.calibration[market] = c;
}

// ---------- Modelo individual ----------

export interface IndividualMarketStat {
  n: number;
  hits: number;
  hitRate: number;
}

export interface IndividualModel {
  byMarket: Record<string, IndividualMarketStat>;
  updatedAt?: Timestamp;
}

export async function getIndividual(db: Firestore, userId: string): Promise<IndividualModel> {
  try {
    const snap = await db.collection('users').doc(userId)
      .collection('betting_learning').doc('individual').get();
    if (snap.exists) {
      const d = snap.data() as Partial<IndividualModel>;
      return { byMarket: d.byMarket ?? {} };
    }
  } catch {
    // neutro
  }
  return { byMarket: {} };
}

export async function saveIndividual(db: Firestore, userId: string, model: IndividualModel): Promise<void> {
  await db.collection('users').doc(userId)
    .collection('betting_learning').doc('individual')
    .set({ byMarket: model.byMarket, updatedAt: Timestamp.now() });
}

export function applyResultToIndividual(model: IndividualModel, market: string, hit: boolean): void {
  const s = model.byMarket[market] ?? { n: 0, hits: 0, hitRate: 0 };
  s.n += 1;
  s.hits += hit ? 1 : 0;
  s.hitRate = Math.round((s.hits / s.n) * 100);
  model.byMarket[market] = s;
}

/**
 * Multiplicador leve de ranking para um mercado, baseado no desempenho pessoal.
 * Acima de 55% de acerto sobe; abaixo de 45% desce. Faixa [0.9, 1.1].
 */
export function individualMultiplier(model: IndividualModel, market: string): number {
  const s = model.byMarket[market];
  if (!s || s.n < 5) return 1;
  const rate = s.hits / s.n;
  return clamp(1 + (rate - 0.5) * 0.4, 0.9, 1.1);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
