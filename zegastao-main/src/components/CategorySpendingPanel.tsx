import { useState } from 'react';
import { Settings2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useCategoryBudgets } from '@/hooks/useCategoryBudgets';
import { CategoryBudgetModal } from '@/components/flows/CategoryBudgetModal';
import { BENCHMARKS } from '@/lib/benchmarks';
import { formatBRL } from '@/lib/utils';
import { cn } from '@/lib/utils';

const CATEGORY_EMOJIS: Record<string, string> = {
  'Alimentação': '🍽️', 'Mercado': '🛒', 'Supermercado': '🛒', 'Delivery': '🛵',
  'Restaurantes': '🍴', 'Transporte': '🚌', 'Transporte app': '🚗', 'Combustível': '⛽',
  'Moradia': '🏠', 'Aluguel': '🏠', 'Saúde': '💊', 'Farmácia': '💊',
  'Lazer': '🎉', 'Entretenimento': '🎬', 'Streaming': '📺', 'Beleza': '💅',
  'Vestuário': '👕', 'Roupas': '👕', 'Educação': '📚', 'Cursos': '📚',
  'Viagem': '✈️', 'Academia': '🏋️', 'Pet': '🐾', 'Telefone': '📱',
  'Internet': '🌐', 'Energia': '⚡', 'Água': '💧', 'Condomínio': '🏢',
};

interface Props {
  byCategory: { name: string; amount: number }[];
  income: number;
  monthLabel?: string;
}

export function CategorySpendingPanel({ byCategory, income, monthLabel }: Props) {
  const { data: budgets } = useCategoryBudgets();
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (byCategory.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-center space-y-2">
        <h2 className="text-sm font-semibold">Gastos por categoria</h2>
        <p className="text-xs text-muted-foreground">
          Importe seu extrato bancário para ver para onde está indo seu dinheiro por categoria.
        </p>
        <a href="/upload" className="inline-block text-xs text-primary hover:underline font-medium">
          Importar extrato →
        </a>
      </div>
    );
  }

  const VISIBLE = 6;
  const items = expanded ? byCategory : byCategory.slice(0, VISIBLE);

  const monthName = monthLabel
    ? new Date(monthLabel + '-15').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null;
  const hasMore = byCategory.length > VISIBLE;

  const overCount = byCategory.filter((cat) => {
    const budget = budgets.find((b) => b.category === cat.name);
    const benchPct = BENCHMARKS[cat.name]?.ideal;
    const limit = budget?.monthlyLimit ?? (benchPct && income > 0 ? Math.round((benchPct / 100) * income) : 0);
    return limit > 0 && cat.amount > limit;
  }).length;

  return (
    <>
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold">Gastos por categoria</h2>
            {monthName && (
              <span className="text-[10px] rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 font-medium border border-amber-500/20">
                {monthName} · importe o extrato atual para ver o mês atual
              </span>
            )}
            {overCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                <AlertTriangle className="h-3 w-3" /> {overCount} acima
              </span>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <Settings2 className="h-3.5 w-3.5" /> Configurar limites
          </button>
        </div>

        <div className="space-y-3">
          {items.map((cat) => {
            const budget = budgets.find((b) => b.category === cat.name);
            const benchPct = BENCHMARKS[cat.name]?.ideal;
            const limit = budget?.monthlyLimit ?? (benchPct && income > 0 ? Math.round((benchPct / 100) * income) : 0);
            const hasLimit = limit > 0;
            const pct = hasLimit ? Math.min(200, (cat.amount / limit) * 100) : 0;
            const isOver = hasLimit && cat.amount > limit;
            const isWarn = hasLimit && pct >= 80 && !isOver;
            const emoji = CATEGORY_EMOJIS[cat.name] ?? '📦';

            return (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base shrink-0">{emoji}</span>
                    <span className="text-sm font-medium truncate">{cat.name}</span>
                    {budget && (
                      <span className="text-[10px] text-muted-foreground shrink-0">limite</span>
                    )}
                    {!budget && benchPct && (
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">benchmark</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {isOver && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                    <span className={cn('text-sm font-bold tabular-nums', isOver ? 'text-destructive' : 'text-foreground')}>
                      {formatBRL(cat.amount)}
                    </span>
                    {hasLimit && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        / {formatBRL(limit)}
                      </span>
                    )}
                  </div>
                </div>

                {hasLimit && (
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        isOver ? 'bg-destructive' : isWarn ? 'bg-amber-500' : 'bg-primary'
                      )}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                )}

                {!hasLimit && (
                  <div className="h-1 rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted-foreground/30 transition-all"
                      style={{ width: `${Math.min(100, income > 0 ? (cat.amount / income) * 300 : 30)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5" /> Ver menos</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> Ver mais {byCategory.length - VISIBLE} categorias</>
            )}
          </button>
        )}
      </div>

      {showModal && (
        <CategoryBudgetModal
          onClose={() => setShowModal(false)}
          categories={byCategory}
          income={income}
        />
      )}
    </>
  );
}
