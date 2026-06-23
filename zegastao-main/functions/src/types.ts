import { Timestamp } from 'firebase-admin/firestore';

export type TransactionType = 'in' | 'out';

export interface ParsedTransaction {
  date: string;            // ISO yyyy-mm-dd
  description: string;
  amount: number;          // positive = entrada, negative = saída
  type: TransactionType;
  category?: string;
  aiConfidence?: number;
  aiCategorized?: boolean;
  normalizedDesc?: string;
  bank?: string;
  isRecurring?: boolean;
  id?: string;
  // Parcelamento inteligente
  isInstallment?: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
  installmentGroup?: string; // hash normalizado para agrupar parcelas do mesmo produto
}

export interface Debt {
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
  actionCaixinhaId?: string;
  timesTriggered?: number;
  totalRedirected?: number;
  monthRedirected?: number;
  lastTriggeredAt?: Timestamp | Date;
}

export interface Insight {
  type: 'alert' | 'tip' | 'win' | 'projection';
  title: string;
  body: string;
  emoji?: string;
}
