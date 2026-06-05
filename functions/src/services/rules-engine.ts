// Motor de regras comportamentais.
// "gastou X em Y → redireciona Z% para meta".
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';
import { ParsedTransaction, Rule } from '../types';

export async function evaluateRules(
  userId: string,
  newTransactions: ParsedTransaction[]
): Promise<void> {
  const db = getFirestore();
  const rulesSnap = await db
    .collection('users').doc(userId).collection('rules')
    .where('isActive', '==', true).get();

  if (rulesSnap.empty) return;

  const batch: WriteBatch = db.batch();

  // Cache de saldos de metas para não ler/somar a mesma meta várias vezes.
  const goalDeltas: Record<string, number> = {};

  for (const ruleDoc of rulesSnap.docs) {
    const rule = { id: ruleDoc.id, ...ruleDoc.data() } as Rule;

    let triggered = 0;
    let redirected = 0;

    for (const tx of newTransactions) {
      const result = await evaluateSingleRule(db, userId, rule, tx);
      if (!result) continue;

      triggered++;
      redirected += result.amountRedirected;

      if (rule.actionGoalId) {
        goalDeltas[rule.actionGoalId] =
          (goalDeltas[rule.actionGoalId] || 0) + result.amountRedirected;
      }

      // Registrar aplicação
      const appRef = db
        .collection('users').doc(userId).collection('rule_applications').doc();
      batch.set(appRef, {
        ruleId: rule.id,
        transactionId: tx.id || null,
        appliedAt: new Date(),
        amountRedirected: result.amountRedirected,
        goalId: rule.actionGoalId || null,
      });
    }

    if (triggered > 0) {
      batch.update(ruleDoc.ref, {
        timesTriggered: (rule.timesTriggered || 0) + triggered,
        totalRedirected: (rule.totalRedirected || 0) + redirected,
        monthRedirected: (rule.monthRedirected || 0) + redirected,
        lastTriggeredAt: new Date(),
      });
    }
  }

  // Aplicar os deltas acumulados de cada meta de uma só vez.
  for (const [goalId, delta] of Object.entries(goalDeltas)) {
    const goalRef = db
      .collection('users').doc(userId).collection('goals').doc(goalId);
    const snap = await goalRef.get();
    if (snap.exists) {
      batch.update(goalRef, {
        currentAmount: (snap.data()!.currentAmount || 0) + delta,
      });
    }
  }

  await batch.commit();
}

async function evaluateSingleRule(
  db: FirebaseFirestore.Firestore,
  userId: string,
  rule: Rule,
  tx: ParsedTransaction
): Promise<{ amountRedirected: number } | null> {
  const amount = Math.abs(tx.amount);
  const pct = (rule.actionPercentage || 0) / 100;
  const fixed = rule.actionFixedAmount || 0;
  const redirect = (base: number) =>
    rule.actionType === 'redirect_fixed' ? fixed : base * pct;

  if (rule.triggerType === 'transaction_in_category') {
    if (tx.category === rule.triggerCategoryName && tx.amount < 0) {
      return { amountRedirected: redirect(amount) };
    }
  }

  if (rule.triggerType === 'category_monthly_over') {
    if (tx.category !== rule.triggerCategoryName || tx.amount >= 0) return null;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().substring(0, 10);
    const monthlySnap = await db
      .collection('users').doc(userId).collection('transactions')
      .where('category', '==', rule.triggerCategoryName)
      .where('date', '>=', monthStart)
      .get();
    const monthlyTotal = monthlySnap.docs.reduce(
      (s, d) => s + Math.abs(d.data().amount), 0
    );
    const excedente = monthlyTotal - (rule.triggerThreshold || 0);
    if (excedente > 0) return { amountRedirected: redirect(excedente) };
  }

  if (rule.triggerType === 'income_received' && tx.amount > 0) {
    return { amountRedirected: redirect(amount) };
  }

  return null;
}
