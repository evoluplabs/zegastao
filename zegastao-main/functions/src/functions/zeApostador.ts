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
import { runStatsAgent } from '../services/betting/stats-agent';
import { runFormAgent } from '../services/betting/form-agent';
import { runH2HAgent } from '../services/betting/h2h-agent';
import { resolveMatchContext, MatchContext } from '../services/betting/context-agent';
import { OddsEvent } from '../services/betting/sports-api';
import { buildRound, Candidate, RiskLevel } from '../services/betting/engine/multiples';
import { composeCard, recalcOnRealOdd } from '../services/betting/card';
import { cycleStake } from '../services/betting/kelly';
import {
  getGlobalModel, getIndividual, saveGlobalModel, saveIndividual,
  applyResultToCalibration, applyResultToIndividual, GlobalModel,
} from '../services/betting/learning';
import { crossOverNote, dopamineLockMessage, ouvidoriaDoFumo } from '../services/betting/templates';
import { suggestBettingBudget } from './bettingProfile';
import Anthropic from '@anthropic-ai/sdk';

const ZE_ENABLED = process.env.ZE_APOSTADOR_ENABLED === 'true';
// us-east1: o cluster do Zé Apostador roda nesta região para não competir pela
// cota de CPU (20 vCPU) de southamerica-east1, onde fica o resto do app.
const REGION = 'us-east1';
const BLOCKED_PHASES = ['survival', 'reorganizing'];

// Cross-over com o Zé Gastão: teto do stake (fração do orçamento) por fase financeira.
// As fases bloqueadas nem chegam aqui (guardResponsible barra antes).
const PHASE_STAKE_CEILING: Record<string, number> = {
  stabilizing: 0.5,   // montando reserva — cautela
  accumulating: 0.75, // já investindo — proteger progresso
  growing: 1.0,       // carteira diversificada — sem trava extra
};

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
  growthTargetAmount?: number; // meta em R$ (ex: de R$15 chegar a R$200)
  stopLossPct: number;
  preferredLeagues: string[];
  preferredTeams: string[];
  blockedTeams: string[];
  maxAutoRiskLevel: RiskLevel;
  preauthorizedScope: { maxStakePerCycle: number; allowMultiples: boolean };
  acceptedRiskDisclaimer: boolean;
  selfExclusionUntil?: Timestamp;
  activeCycleId?: string;
  dopamineLock?: boolean; // ganhou e ainda não comprovou o saque
  karma?: number;         // anti-carona (atrás de flag, liga com volume)
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

/** Lê a fase financeira do usuário (cross-over com o Zé Gastão). */
async function getPhase(db: Firestore, userId: string): Promise<string | undefined> {
  try {
    const snap = await db.collection('users').doc(userId).collection('insights').doc('latest').get();
    return snap.exists ? (snap.data()?.phase as string | undefined) : undefined;
  } catch {
    return undefined;
  }
}

/** Teto do stake (R$) pela fase financeira. Sem fase conhecida, usa 0.75 (moderado). */
function stakeCeilingFor(phase: string | undefined, budget: number): number {
  const fraction = phase && PHASE_STAKE_CEILING[phase] !== undefined ? PHASE_STAKE_CEILING[phase] : 0.75;
  return round2(budget * fraction);
}

// ---------- Fixture extraída de print da Betano ----------

interface PrintFixtureInput {
  homeTeam: string;
  awayTeam: string;
  league?: string;
  matchDate?: string; // YYYY-MM-DD: data do jogo extraída do print
  markets: Array<{ market: string; selection: string; odd: number }>;
}

// Converte null → undefined para campos opcionais (Firebase callable pode enviar null ao invés de undefined).
const n2u = (v: unknown) => (v === null ? undefined : v);

