// Fallback context builder for new users who don't have an insights/latest doc yet.
// Reads profile + debts + goals directly and returns a minimal but useful context string.
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export async function buildContextFallback(userId: string, db: Firestore): Promise<string> {
  try {
    const [profileSnap, debtsSnap, goalsSnap] = await Promise.all([
      db.collection('users').doc(userId).collection('profile').doc('main').get(),
      db.collection('users').doc(userId).collection('debts').where('status', '==', 'active').limit(10).get(),
      db.collection('users').doc(userId).collection('goals').where('status', '==', 'active').limit(5).get(),
    ]);

    const profile = profileSnap.exists ? profileSnap.data()! : {};
    const income: number = profile.monthlyIncome || 0;
    const phase: string = profile.financialPhase || 'survival';
    const skills: string[] = profile.skills || [];

    const debts = debtsSnap.docs.map((d) => d.data());
    const totalDebt = debts.reduce((s, d) => s + (d.totalBalance || 0), 0);
    const debtPayments = debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);

    const goals = goalsSnap.docs.map((g) => g.data());

    const phaseLabels: Record<string, string> = {
      survival: 'Sobrevivência (dívidas críticas)',
      reorganizing: 'Reorganização (pagando dívidas)',
      stabilizing: 'Estabilização (formando reserva)',
      accumulating: 'Acumulação (investindo)',
      growing: 'Crescimento (patrimônio)',
    };

    const lines = [
      `FASE FINANCEIRA: ${phaseLabels[phase] || phase}`,
      `Renda mensal: R$${income.toFixed(0)}`,
      `Dívidas ativas: ${debts.length} | Total: R$${totalDebt.toFixed(0)} | Parcelas/mês: R$${debtPayments.toFixed(0)}`,
      `Comprometimento: ${income > 0 ? (((debtPayments) / income) * 100).toFixed(0) : 0}% da renda em parcelas`,
      goals.length > 0
        ? `Metas: ${goals.map((g) => `${g.name} (R$${(g.currentAmount || 0).toFixed(0)}/R$${(g.targetAmount || 0).toFixed(0)})`).join(', ')}`
        : 'Nenhuma meta cadastrada ainda',
      skills.length > 0 ? `Habilidades do usuário: ${skills.slice(0, 5).join(', ')}` : '',
      '',
      'NOTA: Contexto inicial — análise completa disponível após o primeiro processamento de extrato.',
    ].filter(Boolean);

    return lines.join('\n');
  } catch {
    return 'Usuário novo. Ajude-o a configurar suas finanças e importar o primeiro extrato bancário.';
  }
}
