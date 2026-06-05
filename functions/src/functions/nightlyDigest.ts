// Job noturno (Cloud Scheduler, 00:00 America/Sao_Paulo).
// Consolida o dia: calcula a fase, atualiza marcos da trilha, gera tarefas
// diárias e insights (Sonnet, 1x/dia por usuário).
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { buildCompressedContext } from '../services/context-builder';
import { buildUserSnapshot } from '../services/user-aggregator';
import { generateInsights } from '../services/insight-engine';
import { generateDailyTasks } from '../services/task-generator';
import {
  calculatePhase,
  MILESTONES,
  PHASE_INVESTMENT_CONTEXT,
} from '../services/phase-engine';

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

        // 5. Zera contador mensal de regras no dia 1
        if (new Date().getDate() === 1) {
          const rulesSnap = await userDoc.ref.collection('rules').get();
          if (!rulesSnap.empty) {
            const batch = db.batch();
            rulesSnap.docs.forEach((r) => batch.update(r.ref, { monthRedirected: 0 }));
            await batch.commit();
          }
        }
      } catch (e) {
        console.error(`Error processing user ${userId}:`, e);
      }
    }
  }
);

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
