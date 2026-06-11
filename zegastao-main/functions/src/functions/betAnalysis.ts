// HTTP Callable: recebe pedido de análise de jogo e orquestra os agentes.
// Dois modos: 'single' (uma partida, fluxo manual) e 'objective' (vários jogos
// encontrados por liga + data, com alocação de orçamento).
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { orchestrate } from '../services/betting/orchestrator';
import { BettingAnalysis } from '../services/betting/consolidator';
import { findFixturesForObjective, getLeagueId, getSportKey } from '../services/betting/fixtures-finder';

const ZE_APOSTADOR_ENABLED = process.env.ZE_APOSTADOR_ENABLED === 'true';
const BLOCKED_PHASES = ['survival', 'reorganizing'];
const FREE_DAILY_BET_LIMIT = 3;

const BetAnalysisSchema = z.object({
  homeTeam: z.string().min(1, 'Time da casa é obrigatório').max(100),
  awayTeam: z.string().min(1, 'Time visitante é obrigatório').max(100),
  homeTeamId: z.number().optional().default(0),
  awayTeamId: z.number().optional().default(0),
  league: z.string().max(100).optional().default('Desconhecida'),
  leagueSportKey: z.string().max(100).optional().default('soccer_brazil_serie_a'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function checkBetRateLimit(
  db: ReturnType<typeof getFirestore>,
  userId: string
): Promise<void> {
  const subDoc = await db.collection('users').doc(userId).collection('subscription').doc('main').get();
  const plan = subDoc.exists ? (subDoc.data()!.plan as string) : 'free';
  if (plan !== 'free') return; // pagos sem limite

  const today = new Date().toISOString().slice(0, 10);
  const usageRef = db.collection('users').doc(userId).collection('usage').doc('bet_analyses');

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(usageRef);
    const data = doc.exists ? doc.data()! : {};
    const count: number = data.lastDate === today ? (data.dailyCount || 0) : 0;

    if (count >= FREE_DAILY_BET_LIMIT) {
      throw new HttpsError(
        'resource-exhausted',
        `Plano gratuito permite ${FREE_DAILY_BET_LIMIT} análises por dia. Assine o Copiloto para análises ilimitadas.`
      );
    }

    tx.set(usageRef, { dailyCount: count + 1, lastDate: today }, { merge: true });
  });
}

interface ProfileGuards {
  weeklyBudget: number;
  weeklyStaked: number;
  financialPhase?: string;
}

async function loadAndGuardProfile(db: Firestore, userId: string): Promise<ProfileGuards> {
  const insightsDoc = await db
    .collection('users').doc(userId)
    .collection('insights').doc('latest').get();

  let financialPhase: string | undefined;
  if (insightsDoc.exists) {
    financialPhase = insightsDoc.data()?.phase as string | undefined;
    if (financialPhase && BLOCKED_PHASES.includes(financialPhase)) {
      throw new HttpsError(
        'permission-denied',
        'O Zé Apostador está disponível apenas quando você estabilizar suas finanças. Continue na sua jornada!'
      );
    }
  }

  const bettingProfileDoc = await db
    .collection('users').doc(userId)
    .collection('betting_profile').doc('main').get();

  if (!bettingProfileDoc.exists || !bettingProfileDoc.data()?.acceptedRiskDisclaimer) {
    throw new HttpsError('failed-precondition', 'Configure seu perfil de apostas antes de continuar.');
  }

  const profile = bettingProfileDoc.data()!;

  if (profile.selfExclusionUntil && profile.selfExclusionUntil.toDate() > new Date()) {
    throw new HttpsError(
      'permission-denied',
      `Você está em pausa voluntária até ${profile.selfExclusionUntil.toDate().toLocaleDateString('pt-BR')}.`
    );
  }

  return {
    weeklyBudget: profile.weeklyBudget || 20,
    weeklyStaked: profile.weeklyStaked || 0,
    financialPhase,
  };
}

interface BudgetAllocationItem {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  suggestedStake: number;
  allocationReason: string;
  skip: boolean;
}

function allocateBudget(
  analyses: Array<BettingAnalysis & { matchId: string }>,
  sessionBudget: number
): { allocation: BudgetAllocationItem[]; totalSuggested: number } {
  const QUALIFYING = 50;
  const qualifying = analyses.filter((a) => a.confidenceScore >= QUALIFYING);
  const totalConfidence = qualifying.reduce((sum, a) => sum + a.confidenceScore, 0);

  let totalSuggested = 0;
  const allocation: BudgetAllocationItem[] = analyses.map((a) => {
    if (a.confidenceScore < QUALIFYING || totalConfidence === 0) {
      return {
        matchId: a.matchId,
        homeTeam: a.homeTeam,
        awayTeam: a.awayTeam,
        suggestedStake: 0,
        allocationReason: 'Confiança insuficiente — sem alocação recomendada.',
        skip: true,
      };
    }
    const share = a.confidenceScore / totalConfidence;
    const stake = parseFloat((share * sessionBudget).toFixed(2));
    totalSuggested += stake;
    return {
      matchId: a.matchId,
      homeTeam: a.homeTeam,
      awayTeam: a.awayTeam,
      suggestedStake: stake,
      allocationReason: `Confiança ${a.confidenceScore}% — ${Math.round(share * 100)}% do orçamento da sessão.`,
      skip: false,
    };
  });

  return { allocation, totalSuggested: parseFloat(totalSuggested.toFixed(2)) };
}

export const betAnalysis = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    if (!ZE_APOSTADOR_ENABLED) {
      throw new HttpsError('not-found', 'Zé Apostador ainda não está disponível.');
    }

    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Não autenticado');

    const db = getFirestore();
    const mode: string = request.data?.mode || 'single';

    // ===== Modo OBJETIVO: vários jogos por liga + data =====
    if (mode === 'objective') {
      const {
        leagueSportKeys,
        date,
        teamPreferences,
        sessionBudget,
      } = request.data as {
        leagueSportKeys: string[];
        date: string;
        teamPreferences?: string[];
        sessionBudget: number;
      };

      if (!Array.isArray(leagueSportKeys) || leagueSportKeys.length === 0) {
        throw new HttpsError('invalid-argument', 'Selecione ao menos um campeonato.');
      }
      const targetDate = date || new Date().toISOString().slice(0, 10);
      const budget = typeof sessionBudget === 'number' && sessionBudget > 0 ? sessionBudget : 20;

      await checkBetRateLimit(db, userId);
      const { weeklyBudget, weeklyStaked, financialPhase } = await loadAndGuardProfile(db, userId);

      const fixtures = await findFixturesForObjective(leagueSportKeys, targetDate, teamPreferences);
      if (fixtures.length === 0) {
        throw new HttpsError(
          'not-found',
          'Nenhum jogo encontrado para os campeonatos e a data escolhidos. Tente outra data ou outros campeonatos.'
        );
      }

      const analyses: Array<BettingAnalysis & { matchId: string; kickoff: string }> = [];

      // Sequencial para não estourar rate limit das APIs gratuitas
      for (const fixture of fixtures) {
        const sportKey = getSportKey(fixture.leagueId) || leagueSportKeys[0];
        try {
          const analysis = await orchestrate({
            homeTeam: fixture.homeTeam,
            awayTeam: fixture.awayTeam,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            league: fixture.leagueName,
            leagueSportKey: sportKey,
            date: targetDate,
            weeklyBudget,
            weeklyStaked,
            leagueId: fixture.leagueId,
            userId,
            db,
            financialPhase,
          });

          const analysisRef = db.collection('betting_analyses').doc();
          await analysisRef.set({
            userId,
            ...analysis,
            kickoff: fixture.kickoff,
            createdAt: Timestamp.now(),
            userFeedback: null,
          });

          analyses.push({ ...analysis, matchId: analysisRef.id, kickoff: fixture.kickoff });
        } catch {
          // Pula partidas que falharem na análise — não derruba o objetivo inteiro
        }
      }

      if (analyses.length === 0) {
        throw new HttpsError('internal', 'Não foi possível analisar os jogos encontrados. Tente novamente.');
      }

      const { allocation, totalSuggested } = allocateBudget(analyses, budget);

      return {
        analyses,
        budgetAllocation: allocation,
        totalSuggested,
        remainingBudget: parseFloat(Math.max(0, budget - totalSuggested).toFixed(2)),
        sessionBudget: budget,
      };
    }

    // ===== Modo SINGLE: uma partida (fluxo manual) =====
    const parsed = BetAnalysisSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message || 'Dados inválidos');
    }

    const { homeTeam, awayTeam, homeTeamId, awayTeamId, league, leagueSportKey, date } = parsed.data;

    await checkBetRateLimit(db, userId);
    const { weeklyBudget, weeklyStaked, financialPhase } = await loadAndGuardProfile(db, userId);

    const sportKey = leagueSportKey || 'soccer_brazil_serie_a';
    const analysis = await orchestrate({
      homeTeam,
      awayTeam,
      homeTeamId,
      awayTeamId,
      league,
      leagueSportKey: sportKey,
      date: date || new Date().toISOString().slice(0, 10),
      weeklyBudget,
      weeklyStaked,
      leagueId: getLeagueId(sportKey) ?? undefined,
      userId,
      db,
      financialPhase,
    });

    const analysisRef = db.collection('betting_analyses').doc();
    await analysisRef.set({
      userId,
      ...analysis,
      createdAt: Timestamp.now(),
      userFeedback: null,
    });

    const lostPct = weeklyStaked / weeklyBudget;
    const weeklyLossAlert = lostPct >= 0.5;

    return {
      analysisId: analysisRef.id,
      analysis,
      weeklyBudget,
      weeklyStaked,
      weeklyLossAlert,
      remainingBudget: Math.max(0, weeklyBudget - weeklyStaked),
    };
  }
);
