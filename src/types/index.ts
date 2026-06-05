// Tipos compartilhados do frontend (espelham a estrutura do Firestore).

export type TransactionType = 'in' | 'out';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  aiConfidence: number;
  aiCategorized: boolean;
  userCorrected?: boolean;
  source: string;
  bank?: string | null;
  isRecurring?: boolean;
  normalizedDesc?: string | null;
}

export interface Debt {
  id: string;
  creditor: string;
  type: string;
  totalBalance: number;
  monthlyPayment: number;
  remainingInstallments: number;
  interestRateMonthly: number;
  dueDay: number;
  status: 'active' | 'paid' | 'overdue';
  overdueMonths?: number;
  notes?: string;
}

export interface Goal {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  priority?: number;
  status: 'active' | 'done' | 'paused';
  color?: string;
}

export type TriggerType =
  | 'transaction_in_category'
  | 'category_monthly_over'
  | 'income_received';

export interface Rule {
  id: string;
  name: string;
  isActive: boolean;
  triggerType: TriggerType;
  triggerCategoryName?: string;
  triggerThreshold?: number;
  actionType?: 'redirect_percentage' | 'redirect_fixed';
  actionPercentage?: number;
  actionFixedAmount?: number;
  actionGoalId?: string;
  timesTriggered?: number;
  totalRedirected?: number;
  monthRedirected?: number;
}

export interface Upload {
  id: string;
  filename: string;
  fileType: string;
  bank?: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  totalTransactions?: number;
  errorMessage?: string;
}

export interface Insight {
  type: 'alert' | 'tip' | 'win' | 'projection';
  title: string;
  body: string;
  emoji?: string;
}

export type FinancialPhase =
  | 'survival'
  | 'reorganizing'
  | 'stabilizing'
  | 'accumulating'
  | 'growing';

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export interface Profile {
  name?: string;
  email?: string;
  monthlyIncome?: number;
  fixedExpenses?: number;
  onboardingDone?: boolean;
  financialPhase?: FinancialPhase;
  skills?: string[];
  investmentGoals?: string[];
  riskProfile?: RiskProfile;
  alreadyInvests?: 'yes' | 'no' | 'no_idea';
}

export interface Milestone {
  id: string;
  name: string;
  achievedAt?: { toDate: () => Date };
  celebrationShown?: boolean;
}

export interface DailyTask {
  title: string;
  category: 'renda_extra' | 'economia' | 'aprendizado' | 'investimento';
  estimatedTime: string;
  estimatedReturn?: string;
  platform?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type InvestmentType = 'tesouro' | 'cdb' | 'acoes' | 'cripto' | 'fii' | 'lci' | 'lca' | 'outro';

export interface Investment {
  id: string;
  type: InvestmentType;
  institution?: string;
  amount: number;
  currentValue?: number;
  purchaseDate?: string;
  ticker?: string;
  monthlyIncome?: number;
}

export const PHASE_LABELS: Record<FinancialPhase, string> = {
  survival: 'Sobrevivência',
  reorganizing: 'Reorganização',
  stabilizing: 'Estabilização',
  accumulating: 'Acumulação',
  growing: 'Crescimento',
};

// Marcos da trilha, na ordem em que aparecem (espelha o backend).
export const MILESTONE_ORDER = [
  { id: 'first_positive', name: 'Primeiro mês no azul' },
  { id: 'priciest_debt_cleared', name: 'Dívida mais cara quitada' },
  { id: 'all_debts_cleared', name: 'Todas as dívidas quitadas' },
  { id: 'reserve_1m', name: 'Reserva de 1 mês formada' },
  { id: 'reserve_3m', name: 'Reserva de 3 meses formada' },
  { id: 'first_investment', name: 'Primeiro investimento' },
  { id: 'invested_1k', name: 'R$ 1.000 investidos' },
  { id: 'invested_10k', name: 'R$ 10.000 investidos' },
  { id: 'passive_10', name: 'Renda passiva cobre 10% dos gastos' },
  { id: 'passive_100', name: 'Liberdade financeira' },
] as const;

export const INVESTMENT_DISCLAIMER =
  'Orientação educacional, não consultoria financeira regulamentada pela CVM. ' +
  'Investimentos envolvem riscos, incluindo perda do capital investido. ' +
  'Para decisões, consulte um assessor certificado.';

export const CATEGORIES = [
  'Moradia', 'Alimentação', 'Delivery', 'Restaurantes',
  'Transporte', 'Transporte app', 'Combustível',
  'Saúde', 'Farmácia', 'Educação',
  'Lazer', 'Streaming', 'Vestuário', 'Beleza',
  'Tecnologia', 'Telefone/Internet', 'Energia elétrica', 'Água/esgoto',
  'Mercado', 'Investimentos', 'Fatura cartão', 'Parcela empréstimo',
  'Financiamento', 'Empréstimo', 'Transferência',
  'Salário', 'Renda extra', 'Outros',
] as const;
