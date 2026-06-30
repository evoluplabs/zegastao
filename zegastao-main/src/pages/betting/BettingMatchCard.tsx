import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { cn, formatBRL } from '@/lib/utils';
import { BettingAnalysis, BudgetAllocationItem, BETTING_MARKET_LABELS } from '@/types';
import { AgentInsights } from './AgentInsights';

interface Props {
  analysis: BettingAnalysis & { matchId: string; kickoff: string };
  allocation?: BudgetAllocationItem;
}

function confColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}
function confBg(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function kickoffTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function BettingMatchCard({ analysis, allocation }: Props) {
  const [expanded, setExpanded] = useState(false);
  const score = analysis.confidenceScore;
  const skip = allocation?.skip;

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/70">
      {/* Header */}
      <div className="border-b border-stone-800 px-4 py-3">
        <div className="mb-1 flex items-center justify-between text-xs text-stone-400">
          <span>{analysis.league}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {kickoffTime(analysis.kickoff)}
          </span>
        </div>
        <h3 className="text-base font-bold text-stone-100">
          {analysis.homeTeam} <span className="text-stone-500">×</span> {analysis.awayTeam}
        </h3>
      </div>

      <div className="space-y-3 p-4">
        {/* Confiança */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400">Confiança</span>
            <span className={cn('font-bold', confColor(score))}>{score}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
            <div className={cn('h-full rounded-full', confBg(score))} style={{ width: `${score}%` }} />
          </div>
        </div>

        {/* Recomendação */}
        <div className={cn(
          'rounded-xl border p-3',
          skip ? 'border-stone-700 bg-stone-800/40' : 'border-green-500/30 bg-green-500/10'
        )}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Recomendado</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-stone-100">{analysis.recommendedSelection}</p>
              <p className="text-xs text-stone-400">
                {BETTING_MARKET_LABELS[analysis.recommendedMarket] || analysis.recommendedMarket}
              </p>
            </div>
            <span className={cn('text-xl font-extrabold', skip ? 'text-stone-300' : 'text-green-400')}>
              @{analysis.recommendedOdd}
            </span>
          </div>
          {analysis.alternativeSelection && (
            <p className="mt-1 border-t border-stone-700/50 pt-1 text-xs text-stone-400">
              Alternativa: <span className="text-stone-200">{analysis.alternativeSelection}</span> @{analysis.alternativeOdd}
            </p>
          )}
        </div>

        {/* Alocação de stake */}
        <div className={cn(
          'flex items-center justify-between rounded-xl px-3 py-2 text-sm',
          skip ? 'bg-stone-800/40 text-stone-400' : 'bg-stone-800/60'
        )}>
          <span className="text-stone-400">💰 Sugestão de stake</span>
          {skip ? (
            <span className="text-xs font-medium text-stone-500">Não recomendado</span>
          ) : (
            <span className="font-bold text-green-400">{formatBRL(allocation?.suggestedStake ?? analysis.suggestedStake)}</span>
          )}
        </div>
        {allocation?.allocationReason && (
          <p className="text-[11px] text-stone-500">{allocation.allocationReason}</p>
        )}

        {/* Expandir */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-stone-700 py-2 text-sm text-stone-300 hover:border-stone-500"
        >
          {expanded ? 'Ocultar análise' : 'Ver análise completa'}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="space-y-3 pt-1">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{analysis.finalAnalysis}</p>
            <div className="rounded-xl bg-stone-800/40 p-1">
              <AgentInsights analysis={analysis} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
