// Projeção de quitação de dívidas (cálculo local, sem IA).
// Suporta estratégias avalanche (maior juros primeiro) e snowball (menor saldo).

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

export interface DebtInput {
  creditor: string;
  balance: number;
  monthlyPayment: number;
  interestRateMonthly: number;
}

export function projectDebtPayoff(
  debts: DebtInput[],
  extraMonthlyAvailable: number,
  strategy: 'avalanche' | 'snowball' = 'avalanche'
): DebtProjection {
  if (!debts.length) {
    return { monthsToClear: 0, estimatedEndDate: '', totalInterestPaid: 0, timeline: [], strategy };
  }

  const sorted = [...debts].sort((a, b) =>
    strategy === 'avalanche'
      ? b.interestRateMonthly - a.interestRateMonthly
      : a.balance - b.balance
  );

  const working = sorted.map((d) => ({ ...d }));
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
      const interest = debt.balance * debt.interestRateMonthly;
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
