// Comprime a situação financeira do usuário para ~300 tokens.
// NUNCA enviar transações raw para o Sonnet — sempre este resumo.

export interface UserContext {
  income: number;
  expenses: {
    total: number;
    byCategory: Array<{ name: string; amount: number }>;
  };
  debts: Array<{ balance: number; monthly_payment: number }>;
  goals: Array<{ name: string; current: number; target: number }>;
  rules: Array<{ is_active: boolean; month_redirected?: number }>;
}

export function buildCompressedContext(userData: UserContext): string {
  const { income, expenses, debts, goals, rules } = userData;
  const safeIncome = income || 1; // evita divisão por zero

  return `
SITUAÇÃO (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}):
Renda: R$${income.toFixed(0)} | Gastos: R$${expenses.total.toFixed(0)} | Saldo: R$${(income - expenses.total).toFixed(0)}

TOP GASTOS: ${expenses.byCategory
      .slice(0, 5)
      .map((c) => `${c.name}:R$${c.amount.toFixed(0)}(${((c.amount / safeIncome) * 100).toFixed(0)}%)`)
      .join(', ')}

DÍVIDAS: ${debts.length} ativas | Total: R$${debts.reduce((s, d) => s + d.balance, 0).toFixed(0)} | Parcelas/mês: R$${debts.reduce((s, d) => s + d.monthly_payment, 0).toFixed(0)}

METAS: ${goals.map((g) =>
        `${g.name}: R$${g.current.toFixed(0)}/R$${g.target.toFixed(0)}(${((g.current / (g.target || 1)) * 100).toFixed(0)}%)`
      ).join(' | ')}

REGRAS ATIVAS: ${rules.filter((r) => r.is_active).length} | Redirecionado mês: R$${rules.reduce((s, r) => s + (r.month_redirected || 0), 0).toFixed(0)}
`.trim();
}
