// Projeção de quitação de dívidas — cálculo LOCAL, sem IA (espelha o backend).
import type { Debt } from '@/types';

export interface MonthSummary {
  month: number;
  debts: Array<{ creditor: string; payment: number; remaining: number }>;
}

export interface DebtProjection {
  monthsToClear: number;
  estimatedEndDate: string;
  totalInterestPaid: number;
  timeline: MonthSummary[];
  strategy: 'avalanche' | 'snowball';
}

export function projectDebtPayoff(
  debts: Debt[],
  extraMonthlyAvailable: number,
  strategy: 'avalanche' | 'snowball' = 'avalanche'
): DebtProjection {
  const active = debts.filter((d) => d.totalBalance > 0);
  if (!active.length) {
    return { monthsToClear: 0, estimatedEndDate: '', totalInterestPaid: 0, timeline: [], strategy };
  }

  const sorted = [...active].sort((a, b) =>
    strategy === 'avalanche'
      ? b.interestRateMonthly - a.interestRateMonthly
      : a.totalBalance - b.totalBalance
  );

  const working = sorted.map((d) => ({
    creditor: d.creditor,
    balance: d.totalBalance,
    monthlyPayment: d.monthlyPayment,
    rate: d.interestRateMonthly,
  }));

  const timeline: MonthSummary[] = [];
  let totalInterest = 0;
  let month = 0;
  const startDate = new Date();

  while (working.some((d) => d.balance > 0) && month < 120) {
    month++;
    let extra = extraMonthlyAvailable;
    const summary: MonthSummary = { month, debts: [] };

    for (const debt of working) {
      if (debt.balance <= 0) continue;
      const interest = debt.balance * debt.rate;
      debt.balance += interest;
      totalInterest += interest;

      const payment = Math.min(debt.monthlyPayment + (extra > 0 ? extra : 0), debt.balance);
      debt.balance = Math.max(0, debt.balance - payment);
      extra = Math.max(0, extra - Math.max(0, payment - debt.monthlyPayment));

      summary.debts.push({
        creditor: debt.creditor,
        payment: +payment.toFixed(2),
        remaining: +debt.balance.toFixed(2),
      });
    }

    timeline.push(summary);
    if (!working.some((d) => d.balance > 0)) break;
  }

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + month);

  return {
    monthsToClear: month,
    estimatedEndDate: endDate.toISOString().substring(0, 7),
    totalInterestPaid: +totalInterest.toFixed(2),
    timeline,
    strategy,
  };
}

// Data estimada para atingir uma meta no ritmo de aporte informado.
export function estimateGoalDate(
  current: number,
  target: number,
  monthlyContribution: number
): string | null {
  if (current >= target) return 'Concluída';
  if (monthlyContribution <= 0) return null;
  const months = Math.ceil((target - current) / monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
