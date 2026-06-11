import { TrendingDown, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatBRL, formatPct } from '@/lib/utils';
import { BENCHMARKS } from '@/lib/benchmarks';

interface CategoryItem {
  name: string;
  amount: number;
}

interface Props {
  byCategory: CategoryItem[];
  income: number;
}

export function SpendingFocus({ byCategory, income }: Props) {
  if (byCategory.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground flex items-center gap-3">
        <Upload className="h-4 w-4 shrink-0" />
        <span>
          Importe seu extrato para ver para onde vai seu dinheiro e receber dicas personalizadas.{' '}
          <Link to="/upload" className="text-primary underline">Importar agora</Link>
        </span>
      </div>
    );
  }

  const top = byCategory[0];
  const pct = income > 0 ? (top.amount / income) * 100 : 0;
  const bench = BENCHMARKS[top.name];
  const idealAmount = bench && income > 0 ? (bench.ideal / 100) * income : null;
  const overValue = idealAmount ? Math.max(0, top.amount - idealAmount) : 0;

  return (
    <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-500/5 px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
          <TrendingDown className="h-3.5 w-3.5" /> Para onde foi mais dinheiro
        </p>
        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{top.name}</span>
      </div>
      <p className="text-sm text-amber-900 dark:text-amber-300">
        <strong>{formatBRL(top.amount)}</strong>
        {income > 0 && <> — {formatPct(pct, 1)} da sua renda</>}
      </p>
      {bench && idealAmount && overValue > 0 ? (
        <p className="text-xs text-amber-700/80 dark:text-amber-400/70 leading-snug">
          Ideal: até {formatPct(bench.ideal)} ({formatBRL(idealAmount)}). Você gastou {formatBRL(overValue)} a mais.
          {bench.tip && <> 💡 {bench.tip}</>}
        </p>
      ) : bench ? (
        <p className="text-xs text-green-700 dark:text-green-400">
          Dentro do ideal (até {formatPct(bench.ideal)} da renda). Bom trabalho!
        </p>
      ) : null}
    </div>
  );
}
