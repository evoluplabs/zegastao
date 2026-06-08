// Tipos compartilhados do frontend (espelham a estrutura do Firestore).

// ---- Zé Apostador ----

export interface BettingProfile {
  weeklyBudget: number;
  copilotSuggestedBudget: number;
  preferredMarkets: string[];
  preferredLeagues: string[];
  bettingEnabled: boolean;
  acceptedRiskDisclaimer: boolean;
  selfExclusionUntil?: { toDate: () => Date };
  totalStaked: number;
  totalWon: number;
  weeklyStaked: number;
  weeklyReset: string;
}

export interface ValueMarket {
  market: string;
  selection: string;
  bestOdd: number;
  worstOdd: number;
  impliedProb: number;
  marginPct: number;
  bookmaker: string;
  hasValue: boolean;
}

export interface StrategyOutput {
  primaryMarket: string;
  primarySelection: string;
  primaryOdd: number;
  alternativeMarket?: string;
  alternativeSelection?: string;
  alternativeOdd?: number;
  betType: 'simples' | 'multipla';
  confidenceScore: number;
  minimumOdd: number;
  reasoning: string;
}

export interface BettingAnalysis {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  agentOutputs: {
    form: string;
    h2h: string;
    oddsValue: string;
    strategy: StrategyOutput;
  };
  finalAnalysis: string;
  confidenceScore: number;
  recommendedMarket: string;
  recommendedSelection: string;
  recommendedOdd: number;
  minimumOdd: number;
  alternativeMarket?: string;
  alternativeSelection?: string;
  alternativeOdd?: number;
  suggestedStake: number;
  betType: 'simples' | 'multipla';
  availableMarkets: ValueMarket[];
  disclaimer: string;
}

export interface BettingHistory {
  id: string;
  analysisId?: string;
  market: string;
  selection: string;
  odd: number;
  amount: number;
  outcome: 'pending' | 'hit' | 'miss';
  profit: number;
  createdAt: { toDate: () => Date };
}

// Ligas populares para o MVP
export const BETTING_LEAGUES = [
  { key: 'soccer_brazil_serie_a', label: 'Brasileirão Série A' },
  { key: 'soccer_brazil_serie_b', label: 'Brasileirão Série B' },
  { key: 'soccer_epl', label: 'Premier League' },
  { key: 'soccer_spain_la_liga', label: 'La Liga' },
  { key: 'soccer_germany_bundesliga', label: 'Bundesliga' },
  { key: 'soccer_italy_serie_a', label: 'Serie A (Itália)' },
  { key: 'soccer_france_ligue_one', label: 'Ligue 1' },
  { key: 'soccer_uefa_champs_league', label: 'Champions League' },
] as const;

export const BETTING_MARKET_LABELS: Record<string, string> = {
  h2h: 'Resultado (1X2)',
  btts: 'Ambas Marcam',
  totals: 'Total de Gols',
  spreads: 'Handicap Asiático',
};

export const BETTING_DISCLAIMER =
  'Esta análise é educacional e não garante resultados. Apostas esportivas envolvem risco de perda total do valor apostado. Aposte com responsabilidade e dentro do seu limite semanal configurado com o Copiloto.';

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
  statementType?: 'checking' | 'credit_card' | null;
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

export type StatementType = 'checking' | 'credit_card';

