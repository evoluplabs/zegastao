import { useState } from 'react';
import { X, Plus, Trash2, ChevronRight, Sparkles, CheckCircle2, ExternalLink } from 'lucide-react';
import { addUserDoc, updateUserDoc, setProfile } from '@/lib/firestore';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/utils';
import { FinancialDiagnostic } from '@/components/FinancialDiagnostic';

interface Props {
  onClose: () => void;
}

interface IncomeSource {
  type: string;
  label: string;
  icon: string;
  hint: string;
  enabled: boolean;
  amount: string;
}

interface DebtEntry {
  name: string;
  type: string;
  balance: string;
  payment: string;
  rate: string;
  statementMonth: string;
}

interface FixedExpense {
  name: string;
  amount: string;
}

const INCOME_SOURCES: Omit<IncomeSource, 'enabled' | 'amount'>[] = [
  { type: 'clt', label: 'Salário CLT', icon: '💼', hint: 'Salário líquido (após IR e INSS)' },
  { type: 'freelance', label: 'Freelance / Bico', icon: '🧑‍💻', hint: 'Média mensal dos últimos 3 meses' },
  { type: 'mei', label: 'MEI / Autônomo', icon: '🏪', hint: 'Faturamento médio mensal' },
  { type: 'aluguel', label: 'Aluguel recebido', icon: '🏠', hint: 'Renda de imóveis' },
  { type: 'outros', label: 'Outros', icon: '💰', hint: 'Pensão, auxílio, outros' },
];