/** Converte os mercados extraídos do print em um OddsEvent sintético para o pipeline. */
function slipToOddsEvent(fix: PrintFixtureInput): OddsEvent {
  const marketMap = new Map<string, Array<{ name: string; price: number }>>();
  for (const mk of fix.markets) {
    let name = mk.selection;
    if (mk.market === 'h2h') {
      // Normaliza seleções h2h (1/X/2, Casa/Empate/Fora, etc.) para o formato
      // esperado por analyzeFixture: home_team name, 'Draw', away_team name.
      const s = name.trim().toLowerCase();
      if (s === '1' || /^casa$|^home$|^mandante$/.test(s) || s === fix.homeTeam.toLowerCase()) {
        name = fix.homeTeam;
      } else if (s === '2' || /^fora$|^away$|^visitante$/.test(s) || s === fix.awayTeam.toLowerCase()) {
        name = fix.awayTeam;
      } else if (s === 'x' || /^empate$|^draw$/.test(s)) {
        name = 'Draw';
      }
    } else if (mk.market === 'totals') {
      const s = name.toLowerCase();
      if (/mais de|over|\+/.test(s)) name = 'Over';
      else if (/menos de|under/.test(s)) name = 'Under';
    } else if (mk.market === 'btts') {
      const s = name.toLowerCase();
      if (/sim|yes/.test(s)) name = 'Yes';
      else if (/n[aã]o|no/.test(s)) name = 'No';
    }
    const list = marketMap.get(mk.market) || [];
    list.push({ name, price: mk.odd });
    marketMap.set(mk.market, list);
  }
  // Kickoff: usa a data do jogo extraída do print; se ausente, assume hoje.
  const kickoff = fix.matchDate
    ? new Date(`${fix.matchDate}T15:00:00Z`).toISOString()
    : new Date().toISOString();
  return {
    id: `print_${Date.now()}`,
    sport_key: 'soccer_fifa_world_cup',
    commence_time: kickoff,
    home_team: fix.homeTeam,
    away_team: fix.awayTeam,
    bookmakers: [{
      key: 'betano',
      title: 'Betano',
      markets: Array.from(marketMap.entries()).map(([key, outcomes]) => ({
        key,
        title: key,
        outcomes,
      })),
    }],
  };
}

// ---------- Análise qualitativa dos sub-agentes (Form + H2H + Stats) ----------

