import { useState, useMemo } from 'react';
import { X, Zap, TrendingDown } from 'lucide-react';
import { projectDebtPayoff } from '@/lib/projection';
import { formatBRL } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Debt } from '@/types';

interface Props {
  debt: Debt;
  onClose: () => void;
}

function monthsLabel(m: number): string {
  if (m <= 0) return '—';
  if (m < 12) return `${m} ${m > 1 ? 'meses' : 'mês'}`;
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return `${y} ano${y > 1 ? 's' : ''}${mo > 0 ? ` e ${mo} ${mo > 1 ? 'meses' : 'mês'}` : ''}`;
}

export function DebtSimulator({ debt, onClose }: Props) {
  const [extra, setExtra] = useState(50);
  const maxExtra = Math.max(500, Math.round(debt.monthlyPayment * 2));

  const baseline = useMemo(
    () => projectDebtPayoff([debt], 0, 'avalanche'),
    [debt]
  );

  const accelerated = useMemo(
    () => projectDebtPayoff([debt], extra, 'avalanche'),
    [debt, extra]
  );

  const monthsSaved = baseline.monthsToClear - accelerated.monthsToClear;
  const interestSaved = baseline.totalInterestPaid - accelerated.totalInterestPaid;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="font-bold text-base">E se eu pagar a mais?</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="rounded-xl border bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground">Dívida</p>
            <p className="font-semibold text-sm">{debt.creditor}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatBRL(debt.totalBalance)} · parcela {formatBRL(debt.monthlyPayment)}/mês · {(debt.interestRateMonthly * 100).toFixed(1)}% a.m.
            </p>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Quanto a mais por mês?</p>
              <p className="text-lg font-bold text-primary">{formatBRL(extra)}</p>
            </div>
            <input
              type="range"
              min={0}
              max={maxExtra}
              step={10}
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>R$ 0</span>
              <span>{formatBRL(maxExtra)}</span>
            </div>
          </div>

          {/* Comparação */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/5 dark:border-red-500/20 p-3">
              <p className="text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">Ritmo atual</p>
              <p className="text-lg font-extrabold text-red-600 dark:text-red-400 mt-1">
                {monthsLabel(baseline.monthsToClear)}
              </p>
              <p className="text-[10px] text-red-500/80 mt-0.5">
                {formatBRL(baseline.totalInterestPaid)} em juros
              </p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-500/5 dark:border-green-500/20 p-3">
              <p className="text-[10px] font-semibold uppercase text-green-600 dark:text-green-400">Pagando +{formatBRL(extra)}</p>
              <p className="text-lg font-extrabold text-green-600 dark:text-green-400 mt-1">
                {monthsLabel(accelerated.monthsToClear)}
              </p>
              <p className="text-[10px] text-green-600/80 mt-0.5">
                {formatBRL(accelerated.totalInterestPaid)} em juros
              </p>
            </div>
          </div>

          {/* Resultado */}
          {extra > 0 && monthsSaved > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-primary">
                  Você quita {monthsLabel(monthsSaved)} antes
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  E economiza <strong className="text-foreground">{formatBRL(interestSaved)}</strong> que iriam pro banco em juros.
                  {extra >= 50 && interestSaved > extra * 6 && ' Cada real extra vale muito aqui.'}
                </p>
              </div>
            </div>
          )}

          {extra > 0 && monthsSaved <= 0 && (
            <p className={cn('text-xs text-center text-muted-foreground')}>
              Com esse valor o prazo não muda — tente um valor maior.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