const DEBT_TYPES = [
  { id: 'Cartão de crédito', icon: '💳' },
  { id: 'Empréstimo pessoal', icon: '🏦' },
  { id: 'Financiamento', icon: '🚗' },
  { id: 'Cheque especial', icon: '📄' },
  { id: 'Familiar / Amigos', icon: '👨‍👩‍👧' },
  { id: 'Outros', icon: '📎' },
];

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
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(
    INCOME_SOURCES.map((s) => ({ ...s, enabled: false, amount: '' }))
  );
  const [debts, setDebts] = useState<DebtEntry[]>([{ name: '', type: 'Outros', balance: '', payment: '', rate: '', statementMonth: '' }]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [saving, setSaving] = useState(false);

  function toggleIncomeSource(type: string) {
    setIncomeSources(incomeSources.map((s) => s.type === type ? { ...s, enabled: !s.enabled, amount: '' } : s));
  }

  function updateIncomeAmount(type: string, amount: string) {
    setIncomeSources(incomeSources.map((s) => s.type === type ? { ...s, amount } : s));
  }

  function addDebt() {
    setDebts([...debts, { name: '', type: 'Outros', balance: '', payment: '', rate: '', statementMonth: '' }]);
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
      const monthlyIncome = totalIncome;
      const fixedTotal = fixedExpenses.reduce((s, e) => s + (parseFloat(e.amount.replace(',', '.')) || 0), 0);
      const sources = incomeSources.filter((s) => s.enabled && parseFloat(s.amount.replace(',', '.')) > 0)
        .map((s) => ({ type: s.type, amount: parseFloat(s.amount.replace(',', '.')) }));

      await setProfile({ monthlyIncome, fixedExpenses: fixedTotal, setupWizardDone: true, incomeSources: sources });
      setStoreProfile({ ...profile, monthlyIncome, fixedExpenses: fixedTotal, setupWizardDone: true, incomeSources: sources });

      // Salvar dívidas válidas
      for (const d of debts) {
        const balance = parseFloat(d.balance.replace(',', '.')) || 0;
        if (d.name && balance > 0) {
          const doc: Record<string, unknown> = {
            creditor: d.name,
            type: d.type || 'Outros',
            totalBalance: balance,
            monthlyPayment: parseFloat(d.payment.replace(',', '.')) || 0,
            remainingInstallments: 0,
            interestRateMonthly: (parseFloat(d.rate.replace(',', '.')) || 0) / 100,
            dueDay: 10,
            status: 'active',
          };
          if (d.type === 'Cartão de crédito' && d.statementMonth) doc.statementMonth = d.statementMonth;
          await addUserDoc('debts', doc);
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

  const totalIncome = incomeSources.reduce((s, src) => {
    if (!src.enabled) return s;
    return s + (parseFloat(src.amount.replace(',', '.')) || 0);
  }, 0);
  const totalFixed = fixedExpenses.reduce((s, e) => s + (parseFloat(e.amount.replace(',', '.')) || 0), 0);
  const available = totalIncome - totalFixed;
  const totalDebtPayments = debts.reduce((s, d) => s + (parseFloat(d.payment.replace(',', '.')) || 0), 0);

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

          {/* Step 0 — Renda por fonte */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💰</span>
                <div>
                  <h3 className="font-semibold">De onde vem sua renda?</h3>
                  <p className="text-xs text-muted-foreground">Ative as fontes que se aplicam a você</p>
                </div>
              </div>
              {incomeSources.map((src) => (
                <div key={src.type} className={cn(
                  'rounded-xl border p-3 transition-all',
                  src.enabled ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                )}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleIncomeSource(src.type)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <span className="text-xl">{src.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{src.label}</p>
                        <p className="text-[10px] text-muted-foreground">{src.hint}</p>
                      </div>
                    </button>
                    {src.enabled && (
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          autoFocus={src.type === incomeSources.find((s) => s.enabled)?.type}
                          inputMode="decimal"
                          className="pl-7 h-8 text-sm font-bold"
                          placeholder="0,00"
                          value={src.amount}
                          onChange={(e) => updateIncomeAmount(src.type, e.target.value)}
                        />
                      </div>
                    )}
                    {!src.enabled && (
                      <div
                        onClick={() => toggleIncomeSource(src.type)}
                        className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 cursor-pointer hover:border-primary transition-colors shrink-0"
                      />
                    )}
                    {src.enabled && (
                      <button onClick={() => toggleIncomeSource(src.type)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <span className="text-xs">✕</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {totalIncome > 0 && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-green-700">Total estimado:</span>
                  <span className="text-sm font-bold text-green-700">{formatBRL(totalIncome)}/mês</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground text-center">
                Não tem certeza? Coloque uma estimativa — você pode ajustar depois
              </p>
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

              {/* Upload CTA */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
                <span className="text-xl shrink-0">📤</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary">Tem PDF ou CSV do seu banco?</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Importe o extrato e o Zé Gastão preenche as dívidas automaticamente</p>
                </div>
                <a
                  href="/upload"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline shrink-0"
                >
                  Importar <ExternalLink className="h-3 w-3" />
                </a>
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
                    <Label>Tipo de dívida</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {DEBT_TYPES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => updateDebt(i, 'type', t.id)}
                          className={cn(
                            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                            d.type === t.id ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                          )}
                        >
                          <span>{t.icon}</span> {t.id}
                        </button>
                      ))}
                    </div>
                  </div>
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
                  {d.type === 'Cartão de crédito' && (
                    <div className="space-y-1">
                      <Label>Mês de referência da fatura</Label>
                      <Input
                        placeholder="Ex: 2026-06"
                        value={d.statementMonth}
                        onChange={(e) => updateDebt(i, 'statementMonth', e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">Formato: AAAA-MM</p>
                    </div>
                  )}
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
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Perfil configurado!</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Aqui está seu diagnóstico inicial:</p>
                </div>
              </div>
              <FinancialDiagnostic
                income={totalIncome}
                expenses={totalFixed + totalDebtPayments}
                debts={debts.filter((d) => d.name && parseFloat(d.balance.replace(',', '.')) > 0).map((d, i) => ({
                  id: `draft-${i}`,
                  creditor: d.name,
                  type: d.type,
                  totalBalance: parseFloat(d.balance.replace(',', '.')) || 0,
                  monthlyPayment: parseFloat(d.payment.replace(',', '.')) || 0,
                  remainingInstallments: 12,
                  interestRateMonthly: (parseFloat(d.rate.replace(',', '.')) || 0) / 100,
                  dueDay: 10,
                  status: 'active' as const,
                }))}
                goals={[]}
                compact
              />
              <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-primary font-medium">Importe seu extrato para um plano ainda mais preciso</p>
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
