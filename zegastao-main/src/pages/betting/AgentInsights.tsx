import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, History, BarChart2, Percent, HeartPulse, Sigma, Flag, Repeat, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BettingAnalysis } from '@/types';

interface Props {
  analysis: BettingAnalysis;
}

interface AgentSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  content: string;
}

export function AgentInsights({ analysis }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const o = analysis.agentOutputs;
  const sections: AgentSection[] = [
    {
      key: 'form',
      label: 'Forma Recente',
      icon: <TrendingUp className="h-4 w-4" />,
      content: o.form,
    },
    {
      key: 'h2h',
      label: 'Confronto Direto (H2H)',
      icon: <History className="h-4 w-4" />,
      content: o.h2h,
    },
    ...(o.injury ? [{
      key: 'injury',
      label: 'Desfalques (Lesões/Suspensões)',
      icon: <HeartPulse className="h-4 w-4" />,
      content: o.injury,
    }] : []),
    ...(o.matchContext ? [{
      key: 'matchContext',
      label: 'Contexto da Partida',
      icon: <Flag className="h-4 w-4" />,
      content: o.matchContext,
    }] : []),
    ...(o.stats ? [{
      key: 'stats',
      label: 'Estatísticas',
      icon: <Sigma className="h-4 w-4" />,
      content: o.stats,
    }] : []),
    {
      key: 'odds',
      label: 'Value das Odds',
      icon: <Percent className="h-4 w-4" />,
      content: o.oddsValue,
    },
    ...(o.historyInsight ? [{
      key: 'history',
      label: 'Seu Histórico',
      icon: <Repeat className="h-4 w-4" />,
      content: o.historyInsight,
    }] : []),
    {
      key: 'strategy',
      label: 'Raciocínio Estratégico',
      icon: <BarChart2 className="h-4 w-4" />,
      content: o.strategy.reasoning,
    },
    ...(o.risk ? [{
      key: 'risk',
      label: 'Gestão de Risco',
      icon: <Shield className="h-4 w-4" />,
      content: o.risk,
    }] : []),
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Análise por agente
      </p>
      {sections.map((section) => (
        <div key={section.key} className="rounded-xl border bg-card overflow-hidden">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors"
            onClick={() => setOpen(open === section.key ? null : section.key)}
          >
            <div className="flex items-center gap-2 text-foreground">
              {section.icon}
              {section.label}
            </div>
            {open === section.key
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </button>
          {open === section.key && (
            <div className="px-4 pb-4 pt-0">
              <div className="rounded-lg bg-muted/40 p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {section.content || 'Dados não disponíveis para este agente.'}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Mercados disponíveis */}
      {analysis.availableMarkets.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors"
            onClick={() => setOpen(open === 'markets' ? null : 'markets')}
          >
            <span className="font-medium">Todos os mercados disponíveis</span>
            {open === 'markets'
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </button>
          {open === 'markets' && (
            <div className="px-4 pb-4 pt-0 space-y-1">
              {analysis.availableMarkets.slice(0, 20).map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-xs',
                    m.hasValue ? 'bg-green-50 border border-green-100' : 'bg-muted/30'
                  )}
                >
                  <div>
                    <span className="font-medium">{m.selection}</span>
                    <span className="text-muted-foreground ml-1">({m.market})</span>
                    {m.hasValue && <span className="ml-2 text-green-600 font-semibold">VALUE</span>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{m.bestOdd}</span>
                    <span className="text-muted-foreground ml-1 text-[10px]">{m.bookmaker}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
