import { useState } from 'react';
import { X, ChevronRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { addUserDoc } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { CATEGORIES } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

const EXPENSE_CATEGORIES = CATEGORIES.filter(
  (c) => !['Salário', 'Renda extra', 'Transferência'].includes(c)
);

const INCOME_CATEGORIES = ['Salário', 'Renda extra', 'Transferência', 'Outros'];

export function TransactionWizard({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    type: 'out' as 'in' | 'out',
    amount: 0,
    date: new Date().toISOString().substring(0, 10),
    description: '',
    category: '',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const steps = ['Valor', 'Detalhes'];
  const categories = form.type === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function save() {
    if (form.amount <= 0 || !form.description) return;
    setSaving(true);
    await addUserDoc('transactions', {
      date: form.date,
      description: form.description,
      amount: form.type === 'out' ? -Math.abs(form.amount) : Math.abs(form.amount),
      type: form.type,
      category: form.category || (form.type === 'out' ? 'Outros' : 'Renda extra'),
      aiConfidence: 1,
      aiCategorized: false,
      userCorrected: true,
      source: 'manual',
    });
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1200);
  }

  function canProceed() {
    if (step === 0) return form.amount > 0;
    return form.description.trim().length > 0;
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
            <h2 className="font-semibold text-base">Lançar transação</h2>
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
              <div className="text-3xl">{form.type === 'in' ? '💚' : '🔴'}</div>
              <p className="font-medium text-sm">Transação registrada!</p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-4">
                  {/* Tipo: entrada ou saída */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setForm({ ...form, type: 'out', category: '' })}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium border transition-colors',
                        form.type === 'out'
                          ? 'bg-destructive/10 border-destructive/30 text-destructive'
                          : 'border-border text-muted-foreground hover:border-muted'
                      )}
                    >
                      <ArrowDownCircle className="h-4 w-4" />
                      Saiu (despesa)
                    </button>
                    <button
                      onClick={() => setForm({ ...form, type: 'in', category: '' })}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium border transition-colors',
                        form.type === 'in'
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'border-border text-muted-foreground hover:border-muted'
                      )}
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Entrou (renda)
                    </button>
                  </div>

                  {/* Lançamento rápido */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Lançamento rápido</p>
                    <div className="flex flex-wrap gap-2">
                      {(form.type === 'out'
                        ? [
                            { label: '🛒 Mercado', cat: 'Alimentação', desc: 'Supermercado' },
                            { label: '🍽️ Restaurante', cat: 'Alimentação', desc: 'Refeição fora' },
                            { label: '⛽ Combustível', cat: 'Transporte', desc: 'Gasolina/Álcool' },
                            { label: '💊 Farmácia', cat: 'Saúde', desc: 'Remédios' },
                            { label: '🏠 Aluguel', cat: 'Moradia', desc: 'Aluguel mensal' },
                            { label: '💡 Conta', cat: 'Moradia', desc: 'Luz/Água/Gás' },
                          ]
                        : [
                            { label: '💼 Salário', cat: 'Salário', desc: 'Salário mensal' },
                            { label: '💰 Freelance', cat: 'Renda extra', desc: 'Trabalho extra' },
                            { label: '🔄 Transferência', cat: 'Transferência', desc: 'Recebimento' },
                          ]
                      ).map((q) => (
                        <button
                          key={q.label}
                          onClick={() => setForm({ ...form, category: q.cat, description: q.desc })}
                          className={cn(
                            'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                            form.category === q.cat && form.description === q.desc
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          )}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <CurrencyInput
                    label="Quanto? *"
                    value={form.amount}
                    onChange={(v) => setForm({ ...form, amount: v })}
                    className="text-lg font-semibold"
                    autoFocus
                  />

                  <div className="space-y-1.5">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>O que foi? *</Label>
                    <Input
                      autoFocus
                      placeholder={form.type === 'in' ? 'Ex: Salário de junho' : 'Ex: Almoço no restaurante'}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      Categoria{' '}
                      <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {categories.slice(0, 12).map((c) => (
                        <button
                          key={c}
                          onClick={() => setForm({ ...form, category: c })}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                            form.category === c
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
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
                Registrar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
