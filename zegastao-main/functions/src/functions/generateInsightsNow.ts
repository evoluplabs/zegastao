import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { processUserDigest } from '../services/digest';

export const generateInsightsNow = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');
    const uid = request.auth.uid;
    const db = getFirestore();

    // Cooldown: máximo 1x a cada 6 horas
    const usageRef = db.collection('users').doc(uid).collection('usage').doc('insights');
    const usageDoc = await usageRef.get();
    if (usageDoc.exists) {
      const lastRun = usageDoc.data()?.lastRun?.toDate?.() as Date | undefined;
      if (lastRun && (Date.now() - lastRun.getTime()) < 6 * 60 * 60 * 1000) {
        const nextAllowed = new Date(lastRun.getTime() + 6 * 60 * 60 * 1000);
        throw new HttpsError('resource-exhausted', `Aguarde até ${nextAllowed.toLocaleTimeString('pt-BR')} para gerar novamente.`);
      }
    }

    await processUserDigest(uid);
    await usageRef.set({ lastRun: new Date() }, { merge: true });
    return { success: true };
  }
);
