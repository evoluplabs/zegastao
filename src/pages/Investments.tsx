import { useState } from 'react';
import { Plus, Trash2, TrendingUp, Lock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useInvestments } from '@/hooks/useJourney';
import { addUserDoc, deleteUserDoc } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Disclaimer } from '@/components/Disclaimer';
import { formatBRL } from '@/lib/utils';
import type { InvestmentType } from '@/types';

const TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'tesouro', label: 'Tesouro Direto' },
  { value: 'cdb', label: 'CDB' },
  { value: 'lci', label: 'LCI' },
  { value: 'lca', label: 'LCA' },
  { value: 'fii', label: 'Fundo Imobiliário' },
  { value: 'acoes', label: 'Ações' },
  { value: 'cripto', label: 'Criptomoeda' },
  { value: 'outro', label: 'Outro' },
];

// Telas de investimento só fazem sentido a partir da estabilização.
const UNLOCKED = ['stabilizing', 'accumulating', 'growing'];

export function Investments() {
  const profile = useStore((s) => s.profile);
  const { data: investments } = useInvestments();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'tesouro' as InvestmentType, institution: '', amount: '', ticker: '' });

  const phase = profile?.financialPhase;
  const locked = phase ? !UNLOCKED.includes(phase) : false;
  const total = investments.reduce((s, i) => s + (i.currentValue || i.amount || 0), 0);

  async function save() {
    const amount = parseFloat(form.amount.replace(',', '.')) || 0;
    if (amount <= 0) return;
    await addUserDoc('investments', {
      type: form.type,
      institution: form.institution,
      amount,
      currentValue: amount,
      ticker: form.ticker || null,
      purchaseDate: new Date().toISOString().substring(0, 10),
    });
    setForm({ ...form, institution: '', amount: '', ticker: '' });
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Investimentos</h2>
          <p className="text-sm text-muted-foreground">Total: {formatBRL(total)}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(!open)}>
          <Plus className="h-4 w-4" /> Registrar
        </Button>
      </div>

      <Disclaimer />

      {locked && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <Lock className="h-5 w-5 text-primary" />
            <p className="text-muted-foreground">
              Investir vem depois de parar o sangramento e formar sua reserva. Foque em quitar
              dívidas primeiro — o copiloto te avisa quando for a hora. Você ainda pode registrar
              o que já tem aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {open && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as InvestmentType })}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Instituição</Label>
                <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="Ex: Nubank" />
              </div>
              <div className="space-y-1">
                <Label>Valor aplicado</Label>
                <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            {(form.type === 'acoes' || form.type === 'cripto' || form.type === 'fii') && (
              <div className="space-y-1">
                <Label>Ticker</Label>
                <Input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="Ex: BOVA11" />
              </div>
            )}
            <Button onClick={save} className="w-full">Salvar</Button>
          </CardContent>
        </Card>
      )}

      {investments.map((inv) => (
        <Card key={inv.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-success" />
              {TYPES.find((t) => t.value === inv.type)?.label || inv.type}
              {inv.ticker ? ` · ${inv.ticker}` : ''}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => deleteUserDoc('investments', inv.id)}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CardHeader>
          <CardContent className="flex justify-between text-sm">
            <span className="text-muted-foreground">{inv.institution || '—'}</span>
            <span className="font-semibold">{formatBRL(inv.currentValue || inv.amount)}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
