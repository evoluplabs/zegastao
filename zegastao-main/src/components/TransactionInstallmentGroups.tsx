import { useState } from 'react';
import { ChevronDown, ChevronUp, CreditCard, ShoppingCart } from 'lucide-react';
import { formatBRL } from '@/lib/utils';
import { useTransactionInstallments } from '@/hooks/useTransactionInstallments';

export function TransactionInstallmentGroups() {
  const { groups, loading } = useTransactionInstallments();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) return null;
  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Parcelas no extrato
        </h3>
      </div>

      {groups.map((g) => {
        const isOpen = expanded === g.group;
        const progressPct = g.total > 0 ? Math.round((g.paid / g.total) * 100) : 0;
        const remaining = g.total - g.paid;
        const avgInstallment = g.found > 0 ? g.totalAmount / g.found : 0;
        const projectedTotal = avgInstallment * g.total;

        return (
          <div key={g.group} className="rounded-xl border bg-card overflow-hidden">
            {/* Header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
              onClick={() => setExpanded(isOpen ? null : g.group)}
            >
              <CreditCard className="h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{g.merchantLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {g.found} de {g.total}x encontradas · {formatBRL(avgInstallment)}/parcela
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{formatBRL(g.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  {remaining > 0 ? `${remaining} restantes` : 'Quitado'}
                </p>
              </div>
              {isOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              }
            </button>

            {/* Barra de progresso */}
            <div className="px-4 pb-1">
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Detalhes expandidos */}
            {isOpen && (
              <div className="px-4 pb-4 pt-2 space-y-3 border-t mt-1">
                {/* Resumo financeiro */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-secondary/40 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Pago até agora</p>
                    <p className="text-sm font-semibold">{formatBRL(avgInstallment * g.paid)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/40 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Total projetado</p>
                    <p className="text-sm font-semibold">{formatBRL(projectedTotal)}</p>
                  </div>
                </div>

                {/* Lista de parcelas */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Parcelas ({g.found} encontradas)
                  </p>
                  {g.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-2 text-sm py-1">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium shrink-0">
                        {tx.installmentCurrent}
                      </span>
                      <span className="text-muted-foreground text-xs">{tx.date}</span>
                      <span className="flex-1 truncate text-xs">{tx.description}</span>
                      <span className="font-medium text-xs">{formatBRL(Math.abs(tx.amount))}</span>
                    </div>
                  ))}
                  {g.found < g.total && (
                    <p className="text-xs text-muted-foreground italic pt-1">
                      {g.total - g.found} parcelas ainda não aparecem no extrato importado.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
