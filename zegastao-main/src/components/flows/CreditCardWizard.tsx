import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { addUserDoc, updateUserDoc, deleteUserDoc } from '@/lib/firestore';
import type { CreditCard, CreditCardBank } from '@/types';
import { CREDIT_CARD_BANKS } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
  existing?: CreditCard;
}

const BANK_PRESETS = (Object.entries(CREDIT_CARD_BANKS) as [CreditCardBank, typeof CREDIT_CARD_BANKS[CreditCardBank]][])
  .filter(([key]) => key !== 'outro');

export function CreditCardWizard({ onClose, existing }: Props) {
  const [bank, setBank] = useState<CreditCardBank>(existing?.bank ?? 'outro');
  const [name, setName] = useState(existing?.name ?? '');
  const [limit, setLimit] = useState(existing?.limit ?? 0);
  const [dueDay, setDueDay] = useState(existing?.dueDay ?? 10);
  const [closingDay, setClosingDay] = useState(existing?.closingDay ?? 3);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function applyPreset(key: CreditCardBank) {
    setBank(key);
    const preset = CREDIT_CARD_BANKS[key];
    if (!existing) setName(preset.label);
  }

  async function save() {
    if (!name.trim() || limit <= 0) return;
    setBusy(true);
    const preset = CREDIT_CARD_BANKS[bank];
    const data: Omit<CreditCard, 'id'> = {
      name: name.trim(),
      bank,
      color: preset.color,
      emoji: preset.emoji,
      limit,
      dueDay,
      closingDay,
      createdAt: new Date().toISOString(),
    };
    if (existing) {
      await updateUserDoc('creditCards', existing.id, data);
    } else {
      await addUserDoc('creditCards', data);
    }
    setDone(true);
    setTimeout(onClose, 1000);
  }

  async function remove() {
    if (!existing) return;
    setDeleting(true);
    await deleteUserDoc('creditCards', existing.id);
    onClose();
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
        <div className="bg-card rounded-3xl p-8 text-center mx-4 w-full max-w-sm">
          <div className="text-4xl mb-2">💳</div>
          <p className="font-bold text-lg">{existing ? 'Cartão atualizado!' : 'Cartão adicionado!'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl animate-sheet-up sm:slide-up" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
          <h2 className="text-base font-bold">{existing ? 'Editar cartão' : 'Adicionar cartão'}</h2>
          <div className="flex items-center gap-2">
            {existing && (
              <button onClick={remove} disabled={deleting} className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Banco */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Qual banco?
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {BANK_PRESETS.map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border py-3 px-2 transition-all text-center active:scale-95',
                    bank === key ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                  )}
                >
                  <span className="text-xl">{preset.emoji}</span>
                  <span className="text-[11px] font-medium leading-tight">{preset.label}</span>
                </button>
              ))}
              <button
                onClick={() => applyPreset('outro')}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl border py-3 px-2 transition-all text-center active:scale-95',
                  bank === 'outro' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                )}
              >
                <span className="text-xl">💳</span>
                <span className="text-[11px] font-medium leading-tight">Outro</span>
              </button>
            </div>
          </div>

          {/* Nome */}
          <div>
            <Label htmlFor="card-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Nome do cartão
            </Label>
            <Input
              id="card-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank Mastercard"
              className="rounded-2xl h-12 text-base"
            />
          </div>

          {/* Limite */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Limite do cartão
            </Label>
            <CurrencyInput
              value={limit}
              onChange={setLimit}
              placeholder="R$ 0,00"
              className="rounded-2xl h-12 text-base"
            />
          </div>

          {/* Dias */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Dia de vencimento
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={28}
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="rounded-2xl h-12 text-base text-center"
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-center">Data de pagamento</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Dia de fechamento
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={28}
                value={closingDay}
                onChange={(e) => setClosingDay(Number(e.target.value))}
                className="rounded-2xl h-12 text-base text-center"
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-center">Fecha a fatura</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <Button
            onClick={save}
            disabled={busy || !name.trim() || limit <= 0}
            className="w-full h-12 rounded-2xl text-base font-semibold"
          >
            {busy ? 'Salvando…' : existing ? 'Salvar alterações' : 'Adicionar cartão'}
          </Button>
        </div>
      </div>
    </div>
  );
}
