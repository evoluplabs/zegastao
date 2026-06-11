import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import type { Profile, Debt, Goal, Transaction } from '@/types';

interface Props {
  profile: Profile | null;
  debts: Debt[];
  goals: Goal[];
  transactions: Transaction[];
  onSetupWizard?: () => void;
}

interface Step {
  id: string;
  label: string;
  done: boolean;
  cta: string;
  action?: () => void;
  link?: string;
}

export function ProfileCompletion({ profile, debts, goals, transactions, onSetupWizard }: Props) {
  const hasIncome = (profile?.monthlyIncome || 0) > 0;
  const hasDebts = debts.length > 0;
  const hasTransactions = transactions.length > 0;
  const hasGoal = goals.length > 0;

  const steps: Step[] = [
    { id: 'income', label: 'Renda cadastrada', done: hasIncome, cta: 'Configurar', action: onSetupWizard },
    { id: 'debts', label: 'Dívidas cadastradas', done: hasDebts, cta: 'Adicionar', action: onSetupWizard },
    { id: 'transactions', label: 'Extrato importado', done: hasTransactions, cta: 'Importar', link: '/upload' },
    { id: 'goal', label: 'Meta criada', done: hasGoal, cta: 'Criar meta', link: '/financas?tab=goals' },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  if (pct === 100) return null;

  const nextStep = steps.find((s) => !s.done);

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-sm">Complete seu perfil financeiro</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} de {steps.length} etapas · Quanto mais completo, melhor o plano
          </p>
        </div>
        <span className={`text-2xl font-bold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>
          {pct}%
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Etapas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${
              step.done
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-secondary text-muted-foreground border border-transparent'
            }`}
          >
            <span>{step.done ? '✓' : '○'}</span>
            <span className="truncate">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Próximo passo */}
      {nextStep && (
        <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-sm font-medium text-primary">
            Próximo: <span className="font-normal text-foreground">{nextStep.label}</span>
          </p>
          {nextStep.link ? (
            <Link
              to={nextStep.link}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {nextStep.cta} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              onClick={nextStep.action}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {nextStep.cta} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
