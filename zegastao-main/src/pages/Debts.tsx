import { useState } from 'react';
import { Plus, Trash2, TrendingDown, Handshake, Pencil } from 'lucide-react';
import { useDebts } from '@/hooks/useDebts';
import { useNegotiationAlerts } from '@/hooks/useDocuments';
import { addUserDoc, deleteUserDoc } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { NEGOTIATION_SCRIPTS } from '@/lib/negotiation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import { DebtEditModal } from '@/components/flows/DebtEditModal';
import type { Debt } from '@/types';

export function Debts() {
  const { data: debts } = useDebts();
  const { toast } = useToast();
  const alerts = useNegotiationAlerts();
  const [openScript, setOpenScript] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [form, setForm] = useState({ creditor: '', balance: '', payment: '', rate: '' });

  // Ranking automático: maior juros primeiro (estratégia avalanche).
  const ranked = [...debts]
    .filter((d) => d.status === 'active')
    .sort((a, b) => b.interestRateMonthly - a.interestRateMonthly);

  const totalBalance = ranked.reduce((s, d) => s + d.totalBalance, 0);

  async function save() {
    const balance = parseFloat(form.balance.replace(',', '.')) || 0;
    if (!form.creditor || balance <= 0) return;
    await addUserDoc('debts', {
      creditor: form.creditor,
      type: 'Outros',
      totalBalance: balance,
      monthlyPayment: parseFloat(form.payment.replace(',', '.')) || 0,
      remainingInstallments: 0,
      interestRateMonthly: (parseFloat(form.rate.replace(',', '.')) || 0) / 100,
      dueDay: 10,
      status: 'active',
    });
    setForm({ creditor: '', balance: '', payment: '', rate: '' });
    setOpen(false);
    toast('Dívida cadastrada!');
  }

  async function remove(id: string) {
    await deleteUserDoc('debts', id);
    toast('Dívida removida', 'info');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dívidas</h2>
          <p className="text-sm text-muted-foreground">Total ativo: {formatBRL(totalBalance)}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(!open)}>
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </div>

      {/* Alertas de negociação (gerados pelo job noturno) */}
      {alerts.map((a, i) => {
        const script = NEGOTIATION_SCRIPTS[a.scriptId];
        const isOpen = openScript === `${i}`;
        return (
          <Card key={i} className="border-amber-300/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="space-y-2 py-3 text-sm">
              <div className="flex items-start gap-2">
                <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="flex-1 text-amber-900 dark:text-amber-100">{a.message}</p>
              </div>
              {script && (
                <Button variant="outline" size="sm" onClick={() => setOpenScript(isOpen ? null : `${i}`)}>
                  {isOpen ? 'Fechar' : a.action}
                </Button>
              )}
              {isOpen && script && (
                <div className="space-y-2 rounded-md border bg-card p-3">
                  <p className="font-medium">{script.title}</p>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">{script.script}</pre>
                  <p className="text-xs text-muted-foreground">💡 {script.tip}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {open && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="space-y-1">
              <Label>Credor</Label>
              <Input value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Saldo</Label>
                <Input inputMode="decimal" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Parcela</Label>
                <Input inputMode="decimal" value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Juros %/mês</Label>
                <Input inputMode="decimal" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </div>
            </div>
            <Button onClick={save} className="w-full">Salvar</Button>
          </CardContent>
        </Card>
      )}

      {ranked.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma dívida ativa. Se tiver alguma, cadastre para o copiloto montar o plano de quitação. 🎯
          </CardContent>
        </Card>
      )}

      {ranked.map((d, i) => (
        <Card
          key={d.id}
          className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
          onClick={() => setEditDebt(d)}
        >
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {d.creditor}
              {i === 0 && (
                <Badge variant="destructive">
                  <TrendingDown className="mr-1 h-3 w-3" /> Pague primeiro
                </Badge>
              )}
              {d.source === 'auto-upload' && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  ✨ Do seu extrato
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" onClick={() => setEditDebt(d)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(d.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo</span>
              <span className="font-semibold">{formatBRL(d.totalBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parcela/mês</span>
              <span>{formatBRL(d.monthlyPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Juros</span>
              <span>{(d.interestRateMonthly * 100).toFixed(1)}% a.m.</span>
            </div>
            {d.statementMonth && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fatura ref.</span>
                <span>{d.statementMonth}</span>
              </div>
            )}
            {d.notes && (
              <p className="mt-2 rounded-md bg-primary/5 px-2 py-1.5 text-xs text-muted-foreground">{d.notes}</p>
            )}
          </CardContent>
        </Card>
      ))}

      {editDebt && <DebtEditModal debt={editDebt} onClose={() => setEditDebt(null)} />}
    </div>
  );
}
