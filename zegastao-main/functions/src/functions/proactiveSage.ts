// Gatilho proativo do Sábio: quando o aventureiro derrota um Boss (uma dívida
// passa para 'paid'), o Sábio regenera os insights na hora — sem o usuário pedir.
// É um evento raro e de alto significado, então o custo de IA é baixo e justificado.
// Os demais momentos (fechar o mês, novos marcos) seguem cobertos pelo job noturno.
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { runUserDigest } from '../services/digest';

export const onBossDefeated = onDocumentUpdated(
  {
    document: 'users/{userId}/debts/{debtId}',
    region: 'southamerica-east1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Só dispara na transição para 'paid' (Boss recém-derrotado).
    if (before.status === 'paid' || after.status !== 'paid') return;

    const userId = event.params.userId;
    try {
      await runUserDigest(userId, true);
    } catch (e) {
      console.error('onBossDefeated: falha ao regenerar insights proativos', e);
    }
  }
);
