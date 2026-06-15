// Lógica compartilhada do digest por usuário.
// Chamada pelo handler de Cloud Tasks (processUserDigest, agendado pelo
// dispatcher nightlyDigest) e também sob demanda pelo callable generateInsightsNow.
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { buildCompressedContext } from './context-builder';
import { buildUserSnapshot } from './user-aggregator';
import { generateInsights } from './insight-engine';
import { generateDailyTasks } from './task-generator';
import {
  calculatePhase,
  MILESTONES,
  PHASE_INVESTMENT_CONTEXT,
} from './phase-engine';
import { updateCopilotNotes } from './personal-context';
import { detectNegotiationAlerts } from './negotiation';

export async function runUserDigest(userId: string, forceRegenerate = false): Promise<void> {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);

  // Cache guard: skip if insights were generated less than 23h ago (nightly job may run twice)
  if (!forceRegenerate) {
    try {
      const insightsDoc = await userRef.collection('insights').doc('latest').get();
      const lastGenerated = insightsDoc.data()?.generatedAt?.toDate?.();
      if (lastGenerated && Date.now() - lastGenerated.getTime() < 23 * 3_600_000) {
        console.log(`runUserDigest: skipping ${userId} — insights generated <23h ago`);
        return;
      }
    } catch { /* proceed if check fails */ }
  }

  const snapshot = await buildUserSnapshot(userId);
  const phase = calculatePhase(snapshot.phaseInput);
  const compressed = buildCompressedContext(snapshot.context);

  // Contexto enriquecido com a fase — usado também pelo chat.
  const contextWithPhase = `${compressed}\n\n${PHASE_INVESTMENT_CONTEXT[phase]}`;

  // 1. Fase no perfil
  await userRef.collection('profile').doc('main')
    .set({ financialPhase: phase }, { merge: true });

  // 2. Marcos atingidos (trilha de evolução)
  await updateMilestones(db, userId, snapshot.milestoneState);

  // 3. Tarefas diárias (renda extra / economia conforme a fase)
  const tasks = await generateDailyTasks(phase, snapshot.skills);
  await userRef.collection('daily_tasks').doc('today')
    .set({ tasks, phase, generatedAt: new Date() });

  // 4. Insights do dia — não sobrescrever com vazio em caso de erro
  let insightsError: Error | null = null;
  let insights: Awaited<ReturnType<typeof generateInsights>> = [];
  try {
    insights = await generateInsights(contextWithPhase);
    await userRef.collection('insights').doc('latest')
      .set({
        insights,
        phase,
        generatedAt: new Date(),
        contextSnapshot: contextWithPhase,
      });
  } catch (e) {
    insightsError = e instanceof Error ? e : new Error(String(e));
    console.error('runUserDigest: falha ao gerar insights, preservando último resultado:', insightsError.message);
  }

  // 5. Anotações automáticas do copiloto (contexto pessoal colaborativo)
  const notable = snapshot.context.expenses.byCategory
    .slice(0, 3)
    .map((c) => `${c.name} R$${c.amount.toFixed(0)}`)
    .join(', ');
  await updateCopilotNotes(userId, contextWithPhase, notable);

  // 5.5. Push notification com o insight mais relevante do dia
  if (insights.length > 0) {
    await sendInsightPush(userId, insights[0].title, insights[0].body).catch(() => {});
  }

  // 6. Alertas de negociação a partir das dívidas ativas
  const debtsSnap = await userRef.collection('debts').where('status', '==', 'active').get();
  const debtsData = debtsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const alerts = detectNegotiationAlerts(debtsData);
  await userRef.collection('negotiation_alerts').doc('latest')
    .set({ alerts, generatedAt: new Date() });

  // 7. Alertas de vencimento
  await sendDueDateAlerts(
    db,
    userId,
    debtsData as { id: string; creditor: string; dueDay: number; monthlyPayment: number; status: string }[]
  ).catch(() => {});

  // 8. Zera contador mensal de regras no dia 1
  if (new Date().getDate() === 1) {
    const rulesSnap = await userRef.collection('rules').get();
    if (!rulesSnap.empty) {
      const batch = db.batch();
      rulesSnap.docs.forEach((r) => batch.update(r.ref, { monthRedirected: 0 }));
      await batch.commit();
    }
  }

  // Propaga erro de insights para que o callable retorne a causa real ao frontend
  if (insightsError) throw insightsError;
}

async function sendDueDateAlerts(
  db: FirebaseFirestore.Firestore,
  userId: string,
  debts: { id: string; creditor: string; dueDay: number; monthlyPayment: number; status: string }[]
): Promise<void> {
  const today = new Date();
  const todayDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const dueSoon = debts.filter((d) => {
    if (d.status !== 'active') return false;
    const diff = d.dueDay - todayDay;
    const adjustedDiff = diff < 0 ? diff + daysInMonth : diff;
    return adjustedDiff >= 0 && adjustedDiff <= 3;
  });

  for (const debt of dueSoon) {
    const notifKey = `duedate_${debt.id}_${today.toISOString().slice(0, 7)}`;
    const existing = await db.collection('users').doc(userId)
      .collection('notifications_log')
      .where('key', '==', notifKey).limit(1).get();
    if (!existing.empty) continue;

    const amount = debt.monthlyPayment > 0
      ? ` · R$${debt.monthlyPayment.toFixed(2).replace('.', ',')}`
      : '';

    await sendInsightPush(
      userId,
      `Vencimento em breve: ${debt.creditor}`,
      `Parcela${amount} vence dia ${debt.dueDay}. Não esqueça de pagar!`
    );

    await db.collection('users').doc(userId)
      .collection('notifications_log').doc()
      .set({ key: notifKey, sentAt: new Date(), type: 'due_date_alert' });
  }
}

async function sendInsightPush(userId: string, title: string, body: string): Promise<void> {
  const db = getFirestore();
  const tokenDoc = await db.collection('users').doc(userId)
    .collection('fcm_tokens').doc('main').get();
  if (!tokenDoc.exists) return;
  const token = tokenDoc.data()?.token as string | undefined;
  if (!token) return;

  await getMessaging().send({
    token,
    notification: { title: `💡 ${title}`, body: body.slice(0, 120) },
    data: { url: '/dashboard' },
    android: { notification: { channelId: 'insights' } },
  });
}

async function updateMilestones(
  db: FirebaseFirestore.Firestore,
  userId: string,
  state: Parameters<(typeof MILESTONES)[number]['reached']>[0]
): Promise<void> {
  const col = db.collection('users').doc(userId).collection('journey_milestones');
  const existing = await col.get();
  const achievedIds = new Set(existing.docs.map((d) => d.id));

  const batch = db.batch();
  let dirty = false;
  for (const m of MILESTONES) {
    if (!achievedIds.has(m.id) && m.reached(state)) {
      batch.set(col.doc(m.id), {
        name: m.name,
        achievedAt: new Date(),
        celebrationShown: false,
      });
      dirty = true;
    }
  }
  if (dirty) await batch.commit();
}
