// Job noturno (Cloud Scheduler, 00:00 America/Sao_Paulo).
// Consolida o dia: calcula a fase, atualiza marcos da trilha, gera tarefas
// diárias e insights (Sonnet, 1x/dia por usuário).
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { processUserDigest } from '../services/digest';

export const nightlyDigest = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getFirestore();
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      try {
        await processUserDigest(userId);
      } catch (e) {
        console.error(`Error processing user ${userId}:`, e);
      }
    }
  }
);
