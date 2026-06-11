import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { addUserDoc } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { InvestmentType } from '@/types';

interface Props {
  onClose: () => void;
}

const TYPES: { value: InvestmentType; label: string; emoji: string }[] = [
  { value: 'tesouro', label: 'Tesouro Direto', emoji: '🏛️' },
  { value: 'cdb', label: 'CDB', emoji: '🏦' },
  { value: 'lci', label: 'LCI / LCA', emoji: '🌾' },
  { value: 'fii', label: 'Fundo Imobiliário', emoji: '🏢' },
  { value: 'acoes', label: 'Ações', emoji: '📈' },
  { value: 'cripto', label: 'Cripto', emoji: '₿' },
  { value: 'outro', label: 'Outro', emoji: '💼' },
];

const NEEDS_TICKER: InvestmentType[] = ['acoes', 'cripto', 'fii'];

export function InvestmentWizard({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    type: '' as InvestmentType | '',
    institution: '',
    amount: '',
    ticker: '',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const steps = ['Tipo', 'Valor'];

  async function save() {
    const amount = parseFloat(form.amount.replace(',', '.')) || 0;
    if (amount <= 0 || !form.type) return;
    setSaving(true);
    await addUserDoc('investments', {
      type: form.type,
      institution: form.institution || null,
      amount,
      currentValue: amount,
      ticker: form.ticker || null,
      purchaseDate: new Date().toISOString().substring(0, 10),
    });
    setSaving(false);
    setDone(true);
    setTimeout(onClose, 1200);
  }

  function canProceed() {
    if (step === 0) return form.type !== '';
    return parseFloat(form.amount.replace(',', '.') || '0') > 0;
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
            <h2 className="font-semibold text-base">Registrar investimento</h2>
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
              <div className="text-3xl">📈</div>
              <p className="font-medium text-sm">Investimento registrado!</p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-3">
                  <Label>Onde está o seu dinheiro?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setForm({ ...form, type: t.value })}
                        className={cn(
                          'flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border transition-colors text-left',
                          form.type === t.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        )}
                      >
                        <span className="text-base">{t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Valor aplicado *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input
                        autoFocus
                        inputMode="decimal"
                        className="pl-9"
                        placeholder="0,00"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Instituição{' '}
                      <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Input
                      placeholder="Ex: Nubank, XP, Binance..."
                      value={form.institution}
                      onChange={(e) => setForm({ ...form, institution: e.target.value })}
                    />
                  </div>
                  {form.type && NEEDS_TICKER.includes(form.type) && (
                    <div className="space-y-1.5">
                      <Label>
                        Ticker{' '}
                        <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <Input
                        placeholder="Ex: BOVA11, BTC..."
                        value={form.ticker}
                        onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                      />
                    </div>
                  )}
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
                Salvar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
