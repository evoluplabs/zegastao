// Dispatcher noturno (Cloud Scheduler, 00:00 America/Sao_Paulo).
// Enfileira uma Cloud Task por usuário para processUserDigest processar em paralelo,
// evitando timeout global e gargalo serial em grandes bases de usuários.
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFunctions } from 'firebase-admin/functions';
import { getFirestore } from 'firebase-admin/firestore';

export const nightlyDigest = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    const db = getFirestore();
    const usersSnap = await db.collection('users').get();

    const queue = getFunctions().taskQueue(
      'locations/southamerica-east1/functions/processUserDigest'
    );

    const enqueues = usersSnap.docs.map((doc, i) =>
      queue.enqueue(
        { uid: doc.id },
        // Escalonar 2 s entre tasks para não estourar cota de leituras
        { scheduleDelaySeconds: i * 2 }
      )
    );

    await Promise.allSettled(enqueues);
    console.log(`nightlyDigest: enqueued ${usersSnap.size} tasks`);
  }
);
