// HTTP Callable: salvar perfil de apostas + aceite de cláusulas.
// O budget é sugerido pelo Copiloto com base nos vazamentos do usuário.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';

const ZE_APOSTADOR_ENABLED = process.env.ZE_APOSTADOR_ENABLED === 'true';

const client = new Anthropic();

// Sugere budget de apostas com base no contexto financeiro do usuário
async function suggestBettingBudget(contextSnapshot: string): Promise<{ budget: number; reasoning: string }> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: 'Você é um consultor financeiro. Responda APENAS com JSON válido.',
    messages: [{
      role: 'user',
      content: `Com base na situação financeira abaixo, sugira um budget semanal para apostas esportivas.
O valor deve ser equivalente a uma fração pequena dos "vazamentos" do usuário (gastos impulsivos, delivery, etc).
Máximo absoluto: R$ 50/semana. Mínimo: R$ 5/semana.

CONTEXTO:
${contextSnapshot}

Responda com JSON:
{"budget": 15, "reasoning": "Você gasta cerca de R$X em delivery/semana. Sugerimos R$15 (Y% desse valor) como fézinha semanal."}`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{"budget": 10, "reasoning": "Valor sugerido com base no seu perfil."}';
  try {
    return JSON.parse(text);
  } catch {
    return { budget: 10, reasoning: 'Valor sugerido com base no seu perfil financeiro.' };
  }
}

export const bettingProfile = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    if (!ZE_APOSTADOR_ENABLED) {
      throw new HttpsError('not-found', 'Zé Apostador ainda não está disponível.');
    }

    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Não autenticado');

    const action: string = request.data?.action;

    const db = getFirestore();

    // ---- Ação: sugerir budget (antes do aceite) ----
    if (action === 'suggest_budget') {
      const insightsDoc = await db
        .collection('users').doc(userId)
        .collection('insights').doc('latest').get();

      const contextSnapshot = insightsDoc.exists
        ? insightsDoc.data()!.contextSnapshot
        : 'Contexto não disponível';

      const suggestion = await suggestBettingBudget(contextSnapshot);
      return suggestion;
    }

    // ---- Ação: salvar perfil com aceite ----
    if (action === 'accept_and_save') {
      const { weeklyBudget, preferredMarkets, preferredLeagues } = request.data;

      if (!weeklyBudget || weeklyBudget <= 0) {
        throw new HttpsError('invalid-argument', 'Budget inválido');
      }

      await db
        .collection('users').doc(userId)
        .collection('betting_profile').doc('main')
        .set({
          weeklyBudget,
          copilotSuggestedBudget: weeklyBudget,
          preferredMarkets: preferredMarkets || ['h2h', 'btts', 'totals'],
          preferredLeagues: preferredLeagues || ['soccer_brazil_serie_a'],
          bettingEnabled: true,
          acceptedRiskDisclaimer: true,
          disclaimerAcceptedAt: Timestamp.now(),
          totalStaked: 0,
          totalWon: 0,
          weeklyStaked: 0,
          weeklyReset: new Date().toISOString().slice(0, 10),
        });

      return { success: true };
    }

    // ---- Ação: auto-exclusão ----
    if (action === 'self_exclude') {
      const { days } = request.data;
      const until = new Date();
      until.setDate(until.getDate() + (days || 7));

      await db
        .collection('users').doc(userId)
        .collection('betting_profile').doc('main')
        .update({ selfExclusionUntil: Timestamp.fromDate(until) });

      return { success: true, until: until.toISOString() };
    }

    // ---- Ação: registrar resultado de aposta ----
    if (action === 'record_bet') {
      const { analysisId, market, selection, odd, amount, outcome, profit } = request.data;

      const betRef = db.collection('users').doc(userId).collection('betting_history').doc();
      await betRef.set({
        analysisId: analysisId || null,
        market, selection, odd, amount,
        outcome: outcome || 'pending',
        profit: profit || 0,
        createdAt: Timestamp.now(),
      });

      // Atualizar totais
      const profileRef = db.collection('users').doc(userId).collection('betting_profile').doc('main');
      const profileDoc = await profileRef.get();
      if (profileDoc.exists) {
        const data = profileDoc.data()!;
        await profileRef.update({
          weeklyStaked: (data.weeklyStaked || 0) + amount,
          totalStaked: (data.totalStaked || 0) + amount,
          totalWon: (data.totalWon || 0) + (profit || 0),
        });
      }

      // Atualizar feedback na análise
      if (analysisId && outcome !== 'pending') {
        await db.collection('betting_analyses').doc(analysisId).update({ userFeedback: outcome });
      }

      return { success: true, betId: betRef.id };
    }

    // ---- Ação: atualizar resultado de aposta pendente (feedback loop) ----
    if (action === 'update_bet_result') {
      const { betId, outcome, profit } = request.data;
      if (!betId || (outcome !== 'hit' && outcome !== 'miss')) {
        throw new HttpsError('invalid-argument', 'betId e outcome (hit|miss) são obrigatórios.');
      }

      const betRef = db.collection('users').doc(userId).collection('betting_history').doc(betId);
      const betDoc = await betRef.get();
      if (!betDoc.exists) throw new HttpsError('not-found', 'Aposta não encontrada.');

      const bet = betDoc.data()!;
      const realizedProfit = typeof profit === 'number' ? profit : 0;

      await betRef.update({ outcome, profit: realizedProfit });

      // Atualizar total ganho no perfil
      const profileRef = db.collection('users').doc(userId).collection('betting_profile').doc('main');
      const profileDoc = await profileRef.get();
      if (profileDoc.exists) {
        const data = profileDoc.data()!;
        await profileRef.update({ totalWon: (data.totalWon || 0) + realizedProfit });
      }

      // Propagar feedback para a análise de origem
      if (bet.analysisId) {
        await db.collection('betting_analyses').doc(bet.analysisId).update({ userFeedback: outcome }).catch(() => {});
      }

      return { success: true };
    }

    throw new HttpsError('invalid-argument', `Ação desconhecida: ${action}`);
  }
);
