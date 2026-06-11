import { cn, formatBRL } from '@/lib/utils';
import { BettingObjectiveResult, BETTING_DISCLAIMER } from '@/types';
import { BettingMatchCard } from './BettingMatchCard';
import { ReturnCalculator } from './ReturnCalculator';

interface Props {
  result: BettingObjectiveResult;
}

const SEGMENT_COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500'];

export function BettingResultsGrid({ result }: Props) {
  const { analyses, budgetAllocation, totalSuggested, remainingBudget, sessionBudget } = result;
  const allocated = budgetAllocation.filter((a) => !a.skip);

  return (
    <div className="space-y-5">
      {/* Resumo de orçamento */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-400">Orçamento da sessão</span>
          <span className="font-bold text-slate-100">{formatBRL(sessionBudget)}</span>
        </div>
        {/* Barra segmentada */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
          {allocated.map((a, i) => (
            <div
              key={a.matchId}
              className={cn('h-full', SEGMENT_COLORS[i % SEGMENT_COLORS.length])}
              style={{ width: `${sessionBudget > 0 ? (a.suggestedStake / sessionBudget) * 100 : 0}%` }}
              title={`${a.homeTeam} × ${a.awayTeam}: ${formatBRL(a.suggestedStake)}`}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>Sugerido: <span className="text-emerald-400 font-semibold">{formatBRL(totalSuggested)}</span></span>
          <span>Não alocado: {formatBRL(remainingBudget)}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {analyses.map((analysis) => (
          <BettingMatchCard
            key={analysis.matchId}
            analysis={analysis}
            allocation={budgetAllocation.find((a) => a.matchId === analysis.matchId)}
          />
        ))}
      </div>

      {/* Calculadora de retorno (tema claro embutido) */}
      <div className="rounded-2xl bg-slate-900/40 p-1">
        <ReturnCalculator />
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
        <p className="text-[11px] leading-relaxed text-amber-300/90">{BETTING_DISCLAIMER}</p>
      </div>
    </div>
  );
}
