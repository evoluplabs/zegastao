// Cloud Functions do Zé Apostador 2.0.
// Callables: zeMandate, zeCycle, zeRecalcCard, zeFeedback.
// Agendadas:  zeScan (busca oportunidades), zeLearnNightly (recalibra o modelo).
// Mantém a feature flag ZE_APOSTADOR_ENABLED e os guard-rails de jogo responsável.

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import { findFixturesForObjective, getSportKey, FixtureSummary } from '../services/betting/fixtures-finder';
import { analyzeFixture, getCachedOdds } from '../services/betting/pipeline';
import { buildRound, Candidate, RiskLevel } from '../services/betting/engine/multiples';
import { composeCard, recalcOnRealOdd } from '../services/betting/card';
import { cycleStake } from '../services/betting/kelly';
import {
  getGlobalModel, getIndividual, saveGlobalModel, saveIndividual,
  applyResultToCalibration, applyResultToIndividual, GlobalModel,
} from '../services/betting/learning';

const ZE_ENABLED = process.env.ZE_APOSTADOR_ENABLED === 'true';
const REGION = 'southamerica-east1';
const BLOCKED_PHASES = ['survival', 'reorganizing'];

function ensureEnabled() {
  if (!ZE_ENABLED) throw new HttpsError('not-found', 'Zé Apostador ainda não está disponível.');
}
function uid(request: CallableRequest): string {
  const u = request.auth?.uid;
  if (!u) throw new HttpsError('unauthenticated', 'Não autenticado');
  return u;
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Tipos persistidos ----------

interface Mandate {
  cycleBudget: number;
  growthTargetPct: number;
  stopLossPct: number;
  preferredLeagues: string[];
  preferredTeams: string[];
  blockedTeams: string[];
  maxAutoRiskLevel: RiskLevel;
  preauthorizedScope: { maxStakePerCycle: number; allowMultiples: boolean };
  acceptedRiskDisclaimer: boolean;
  selfExclusionUntil?: Timestamp;
  activeCycleId?: string;
}

interface Cycle {
  id: string;
  status: 'planning' | 'awaiting_games' | 'placed' | 'settling' | 'won' | 'lost' | 'aborted';
  budget: number;
  growthTargetPct: number;
  stopLossPct: number;
  currentBankroll: number;
  riskLevel: RiskLevel;
  startedAt: Timestamp;
  closedAt?: Timestamp;
}

// ---------- Guards de jogo responsável ----------

async function guardResponsible(db: Firestore, userId: string): Promise<Mandate> {
  const insights = await db.collection('users').doc(userId).collection('insights').doc('latest').get();
  const phase = insights.exists ? (insights.data()?.phase as string | undefined) : undefined;
  if (phase && BLOCKED_PHASES.includes(phase)) {
    throw new HttpsError('permission-denied', 'O Zé Apostador fica disponível quando suas finanças estabilizarem. Tamo junto nessa jornada!');
  }
  const mref = db.collection('users').doc(userId).collection('betting_mandate').doc('main');
  const msnap = await mref.get();
  if (!msnap.exists || !msnap.data()?.acceptedRiskDisclaimer) {
    throw new HttpsError('failed-precondition', 'Configure seu mandato de apostas antes de continuar.');
  }
  const mandate = msnap.data() as Mandate;
  if (mandate.selfExclusionUntil && mandate.selfExclusionUntil.toDate() > new Date()) {
    throw new HttpsError('permission-denied', `Você está em pausa voluntária até ${mandate.selfExclusionUntil.toDate().toLocaleDateString('pt-BR')}.`);
  }
  return mandate;
}

// ---------- Helper compartilhado: monta uma rodada para o ciclo ----------

async function buildRoundForCycle(
  db: Firestore, userId: string, mandate: Mandate, cycle: Cycle,
  opts: { date?: string; riskLevel?: RiskLevel; targetMultiplier?: number },
) {
  const date = opts.date || today();
  const riskLevel: RiskLevel = (opts.riskLevel ?? cycle.riskLevel ?? mandate.maxAutoRiskLevel ?? 0) as RiskLevel;
  const sportKeys = mandate.preferredLeagues?.length ? mandate.preferredLeagues : ['soccer_fifa_world_cup'];

  let fixtures = await findFixturesForObjective(sportKeys, date, mandate.preferredTeams);
  const blocked = (mandate.blockedTeams || []).map((t) => t.toLowerCase());
  if (blocked.length) {
    fixtures = fixtures.filter((f) =>
      !blocked.some((b) => f.homeTeam.toLowerCase().includes(b) || f.awayTeam.toLowerCase().includes(b)));
  }
  if (fixtures.length === 0) {
    return { roundId: null as string | null, card: composeSkip(riskLevel), empty: true };
  }

  const [model, individual] = await Promise.all([getGlobalModel(db), getIndividual(db, userId)]);

  // Odds por liga (cacheadas)
  const uniqueSports = [...new Set(fixtures.map((f) => getSportKey(f.leagueId) || sportKeys[0]))];
  const oddsBySport: Record<string, Awaited<ReturnType<typeof getCachedOdds>>> = {};
  await Promise.all(uniqueSports.map(async (sk) => { oddsBySport[sk] = await getCachedOdds(db, sk, date); }));

  const allCands: Candidate[] = [];
  for (const fx of fixtures) {
    const sk = getSportKey(fx.leagueId) || sportKeys[0];
    try {
      const cands = await analyzeFixture({ db, fixture: fx as FixtureSummary, sportKey: sk, oddsEvents: oddsBySport[sk] || [], model, individual });
      allCands.push(...cands);
    } catch {
      // pula partida que falhar
    }
  }

  const targetMultiplier = opts.targetMultiplier ?? 10;
  const plan = buildRound(allCands, { riskLevel, targetMultiplier });
  const card = composeCard(plan, { authLevel: riskLevel, bankroll: cycle.currentBankroll });

  const roundRef = db.collection('users').doc(userId).collection('betting_cycles').doc(cycle.id).collection('rounds').doc();
  await roundRef.set({
    type: plan.type,
    legs: plan.legs.map((l) => ({ ...l, userEnteredOdd: null, legOutcome: 'pending' })),
    combinedOdd: plan.combinedOdd,
    combinedProb: plan.combinedProb,
    ev: plan.ev,
    card,
    authLevel: riskLevel,
    suggestedStake: card.suggestedStake,
    placed: false,
    outcome: 'pending',
    skip: card.skip,
    reasonCode: plan.reasonCode,
    createdAt: Timestamp.now(),
  });

  return { roundId: roundRef.id, card, empty: false };
}

function composeSkip(riskLevel: RiskLevel) {
  return composeCard(
    { type: 'single', legs: [], combinedOdd: 0, combinedProb: 0, ev: -1, skip: true, reasonCode: 'no_candidates' },
    { authLevel: riskLevel, bankroll: 0 },
  );
}

// ==================== zeMandate ====================

const MandateSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('get') }),
  z.object({
    action: z.literal('save'),
    cycleBudget: z.number().min(2).max(200),
    growthTargetPct: z.number().min(5).max(500),
    stopLossPct: z.number().min(10).max(100),
    preferredLeagues: z.array(z.string()).min(1),
    preferredTeams: z.array(z.string()).optional().default([]),
    blockedTeams: z.array(z.string()).optional().default([]),
    maxAutoRiskLevel: z.number().int().min(0).max(3),
    allowMultiples: z.boolean().optional().default(true),
    acceptedRiskDisclaimer: z.literal(true),
  }),
  z.object({ action: z.literal('self_exclude'), days: z.number().int().min(1).max(365).optional().default(7) }),
]);

