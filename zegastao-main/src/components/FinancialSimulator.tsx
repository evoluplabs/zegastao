import { useState, useMemo } from 'react';
import { X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { projectDebtPayoff } from '@/lib/projection';
import { formatBRL } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Debt } from '@/types';

interface Props {
  income: number;
  expenses: number;
  debts: Debt[];
  onClose: () => void;
}

type Scenario = 'extra_income' | 'cut_expense' | 'income_drop' | 'buy_something';

const SCENARIOS: { id: Scenario; emoji: string; label: string; placeholder: string }[] = [
  { id: 'extra_income',  emoji: '💰', label: 'Se eu ganhar uma renda extra',     placeholder: 'Quanto você receberia? (R$)' },
  { id: 'cut_expense',   emoji: '✂️', label: 'Se eu cortar um gasto',            placeholder: 'Quanto economizaria por mês? (R$)' },
  { id: 'income_drop',   emoji: '📉', label: 'Se minha renda cair',              placeholder: 'Quanto cairia? (R$)' },
  { id: 'buy_something', emoji: '🛍️', label: 'Se eu comprar algo agora',         placeholder: 'Qual o valor? (R$)' },
];

function monthsLabel(m: number): string {
  if (m === 0) return 'hoje';
  if (m < 12) return `${m} mês${m > 1 ? 'es' : ''}`;
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return `${y} ano${y > 1 ? 's' : ''}${mo > 0 ? ` e ${mo} mes${mo > 1 ? 'es' : ''}` : ''}`;
}

export function FinancialSimulator({ income, expenses, debts, onClose }: Props) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [value, setValue] = useState('');

  const activeDebts = debts.filter((d) => d.status === 'active');
  const numVal = parseFloat(value.replace(',', '.')) || 0;

  const baseline = useMemo(() => {
    if (!activeDebts.length) return null;
    return projectDebtPayoff(activeDebts, 0, 'avalanche');
  }, [activeDebts]);

  const result = useMemo(() => {
    if (!scenario || numVal <= 0) return null;
    const availableExtra = income - expenses;

    switch (scenario) {
      case 'extra_income': {
        const proj = activeDebts.length
          ? projectDebtPayoff(activeDebts, numVal, 'avalanche')
          : null;
        const baseMonths = baseline?.monthsToClear || 0;
        const newMonths = proj?.monthsToClear || 0;
        const saved = baseMonths - newMonths;
        const interestSaved = (baseline?.totalInterestPaid || 0) - (proj?.totalInterestPaid || 0);
        return {
          type: 'positive',
          headline: activeDebts.length
            ? `Você quitaria as dívidas ${saved > 0 ? `${saved} meses antes` : 'no mesmo prazo'}`
            : `Sobrariam ${formatBRL(availableExtra + numVal)}/mês para guardar`,
          details: [
            activeDebts.length && saved > 0 ? `Economizaria ~${formatBRL(interestSaved)} em juros` : null,
            `Saldo mensal com esse extra: ${formatBRL(availableExtra + numVal)}`,
          ].filter(Boolean) as string[],
        };
      }
      case 'cut_expense': {
        const proj = activeDebts.length
          ? projectDebtPayoff(activeDebts, numVal, 'avalanche')
          : null;
        const baseMonths = baseline?.monthsToClear || 0;
        const newMonths = proj?.monthsToClear || 0;
        const saved = baseMonths - newMonths;
        return {
          type: 'positive',
          headline: `Você teria ${formatBRL(numVal)} a mais por mês`,
          details: [
            activeDebts.length && saved > 0
              ? `Quitaria as dívidas ${saved} meses antes`
              : null,
            `Em 1 ano = ${formatBRL(numVal * 12)} guardados a mais`,
          ].filter(Boolean) as string[],
        };
      }
      case 'income_drop': {
        const newBalance = availableExtra - numVal;
        const newIncome = income - numVal;
        const newCompromisso = newIncome > 0 ? ((expenses / newIncome) * 100) : 100;
        return {
          type: newBalance < 0 ? 'danger' : 'warn',
          headline: newBalance < 0
            ? `Você ficaria R$ ${formatBRL(Math.abs(newBalance))} no vermelho por mês`
            : `Sobraria ${formatBRL(newBalance)}/mês — mais apertado`,
          details: [
            `${newCompromisso.toFixed(0)}% da renda comprometida (era ${income > 0 ? ((expenses / income) * 100).toFixed(0) : '?'}%)`,
            newBalance < 0
              ? `Para cobrir o déficit: busque R${formatBRL(Math.abs(newBalance))} em renda extra`
              : null,
          ].filter(Boolean) as string[],
        };
      }
      case 'buy_something': {
        const monthsToRecover = availableExtra > 0 ? Math.ceil(numVal / availableExtra) : 999;
        const impactOnDebt = baseline && baseline.monthsToClear > 0
          ? `Atrasaria a quitação das dívidas em ~${Math.ceil(numVal / (activeDebts[0]?.monthlyPayment || 100))} mês${monthsToRecover > 1 ? 'es' : ''}`
          : null;
        return {
          type: numVal > income ? 'danger' : numVal > availableExtra * 3 ? 'warn' : 'neutral',
          headline: availableExtra > 0
            ? `Levaria ${monthsToRecover > 60 ? 'mais de 5 anos' : monthsLabel(monthsToRecover)} para recuperar`
            : 'Você não tem sobra mensal para absorver isso',
          details: [
            impactOnDebt,
            availableExtra > 0 && numVal <= availableExtra
              ? 'Cabe no seu orçamento — só certifique que quer mesmo!'
              : 'Considere esperar juntar antes de comprar.',
          ].filter(Boolean) as string[],
        };
      }
    }
  }, [scenario, numVal, income, expenses, activeDebts, baseline]);

  const colorMap: Record<string, string> = {
    positive: 'border-success/30 bg-success/5 text-success',
    warn: 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    danger: 'border-destructive/30 bg-destructive/5 text-destructive',
    neutral: 'border-primary/20 bg-primary/5 text-primary',
  };

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
            <h2 className="font-bold text-base">E se eu…</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <p className="text-xs text-muted-foreground">Simule um cenário e veja o impacto real nas suas finanças.</p>

          {/* Seletor de cenário */}
          <div className="grid grid-cols-2 gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => { setScenario(s.id); setValue(''); }}
                className={cn(
                  'rounded-xl border p-3 text-left text-xs transition-all',
                  scenario === s.id
                    ? 'border-primary bg-primary/5 font-semibold'
                    : 'hover:border-primary/30 hover:bg-accent'
                )}
              >
                <span className="text-lg block mb-1">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Input do valor */}
          {scenario && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {SCENARIOS.find((s) => s.id === scenario)?.placeholder}
              </p>
              <Input
                inputMode="decimal"
                placeholder="Ex: 500"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="text-lg font-bold"
                autoFocus
              />
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className={cn('rounded-xl border p-4 space-y-2', colorMap[result.type])}>
              <p className="font-semibold text-sm">{result.headline}</p>
              <ul className="space-y-1">
                {result.details.map((d, i) => (
                  <li key={i} className="text-xs opacity-80 flex items-start gap-1.5">
                    <span className="mt-0.5">•</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {scenario && !numVal && (
            <p className="text-xs text-muted-foreground text-center">Digite um valor acima para ver a simulação</p>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}
