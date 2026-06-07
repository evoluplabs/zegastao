// Agrega os dados do usuário: contexto comprimido + insumos de fase/marcos.
// Usado pelo job noturno e (via cache) pelo chat.
import { getFirestore } from 'firebase-admin/firestore';
import { UserContext } from './context-builder';
import { PhaseInput, MilestoneState } from './phase-engine';

export interface UserSnapshot {
  context: UserContext;
  phaseInput: PhaseInput;
  milestoneState: MilestoneState;
  skills: string[];
  investmentGoals: string[];
  riskProfile: string;
}

// Heurística: tesouro/cdb/conta são considerados líquidos (reserva).
const LIQUID_TYPES = ['tesouro', 'cdb', 'conta', 'lci', 'lca'];

export async function buildUserSnapshot(userId: string): Promise<UserSnapshot> {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().substring(0, 10);

  const [profileSnap, txSnap, debtsSnap, goalsSnap, rulesSnap, invSnap] = await Promise.all([
    userRef.collection('profile').doc('main').get(),
    userRef.collection('transactions').where('date', '>=', monthStart).get(),
    userRef.collection('debts').where('status', '==', 'active').get(),
    userRef.collection('goals').where('status', '==', 'active').get(),
    userRef.collection('rules').get(),
    userRef.collection('investments').get(),
  ]);

  const profile = profileSnap.data() || {};
  const monthlyIncome = profile.monthlyIncome || 0;

  // Gastos do mês por categoria (apenas saídas)
  let expenseTotal = 0;
  let incomeFromTx = 0;
  const byCategoryMap: Record<string, number> = {};
  for (const doc of txSnap.docs) {
    const tx = doc.data();
    if (tx.amount < 0) {
      const abs = Math.abs(tx.amount);
      expenseTotal += abs;
      const cat = tx.category || 'Outros';
      byCategoryMap[cat] = (byCategoryMap[cat] || 0) + abs;
    } else {
      incomeFromTx += tx.amount;
    }
  }
  const byCategory = Object.entries(byCategoryMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const income = monthlyIncome || incomeFromTx;

  // Dívidas
  const debts = debtsSnap.docs.map((d) => d.data());
  const totalDebt = debts.reduce((s, d) => s + (d.totalBalance || 0), 0);
  const debtPayments = debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);

  // Investimentos
  let totalInvestments = 0;
  let liquidInvestments = 0;
  let passiveIncome = 0;
  for (const doc of invSnap.docs) {
    const inv = doc.data();
    const value = inv.currentValue || inv.amount || 0;
    totalInvestments += value;
    if (LIQUID_TYPES.includes(String(inv.type || '').toLowerCase())) liquidInvestments += value;
    passiveIncome += inv.monthlyIncome || 0;
  }

  // Reserva de emergência: metas marcadas como reserva + investimentos líquidos.
  const reserveGoals = goalsSnap.docs
    .filter((g) => /reserva|emerg/i.test(g.data().name || '') || g.data().type === 'reserva')
    .reduce((s, g) => s + (g.data().currentAmount || 0), 0);
  const emergencyFund = reserveGoals + liquidInvestments;

  const fixedExpenses = profile.fixedExpenses || expenseTotal;
  const monthlyBalance = income - expenseTotal - debtPayments;

  const context: UserContext = {
    income,
    expenses: { total: expenseTotal, byCategory },
    debts: debts.map((d) => ({
      balance: d.totalBalance || 0,
      monthly_payment: d.monthlyPayment || 0,
    })),
    goals: goalsSnap.docs.map((g) => ({
      name: g.data().name || 'Meta',
      current: g.data().currentAmount || 0,
      target: g.data().targetAmount || 0,
    })),
    rules: rulesSnap.docs.map((r) => ({
      is_active: !!r.data().isActive,
      month_redirected: r.data().monthRedirected || 0,
    })),
  };

  const phaseInput: PhaseInput = {
    monthlyBalance,
    totalDebt,
    emergencyFund,
    fixedExpenses,
    totalInvestments,
  };

  const milestoneState: MilestoneState = {
    monthlyBalance,
    highestRateDebtCleared: debts.length === 0 || !debts.some((d) => (d.interestRateMonthly || 0) > 0),
    allDebtsCleared: totalDebt <= 0,
    emergencyFund,
    fixedExpenses,
    totalInvestments,
    passiveIncome,
    monthlyExpenses: expenseTotal,
  };

  return {
    context,
    phaseInput,
    milestoneState,
    skills: profile.skills || [],
    investmentGoals: profile.investmentGoals || [],
    riskProfile: profile.riskProfile || 'conservative',
  };
}