export const zeMandate = onCall({ region: REGION }, async (request) => {
  ensureEnabled();
  const userId = uid(request);
  const parsed = MandateSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message || 'Dados inválidos');
  const db = getFirestore();
  const mref = db.collection('users').doc(userId).collection('betting_mandate').doc('main');

  if (parsed.data.action === 'get') {
    const snap = await mref.get();
    return { mandate: snap.exists ? snap.data() : null };
  }

  if (parsed.data.action === 'save') {
    const d = parsed.data;
    const mandate: Mandate = {
      cycleBudget: d.cycleBudget,
      growthTargetPct: d.growthTargetPct,
      stopLossPct: d.stopLossPct,
      preferredLeagues: d.preferredLeagues,
      preferredTeams: d.preferredTeams,
      blockedTeams: d.blockedTeams,
      maxAutoRiskLevel: d.maxAutoRiskLevel as RiskLevel,
      preauthorizedScope: { maxStakePerCycle: d.cycleBudget, allowMultiples: d.allowMultiples },
      acceptedRiskDisclaimer: true,
    };
    await mref.set(mandate, { merge: true });
    return { success: true };
  }

  // self_exclude
  const until = new Date();
  until.setDate(until.getDate() + parsed.data.days);
  await mref.set({ selfExclusionUntil: Timestamp.fromDate(until) }, { merge: true });
  return { success: true, until: until.toISOString() };
});

// ==================== zeCycle ====================

const CycleSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('get') }),
  z.object({ action: z.literal('start'), riskLevel: z.number().int().min(0).max(3).optional() }),
  z.object({
    action: z.literal('build'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    riskLevel: z.number().int().min(0).max(3).optional(),
    targetMultiplier: z.number().min(1.1).max(1000).optional(),
  }),
  z.object({ action: z.literal('abort') }),
]);

export const zeCycle = onCall({ region: REGION, timeoutSeconds: 120 }, async (request) => {
  ensureEnabled();
  const userId = uid(request);
  const parsed = CycleSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message || 'Dados inválidos');
  const db = getFirestore();
  const mandate = await guardResponsible(db, userId);
  const cyclesCol = db.collection('users').doc(userId).collection('betting_cycles');

  async function activeCycle(): Promise<Cycle | null> {
    if (!mandate.activeCycleId) return null;
    const snap = await cyclesCol.doc(mandate.activeCycleId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as Omit<Cycle, 'id'>) };
  }

  if (parsed.data.action === 'start') {
    const existing = await activeCycle();
    if (existing && ['planning', 'awaiting_games', 'placed', 'settling'].includes(existing.status)) {
      throw new HttpsError('failed-precondition', 'Você já tem um ciclo em andamento.');
    }
    const riskLevel = (parsed.data.riskLevel ?? mandate.maxAutoRiskLevel ?? 0) as RiskLevel;
    const ref = cyclesCol.doc();
    const cycle: Omit<Cycle, 'id'> = {
      status: 'planning',
      budget: mandate.cycleBudget,
      growthTargetPct: mandate.growthTargetPct,
      stopLossPct: mandate.stopLossPct,
      currentBankroll: mandate.cycleBudget,
      riskLevel,
      startedAt: Timestamp.now(),
    };
    await ref.set(cycle);
    await db.collection('users').doc(userId).collection('betting_mandate').doc('main').set({ activeCycleId: ref.id }, { merge: true });
    return { cycleId: ref.id, cycle: { id: ref.id, ...cycle } };
  }

  if (parsed.data.action === 'get') {
    const cycle = await activeCycle();
    if (!cycle) return { cycle: null, rounds: [] };
    const roundsSnap = await cyclesCol.doc(cycle.id).collection('rounds').orderBy('createdAt', 'desc').limit(20).get();
    return { cycle, rounds: roundsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) };
  }

  if (parsed.data.action === 'abort') {
    const cycle = await activeCycle();
    if (cycle) {
      await cyclesCol.doc(cycle.id).set({ status: 'aborted', closedAt: Timestamp.now() }, { merge: true });
      await db.collection('users').doc(userId).collection('betting_mandate').doc('main').set({ activeCycleId: null }, { merge: true });
    }
    return { success: true };
  }

  // build
  const cycle = await activeCycle();
  if (!cycle) throw new HttpsError('failed-precondition', 'Comece um ciclo antes de buscar apostas.');
  if (['won', 'lost', 'aborted'].includes(cycle.status)) throw new HttpsError('failed-precondition', 'Este ciclo já foi encerrado.');

  const result = await buildRoundForCycle(db, userId, mandate, cycle, {
    date: parsed.data.date,
    riskLevel: parsed.data.riskLevel as RiskLevel | undefined,
    targetMultiplier: parsed.data.targetMultiplier,
  });
  if (cycle.status === 'planning') {
    await cyclesCol.doc(cycle.id).set({ status: 'awaiting_games' }, { merge: true });
  }
  return result;
});

// ==================== zeRecalcCard ====================

const RecalcSchema = z.object({
  cycleId: z.string(),
  roundId: z.string(),
  legOdds: z.array(z.object({ fixtureId: z.number(), market: z.string(), odd: z.number().positive() })).min(1),
});

