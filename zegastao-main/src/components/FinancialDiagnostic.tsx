import { useMemo, useState } from 'react';
import { Info, TrendingDown, TrendingUp, Minus, X, ChevronRight } from 'lucide-react';
import { projectDebtPayoff } from '@/lib/projection';
import { formatBRL } from '@/lib/utils';
import type { Debt, Goal } from '@/types';

interface Props {
  income: number;
  expenses: number;
  debts: Debt[];
  goals: Goal[];
  compact?: boolean; // usado dentro do FinancialSetupWizard
}

interface Metric {
  label: string;
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

function scoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 800) return { label: 'Excelente', color: 'text-green-600', bg: 'stroke-green-500' };
  if (score >= 600) return { label: 'Boa', color: 'text-blue-600', bg: 'stroke-blue-500' };
  if (score >= 400) return { label: 'Razoável', color: 'text-yellow-600', bg: 'stroke-yellow-500' };
  if (score >= 200) return { label: 'Atenção', color: 'text-orange-600', bg: 'stroke-orange-500' };
  return { label: 'Crítica', color: 'text-red-600', bg: 'stroke-red-500' };
}

function statusColor(status: Metric['status']): string {
  if (status === 'good') return 'text-green-600 bg-green-50 border-green-200';
  if (status === 'warn') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (status === 'bad') return 'text-red-600 bg-red-50 border-red-200';
  return 'text-muted-foreground bg-secondary border-transparent';
}

function ScoreGauge({ score }: { score: number }) {
  const { label, color, bg } = scoreLabel(score);
  const pct = score / 1000;
  const r = 48;
  const circ = Math.PI * r; // half circle
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="68" viewBox="0 0 120 68">
        {/* Track */}
        <path
          d={`M 12,60 A ${r},${r} 0 0 1 108,60`}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted/30"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M 12,60 A ${r},${r} 0 0 1 108,60`}
          fill="none"
          strokeWidth="10"
          className={bg}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="800" className={`fill-current ${color}`}>
          {score}
        </text>
      </svg>
      <p className={`text-sm font-semibold ${color}`}>{label}</p>
      <p className="text-xs text-muted-foreground">Saúde Financeira</p>
    </div>
  );
}

