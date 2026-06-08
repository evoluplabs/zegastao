// HTTP Callable: recebe pedido de análise de jogo e orquestra os agentes.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { orchestrate } from '../services/betting/orchestrator';

const BLOCKED_PHASES = ['survival', 'reorganizing'];

export const betAnalysis = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Não autenticado');

    const {
      homeTeam, awayTeam,
      homeTeamId, awayTeamId,
      league, leagueSportKey, date,
    } = request.data;

    if (!homeTeam || !awayTeam) {
      throw new HttpsError('invalid-argument', 'Times são obrigatórios');
    }

    const db = getFirestore();

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
      homeTeamId: homeTeamId || 0,
      awayTeamId: awayTeamId || 0,
      league: league || 'Desconhecida',
      leagueSportKey: leagueSportKey || 'soccer_brazil_serie_a',
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