export const zeRecalcCard = onCall({ region: REGION }, async (request) => {
  ensureEnabled();
  const userId = uid(request);
  const parsed = RecalcSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message || 'Dados inválidos');
  const db = getFirestore();
  const { cycleId, roundId, legOdds } = parsed.data;

  const cycleSnap = await db.collection('users').doc(userId).collection('betting_cycles').doc(cycleId).get();
  if (!cycleSnap.exists) throw new HttpsError('not-found', 'Ciclo não encontrado.');
  const cycle = cycleSnap.data() as Cycle;

  const roundRef = db.collection('users').doc(userId).collection('betting_cycles').doc(cycleId).collection('rounds').doc(roundId);
  const roundSnap = await roundRef.get();
  if (!roundSnap.exists) throw new HttpsError('not-found', 'Rodada não encontrada.');
  const round = roundSnap.data() as { legs: Candidate[]; authLevel: RiskLevel; suggestedStake: number };

  const legResults = round.legs.map((leg) => {
    const entered = legOdds.find((o) => o.fixtureId === leg.fixtureId && o.market === leg.market);
    if (!entered) return { fixtureId: leg.fixtureId, market: leg.market, status: 'green' as const, message: '', userOdd: leg.marketOdd };
    const r = recalcOnRealOdd({
      modelProb: leg.modelProb, recommendedOdd: leg.marketOdd, userOdd: entered.odd,
      bankroll: cycle.currentBankroll, riskLevel: round.authLevel, oldStake: round.suggestedStake,
    });
    return { fixtureId: leg.fixtureId, market: leg.market, status: r.status, message: r.message, userOdd: entered.odd, hasValue: r.hasValue };
  });

  // Recombina com as odds reais
  const combinedOdd = round.legs.reduce((acc, leg) => {
    const e = legOdds.find((o) => o.fixtureId === leg.fixtureId && o.market === leg.market);
    return acc * (e ? e.odd : leg.marketOdd);
  }, 1);
  const combinedProb = round.legs.reduce((acc, leg) => acc * leg.modelProb, 1);
  const newStake = cycleStake({ probability: combinedProb, odd: combinedOdd, bankroll: cycle.currentBankroll, riskLevel: round.authLevel });
  const lostValue = legResults.some((r) => r.status === 'lost');

  // Persiste as odds informadas (vira dado de aprendizado)
  await roundRef.set({
    legs: round.legs.map((leg) => {
      const e = legOdds.find((o) => o.fixtureId === leg.fixtureId && o.market === leg.market);
      return { ...leg, userEnteredOdd: e ? e.odd : null, legOutcome: 'pending' };
    }),
    userCombinedOdd: parseFloat(combinedOdd.toFixed(2)),
  }, { merge: true });

  return {
    legResults,
    combinedOdd: parseFloat(combinedOdd.toFixed(2)),
    newStake,
    lostValue,
    potentialReturn: parseFloat((newStake * (combinedOdd - 1)).toFixed(2)),
  };
});

// ==================== zeFeedback ====================

const FeedbackSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('placed'), cycleId: z.string(), roundId: z.string(), stake: z.number().positive().max(1000) }),
  z.object({
    action: z.literal('result'), cycleId: z.string(), roundId: z.string(),
    outcome: z.enum(['won', 'lost']), payout: z.number().min(0).optional().default(0),
  }),
]);

export const zeFeedback = onCall({ region: REGION }, async (request) => {
  ensureEnabled();
  const userId = uid(request);
  const parsed = FeedbackSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message || 'Dados inválidos');
  const db = getFirestore();
  const { cycleId, roundId } = parsed.data;
  const cycleRef = db.collection('users').doc(userId).collection('betting_cycles').doc(cycleId);
  const roundRef = cycleRef.collection('rounds').doc(roundId);

  const [cycleSnap, roundSnap] = await Promise.all([cycleRef.get(), roundRef.get()]);
  if (!cycleSnap.exists || !roundSnap.exists) throw new HttpsError('not-found', 'Ciclo ou rodada não encontrados.');
  const cycle = cycleSnap.data() as Cycle;
  const round = roundSnap.data() as { legs: Candidate[]; type: string; combinedOdd: number; placed: boolean; stake?: number };

  if (parsed.data.action === 'placed') {
    const stake = parsed.data.stake;
    await roundRef.set({ placed: true, placedAt: Timestamp.now(), stake }, { merge: true });
    await cycleRef.set({ status: 'placed', currentBankroll: round2(cycle.currentBankroll - stake) }, { merge: true });
    return { success: true, bankroll: round2(cycle.currentBankroll - stake) };
  }

  // result
  const { outcome, payout } = parsed.data;
  const realizedReturn = outcome === 'won' ? payout : 0;
  let bankroll = round2(cycle.currentBankroll + realizedReturn);

  // Registra feedback (dado de treino) e atualiza aprendizado para apostas simples
  const fbRef = db.collection('users').doc(userId).collection('betting_feedback').doc();
  await fbRef.set({
    cycleId, roundId, type: round.type, outcome, payout: realizedReturn,
    legs: round.legs.map((l) => ({ market: l.market, selection: l.selection, modelProb: l.modelProb, fixtureId: l.fixtureId, homeTeamId: 0, awayTeamId: 0 })),
    createdAt: Timestamp.now(),
  });

  if (round.type === 'single' && round.legs[0]) {
    const leg = round.legs[0];
    const hit = outcome === 'won';
    const [model, individual] = await Promise.all([getGlobalModel(db), getIndividual(db, userId)]);
    applyResultToCalibration(model, leg.market, leg.modelProb, hit);
    applyResultToIndividual(individual, leg.market, hit);
    await Promise.all([saveGlobalModel(db, model), saveIndividual(db, userId, individual)]);
  }

  await roundRef.set({ outcome, payout: realizedReturn, settledAt: Timestamp.now(), legs: round.legs.map((l) => ({ ...l, legOutcome: outcome === 'won' ? 'hit' : 'miss' })) }, { merge: true });

  // Estado do ciclo: meta batida, stop-loss ou continua
  const target = cycle.budget * (1 + cycle.growthTargetPct / 100);
  const floor = cycle.budget * (1 - cycle.stopLossPct / 100);
  let status: Cycle['status'] = 'awaiting_games';
  if (bankroll >= target) status = 'won';
  else if (bankroll <= floor) status = 'lost';

  const patch: Partial<Cycle> = { currentBankroll: bankroll, status };
  if (status === 'won' || status === 'lost') {
    patch.closedAt = Timestamp.now();
    await db.collection('users').doc(userId).collection('betting_mandate').doc('main').set({ activeCycleId: null }, { merge: true });
  }
  await cycleRef.set(patch, { merge: true });

  return { success: true, bankroll, cycleStatus: status };
});

