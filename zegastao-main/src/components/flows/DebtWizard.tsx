import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { addUserDoc } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

const DEBT_TYPES = [
  'Cartão de crédito', 'Empréstimo pessoal', 'Financiamento', 'Cheque especial',
  'Crediário', 'Dívida com familiar', 'Outro',
];

export function DebtWizard({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    creditor: '',
    type: 'Outro',
    balance: '',
    payment: '',
    rate: '',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const steps = ['Credor', 'Valores', 'Taxa'];

  async function save() {
    const balance = parseFloat(form.balance.replace(',', '.')) || 0;
    if (!form.creditor || balance <= 0) return;
    setSaving(true);
    await addUserDoc('debts', {
      creditor: form.creditor,
      type: form.type,
      totalBalance: balance,
      monthlyPayment: parseFloat(form.payment.replace(',', '.')) || 0,
      remainingInstallments: 0,
      interestRateMonthly: (parseFloat(form.rate.replace(',', '.')) || 0) / 100,
      dueDay: 10,
      status: 'active',
    });
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1200);
  }

  function canProceed() {
    if (step === 0) return form.creditor.trim().length > 0;
    if (step === 1) return parseFloat(form.balance.replace(',', '.') || '0') > 0;
    return true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <div>
            <h2 className="font-semibold text-base">Adicionar dívida</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Passo {step + 1} de {steps.length}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dots de progresso */}
        <div className="flex gap-1.5 px-5 pt-4">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-300',
                i <= step ? 'bg-primary' : 'bg-secondary'
              )}
            />
          ))}
        </div>

        {/* Conteúdo */}
        <div className="px-5 py-5 space-y-4 min-h-[200px]">
          {done ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <div className="text-3xl">✅</div>
              <p className="font-medium text-sm">Dívida adicionada!</p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Quem cobra essa dívida?</Label>
                    <Input
                      autoFocus
                      placeholder="Ex: Nubank, Caixa, Primo João..."
                      value={form.creditor}
                      onChange={(e) => setForm({ ...form, creditor: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && canProceed() && setStep(1)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo de dívida</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEBT_TYPES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setForm({ ...form, type: t })}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                            form.type === t
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Quanto você deve hoje? *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input
                        autoFocus
                        inputMode="decimal"
                        className="pl-9"
                        placeholder="0,00"
                        value={form.balance}
                        onChange={(e) => setForm({ ...form, balance: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Parcela mensal{' '}
                      <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input
                        inputMode="decimal"
                        className="pl-9"
                        placeholder="0,00"
                        value={form.payment}
                        onChange={(e) => setForm({ ...form, payment: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>
                      Taxa de juros{' '}
                      <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        autoFocus
                        inputMode="decimal"
                        className="pr-12"
                        placeholder="0,0"
                        value={form.rate}
                        onChange={(e) => setForm({ ...form, rate: e.target.value })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">% a.m.</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Você acha no contrato, fatura ou no app do credor. Se não souber, deixe em branco.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex gap-2 px-5 pb-5">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            >
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </Button>
            {step < steps.length - 1 ? (
              <Button
                className="flex-1 gap-1"
                disabled={!canProceed()}
                onClick={() => setStep(step + 1)}
              >
                Continuar <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-1"
                disabled={saving || !canProceed()}
                loading={saving}
                onClick={save}
              >
                Salvar dívida
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