function DetailModal({ metrics, score, income, debtPayments, expenses, onClose }: {
  metrics: Metric[];
  score: number;
  income: number;
  debtPayments: number;
  expenses: number;
  onClose: () => void;
}) {
  const { label, color } = scoreLabel(score);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <h2 className="font-bold text-base">Diagnóstico Financeiro</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-4 rounded-xl border p-4">
            <ScoreGauge score={score} />
            <div className="flex-1 text-sm text-muted-foreground leading-relaxed">
              Sua pontuação de <strong className={color}>{label}</strong> é calculada com base no comprometimento da renda, dívidas ativas e saldo mensal.
            </div>
          </div>

          {metrics.map((m) => (
            <div key={m.label} className={`rounded-xl border p-3 ${statusColor(m.status)}`}>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{m.label}</p>
                {m.icon}
              </div>
              <p className="text-xl font-bold">{m.value}</p>
              <p className="text-xs mt-0.5">{m.sub}</p>
            </div>
          ))}

          <div className="rounded-xl border bg-secondary/50 p-4 text-xs text-muted-foreground leading-relaxed space-y-1">
            <p className="font-semibold text-foreground text-sm mb-2">Como seu score é calculado:</p>
            <p>• <strong>Comprometimento da renda:</strong> (gastos + parcelas) ÷ renda. Ideal: abaixo de 70%.</p>
            <p>• <strong>Dívidas:</strong> menos dívidas ativas = mais pontos.</p>
            <p>• <strong>Saldo mensal:</strong> mês no azul = +250 pts.</p>
            <p>• <strong>Metas:</strong> ter metas ativas = +100 pts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinancialDiagnostic({ income, expenses, debts, goals, compact = false }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const activeDebts = debts.filter((d) => d.status === 'active');
  const debtPayments = activeDebts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);
  const comprometimento = income > 0 ? ((expenses + debtPayments) / income) * 100 : 0;
  const disponivel = income - expenses - debtPayments;
  const positiveBalance = disponivel >= 0;
  const hasGoal = goals.some((g) => g.status === 'active');

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
      label: 'Comprometimento da renda',
      value: income > 0 ? `${comprometimento.toFixed(0)}%` : '—',
      sub: comprometimento < 70
        ? 'Dentro do recomendado (até 70%)'
        : comprometimento < 90
        ? 'Atenção — acima de 70%'
        : 'Crítico — acima de 90% da renda comprometida',
      status: comprometimento < 70 ? 'good' : comprometimento < 90 ? 'warn' : 'bad',
      icon: comprometimento < 70
        ? <TrendingDown className="h-4 w-4 text-green-600" />
        : <TrendingUp className="h-4 w-4 text-red-500" />,
    },
    {
      label: 'Disponível por mês',
      value: formatBRL(disponivel),
      sub: disponivel >= 0 ? 'Sobra após gastos e parcelas' : 'Déficit — está gastando mais do que ganha',
      status: disponivel >= 200 ? 'good' : disponivel >= 0 ? 'warn' : 'bad',
      icon: disponivel >= 0
        ? <TrendingUp className="h-4 w-4 text-green-600" />
        : <TrendingDown className="h-4 w-4 text-red-500" />,
    },
    {
      label: 'Prazo para quitar dívidas',
      value: prazo === null ? 'Sem dívidas' : prazo === 0 ? 'Impossível calcular' : `${prazo} meses`,
      sub: prazo === null
        ? 'Ótimo! Foco em construir patrimônio'
        : prazo <= 12
        ? 'Menos de 1 ano — continue firme!'
        : prazo <= 36
        ? 'Entre 1 e 3 anos — plano realista'
        : 'Acima de 3 anos — considere acelerar',
      status: prazo === null ? 'good' : prazo <= 12 ? 'good' : prazo <= 36 ? 'warn' : 'bad',
      icon: <Minus className="h-4 w-4" />,
    },
    {
      label: 'Dívidas ativas',
      value: activeDebts.length === 0 ? 'Nenhuma 🎉' : `${activeDebts.length} dívida${activeDebts.length > 1 ? 's' : ''}`,
      sub: activeDebts.length === 0
        ? 'Você está livre de dívidas!'
        : `Total: ${formatBRL(activeDebts.reduce((s, d) => s + d.totalBalance, 0))}`,
      status: activeDebts.length === 0 ? 'good' : activeDebts.length <= 2 ? 'warn' : 'bad',
      icon: <Info className="h-4 w-4" />,
    },
  ];

  if (compact) {
    // Versão compacta para o FinancialSetupWizard
    const { label, color } = scoreLabel(score);
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Saúde Financeira</p>
            <p className={`text-2xl font-black ${color}`}>{score} <span className="text-sm font-normal">/1000</span></p>
            <p className={`text-xs font-medium ${color}`}>{label}</p>
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
        <button
          onClick={() => setShowDetail(true)}
          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
        >
          Ver diagnóstico completo <ChevronRight className="h-3.5 w-3.5" />
        </button>
        {showDetail && (
          <DetailModal
            metrics={metrics}
            score={score}
            income={income}
            debtPayments={debtPayments}
            expenses={expenses}
            onClose={() => setShowDetail(false)}
          />
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
            <p className="text-xs text-muted-foreground">Baseado nos seus dados atuais</p>
          </div>
          <button
            onClick={() => setShowDetail(true)}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            Detalhes <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-start gap-5">
          <ScoreGauge score={score} />
          <div className="flex-1 grid grid-cols-2 gap-2">
            {metrics.map((m) => (
              <div key={m.label} className={`rounded-xl border p-3 ${statusColor(m.status)}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1">{m.label}</p>
                <p className="text-sm font-bold leading-tight">{m.value}</p>
                <p className="text-[10px] mt-0.5 leading-snug">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDetail && (
        <DetailModal
          metrics={metrics}
          score={score}
          income={income}
          debtPayments={debtPayments}
          expenses={expenses}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}
