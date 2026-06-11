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

export async function processUserDigest(userId: string): Promise<void> {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(userId).get();

  const snapshot = await buildUserSnapshot(userId);
  const phase = calculatePhase(snapshot.phaseInput);
  const compressed = buildCompressedContext(snapshot.context);

  // Contexto enriquecido com a fase — usado também pelo chat.
  const contextWithPhase = `${compressed}\n\n${PHASE_INVESTMENT_CONTEXT[phase]}`;

  // 1. Fase no perfil
  await userDoc.ref.collection('profile').doc('main')
    .set({ financialPhase: phase }, { merge: true });

  // 2. Marcos atingidos (trilha de evolução)
  await updateMilestones(db, userId, snapshot.milestoneState);

  // 3. Tarefas diárias (renda extra / economia conforme a fase)
  const tasks = await generateDailyTasks(phase, snapshot.skills);
  await db.collection('users').doc(userId)
    .collection('daily_tasks').doc('today')
    .set({ tasks, phase, generatedAt: new Date() });

  // 4. Insights do dia
  const insights = await generateInsights(contextWithPhase);
  await db.collection('users').doc(userId)
    .collection('insights').doc('latest')
    .set({
      insights,
      phase,
      generatedAt: new Date(),
      contextSnapshot: contextWithPhase,
    });

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
  const debtsSnap = await userDoc.ref
    .collection('debts').where('status', '==', 'active').get();
  const alerts = detectNegotiationAlerts(
    debtsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  );
  await db.collection('users').doc(userId)
    .collection('negotiation_alerts').doc('latest')
    .set({ alerts, generatedAt: new Date() });

  // 7. Zera contador mensal de regras no dia 1
  if (new Date().getDate() === 1) {
    const rulesSnap = await userDoc.ref.collection('rules').get();
    if (!rulesSnap.empty) {
      const batch = db.batch();
      rulesSnap.docs.forEach((r) => batch.update(r.ref, { monthRedirected: 0 }));
      await batch.commit();
    }
  }
}

async function sendInsightPush(userId: string, title: string, body: string): Promise<void> {
  const db = getFirestore();
  const tokenDoc = await db.collection('users').doc(userId).collection('fcm_tokens').doc('main').get();
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
