// Estrutura extraída de um contrato financeiro pela IA.
export type ContractType =
  | 'personal_loan'
  | 'financing'
  | 'credit_card'
  | 'overdraft'
  | 'consortium'
  | 'other';

export interface ExtractedContract {
  contractNumber?: string;
  creditor: string;
  contractDate: string;
  contractType: ContractType;

  principalAmount: number;
  totalAmount: number;
  monthlyInterestRate: number;   // decimal (12% = 0.12)
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
