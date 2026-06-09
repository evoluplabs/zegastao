import { useState, useMemo } from 'react';
import { X, Trash2, CheckCircle2, TrendingDown, AlertTriangle } from 'lucide-react';
import { updateUserDoc, deleteUserDoc } from '@/lib/firestore';
import { calcAmortization } from '@/lib/amortization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Debt } from '@/types';

const DEBT_TYPES = [
  { id: 'Cartão de crédito', icon: '💳' },
  { id: 'Empréstimo pessoal', icon: '🏦' },
  { id: 'Financiamento', icon: '🚗' },
  { id: 'Crediário', icon: '📱' },
  { id: 'Familiar / Amigos', icon: '👨‍👩‍👧' },
  { id: 'Cheque especial', icon: '📄' },
  { id: 'Outros', icon: '📎' },
];

function statusBadge(status: Debt['status']) {
  if (status === 'paid') return <Badge className="bg-green-100 text-green-700 border-green-200">Quitada</Badge>;
  if (status === 'overdue') return <Badge variant="destructive">Em atraso</Badge>;
  return <Badge variant="outline" className="border-primary/30 text-primary">Ativa</Badge>;
}

interface Props {
  debt: Debt;
  onClose: () => void;
}

export function DebtEditModal({ debt, onClose }: Props) {
  const [tab, setTab] = useState<'detail' | 'edit'>('detail');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    creditor: debt.creditor,
    type: debt.type || 'Outros',
    totalBalance: String(debt.totalBalance),
    monthlyPayment: String(debt.monthlyPayment),
    interestRateMonthly: String((debt.interestRateMonthly * 100).toFixed(2)),
    dueDay: String(debt.dueDay || 10),
    remainingInstallments: String(debt.remainingInstallments || 0),
    status: debt.status,
    statementMonth: debt.statementMonth || '',
    notes: debt.notes || '',
  });

  const isCard = form.type === 'Cartão de crédito';

  // Projection: pay minimum vs +100
  const projection = useMemo(() => {
    const balance = parseFloat(form.totalBalance.replace(',', '.')) || 0;
    const rate = (parseFloat(form.interestRateMonthly.replace(',', '.')) || 0) / 100;
    const installments = parseInt(form.remainingInstallments) || 0;
    if (balance <= 0 || installments <= 0 || rate <= 0) return null;
    try {
      const base = calcAmortization(balance, rate, installments, []);
      const extra100Advances = Array.from({ length: installments }, (_, i) => ({ installmentNumber: i + 1, extraAmount: 100 }));
      const faster = calcAmortization(balance, rate, installments, extra100Advances);
      return {
        baseMths: base.originalSchedule.length,
        baseInterest: base.originalSchedule.reduce((s, i) => s + i.interest, 0),
        fasterMths: faster.acceleratedSchedule.length,
        fasterInterest: faster.acceleratedSchedule.reduce((s, i) => s + i.interest, 0),
      };
    } catch {
      return null;
    }
  }, [form.totalBalance, form.interestRateMonthly, form.remainingInstallments]);

  async function save() {
    setSaving(true);
    try {
      const patch: Partial<Debt> = {
        creditor: form.creditor,
        type: form.type,
        totalBalance: parseFloat(form.totalBalance.replace(',', '.')) || 0,
        monthlyPayment: parseFloat(form.monthlyPayment.replace(',', '.')) || 0,
        interestRateMonthly: (parseFloat(form.interestRateMonthly.replace(',', '.')) || 0) / 100,
        dueDay: parseInt(form.dueDay) || 10,
        remainingInstallments: parseInt(form.remainingInstallments) || 0,
        status: form.status as Debt['status'],
        notes: form.notes || undefined,
      };
      if (isCard && form.statementMonth) patch.statementMonth = form.statementMonth;
      await updateUserDoc('debts', debt.id, patch);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function markPaid() {
    await updateUserDoc('debts', debt.id, { status: 'paid' });
    onClose();
  }

  async function remove() {
    await deleteUserDoc('debts', debt.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base">{debt.creditor}</h2>
              {statusBadge(debt.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{debt.type}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent transition-colors ml-2 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['detail', 'edit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium transition-colors',
                tab === t ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'detail' ? 'Detalhes' : 'Editar'}
            </button>
          ))}
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {tab === 'detail' && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Saldo', value: formatBRL(debt.totalBalance) },
                  { label: 'Parcela/mês', value: formatBRL(debt.monthlyPayment) },
                  { label: 'Juros a.m.', value: `${(debt.interestRateMonthly * 100).toFixed(1)}%` },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border bg-secondary/40 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">{item.label}</p>
                    <p className="text-sm font-bold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              {debt.dueDay && (
                <p className="text-xs text-muted-foreground">Vence todo dia <strong>{debt.dueDay}</strong></p>
              )}
              {debt.statementMonth && (
                <p className="text-xs text-muted-foreground">Fatura de referência: <strong>{debt.statementMonth}</strong></p>
              )}
              {debt.notes && (
                <p className="text-xs rounded-lg bg-secondary/50 px-3 py-2 text-muted-foreground leading-relaxed">{debt.notes}</p>
              )}

              {/* Projection */}
              {projection && (
                <div className="rounded-xl border p-4 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <TrendingDown className="h-4 w-4 text-primary" /> Projeção de quitação
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-red-50 border border-red-200 p-2.5">
                      <p className="text-red-600 font-medium">Pagando o mínimo</p>
                      <p className="text-red-700 font-bold text-sm mt-0.5">{projection.baseMths} meses</p>
                      <p className="text-red-500 mt-0.5">{formatBRL(projection.baseInterest)} em juros</p>
                    </div>
                    <div className="rounded-lg bg-green-50 border border-green-200 p-2.5">
                      <p className="text-green-600 font-medium">+R$100/mês extra</p>
                      <p className="text-green-700 font-bold text-sm mt-0.5">{projection.fasterMths} meses</p>
                      <p className="text-green-500 mt-0.5">
                        Economiza {formatBRL(projection.baseInterest - projection.fasterInterest)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {debt.status !== 'paid' && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50" onClick={markPaid}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como quitada
                  </Button>
                )}
                {!confirmDelete ? (
                  <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:bg-destructive/5 ml-auto" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                ) : (
                  <div className="ml-auto flex items-center gap-2">
                    <p className="text-xs text-destructive font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Confirmar?
                    </p>
                    <Button size="sm" variant="destructive" onClick={remove}>Sim, excluir</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Não</Button>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'edit' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Credor</Label>
                <Input value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} />
              </div>

              <div className="space-y-1">
                <Label>Tipo</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEBT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setForm({ ...form, type: t.id })}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left transition-colors',
                        form.type === t.id ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-accent'
                      )}
                    >
                      <span>{t.icon}</span> {t.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Saldo total (R$)</Label>
                  <Input inputMode="decimal" value={form.totalBalance} onChange={(e) => setForm({ ...form, totalBalance: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Parcela/mês (R$)</Label>
                  <Input inputMode="decimal" value={form.monthlyPayment} onChange={(e) => setForm({ ...form, monthlyPayment: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Juros %/mês</Label>
                  <Input inputMode="decimal" value={form.interestRateMonthly} onChange={(e) => setForm({ ...form, interestRateMonthly: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Dia de vencimento</Label>
                  <Input inputMode="numeric" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Parcelas restantes</Label>
                  <Input inputMode="numeric" value={form.remainingInstallments} onChange={(e) => setForm({ ...form, remainingInstallments: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Debt['status'] })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="active">Ativa</option>
                    <option value="paid">Quitada</option>
                    <option value="overdue">Em atraso</option>
                  </select>
                </div>
              </div>

              {isCard && (
                <div className="space-y-1">
                  <Label>Mês de referência da fatura (AAAA-MM)</Label>
                  <Input
                    placeholder="Ex: 2026-06"
                    value={form.statementMonth}
                    onChange={(e) => setForm({ ...form, statementMonth: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label>Observações</Label>
                <Input
                  placeholder="Opcional"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <Button className="w-full" disabled={saving} onClick={save}>
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
