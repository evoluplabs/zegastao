import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { addUserDoc } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

const DREAM_PRESETS = [
  { label: '🏠 Casa própria', name: 'Casa própria' },
  { label: '🚗 Carro novo', name: 'Carro novo' },
  { label: '🏖️ Viagem', name: 'Viagem dos sonhos' },
  { label: '📚 Educação', name: 'Educação / Curso' },
  { label: '🛡️ Reserva', name: 'Reserva de emergência' },
  { label: '🎯 Outro', name: '' },
];

export function GoalWizard({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [form, setForm] = useState({
    name: '',
    target: 0,
    current: 0,
    monthly: 0,
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const steps = ['Sonho', 'Como guardar'];

  function pickPreset(name: string, preset: string) {
    setSelectedPreset(preset);
    setForm((f) => ({ ...f, name: name || f.name }));
  }

  async function save() {
    if (!form.name || form.target <= 0) return;
    setSaving(true);
    await addUserDoc('goals', {
      name: form.name,
      type: 'Outros',
      targetAmount: form.target,
      currentAmount: form.current,
      monthlyContribution: form.monthly,
      priority: 1,
      status: 'active',
    });
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1200);
  }

  function canProceed() {
    if (step === 0) return form.name.trim().length > 0 && form.target > 0;
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
            <h2 className="font-semibold text-base">Criar meta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Passo {step + 1} de {steps.length}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dots */}
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
        <div className="px-5 py-5 space-y-4 min-h-[220px]">
          {done ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <div className="text-3xl">🎯</div>
              <p className="font-medium text-sm">Meta criada!</p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Qual é o sonho?</Label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {DREAM_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => pickPreset(p.name, p.label)}
                          className={cn(
                            'px-2 py-2 rounded-xl text-xs font-medium border text-center transition-colors',
                            selectedPreset === p.label
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Nome da meta..."
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <CurrencyInput
                    label="Quanto precisa juntar? *"
                    value={form.target}
                    onChange={(v) => setForm({ ...form, target: v })}
                  />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <CurrencyInput
                    label="Já tem guardado? (opcional)"
                    value={form.current}
                    onChange={(v) => setForm({ ...form, current: v })}
                    autoFocus
                  />
                  <div>
                    <CurrencyInput
                      label="Quanto vai guardar por mês? (opcional)"
                      value={form.monthly}
                      onChange={(v) => setForm({ ...form, monthly: v })}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      💡 Com esse valor o Copiloto calcula quando você chega lá.
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
                disabled={saving}
                loading={saving}
                onClick={save}
              >
                Criar meta
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
