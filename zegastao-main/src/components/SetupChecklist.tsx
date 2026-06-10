import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  hasIncome: boolean;
  hasDebts: boolean;
  hasUpload: boolean;
  hasGoals: boolean;
  onClose?: () => void;
}

export function SetupChecklist({ hasIncome, hasDebts, hasUpload, hasGoals, onClose }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const steps = [
    { done: true, label: 'Conta criada', action: null },
    { done: hasIncome, label: 'Renda configurada', action: '/profile', actionLabel: 'Configurar' },
    { done: hasUpload, label: 'Extrato bancário importado', action: '/upload', actionLabel: 'Importar' },
    { done: hasDebts, label: 'Dívidas cadastradas', action: '/financas?tab=debts', actionLabel: 'Cadastrar' },
    { done: hasGoals, label: 'Primeira meta definida', action: '/financas?tab=goals', actionLabel: 'Definir meta' },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (dismissed || allDone) return null;

  const pct = (doneCount / steps.length) * 100;

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3 relative">
      {onClose && (
        <button
          onClick={() => { setDismissed(true); onClose(); }}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-center justify-between pr-6">
        <div>
          <p className="text-sm font-semibold">Ative o Zé Gastão</p>
          <p className="text-xs text-muted-foreground">{doneCount} de {steps.length} feitos</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-primary">{Math.round(pct)}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <span className={cn(
              'text-xs flex-1',
              step.done ? 'text-muted-foreground line-through' : 'text-foreground font-medium'
            )}>
              {step.label}
            </span>
            {!step.done && step.action && (
              <Link
                to={step.action}
                className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline shrink-0"
              >
                {step.actionLabel} <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
