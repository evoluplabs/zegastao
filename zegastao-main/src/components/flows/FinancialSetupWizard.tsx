import { useState } from 'react';
import { X, Plus, Trash2, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { addUserDoc, updateUserDoc, setProfile } from '@/lib/firestore';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

interface DebtEntry {
  name: string;
  balance: string;
  payment: string;
  rate: string;
}

interface FixedExpense {
  name: string;
  amount: string;
}

const DEBT_TYPES = ['Cartão de crédito', 'Empréstimo pessoal', 'Financiamento', 'Cheque especial', 'Família / Amigos', 'Outro'];

const FIXED_EXPENSE_SUGGESTIONS = [
  { name: 'Aluguel / Financiamento', icon: '🏠' },
  { name: 'Condomínio', icon: '🏢' },
  { name: 'Internet', icon: '📡' },
  { name: 'Plano de saúde', icon: '❤️' },
  { name: 'Academia', icon: '💪' },
  { name: 'Streaming (Netflix, etc)', icon: '📺' },
  { name: 'Escola / Faculdade', icon: '📚' },
  { name: 'Combustível mensal', icon: '⛽' },
];

const GOAL_PRESETS = [
  { id: 'reserva', label: 'Reserva de emergência', icon: '🛡️', desc: '3 a 6 meses de despesas' },
  { id: 'quitar', label: 'Quitar todas as dívidas', icon: '💥', desc: 'Foco total na quitação' },
  { id: 'viagem', label: 'Viagem dos sonhos', icon: '✈️', desc: 'Juntar para uma viagem' },
  { id: 'casa', label: 'Casa própria', icon: '🏡', desc: 'Entrada ou financiamento' },
  { id: 'aposentadoria', label: 'Aposentadoria', icon: '🌅', desc: 'Independência financeira' },
  { id: 'outro', label: 'Outro objetivo', icon: '🎯', desc: 'Defina o seu' },
];

const STEPS = [
  { label: 'Renda', emoji: '💰' },
  { label: 'Dívidas', emoji: '💳' },
  { label: 'Gastos fixos', emoji: '📋' },
  { label: 'Meta', emoji: '🎯' },
  { label: 'Pronto!', emoji: '🎉' },
];

export function FinancialSetupWizard({ onClose }: Props) {
  const { profile, setProfile: setStoreProfile } = useStore();
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState(profile?.monthlyIncome ? String(profile.monthlyIncome) : '');
  const [debts, setDebts] = useState<DebtEntry[]>([{ name: '', balance: '', payment: '', rate: '' }]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [saving, setSaving] = useState(false);

  function addDebt() {
    setDebts([...debts, { name: '', balance: '', payment: '', rate: '' }]);
  }

  function removeDebt(i: number) {
    setDebts(debts.filter((_, idx) => idx !== i));
  }

  function updateDebt(i: number, field: keyof DebtEntry, value: string) {
    setDebts(debts.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  }

  function toggleFixedExpense(name: string) {
    const exists = fixedExpenses.find((e) => e.name === name);
    if (exists) {
      setFixedExpenses(fixedExpenses.filter((e) => e.name !== name));
    } else {
      setFixedExpenses([...fixedExpenses, { name, amount: '' }]);
    }
  }

  function updateFixedAmount(name: string, amount: string) {
    setFixedExpenses(fixedExpenses.map((e) => e.name === name ? { ...e, amount } : e));
  }

  async function finish() {
    setSaving(true);
    try {
      const monthlyIncome = parseFloat(income.replace(',', '.')) || 0;
      const fixedTotal = fixedExpenses.reduce((s, e) => s + (parseFloat(e.amount.replace(',', '.')) || 0), 0);

      await setProfile({ monthlyIncome, fixedExpenses: fixedTotal, setupWizardDone: true });
      setStoreProfile({ ...profile, monthlyIncome, fixedExpenses: fixedTotal, setupWizardDone: true });

      // Salvar dívidas válidas
      for (const d of debts) {
        const balance = parseFloat(d.balance.replace(',', '.')) || 0;
        if (d.name && balance > 0) {
          await addUserDoc('debts', {
            creditor: d.name,
            type: 'Outros',
            totalBalance: balance,
            monthlyPayment: parseFloat(d.payment.replace(',', '.')) || 0,
            remainingInstallments: 0,
            interestRateMonthly: (parseFloat(d.rate.replace(',', '.')) || 0) / 100,
            dueDay: 10,
            status: 'active',
          });
        }
      }

      // Salvar meta selecionada
      const amt = parseFloat(goalAmount.replace(',', '.')) || 0;
      if (selectedGoal && amt > 0) {
        const preset = GOAL_PRESETS.find((g) => g.id === selectedGoal);
        await addUserDoc('goals', {
          name: preset?.label || 'Minha meta',
          type: selectedGoal,
          targetAmount: amt,
          currentAmount: 0,
          status: 'active',
          source: 'setup-wizard',
        });
      }

      setStep(4);
    } finally {
      setSaving(false);
    }
  }

  const totalIncome = parseFloat(income.replace(',', '.')) || 0;
  const totalFixed = fixedExpenses.reduce((s, e) => s + (parseFloat(e.amount.replace(',', '.')) || 0), 0);
  const available = totalIncome - totalFixed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border bg-card shadow-2xl my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <div>
            <h2 className="font-bold text-base">Configurar situação financeira</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Passo {step + 1} de {STEPS.length}</p>
          </div>
          {step < 4 && (
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-5 pt-4">
          {STEPS.map((s, i) => (
            <div key={s.label} className={cn('h-1 flex-1 rounded-full transition-all duration-300', i <= step ? 'bg-primary' : 'bg-secondary')} />
          ))}
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* Step 0 — Renda */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💰</span>
                <div>
                  <h3 className="font-semibold">Qual é sua renda mensal?</h3>
                  <p className="text-xs text-muted-foreground">Renda líquida (o que cai na conta)</p>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  autoFocus
                  inputMode="decimal"
                  className="pl-9 text-xl font-bold"
                  placeholder="0,00"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                />
              </div>
              {totalIncome > 0 && (
                <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
                  Renda configurada: <strong>{formatBRL(totalIncome)}/mês</strong>
                </p>
              )}
            </div>
          )}

          {/* Step 1 — Dívidas */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💳</span>
                <div>
                  <h3 className="font-semibold">Quais são suas dívidas?</h3>
                  <p className="text-xs text-muted-foreground">Adicione todas para um plano preciso</p>
                </div>
              </div>
              {debts.map((d, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3 relative">
                  {debts.length > 1 && (
                    <button
                      onClick={() => removeDebt(i)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="space-y-1">
                    <Label>Credor / nome da dívida</Label>
                    <Input
                      placeholder="Ex: Cartão Nubank"
                      value={d.name}
                      onChange={(e) => updateDebt(i, 'name', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label>Saldo (R$)</Label>
                      <Input inputMode="decimal" placeholder="Ex: 3500" value={d.balance} onChange={(e) => updateDebt(i, 'balance', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Parcela/mês</Label>
                      <Input inputMode="decimal" placeholder="Ex: 200" value={d.payment} onChange={(e) => updateDebt(i, 'payment', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Juros %/mês</Label>
                      <Input inputMode="decimal" placeholder="Ex: 12" value={d.rate} onChange={(e) => updateDebt(i, 'rate', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={addDebt}>
                <Plus className="h-4 w-4" /> Adicionar outra dívida
              </Button>
            </div>
          )}

          {/* Step 2 — Gastos fixos */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="font-semibold">Quais são seus gastos fixos?</h3>
                  <p className="text-xs text-muted-foreground">Selecione e preencha os valores</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FIXED_EXPENSE_SUGGESTIONS.map((s) => {
                  const selected = fixedExpenses.find((e) => e.name === s.name);
                  return (
                    <button
                      key={s.name}
                      onClick={() => toggleFixedExpense(s.name)}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all',
                        selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                      )}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <p className="text-xs font-medium mt-1 leading-snug">{s.name}</p>
                    </button>
                  );
                })}
              </div>
              {fixedExpenses.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Valores mensais:</p>
                  {fixedExpenses.map((e) => (
                    <div key={e.name} className="flex items-center gap-2">
                      <span className="text-xs flex-1 text-muted-foreground truncate">{e.name}</span>
                      <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          inputMode="decimal"
                          className="pl-7 text-sm h-8"
                          placeholder="0,00"
                          value={e.amount}
                          onChange={(ev) => updateFixedAmount(e.name, ev.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg bg-secondary px-3 py-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Disponível após fixos:</span>
                    <span className={cn('font-bold', available >= 0 ? 'text-green-600' : 'text-destructive')}>
                      {formatBRL(available)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Meta */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="font-semibold">Qual é seu principal objetivo?</h3>
                  <p className="text-xs text-muted-foreground">O copiloto vai priorizar isso no seu plano</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_PRESETS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      selectedGoal === g.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                    )}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <p className="text-xs font-semibold mt-1">{g.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{g.desc}</p>
                  </button>
                ))}
              </div>
              {selectedGoal && (
                <div className="space-y-1">
                  <Label>Valor alvo (R$) — opcional</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input
                      inputMode="decimal"
                      className="pl-9"
                      placeholder="Ex: 15000"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Concluído */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Perfil configurado!</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  O copiloto já está analisando sua situação. Seus insights personalizados aparecem no dashboard.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 w-full">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-primary font-medium">Importe seu extrato para um plano ainda mais preciso</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          {step === 4 ? (
            <Button className="w-full" onClick={onClose}>
              Ir para o dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
              >
                {step === 0 ? 'Pular' : 'Voltar'}
              </Button>
              {step < 3 ? (
                <Button className="flex-1 gap-1" onClick={() => setStep(step + 1)}>
                  Continuar <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="flex-1" disabled={saving} onClick={finish}>
                  {saving ? 'Salvando…' : 'Concluir configuração'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