async function generateCardAnalysis(
  leg: { homeTeam: string; awayTeam: string; selection: string; marketOdd: number; modelProb: number; ev: number; league: string },
  ctx: { formSummary: string; h2hSummary: string; statsSummary: string },
): Promise<string> {
  const hasCtx = ctx.formSummary || ctx.h2hSummary || ctx.statsSummary;
  if (!hasCtx) return '';
  const modelPct = Math.round(leg.modelProb * 100);
  const evPct = Math.round(leg.ev * 100);
  const sign = evPct >= 0 ? '+' : '';
  const sections = [
    ctx.formSummary ? `FORMA RECENTE:\n${ctx.formSummary}` : '',
    ctx.h2hSummary ? `HISTÓRICO H2H:\n${ctx.h2hSummary}` : '',
    ctx.statsSummary ? `ESTATÍSTICAS:\n${ctx.statsSummary}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `Jogo: ${leg.homeTeam} x ${leg.awayTeam} (${leg.league})
Aposta escolhida: ${leg.selection} | Odd: ${leg.marketOdd.toFixed(2)} | Nossa previsão: ${modelPct}% de chance | Margem: ${sign}${evPct}%

${sections}

Explique em 2-3 parágrafos curtos (máx 180 palavras, português simples) POR QUE escolhemos essa aposta:
1. O que a forma recente e o H2H dizem sobre esse confronto
2. O principal risco que poderia invalidar a escolha
3. Uma frase final honesta

Sem jargão técnico. Fala direta com o apostador comum.`;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
    system: 'Você é o Zé Apostador: analista honesto e direto que fala com apostadores comuns em português brasileiro.',
  });
  return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
}

// ---------- Helper compartilhado: monta uma rodada para o ciclo ----------

async function buildRoundForCycle(
  db: Firestore, userId: string, mandate: Mandate, cycle: Cycle,
  opts: { date?: string; riskLevel?: RiskLevel; targetMultiplier?: number; printFixture?: PrintFixtureInput },
) {
  const date = opts.date || today();
  const riskLevel: RiskLevel = (opts.riskLevel ?? cycle.riskLevel ?? mandate.maxAutoRiskLevel ?? 0) as RiskLevel;
  const sportKeys = mandate.preferredLeagues?.length ? mandate.preferredLeagues : ['soccer_fifa_world_cup'];

  let fixtures: FixtureSummary[];
  const oddsBySport: Record<string, Awaited<ReturnType<typeof getCachedOdds>>> = {};
  let teamStats: Awaited<ReturnType<typeof runStatsAgent>> | null = null;
  let printMatchCtx: MatchContext | null = null;
  let agentFormSummary = '';
  let agentH2HSummary = '';
  let agentStatsSummary = '';

  if (opts.printFixture) {
    // Valida que o jogo ainda não foi realizado (se a data foi extraída do print).
    if (opts.printFixture.matchDate) {
      const gameDay = new Date(`${opts.printFixture.matchDate}T23:59:59Z`);
      if (gameDay < new Date()) {
        throw new HttpsError(
          'failed-precondition',
          `Este jogo (${opts.printFixture.homeTeam} x ${opts.printFixture.awayTeam}) já foi realizado em ${opts.printFixture.matchDate}. Envie o print de um jogo que ainda vai acontecer!`,
        );
      }
    }
    // Print-first: usa o jogo extraído do print, sem chamar API-Football nem Odds API.
    // Dispara 4 agentes em paralelo para enriquecer a análise Poisson e o contexto:
    // StatsAgent: priors de gols (Claude histórico p/ teamId=0, substitui 1.2/1.2).
    // FormAgent: forma recente via Claude (sem API-Football p/ seleções da Copa).
    // H2HAgent: confrontos diretos via Claude (idem).
    // MatchContext: multiplicadores de mercado (lesões, árbitro, peso do jogo via web search).
    const kickoff = opts.printFixture.matchDate
      ? new Date(`${opts.printFixture.matchDate}T15:00:00Z`).toISOString()
      : new Date().toISOString();
    const league = opts.printFixture.league || 'Copa do Mundo';
    fixtures = [{
      fixtureId: 0,
      homeTeam: opts.printFixture.homeTeam,
      homeTeamId: 0,
      awayTeam: opts.printFixture.awayTeam,
      awayTeamId: 0,
      kickoff,
      leagueId: 1, // FIFA World Cup
      leagueName: league,
    }];
    oddsBySport['soccer_fifa_world_cup'] = [slipToOddsEvent(opts.printFixture)];
    const [statsResult, formResult, h2hResult, ctxResult] = await Promise.allSettled([
      runStatsAgent(0, opts.printFixture.homeTeam, 0, opts.printFixture.awayTeam, league),
      runFormAgent(0, opts.printFixture.homeTeam, 0, opts.printFixture.awayTeam, league),
      runH2HAgent(0, opts.printFixture.homeTeam, 0, opts.printFixture.awayTeam, league),
      resolveMatchContext({ db, fixtureId: 0, homeTeam: opts.printFixture.homeTeam, homeTeamId: 0, awayTeam: opts.printFixture.awayTeam, awayTeamId: 0, leagueId: 1, date }),
    ]);
    teamStats = statsResult.status === 'fulfilled' ? statsResult.value : null;
    printMatchCtx = ctxResult.status === 'fulfilled' ? ctxResult.value : null;
    agentFormSummary = formResult.status === 'fulfilled' ? formResult.value : '';
    agentH2HSummary = h2hResult.status === 'fulfilled' ? h2hResult.value : '';
    agentStatsSummary = teamStats?.summary || '';
  } else {
    fixtures = await findFixturesForObjective(sportKeys, date, mandate.preferredTeams);
    const blocked = (mandate.blockedTeams || []).map((t) => t.toLowerCase());
    if (blocked.length) {
      fixtures = fixtures.filter((f) =>
        !blocked.some((b) => f.homeTeam.toLowerCase().includes(b) || f.awayTeam.toLowerCase().includes(b)));
    }
    if (fixtures.length > 0) {
      const uniqueSports = [...new Set(fixtures.map((f) => getSportKey(f.leagueId) || sportKeys[0]))];
      await Promise.all(uniqueSports.map(async (sk) => { oddsBySport[sk] = await getCachedOdds(db, sk, date); }));
    }
  }

  if (fixtures.length === 0) {
    return { roundId: null as string | null, card: composeSkip(riskLevel), empty: true };
  }

  const [model, individual] = await Promise.all([getGlobalModel(db), getIndividual(db, userId)]);

  const allCands: Candidate[] = [];
  for (const fx of fixtures) {
    const sk = getSportKey(fx.leagueId) || sportKeys[0];
    try {
      // overrideAverages: usa StatsAgent (API-Football ou inferência Claude) quando
      // teamId=0. Para fixtures reais (teamId!=0), teamAverages busca normalmente.
      const override = opts.printFixture && teamStats
        ? {
            home: { scored: teamStats.homeAvgScored, conceded: teamStats.homeAvgConceded, games: 8 },
            away: { scored: teamStats.awayAvgScored, conceded: teamStats.awayAvgConceded, games: 8 },
          }
        : undefined;
      // context: multiplicadores de mercado do MatchContextAgent (lesões, árbitro,
      // peso do jogo). Enriquece o pipeline print-first com os mesmos ajustes
      // qualitativos que o pipeline completo (betAnalysis) já usava.
      const context = opts.printFixture && printMatchCtx ? printMatchCtx.multipliers : undefined;
      const cands = await analyzeFixture({ db, fixture: fx as FixtureSummary, sportKey: sk, oddsEvents: oddsBySport[sk] || [], model, individual, overrideAverages: override, context });
      allCands.push(...cands);
    } catch {
      // pula partida que falhar
    }
  }

  // Meta em R$ vira multiplicador-alvo do moonshot (de R$budget chegar a R$meta).
  const derivedTarget = mandate.growthTargetAmount && mandate.growthTargetAmount > cycle.budget
    ? mandate.growthTargetAmount / cycle.budget
    : undefined;
  const targetMultiplier = clampTarget(opts.targetMultiplier ?? derivedTarget ?? 10);
  const plan = buildRound(allCands, { riskLevel, targetMultiplier });
  const card = composeCard(plan, { authLevel: riskLevel, bankroll: cycle.currentBankroll });

  // Análise qualitativa: enriquece o card com a síntese dos sub-agentes (form, h2h, stats).
  // Só disponível no fluxo print-first (Copa/internacionais) onde os agentes são chamados.
  if (!card.skip && plan.legs.length > 0 && (agentFormSummary || agentH2HSummary || agentStatsSummary)) {
    const leg = plan.legs[0];
    try {
      card.finalAnalysis = await generateCardAnalysis(
        { homeTeam: leg.homeTeam, awayTeam: leg.awayTeam, selection: leg.selection, marketOdd: leg.marketOdd, modelProb: leg.modelProb, ev: leg.ev, league: leg.league },
        { formSummary: agentFormSummary, h2hSummary: agentH2HSummary, statsSummary: agentStatsSummary },
      );
    } catch { /* não interrompe o fluxo */ }
  }

  // Cross-over com o Zé Gastão: trava o stake pela fase financeira.
  const phase = await getPhase(db, userId);
  const ceiling = stakeCeilingFor(phase, cycle.budget);
  let crossOver = '';
  if (!card.skip && card.suggestedStake > ceiling) {
    crossOver = crossOverNote(phase || '', ceiling, card.suggestedStake);
    card.suggestedStake = ceiling;
    card.potentialReturn = round2(ceiling * (card.combinedOdd - 1));
  }

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
    crossOver: crossOver || null,
    placed: false,
    outcome: 'pending',
    skip: card.skip,
    reasonCode: plan.reasonCode,
    createdAt: Timestamp.now(),
  });

  return { roundId: roundRef.id, card, crossOver, empty: false };
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
  z.object({ action: z.literal('suggest_budget') }),
  z.object({
    action: z.literal('save'),
    cycleBudget: z.number().min(2).max(200),
    growthTargetPct: z.number().min(5).max(5000).optional(),
    growthTargetAmount: z.number().min(2).max(100000).optional(),
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

  // Orçamento sugerido pelo perfil financeiro (reusa a lógica do Zé Gastão).
  if (parsed.data.action === 'suggest_budget') {
    const insights = await db.collection('users').doc(userId).collection('insights').doc('latest').get();
    const contextSnapshot = insights.exists ? (insights.data()?.contextSnapshot as string) : 'Contexto não disponível';
    try {
      const s = await suggestBettingBudget(contextSnapshot);
      return { budget: s.budget, reasoning: s.reasoning };
    } catch {
      return { budget: 10, reasoning: 'Sugestão padrão — não consegui ler seu perfil agora. Você pode ajustar o valor.' };
    }
  }

  if (parsed.data.action === 'save') {
    const d = parsed.data;
    // Meta: aceita % OU R$. Normaliza para ter sempre os dois (a meta em R$ guia o moonshot).
    let growthTargetPct = d.growthTargetPct;
    let growthTargetAmount = d.growthTargetAmount;
    if (growthTargetAmount && growthTargetAmount > d.cycleBudget) {
      growthTargetPct = Math.round((growthTargetAmount / d.cycleBudget - 1) * 100);
    } else if (growthTargetPct && !growthTargetAmount) {
      growthTargetAmount = round2(d.cycleBudget * (1 + growthTargetPct / 100));
    }
    if (!growthTargetPct || growthTargetPct < 5) {
      throw new HttpsError('invalid-argument', 'Informe a meta em % ou em R$ (acima do orçamento).');
    }
    const mandate: Mandate = {
      cycleBudget: d.cycleBudget,
      growthTargetPct,
      growthTargetAmount,
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
  z.object({
    action: z.literal('start'),
    // Firebase callable pode enviar null para campos opcionais — n2u converte null→undefined.
    riskLevel: z.preprocess(n2u, z.number().int().min(0).max(3).optional()),
  }),
  z.object({
    action: z.literal('build'),
    date: z.preprocess(n2u, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    riskLevel: z.preprocess(n2u, z.number().int().min(0).max(3).optional()),
    targetMultiplier: z.preprocess(n2u, z.number().min(1.1).max(1000).optional()),
    // Print-first: fixture extraída do print da Betano (bypassa API-Football + Odds API).
    printFixture: z.preprocess(n2u, z.object({
      homeTeam: z.string().min(1).max(100),
      awayTeam: z.string().min(1).max(100),
      league: z.preprocess(n2u, z.string().max(100).optional()),
      matchDate: z.preprocess(n2u, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
      markets: z.preprocess(
        // Remove mercados com odd nula/inválida antes da validação Zod
        (arr) => Array.isArray(arr)
          ? arr.filter((m): boolean => {
              if (!m || typeof m !== 'object') return false;
              const odd = (m as { odd?: unknown }).odd;
              return typeof odd === 'number' && odd > 0;
            })
          : arr,
        z.array(z.object({
          market: z.string().max(50),
          selection: z.string().max(80),
          odd: z.number().positive(),
        })).min(1).max(30),
      ),
    }).optional()),
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
    // Trava de dopamina: ganhou o ciclo anterior? Só libera novo após comprovar o saque.
    if (mandate.dopamineLock) {
      throw new HttpsError('failed-precondition', 'Antes de um novo ciclo, comprove o saque do seu lucro (manda o print do "Saque solicitado"). Dinheiro na conta > número na tela.');
    }
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
    printFixture: parsed.data.printFixture,
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
    // Ao ganhar, arma a trava de dopamina (libera só após comprovar o saque).
    const mandatePatch: Record<string, unknown> = { activeCycleId: null };
    if (status === 'won') mandatePatch.dopamineLock = true;
    await db.collection('users').doc(userId).collection('betting_mandate').doc('main').set(mandatePatch, { merge: true });
    if (status === 'won') {
      const profit = round2(bankroll - cycle.budget);
      await sendPush(db, userId, '🎉 Ciclo no azul! Hora de sacar', dopamineLockMessage(profit > 0 ? profit : bankroll));
    } else {
      const leg0 = round.legs[0];
      await sendPush(db, userId, 'Não foi dessa vez 😮‍💨', ouvidoriaDoFumo(leg0?.homeTeam, leg0?.awayTeam));
    }
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

function clampTarget(t: number): number {
  if (!isFinite(t) || t < 1.1) return 1.1;
  return Math.min(1000, t);
}
