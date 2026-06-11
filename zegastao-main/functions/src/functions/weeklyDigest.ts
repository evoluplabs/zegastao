// Job semanal (Cloud Scheduler, segunda-feira 08:00 BRT).
// Envia resumo da semana anterior via push FCM.
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const weeklyDigest = onSchedule(
  {
    schedule: '0 8 * * 1', // Segunda-feira às 08:00
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
    memory: '256MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const usersSnap = await db.collection('users').get();

    const today = new Date();
    // Semana anterior: de segunda passada até domingo
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - 7);
    const startStr = lastMonday.toISOString().slice(0, 10);
    const endStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10); // ontem

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      try {
        const tokenDoc = await db.collection('users').doc(userId)
          .collection('fcm_tokens').doc('main').get();
        if (!tokenDoc.exists || !tokenDoc.data()?.token) continue;
        const fcmToken = tokenDoc.data()!.token as string;

        // Busca transações da semana anterior
        const txSnap = await db.collection('users').doc(userId)
          .collection('transactions')
          .where('date', '>=', startStr)
          .where('date', '<=', endStr)
          .get();

        if (txSnap.empty) continue;

        const transactions = txSnap.docs.map((d) => d.data());
        const totalExpenses = transactions
          .filter((t) => t.amount < 0)
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        const totalIncome = transactions
          .filter((t) => t.amount > 0)
          .reduce((s, t) => s + t.amount, 0);

        // Busca metas para ver se há alguma ativa
        const goalsSnap = await db.collection('users').doc(userId)
          .collection('goals').where('status', '==', 'active').limit(1).get();
        const hasActiveGoal = !goalsSnap.empty;

        const balance = totalIncome - totalExpenses;
        const balanceEmoji = balance >= 0 ? '✅' : '⚠️';
        const expFormatted = `R$${totalExpenses.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
        const incFormatted = `R$${totalIncome.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

        const title = `${balanceEmoji} Resumo da semana — Zé Gastão`;
        let body = `Gastou ${expFormatted}`;
        if (totalIncome > 0) body += ` · Recebeu ${incFormatted}`;
        if (balance < 0) body += ` · Atenção: semana no vermelho!`;
        else if (hasActiveGoal) body += ` · Continue focado nas suas metas!`;

        await getMessaging().send({
          token: fcmToken,
          notification: { title, body },
          data: { url: '/transactions' },
          android: { notification: { channelId: 'weekly_digest' } },
        });
      } catch {
        // Ignora erros individuais para não parar o loop
      }
    }
  }
);
