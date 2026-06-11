// Calculadora de Liberdade Financeira (FIRE — Financial Independence, Retire Early).
// Todos os cálculos são locais — zero custo.

export interface FireInput {
  monthlyIncome: number;         // renda mensal bruta
  monthlyExpenses: number;       // gastos mensais atuais
  currentAssets: number;         // patrimônio já acumulado
  annualReturnPct: number;       // retorno anual esperado dos investimentos (ex: 10)
  inflationPct: number;          // inflação anual esperada (ex: 5)
  targetMultiplier?: number;     // múltiplo de despesas para meta (padrão: 25 — regra dos 4%)
}

export interface FireResult {
  targetAmount: number;          // patrimônio necessário para FIRE
  monthlySavings: number;        // quanto está poupando por mês atualmente
  savingsRate: number;           // taxa de poupança (0–1)
  yearsToFire: number | null;    // anos até atingir FIRE (null = impossível com custos atuais)
  monthsToFire: number | null;
  chart: { year: number; balance: number }[];  // evolução patrimonial (máx 50 anos)
  passiveIncomeNow: number;      // renda passiva que o patrimônio atual geraria (anual → mensal)
  firePhase: 'survival' | 'saving' | 'on_track' | 'close' | 'achieved';
  motivationalNote: string;
}

export function calcFire(input: FireInput): FireResult {
  const {
    monthlyIncome,
    monthlyExpenses,
    currentAssets,
    annualReturnPct,
    inflationPct,
    targetMultiplier = 25,
  } = input;

  const annualExpenses = monthlyExpenses * 12;
  const targetAmount = annualExpenses * targetMultiplier;

  const monthlySavings = Math.max(0, monthlyIncome - monthlyExpenses);
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;

  // Taxa real mensal (desconta inflação)
  const nominalMonthlyRate = (1 + annualReturnPct / 100) ** (1 / 12) - 1;
  const realMonthlyRate = (1 + nominalMonthlyRate) / (1 + inflationPct / 100 / 12) - 1;

  const passiveIncomeNow = (currentAssets * realMonthlyRate);

  // Simulação mês a mês até atingir targetAmount ou 600 meses (50 anos)
  let balance = currentAssets;
  const chart: { year: number; balance: number }[] = [{ year: 0, balance }];
  let monthsToFire: number | null = null;

  for (let m = 1; m <= 600; m++) {
    balance = balance * (1 + realMonthlyRate) + monthlySavings;

    if (m % 12 === 0) {
      chart.push({ year: m / 12, balance });
    }

    if (monthsToFire === null && balance >= targetAmount) {
      monthsToFire = m;
    }
  }

  const yearsToFire = monthsToFire !== null ? monthsToFire / 12 : null;

  // Fase
  let firePhase: FireResult['firePhase'];
  if (monthlySavings <= 0) firePhase = 'survival';
  else if (savingsRate < 0.1) firePhase = 'saving';
  else if (yearsToFire === null || yearsToFire > 30) firePhase = 'saving';
  else if (yearsToFire > 10) firePhase = 'on_track';
  else if (yearsToFire > 2) firePhase = 'close';
  else firePhase = 'achieved';

  const motivational: Record<FireResult['firePhase'], string> = {
    survival: 'Primeiro passo: equilibre receitas e despesas. Mesmo R$50/mês investidos fazem diferença no longo prazo.',
    saving: 'Você está poupando! Aumentar a taxa de poupança é o caminho mais rápido para a liberdade financeira.',
    on_track: 'Você está no caminho certo. Mantenha a consistência e revise os aportes anualmente.',
    close: 'Você está perto da liberdade financeira! Considere aumentar os aportes para acelerar a chegada.',
    achieved: 'Parabéns! Com o patrimônio atual e aportes mensais, você pode atingir FIRE em breve.',
  };

  return {
    targetAmount,
    monthlySavings,
    savingsRate,
    yearsToFire,
    monthsToFire,
    chart: chart.slice(0, 51),
    passiveIncomeNow,
    firePhase,
    motivationalNote: motivational[firePhase],
  };
}
