import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { addUserDoc, updateUserDoc, deleteUserDoc } from '@/lib/firestore';
import type { Account, AccountType } from '@/types';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

const ACCOUNT_SHORTCUTS = [
  { name: 'Nubank', emoji: '💜', color: '#8B5CF6', type: 'checking' as AccountType },
  { name: 'Itaú', emoji: '🟠', color: '#F97316', type: 'checking' as AccountType },
  { name: 'Bradesco', emoji: '🔴', color: '#EF4444', type: 'checking' as AccountType },
  { name: 'Caixa', emoji: '🔵', color: '#3B82F6', type: 'checking' as AccountType },
  { name: 'Inter', emoji: '🟡', color: '#F59E0B', type: 'checking' as AccountType },
  { name: 'Sicoob', emoji: '🟢', color: '#10B981', type: 'checking' as AccountType },
  { name: 'Carteira', emoji: '💵', color: '#6B7280', type: 'wallet' as AccountType },
  { name: 'Poupança', emoji: '🏦', color: '#0EA5E9', type: 'savings' as AccountType },
];

const TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  wallet: 'Carteira / Dinheiro',
  investment: 'Investimentos',
  other: 'Outra',
};

interface Props {
  onClose: () => void;
  existing?: Account;
}

export function AccountWizard({ onClose, existing }: Props) {
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<AccountType>(existing?.type ?? 'checking');
  const [balance, setBalance] = useState(existing?.balance ?? 0);
  const [emoji, setEmoji] = useState(existing?.emoji ?? '🏦');
  const [busy, setBusy] = useState(false);

  function applyShortcut(s: typeof ACCOUNT_SHORTCUTS[0]) {
    setName(s.name);
    setType(s.type);
    setEmoji(s.emoji);
  }

  async function save() {
    if (!name || balance < 0) return;
    setBusy(true);
    const balancedAt = new Date().toISOString().slice(0, 10);
    try {
      if (existing) {
        await updateUserDoc('accounts', existing.id, { name, type, balance, emoji, balancedAt });
      } else {
        await addUserDoc('accounts', { name, type, balance, emoji, balancedAt });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    try {
      await deleteUserDoc('accounts', existing.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">{existing ? 'Editar conta' : 'Adicionar conta'}</h2>
          {existing && (
            <button onClick={remove} disabled={busy} className="text-destructive hover:text-destructive/80">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Atalhos */}
        {!existing && (
          <div className="flex flex-wrap gap-1.5">
            {ACCOUNT_SHORTCUTS.map((s) => (
              <button
                key={s.name}
                onClick={() => applyShortcut(s)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  name === s.name ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <Label>Nome da conta</Label>
          <div className="flex gap-2">
            <Input
              className="w-12 px-2 text-center"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={2}
            />
            <Input
              className="flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank Corrente"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Tipo</Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {(Object.keys(TYPE_LABELS) as AccountType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <CurrencyInput
          label="Saldo atual"
          value={balance}
          onChange={setBalance}
        />

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button className="flex-1" onClick={save} disabled={busy || !name}>
            {busy ? 'Salvando…' : existing ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