export interface Upload {
  id: string;
  filename: string;
  fileType: string;
  bank?: string;
  statementType?: StatementType;
  status: 'uploading' | 'processing' | 'done' | 'error';
  totalTransactions?: number;
  errorMessage?: string;
  errorCode?: 'password' | 'unreadable' | 'unsupported' | 'generic';
  periodStart?: string;
  periodEnd?: string;
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

// ---- Amortização e projeções ----

export interface Installment {
  number: number;
  dueDate: string;
  principal: number;
  interest: number;
  payment: number;
  remainingBalance: number;
  isAdvanced?: boolean;
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

export interface ScenarioSummary {
  label: string;
  monthsToClear: number;
  endDate: string;
  totalInterest: number;
  totalPaid: number;
  interestSavedVsBaseline: number;
}

// ---- Contratos e documentos ----

export type ContractType =
  | 'personal_loan' | 'financing' | 'credit_card'
  | 'overdraft' | 'consortium' | 'other';

export interface ExtractedContract {
  contractNumber?: string;
  creditor: string;
  contractDate: string;
  contractType: ContractType;
  principalAmount: number;
  totalAmount: number;
  monthlyInterestRate: number;
  annualInterestRate: number;
  cetRate?: number;
  totalInstallments: number;
  installmentAmount: number;
  firstDueDate: string;
  lastDueDate: string;
  amortizationType: 'price' | 'sac' | 'other';
  latePaymentFee?: number;
  lateInterestRate?: number;
  earlyPaymentDiscount?: boolean;
  keyClausesForUser: string[];
  redFlags: string[];
  negotiationOpportunities: string[];
}

export interface Contract {
  id: string;
  filename: string;
  status: 'pending' | 'analyzing' | 'analyzed' | 'error';
  storagePath?: string;
  extracted?: ExtractedContract;
  linkedDebtId?: string | null;
  errorMessage?: string;
}

export type DocumentType = 'contract' | 'statement' | 'receipt' | 'proof' | 'other';

export interface UserDocument {
  id: string;
  filename: string;
  type: DocumentType;
  description?: string;
  tags?: string[];
  storagePath?: string;
  linkedEntityId?: string;
}

// ---- Contexto pessoal ----

export interface CopilotNotes {
  behaviorPatterns?: string[];
  strengths?: string[];
  riskAreas?: string[];
  progressNotes?: string[];
  suggestedFocus?: string;
  lastAnalysis?: string;
}

export interface UserWrittenContext {
  skills?: string[];
  goals?: string[];
  fears?: string[];
  currentFeelings?: string;
  impulses?: string[];
  lifeEvents?: string[];
  notes?: string;
}

export interface ImpulseItem {
  id: string;
  impulse: string;
  copilotResponse?: string;
  outcome: 'resisted' | 'acted' | 'pending';
  impactIfActed?: number | null;
}

// ---- Assinaturas e Planos ----

export type PlanId = 'free' | 'copiloto_monthly' | 'copiloto_annual';

export interface PlanLimits {
  chatMessagesPerDay: number;
  uploadsPerMonth: number;
  contractAnalysis: boolean;
  pushNotifications: boolean;
  dailyInsights: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    chatMessagesPerDay: 10,
    uploadsPerMonth: 2,
    contractAnalysis: false,
    pushNotifications: false,
    dailyInsights: false,
  },
  copiloto_monthly: {
    chatMessagesPerDay: 50,
    uploadsPerMonth: Infinity,
    contractAnalysis: true,
    pushNotifications: true,
    dailyInsights: true,
  },
  copiloto_annual: {
    chatMessagesPerDay: 50,
    uploadsPerMonth: Infinity,
    contractAnalysis: true,
    pushNotifications: true,
    dailyInsights: true,
  },
};

export const PLAN_PRICES: Record<PlanId, { label: string; monthly: number; yearly?: number }> = {
  free: { label: 'Gratuito', monthly: 0 },
  copiloto_monthly: { label: 'Copiloto', monthly: 1990 },
  copiloto_annual: { label: 'Copiloto Anual', monthly: 1490, yearly: 17880 },
};

export interface Subscription {
  plan: PlanId;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'inactive';
  mpSubscriptionId?: string;
  currentPeriodEnd?: { toDate: () => Date };
  uploadsThisMonth?: number;
}

// ---- Negociação ----

export interface NegotiationAlert {
  debtId: string;
  creditor: string;
  message: string;
  action: string;
  scriptId: string;
}
