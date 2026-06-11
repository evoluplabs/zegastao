import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { formatBRL, formatPct } from '@/lib/utils';

// Categorias consideradas não-essenciais (corte possível)
const NON_ESSENTIAL = new Set([
  'Delivery', 'Restaurantes', 'Lazer', 'Streaming', 'Compras',
  'Vestuário', 'Beleza', 'Assinaturas', 'Jogos', 'Apostas',
]);

interface Props {
  income: number;
  byCategory: Array<{ name: string; amount: number }>;
}

export function SpendingAlert({ income, byCategory }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || income <= 0) return null;

  const nonEssential = byCategory.filter((c) => NON_ESSENTIAL.has(c.name));
  const nonEssentialTotal = nonEssential.reduce((s, c) => s + c.amount, 0);
  const pct = (nonEssentialTotal / income) * 100;

  // Alerta só dispara quando gastos não-essenciais passam de 30% da renda
  if (pct < 30) return null;

  const topCategory = nonEssential.sort((a, b) => b.amount - a.amount)[0];

  return (
    <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20 p-4 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-amber-600/60 hover:text-amber-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
            Tá gastando demais com {topCategory?.name.toLowerCase() || 'supérfluos'}
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-1 leading-relaxed">
            {formatBRL(nonEssentialTotal)} ({formatPct(pct)} da renda) foram para gastos que dá pra cortar este mês.
            {topCategory && ` Só ${topCategory.name.toLowerCase()}: ${formatBRL(topCategory.amount)}.`}
          </p>
          <Link
            to="/transactions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline mt-2"
          >
            Ver onde cortar <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
