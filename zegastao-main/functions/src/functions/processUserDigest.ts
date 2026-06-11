// Cloud Tasks handler — processa o digest noturno de um único usuário.
// Enfileirado pelo dispatcher nightlyDigest; permite escalar sem timeout global.
// A lógica em si vive em services/digest.ts (runUserDigest), compartilhada com
// o callable generateInsightsNow (geração sob demanda).
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { runUserDigest } from '../services/digest';

interface DigestPayload {
  uid: string;
}

export const processUserDigest = onTaskDispatched<DigestPayload>(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
    timeoutSeconds: 300,
    retryConfig: {
      maxAttempts: 2,
      minBackoffSeconds: 60,
    },
    rateLimits: {
      maxConcurrentDispatches: 10,
    },
  },
  async (req) => {
    await runUserDigest(req.data.uid);
  }
);
