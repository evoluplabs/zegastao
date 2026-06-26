import type { Account, Transaction } from '@/types';

/**
 * Categorias neutras: movimentações internas entre contas próprias.
 * Não devem entrar em Entradas nem Saídas no fluxo do mês — são ruído,
 * não receita nem despesa real.
 */
export const NEUTRAL_CATEGORIES = new Set([
  'Fatura cartão',
  'Transferência',
  'Pagamento fatura',
  'Investimentos', // saída de conta-corrente que vira ativo — não é despesa de consumo
]);

export function isNeutral(category: string): boolean {
  return NEUTRAL_CATEGORIES.has(category);
}

/**
 * Calcula o saldo real de uma conta.
 *
 * Modelo:
 *  - account.balance  = saldo reconciliado manualmente (âncora)
 *  - account.balancedAt = data da última reconciliação (YYYY-MM-DD)
 *  - Transações com accountId == account.id e date > balancedAt
 *    (exceto neutras) ajustam o saldo a partir da âncora.
 *
 * Se não houver balancedAt, retorna o balance estático — retrocompatível.
 */
export function computeBalance(account: Account, allTransactions: Transaction[]): number {
  if (!account.balancedAt) return account.balance;
  const delta = allTransactions
    .filter(
      (t) =>
        t.accountId === account.id &&
        t.date > account.balancedAt! &&
        !isNeutral(t.category)
    )
    .reduce((s, t) => s + t.amount, 0);
  return account.balance + delta;
}

/** Retorna "YYYY-MM" do mês atual. */
export function currentMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Retorna "YYYY-MM" do mês anterior a um dado "YYYY-MM". */
export function prevMonthOf(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Label legível de um "YYYY-MM". */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

/** Avança ou recua um "YYYY-MM" por `delta` meses. */
export function shiftMonth(ym: string, delta: 1 | -1): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
