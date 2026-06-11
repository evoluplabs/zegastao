// Fase financeira do usuário — calculada automaticamente pelo job noturno.
// O app começa como gestor de dívidas e termina como assessor de patrimônio;
// a fase determina o que o copiloto fala e o que o dashboard mostra.

export type FinancialPhase =
  | 'survival'       // saldo mensal negativo — parar o sangramento
  | 'reorganizing'   // no azul, mas ainda com dívidas
  | 'stabilizing'    // sem dívidas, construindo reserva de emergência
  | 'accumulating'   // reserva ok, primeiros investimentos
  | 'growing';       // carteira diversificada

export interface PhaseInput {
  monthlyBalance: number;   // renda - gastos - parcelas de dívida
  totalDebt: number;
  emergencyFund: number;
  fixedExpenses: number;
  totalInvestments: number;
}

export function calculatePhase(d: PhaseInput): FinancialPhase {
  if (d.monthlyBalance < 0) return 'survival';
  if (d.totalDebt > 0) return 'reorganizing';
  if (d.emergencyFund < d.fixedExpenses * 3) return 'stabilizing';
  if (d.totalInvestments < 10000) return 'accumulating';
  return 'growing';
}

// Orientação de investimento por fase — injetada no system prompt do copiloto.
export const PHASE_INVESTMENT_CONTEXT: Record<FinancialPhase, string> = {
  survival: `FASE ATUAL: Sobrevivência. NÃO mencione investimentos.
Foco exclusivo: cortar gastos e quitar dívidas de maior juros.
Tom: direto, urgente, sem rodeios, mas sem julgamento — "estamos nisso juntos".
Se perguntado sobre investimentos: "Antes de investir, precisamos parar o sangramento. Cada R$1 de juros é R$1 que não trabalha pra você."`,
  reorganizing: `FASE ATUAL: Reorganização. Mencione investimentos apenas se perguntado.
Foco: quitar dívidas e criar disciplina. Tom: encorajador, "cada real a menos em dívida é uma vitória".
Se perguntado, oriente o Tesouro Selic como "guardar dinheiro seguro" para a reserva — ainda não como investimento.`,
  stabilizing: `FASE ATUAL: Estabilização. Pode introduzir investimentos conservadores.
Tom: celebratório, construindo confiança — "você passou o pior".
Sugestão padrão: Tesouro Selic, CDB de liquidez diária, conta remunerada. Meta: reserva = 3× despesas fixas.`,
  accumulating: `FASE ATUAL: Acumulação. Expandir para renda variável passiva.
Tom: educativo e empolgante — "seu dinheiro começa a trabalhar por você".
Progressão: Tesouro → CDB → Fundos de índice (BOVA11/IVVB11) → Ações. Bitcoin/cripto só se perguntado e com aviso de risco.`,
  growing: `FASE ATUAL: Crescimento. Base sólida.
Tom: estratégico e ambicioso — "vamos pensar em legado, não só em contas".
Pode discutir carteira diversificada, aportes regulares, dividendos, FIIs e cripto como % pequena.`,
};

// Aviso legal obrigatório em qualquer contexto de investimento.
export const INVESTMENT_DISCLAIMER =
  'Este app oferece orientação educacional, não consultoria financeira regulamentada pela CVM. ' +
  'Investimentos envolvem riscos, incluindo perda do capital. Para decisões, consulte um assessor certificado.';

// ---- Trilha de evolução: marcos sequenciais ----

export interface MilestoneDef {
  id: string;
  name: string;
  reached: (s: MilestoneState) => boolean;
}

export interface MilestoneState {
  monthlyBalance: number;
  highestRateDebtCleared: boolean;
  allDebtsCleared: boolean;
  emergencyFund: number;
  fixedExpenses: number;
  totalInvestments: number;
  passiveIncome: number;
  monthlyExpenses: number;
}

export const MILESTONES: MilestoneDef[] = [
  { id: 'first_positive', name: 'Primeiro mês no azul', reached: (s) => s.monthlyBalance > 0 },
  { id: 'priciest_debt_cleared', name: 'Dívida mais cara quitada', reached: (s) => s.highestRateDebtCleared },
  { id: 'all_debts_cleared', name: 'Todas as dívidas quitadas', reached: (s) => s.allDebtsCleared },
  { id: 'reserve_1m', name: 'Reserva de 1 mês formada', reached: (s) => s.emergencyFund >= s.fixedExpenses * 1 && s.fixedExpenses > 0 },
  { id: 'reserve_3m', name: 'Reserva de 3 meses formada', reached: (s) => s.emergencyFund >= s.fixedExpenses * 3 && s.fixedExpenses > 0 },
  { id: 'first_investment', name: 'Primeiro investimento', reached: (s) => s.totalInvestments > 0 },
  { id: 'invested_1k', name: 'R$ 1.000 investidos', reached: (s) => s.totalInvestments >= 1000 },
  { id: 'invested_10k', name: 'R$ 10.000 investidos', reached: (s) => s.totalInvestments >= 10000 },
  { id: 'passive_10', name: 'Renda passiva cobre 10% dos gastos', reached: (s) => s.monthlyExpenses > 0 && s.passiveIncome >= s.monthlyExpenses * 0.1 },
  { id: 'passive_100', name: 'Liberdade financeira: renda passiva cobre 100% dos gastos', reached: (s) => s.monthlyExpenses > 0 && s.passiveIncome >= s.monthlyExpenses },
];
