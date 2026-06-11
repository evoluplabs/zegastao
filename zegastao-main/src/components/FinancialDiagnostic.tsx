import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, X, ChevronRight } from 'lucide-react';
import { projectDebtPayoff } from '@/lib/projection';
import { formatBRL, formatPct } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import type { Debt, Goal } from '@/types';

interface Props {
  income: number;
  expenses: number;
  debts: Debt[];
  goals: Goal[];
  compact?: boolean;
  // Quando true, expenses já inclui os pagamentos de dívidas (vindos de transações reais).
  // Evita double-counting: não soma debtPayments ao comprometimento.
  hasRealTransactions?: boolean;
}

interface Metric {
  label: string;
  tooltip: string;
  value: string;
  sub: string;
  status: 'good' | 'warn' | 'bad' | 'neutral';
  icon: React.ReactNode;
}

function calcScore(comprometimento: number, activeDebts: number, positiveBalance: boolean, hasGoal: boolean): number {
  let score = 0;
  if (comprometimento < 50) score += 300;
  else if (comprometimento < 70) score += 200;
  else if (comprometimento < 90) score += 100;

  if (activeDebts === 0) score += 250;
  else if (activeDebts <= 2) score += 150;
  else score += 50;

  if (positiveBalance) score += 250;
  if (hasGoal) score += 100;
  if (score === 0) score = 50;

  return Math.min(1000, score);
}

function scoreLabel(score: number): { label: string; emoji: string; color: string; bg: string; explain: string } {
  if (score >= 800) return { label: 'Você tá indo muito bem!',  emoji: '🟢', color: 'text-green-600',  bg: 'stroke-green-500',  explain: 'Suas finanças estão saudáveis. Continue assim!' };
  if (score >= 600) return { label: 'Caminho certo 👍',         emoji: '🔵', color: 'text-blue-600',   bg: 'stroke-blue-500',   explain: 'Boa base, mas ainda dá pra melhorar — foco nas dívidas.' };
  if (score >= 400) return { label: 'Dá pra melhorar',          emoji: '🟡', color: 'text-yellow-600', bg: 'stroke-yellow-500', explain: 'Você tá no meio do caminho. Cada real economizado conta.' };
  if (score >= 200) return { label: 'Precisa de atenção',       emoji: '🟠', color: 'text-orange-600', bg: 'stroke-orange-500', explain: 'Tá apertado, mas tem saída. O plano de quitação é o primeiro passo.' };
  return             { label: 'Situação crítica — mas tem saída', emoji: '🔴', color: 'text-red-600',    bg: 'stroke-red-500',    explain: 'Não desiste! A primeira coisa é parar de piorar — fale com o Copiloto.' };
}

function statusColor(status: Metric['status']): string {
  if (status === 'good')    return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-500/5 dark:border-green-500/20';
  if (status === 'warn')    return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-500/5 dark:border-yellow-500/20';
  if (status === 'bad')     return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/5 dark:border-red-500/20';
  return 'text-muted-foreground bg-secondary border-transparent';
}

function ScoreGauge({ score }: { score: number }) {
  const { label, color, bg } = scoreLabel(score);
  const pct = score / 1000;
  const r = 48;
  const circ = Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="68" viewBox="0 0 120 68">
        <path d={`M 12,60 A ${r},${r} 0 0 1 108,60`} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" strokeLinecap="round" />
        <path
          d={`M 12,60 A ${r},${r} 0 0 1 108,60`}
          fill="none" strokeWidth="10" className={bg} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="800" className={`fill-current ${color}`}>{score}</text>
      </svg>
      <p className={`text-sm font-semibold text-center ${color}`}>{label}</p>
    </div>
  );
}

