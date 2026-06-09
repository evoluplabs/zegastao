import { cn } from '@/lib/utils';
import type { Profile, Debt, Goal, Transaction } from '@/types';

interface Step {
  label: string;
  sublabel: string;
  done: boolean;
  color: string;
  trackColor: string;
}

interface Props {
  profile: Profile | null;
  debts: Debt[];
  goals: Goal[];
  transactions: Transaction[];
  onSetupWizard?: () => void;
}

function RingSegment({
  index,
  total,
  done,
  color,
  cx,
  cy,
  r,
}: {
  index: number;
  total: number;
  done: boolean;
  color: string;
  cx: number;
  cy: number;
  r: number;
}) {
  const circumference = 2 * Math.PI * r;
  const gapAngle = 8; // degrees between segments
  const segmentAngle = 360 / total - gapAngle;
  const segLen = (segmentAngle / 360) * circumference;
  const startAngle = index * (360 / total) - 90;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={done ? color : '#e5e7eb'}
      strokeWidth="10"
      strokeLinecap="round"
      strokeDasharray={`${segLen} ${circumference - segLen}`}
      transform={`rotate(${startAngle}, ${cx}, ${cy})`}
      style={{ transition: 'stroke 0.6s ease, stroke-dasharray 0.6s ease' }}
      className="dark:stroke-[#374151] data-[done=true]:stroke-[var(--seg-color)]"
      data-done={done}
    />
  );
}

export function ProfileCompletionRing({ profile, debts, goals, transactions, onSetupWizard }: Props) {
  const hasIncome = (profile?.monthlyIncome || 0) > 0;
  const hasDebts = debts.length > 0;
  const hasTransactions = transactions.length > 0;
  const hasGoal = goals.length > 0;

  const steps: Step[] = [
    { label: 'Renda', sublabel: hasIncome ? 'configurada' : 'pendente', done: hasIncome, color: '#22c55e', trackColor: 'bg-green-500' },
    { label: 'Dívidas', sublabel: hasDebts ? 'cadastradas' : 'pendente', done: hasDebts, color: '#f59e0b', trackColor: 'bg-amber-500' },
    { label: 'Extrato', sublabel: hasTransactions ? 'importado' : 'pendente', done: hasTransactions, color: '#3b82f6', trackColor: 'bg-blue-500' },
    { label: 'Meta', sublabel: hasGoal ? 'criada' : 'pendente', done: hasGoal, color: '#8b5cf6', trackColor: 'bg-violet-500' },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  if (pct === 100) return null;

  const cx = 52;
  const cy = 52;
  const r = 40;
  const nextStep = steps.find((s) => !s.done);

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-4">
        {/* SVG ring */}
        <div className="shrink-0">
          <svg width="104" height="104" viewBox="0 0 104 104" className="overflow-visible">
            {steps.map((step, i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={step.done ? step.color : '#e5e7eb'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(85 / 360) * 2 * Math.PI * r} ${2 * Math.PI * r}`}
                transform={`rotate(${i * 90 - 90}, ${cx}, ${cy})`}
                style={{ transition: 'stroke 0.5s ease' }}
                className="dark:[--track:#374151]"
              />
            ))}
            <text x={cx} y={cy - 5} textAnchor="middle" fontSize="20" fontWeight="800" fill="currentColor">
              {pct}%
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#9ca3af">
              completo
            </text>
          </svg>
        </div>

        {/* Right side */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5">Complete seu perfil</p>
          <p className="text-xs text-muted-foreground mb-3">Quanto mais completo, mais preciso o plano</p>

          {/* Step indicators */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {steps.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full shrink-0', s.done ? s.trackColor : 'bg-muted-foreground/20')} />
                <span className={cn('text-[11px]', s.done ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                  {s.label}
                </span>
                {s.done && <span className="text-[10px] text-muted-foreground hidden sm:inline">✓</span>}
              </div>
            ))}
          </div>

          {/* Next step CTA */}
          {nextStep && onSetupWizard && (
            <button
              onClick={onSetupWizard}
              className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary/8 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
            >
              Próximo: {nextStep.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
