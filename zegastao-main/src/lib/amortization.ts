// Motor de amortização no cliente (espelha o backend) — cálculo local, sem IA.
import type { AmortizationResult, Installment, ScenarioSummary } from '@/types';

export interface AdvancePayment {
  installmentNumber: number;
  extraAmount: number;
}

function futureDate(monthsAhead: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().substring(0, 7);
}

function pricePayment(principal: number, rate: number, n: number): number {
  if (rate <= 0) return principal / n;
  return principal * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
}

function buildPrice(principal: number, rate: number, n: number, advances: AdvancePayment[]): Installment[] {
  const monthlyPayment = pricePayment(principal, rate, n);
  const out: Installment[] = [];
  let balance = principal;
  for (let i = 1; i <= n && balance > 0.005; i++) {
    const interest = balance * rate;
    const extra = advances.find((a) => a.installmentNumber === i)?.extraAmount || 0;
    let amort = Math.min(monthlyPayment - interest + extra, balance);
    balance = Math.max(0, balance - amort);
    out.push({
      number: i,
      dueDate: futureDate(i),
      principal: +amort.toFixed(2),
      interest: +interest.toFixed(2),
      payment: +(interest + amort).toFixed(2),
      remainingBalance: +balance.toFixed(2),
      isAdvanced: extra > 0,
    });
    if (balance <= 0.005) break;
  }
  return out;
}

function buildSac(principal: number, rate: number, n: number, advances: AdvancePayment[]): Installment[] {
  const baseAmort = principal / n;
  const out: Installment[] = [];
  let balance = principal;
  for (let i = 1; i <= n && balance > 0.005; i++) {
    const interest = balance * rate;
    const extra = advances.find((a) => a.installmentNumber === i)?.extraAmount || 0;
    const amort = Math.min(baseAmort + extra, balance);
    balance = Math.max(0, balance - amort);
    out.push({
      number: i,
      dueDate: futureDate(i),
      principal: +amort.toFixed(2),
      interest: +interest.toFixed(2),
      payment: +(interest + amort).toFixed(2),
      remainingBalance: +balance.toFixed(2),
      isAdvanced: extra > 0,
    });
    if (balance <= 0.005) break;
  }
  return out;
}

export function calcAmortization(
  principal: number,
  monthlyRate: number,
  totalInstallments: number,
  advancePayments: AdvancePayment[] = [],
  type: 'price' | 'sac' = 'price'
): AmortizationResult {
  const build = type === 'sac' ? buildSac : buildPrice;
  const originalSchedule = build(principal, monthlyRate, totalInstallments, []);
  const acceleratedSchedule = build(principal, monthlyRate, totalInstallments, advancePayments);
  const oInt = originalSchedule.reduce((s, i) => s + i.interest, 0);
  const aInt = acceleratedSchedule.reduce((s, i) => s + i.interest, 0);
  const interestSaved = oInt - aInt;
  const totalAdvanced = advancePayments.reduce((s, a) => s + a.extraAmount, 0);
  return {
    originalSchedule,
    acceleratedSchedule,
    savings: {
      interestSaved: +interestSaved.toFixed(2),
      monthsSaved: originalSchedule.length - acceleratedSchedule.length,
      newEndDate: acceleratedSchedule[acceleratedSchedule.length - 1]?.dueDate || '',
      roi:
        totalAdvanced > 0
          ? `Para cada R$1,00 adiantado, você economiza R$${(interestSaved / totalAdvanced).toFixed(2)} em juros`
          : '',
    },
  };
}

export interface ScenarioInput {
  label: string;
  principal: number;
  monthlyRate: number;
  totalInstallments: number;
  extraMonthly?: number;
  type?: 'price' | 'sac';
}

export function compareScenarios(scenarios: ScenarioInput[]): ScenarioSummary[] {
  const summaries: ScenarioSummary[] = scenarios.map((s) => {
    const advances: AdvancePayment[] = [];
    if (s.extraMonthly && s.extraMonthly > 0) {
      for (let i = 1; i <= s.totalInstallments; i++) {
        advances.push({ installmentNumber: i, extraAmount: s.extraMonthly });
      }
    }
    const r = calcAmortization(s.principal, s.monthlyRate, s.totalInstallments, advances, s.type || 'price');
    const sched = r.acceleratedSchedule;
    return {
      label: s.label,
      monthsToClear: sched.length,
      endDate: sched[sched.length - 1]?.dueDate || '',
      totalInterest: +sched.reduce((a, i) => a + i.interest, 0).toFixed(2),
      totalPaid: +sched.reduce((a, i) => a + i.payment, 0).toFixed(2),
      interestSavedVsBaseline: 0,
    };
  });
  const baseline = summaries[0]?.totalInterest || 0;
  for (const s of summaries) s.interestSavedVsBaseline = +(baseline - s.totalInterest).toFixed(2);
  return summaries;
}