function DetailModal({ metrics, score, income, debtPayments, expenses, onClose }: {
  metrics: Metric[]; score: number; income: number; debtPayments: number; expenses: number; onClose: () => void;
}) {
  const { color, explain } = scoreLabel(score);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <h2 className="font-bold text-base">Diagnóstico Financeiro</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-4 rounded-xl border p-4">
            <ScoreGauge score={score} />
            <p className={`flex-1 text-sm leading-relaxed ${color}`}>{explain}</p>
          </div>
          {metrics.map((m) => (
            <div key={m.label} className={`rounded-xl border p-3 ${statusColor(m.status)}`}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{m.label}</p>
                  <InfoTooltip text={m.tooltip} />
                </div>
                {m.icon}
              </div>
              <p className="text-xl font-bold">{m.value}</p>
              <p className="text-xs mt-0.5">{m.sub}</p>
            </div>
          ))}
          <div className="rounded-xl border bg-secondary/50 p-4 text-xs text-muted-foreground leading-relaxed space-y-1">
            <p className="font-semibold text-foreground text-sm mb-2">Como o score é calculado:</p>
            <p>• <strong>Comprometimento:</strong> quanto da renda já está comprometida. Ideal: abaixo de 70%.</p>
            <p>• <strong>Dívidas:</strong> quanto menos, mais pontos.</p>
            <p>• <strong>Saldo:</strong> fechar o mês no azul vale +250 pts.</p>
            <p>• <strong>Metas:</strong> ter uma meta ativa vale +100 pts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinancialDiagnostic({ income, expenses, debts, goals, compact = false, hasRealTransactions = false }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const activeDebts    = debts.filter((d) => d.status === 'active');
  const debtPayments   = activeDebts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);
  // Quando há transações reais, os pagamentos de dívidas já estão em `expenses`.
  // Somar debtPayments novamente geraria double-counting.
  const totalExpenses   = hasRealTransactions ? expenses : expenses + debtPayments;
  const comprometimento = income > 0 ? (totalExpenses / income) * 100 : 0;
  const disponivel      = income - totalExpenses;
  const positiveBalance = disponivel >= 0;
  const hasGoal         = goals.some((g) => g.status === 'active');

  const score = useMemo(
    () => calcScore(comprometimento, activeDebts.length, positiveBalance, hasGoal),
    [comprometimento, activeDebts.length, positiveBalance, hasGoal]
  );

  const prazo = useMemo(() => {
    if (!activeDebts.length) return null;
    const proj = projectDebtPayoff(activeDebts, 0, 'avalanche');
    return proj.monthsToClear;
  }, [activeDebts]);

  const metrics: Metric[] = [
    {
      label: 'Comprometimento',
      tooltip: 'Soma de todos os seus gastos fixos + parcelas de dívidas dividido pela renda. Ideal: abaixo de 70%. Acima de 90% é zona de perigo.',
      value: income <= 0
        ? '—'
        : comprometimento > 999
        ? '>999%'
        : formatPct(comprometimento),
      sub: income <= 0
        ? 'Configure sua renda no Perfil'
        : income < 100
        ? 'Renda muito baixa — verifique seu perfil'
        : comprometimento < 70
        ? 'Dentro do recomendado — ótimo!'
        : comprometimento < 90
        ? 'Acima de 70% — atenção nos gastos'
        : comprometimento > 999
        ? 'Renda quase zero — ajuste no Perfil'
        : 'Acima de 90% — precisa cortar urgente',
      status: income < 100 ? 'warn' : comprometimento < 70 ? 'good' : comprometimento < 90 ? 'warn' : 'bad',
      icon: comprometimento < 70 ? <TrendingDown className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-red-500" />,
    },
    {
      label: 'Sobra/mês',
      tooltip: 'Renda menos todos os gastos e parcelas. Se positivo, é o que você tem para guardar ou investir.',
      value: formatBRL(disponivel),
      sub: disponivel >= 0 ? 'Sobra após gastos e parcelas' : 'Tá gastando mais do que ganha — hora de agir',
      status: disponivel >= 200 ? 'good' : disponivel >= 0 ? 'warn' : 'bad',
      icon: disponivel >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-500" />,
    },
    {
      label: 'Tempo p/ quitar',
      tooltip: 'Estimativa de quanto tempo levaria para quitar todas as dívidas ativas pagando no ritmo atual, começando pela de maior juros.',
      value: prazo === null ? 'Sem dívidas 🎉' : prazo === 0 ? 'Calcule suas parcelas' : `${prazo} meses`,
      sub: prazo === null
        ? 'Incrível! Foco em construir patrimônio'
        : prazo <= 12 ? 'Menos de 1 ano — continue firme!'
        : prazo <= 36 ? `Uns ${Math.ceil(prazo / 12)} anos — plano realista`
        : 'Acima de 3 anos — vale acelerar',
      status: prazo === null ? 'good' : prazo <= 12 ? 'good' : prazo <= 36 ? 'warn' : 'bad',
      icon: <Minus className="h-4 w-4" />,
    },
    {
      label: 'Dívidas',
      tooltip: 'Número de dívidas que ainda estão sendo pagas. Quanto menos, melhor para sua saúde financeira.',
      value: activeDebts.length === 0 ? 'Nenhuma 🎉' : `${activeDebts.length} dívida${activeDebts.length > 1 ? 's' : ''}`,
      sub: activeDebts.length === 0
        ? 'Você está livre de dívidas!'
        : `Total devendo: ${formatBRL(activeDebts.reduce((s, d) => s + d.totalBalance, 0))}`,
      status: activeDebts.length === 0 ? 'good' : activeDebts.length <= 2 ? 'warn' : 'bad',
      icon: null,
    },
  ];

  if (compact) {
    const { color } = scoreLabel(score);
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Saúde Financeira</p>
            <p className={`text-2xl font-black ${color}`}>{score} <span className="text-sm font-normal">/1000</span></p>
            <p className={`text-xs font-medium ${color}`}>{scoreLabel(score).label}</p>
          </div>
          <ScoreGauge score={score} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {metrics.slice(0, 2).map((m) => (
            <div key={m.label} className={`rounded-lg border p-2 ${statusColor(m.status)}`}>
              <p className="text-[10px] font-semibold uppercase opacity-70">{m.label}</p>
              <p className="text-sm font-bold mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setShowDetail(true)} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
          Ver diagnóstico completo <ChevronRight className="h-3.5 w-3.5" />
        </button>
        {showDetail && (
          <DetailModal metrics={metrics} score={score} income={income} debtPayments={debtPayments} expenses={expenses} onClose={() => setShowDetail(false)} />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-sm">Diagnóstico Financeiro</h2>
            <p className="text-xs text-muted-foreground">Baseado nos seus dados agora</p>
          </div>
          <button onClick={() => setShowDetail(true)} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
            Detalhes <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mobile: gauge centrado + grid embaixo. Desktop: lado a lado */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-5">
          <div className="flex justify-center mb-3 sm:mb-0 sm:shrink-0">
            <ScoreGauge score={score} />
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {metrics.map((m) => (
              <div key={m.label} className={`rounded-xl border p-2.5 ${statusColor(m.status)}`}>
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 leading-tight truncate">{m.label}</p>
                  <InfoTooltip text={m.tooltip} />
                </div>
                <p className="text-base font-bold leading-tight">{m.value}</p>
                <p className="text-[10px] mt-0.5 leading-snug line-clamp-2">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDetail && (
        <DetailModal metrics={metrics} score={score} income={income} debtPayments={debtPayments} expenses={expenses} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}