// ==================== zeScan (agendada) ====================

export const zeScan = onSchedule(
  { schedule: '0 11,17 * * *', timeZone: 'America/Sao_Paulo', region: REGION, memory: '512MiB', timeoutSeconds: 300 },
  async () => {
    if (!ZE_ENABLED) return;
    const db = getFirestore();
    // Beta pequeno: percorre os mandatos com ciclo ativo inline
    const mandatesSnap = await db.collectionGroup('betting_mandate').get();
    for (const mdoc of mandatesSnap.docs) {
      const mandate = mdoc.data() as Mandate;
      if (!mandate.activeCycleId || !mandate.acceptedRiskDisclaimer) continue;
      if (mandate.selfExclusionUntil && mandate.selfExclusionUntil.toDate() > new Date()) continue;
      const userId = mdoc.ref.parent.parent?.id;
      if (!userId) continue;
      try {
        const cycleSnap = await db.collection('users').doc(userId).collection('betting_cycles').doc(mandate.activeCycleId).get();
        if (!cycleSnap.exists) continue;
        const cycle: Cycle = { id: cycleSnap.id, ...(cycleSnap.data() as Omit<Cycle, 'id'>) };
        if (!['planning', 'awaiting_games'].includes(cycle.status)) continue;
        const { card, empty } = await buildRoundForCycle(db, userId, mandate, cycle, {});
        if (!empty && !card.skip) {
          await sendPush(db, userId, 'O Zé achou uma aposta pro seu ciclo 👀', card.type === 'multiple'
            ? `Múltipla @${card.combinedOdd} montada. Confere no app!`
            : `${card.legs[0]?.selection} @${card.combinedOdd}. Confere no app!`);
        }
      } catch {
        // segue para o próximo usuário
      }
    }
  },
);

// ==================== zeLearnNightly (agendada) ====================

export const zeLearnNightly = onSchedule(
  { schedule: '30 3 * * *', timeZone: 'America/Sao_Paulo', region: REGION, memory: '512MiB', timeoutSeconds: 300 },
  async () => {
    if (!ZE_ENABLED) return;
    const db = getFirestore();
    // Recalibra o modelo coletivo do zero a partir de todo o feedback (beta pequeno)
    const model: GlobalModel = { ratings: {}, calibration: {} };
    const fbSnap = await db.collectionGroup('betting_feedback').get();
    for (const doc of fbSnap.docs) {
      const fb = doc.data() as { type: string; outcome: string; legs: Array<{ market: string; modelProb: number }> };
      if (fb.type !== 'single' || !fb.legs?.[0]) continue;
      applyResultToCalibration(model, fb.legs[0].market, fb.legs[0].modelProb, fb.outcome === 'won');
    }
    await saveGlobalModel(db, model);
    console.log(`zeLearnNightly: recalibrado com ${fbSnap.size} feedbacks`);
  },
);

// ---------- utils ----------

async function sendPush(db: Firestore, userId: string, title: string, body: string): Promise<void> {
  try {
    const tokenSnap = await db.collection('users').doc(userId).collection('fcm_tokens').doc('main').get();
    const token = tokenSnap.exists ? (tokenSnap.data()?.token as string | undefined) : undefined;
    if (!token) return;
    const { getMessaging } = await import('firebase-admin/messaging');
    await getMessaging().send({ token, notification: { title, body } });
  } catch {
    // notificação é opcional
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
