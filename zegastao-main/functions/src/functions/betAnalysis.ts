// HTTP Callable: recebe pedido de análise de jogo e orquestra os agentes.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { orchestrate } from '../services/betting/orchestrator';

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

export const betAnalysis = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    if (!ZE_APOSTADOR_ENABLED) {
      throw new HttpsError('not-found', 'Zé Apostador ainda não está disponível.');
    }

    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Não autenticado');

    const parsed = BetAnalysisSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message || 'Dados inválidos');
    }

    const { homeTeam, awayTeam, homeTeamId, awayTeamId, league, leagueSportKey, date } = parsed.data;

    const db = getFirestore();

    // Rate limiting (free: 3/dia)
    await checkBetRateLimit(db, userId);

    // Verificar fase financeira
    const insightsDoc = await db
      .collection('users').doc(userId)
      .collection('insights').doc('latest').get();

    if (insightsDoc.exists) {
      const phase = insightsDoc.data()?.phase as string | undefined;
      if (phase && BLOCKED_PHASES.includes(phase)) {
        throw new HttpsError(
          'permission-denied',
          'O Zé Apostador está disponível apenas quando você estabilizar suas finanças. Continue na sua jornada!'
        );
      }
    }

    // Verificar perfil de apostas configurado
    const bettingProfileDoc = await db
      .collection('users').doc(userId)
      .collection('betting_profile').doc('main').get();

    if (!bettingProfileDoc.exists || !bettingProfileDoc.data()?.acceptedRiskDisclaimer) {
      throw new HttpsError(
        'failed-precondition',
        'Configure seu perfil de apostas antes de continuar.'
      );
    }

    const profile = bettingProfileDoc.data()!;

    // Verificar auto-exclusão
    if (profile.selfExclusionUntil && profile.selfExclusionUntil.toDate() > new Date()) {
      throw new HttpsError(
        'permission-denied',
        `Você está em pausa voluntária até ${profile.selfExclusionUntil.toDate().toLocaleDateString('pt-BR')}.`
      );
    }

    const weeklyBudget: number = profile.weeklyBudget || 20;
    const weeklyStaked: number = profile.weeklyStaked || 0;

    // Orquestrar análise
    const analysis = await orchestrate({
      homeTeam,
      awayTeam,
      homeTeamId,
      awayTeamId,
      league,
      leagueSportKey,
      date: date || new Date().toISOString().slice(0, 10),
      weeklyBudget,
      weeklyStaked,
    });

    // Salvar análise no Firestore
    const analysisRef = db.collection('betting_analyses').doc();
    await analysisRef.set({
      userId,
      ...analysis,
      createdAt: Timestamp.now(),
      userFeedback: null,
    });

    // Alerta de perda semanal
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
