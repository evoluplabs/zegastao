// Motor de amortização — cálculo LOCAL, sem IA.
// Tabela Price e SAC, com adiantamento de parcelas e comparação de cenários.

export interface Installment {
  number: number;
  dueDate: string;        // yyyy-mm
  principal: number;      // amortização
  interest: number;       // juros
  payment: number;        // parcela total
  remainingBalance: number;
  isAdvanced?: boolean;   // recebeu pagamento extra neste mês
}

export interface AdvancePayment {
  installmentNumber: number;
  extraAmount: number;
}

export interface AmortizationResult {
  originalSchedule: Installment[];
  acceleratedSchedule: Installment[];
  savings: {
    interestSaved: number;
    monthsSaved: number;
    newEndDate: string;
    roi: string;
  };
}

function futureDate(monthsAhead: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().substring(0, 7);
}

function pricePayment(principal: number, rate: number, n: number): number {
  if (rate <= 0) return principal / n;
  return (
    principal * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1)
  );
}

// Gera a tabela Price (parcelas fixas), opcionalmente com adiantamentos.
function buildPriceSchedule(
  principal: number,
  rate: number,
  n: number,
  advances: AdvancePayment[]
): Installment[] {
  const monthlyPayment = pricePayment(principal, rate, n);
  const schedule: Installment[] = [];
  let balance = principal;

  for (let i = 1; i <= n && balance > 0.005; i++) {
    const interest = balance * rate;
    let amort = monthlyPayment - interest;
    const extra = advances.find((a) => a.installmentNumber === i)?.extraAmount || 0;
    amort = Math.min(amort + extra, balance);
    balance = Math.max(0, balance - amort);
    schedule.push({
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
  return schedule;
}

// Tabela SAC (amortização constante), opcionalmente com adiantamentos.
function buildSacSchedule(
  principal: number,
  rate: number,
  n: number,
  advances: AdvancePayment[]
): Installment[] {
  const baseAmort = principal / n;
  const schedule: Installment[] = [];
  let balance = principal;

  for (let i = 1; i <= n && balance > 0.005; i++) {
    const interest = balance * rate;
    const extra = advances.find((a) => a.installmentNumber === i)?.extraAmount || 0;
    let amort = Math.min(baseAmort + extra, balance);
    balance = Math.max(0, balance - amort);
    schedule.push({
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
  return schedule;
}

export function calcAmortization(
  principal: number,
  monthlyRate: number,
  totalInstallments: number,
  advancePayments: AdvancePayment[] = [],
  type: 'price' | 'sac' = 'price'
): AmortizationResult {
  const build = type === 'sac' ? buildSacSchedule : buildPriceSchedule;
  const originalSchedule = build(principal, monthlyRate, totalInstallments, []);
  const acceleratedSchedule = build(principal, monthlyRate, totalInstallments, advancePayments);

  const totalOriginalInterest = originalSchedule.reduce((s, i) => s + i.interest, 0);
  const totalAccInterest = acceleratedSchedule.reduce((s, i) => s + i.interest, 0);
  const interestSaved = totalOriginalInterest - totalAccInterest;
  const monthsSaved = originalSchedule.length - acceleratedSchedule.length;
  const totalAdvanced = advancePayments.reduce((s, a) => s + a.extraAmount, 0);

  return {
    originalSchedule,
    acceleratedSchedule,
    savings: {
      interestSaved: +interestSaved.toFixed(2),
      monthsSaved,
      newEndDate: acceleratedSchedule[acceleratedSchedule.length - 1]?.dueDate || '',
      roi:
        totalAdvanced > 0
          ? `Para cada R$1,00 adiantado, você economiza R$${(interestSaved / totalAdvanced).toFixed(2)} em juros`
          : '',
    },
  };
}

// ---- Comparação de cenários (até 3 lado a lado) ----

export interface Scenario {
  label: string;
  principal: number;
  monthlyRate: number;
  totalInstallments: number;
  extraMonthly?: number;          // pagamento extra fixo por mês
  type?: 'price' | 'sac';
}

export interface ScenarioSummary {
  label: string;
  monthsToClear: number;
  endDate: string;
  totalInterest: number;
  totalPaid: number;
  interestSavedVsBaseline: number;
}

export function compareScenarios(scenarios: Scenario[]): ScenarioSummary[] {
  const summaries = scenarios.map((s) => {
    const advances: AdvancePayment[] = [];
    if (s.extraMonthly && s.extraMonthly > 0) {
      for (let i = 1; i <= s.totalInstallments; i++) {
        advances.push({ installmentNumber: i, extraAmount: s.extraMonthly });
      }
    }
    const result = calcAmortization(s.principal, s.monthlyRate, s.totalInstallments, advances, s.type || 'price');
    const sched = result.acceleratedSchedule;
    const totalInterest = sched.reduce((a, i) => a + i.interest, 0);
    const totalPaid = sched.reduce((a, i) => a + i.payment, 0);
    return {
      label: s.label,
      monthsToClear: sched.length,
      endDate: sched[sched.length - 1]?.dueDate || '',
      totalInterest: +totalInterest.toFixed(2),
      totalPaid: +totalPaid.toFixed(2),
      interestSavedVsBaseline: 0,
    };
  });

  // O primeiro cenário é a linha de base; calcula economia relativa.
  const baselineInterest = summaries[0]?.totalInterest || 0;
  for (const s of summaries) {
    s.interestSavedVsBaseline = +(baselineInterest - s.totalInterest).toFixed(2);
  }
  return summaries;
}
