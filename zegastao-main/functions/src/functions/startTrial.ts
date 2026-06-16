// Inicia o trial de 7 dias do plano Copiloto. One-time por usuário, sem cartão.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const TRIAL_DAYS = 7;

export const startTrial = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Não autenticado');

    const db = getFirestore();
    const ref = db.collection('users').doc(uid).collection('subscription').doc('main');
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : null;

    // Já assinante ativo → não precisa de trial
    if (data?.status === 'active') {
      throw new HttpsError('failed-precondition', 'Você já é assinante.');
    }
    // Trial é one-time: se já começou alguma vez, recusa
    if (data?.trialStartedAt) {
      throw new HttpsError('failed-precondition', 'Seu teste grátis já foi utilizado.');
    }

    const now = Timestamp.now();
    const endsAt = Timestamp.fromMillis(now.toMillis() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    await ref.set(
      {
        plan: 'copiloto_monthly',
        status: 'trialing',
        trialStartedAt: now,
        trialEndsAt: endsAt,
      },
      { merge: true }
    );

    return { ok: true, trialEndsAt: endsAt.toMillis() };
  }
);
