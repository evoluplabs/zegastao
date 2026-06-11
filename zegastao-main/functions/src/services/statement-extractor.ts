// Extrai o resumo da fatura de cartão (total, juros, mínimo, vencimento) do texto
// reconstruído do PDF, para auto-popular a dívida do cartão de forma TRANSPARENTE
// (o doc criado é marcado com source:'auto-upload' e o usuário pode editar/excluir).
import { parseBRAmount } from './parsers/bank-detector';

export interface StatementDebt {
  creditor: string;
  totalBalance: number;
  interestRateMonthly: number;
  monthlyPayment: number;
  dueDay: number;
}

const BANK_LABELS: Record<string, string> = {
  nubank: 'Nubank', inter: 'Inter', itau: 'Itaú', bradesco: 'Bradesco',
  santander: 'Santander', caixa: 'Caixa', bb: 'Banco do Brasil', c6: 'C6',
};

// Converte percentual BR ("16,1" → 16.1; "1.234,5" → 1234.5)
function parsePercent(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

export function extractCreditCardDebt(text: string, bank: string): StatementDebt | null {
  if (!text) return null;

  // Total a pagar — o primeiro match costuma ser o valor da fatura.
  const total = text.match(/Total a pagar:?\s*R\$\s*([\d.]+,\d{2})/i);
  const totalBalance = total ? (parseBRAmount(total[1]) ?? 0) : 0;
  if (totalBalance <= 0) return null;

  // Juros rotativo ("Juros rotativo 16,1% ao mês" ou "rotativos de 16,1% ao mês")
  // Armazenado como FRAÇÃO (0.161) para bater com o padrão do app (Debts.tsx
  // grava rate/100 e exibe rate*100).
  const juros =
    text.match(/juros rotativo\s*([\d.,]+)\s*%?\s*ao m[êe]s/i) ||
    text.match(/rotativos?\s*de\s*([\d.,]+)\s*%\s*ao m[êe]s/i);
  const interestRateMonthly = juros ? parsePercent(juros[1]) / 100 : 0;

  // Pagamento mínimo ("Pagamento mínimo ... R$ 683,83")
  const minimo = text.match(/pagamento m[íi]nimo[^R]{0,40}R\$\s*([\d.]+,\d{2})/i);
  const monthlyPayment = minimo ? (parseBRAmount(minimo[1]) ?? 0) : 0;

  // Dia de vencimento ("Data de vencimento: 22 ABR 2026")
  const venc = text.match(/vencimento:?\s*(\d{1,2})\s+[A-Za-zÀ-ú]{3}/i);
  const dueDay = venc ? parseInt(venc[1], 10) : 1;

  const label = BANK_LABELS[bank] || (bank ? bank[0].toUpperCase() + bank.slice(1) : 'Cartão');
  return {
    creditor: `Cartão ${label}`,
    totalBalance,
    interestRateMonthly,
    monthlyPayment,
    dueDay,
  };
}
