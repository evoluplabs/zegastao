import { useState, useMemo } from 'react';
import { deleteField } from 'firebase/firestore';
import { X, Trash2, CheckCircle2, TrendingDown, AlertTriangle, MessageCircle, Calculator } from 'lucide-react';
import { updateUserDoc, deleteUserDoc } from '@/lib/firestore';
import { calcAmortization } from '@/lib/amortization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CurrencyInput, PercentInput } from '@/components/ui/CurrencyInput';
import { formatBRL, formatPct, roundCents } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { InstallmentTracker } from '@/components/InstallmentTracker';
import { InvoiceTracker } from '@/components/InvoiceTracker';
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
  const [tab, setTab] = useState<'detail' | 'minimo' | 'parcelas' | 'edit'>('detail');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [minimoPct, setMinimoPct] = useState('15');

  const [form, setForm] = useState({
    creditor: debt.creditor,
    type: debt.type || 'Outros',
    totalBalance: debt.totalBalance,
    monthlyPayment: debt.monthlyPayment,
    interestRateMonthly: debt.interestRateMonthly,
    dueDay: String(debt.dueDay || 10),
    remainingInstallments: String(debt.remainingInstallments || 0),
    status: debt.status,
    statementMonth: debt.statementMonth || '',
    informalUrgency: debt.informalUrgency || 'whenever',
    notes: debt.notes || '',
    cardMode: (debt.cardMode || 'parcelado') as 'fatura' | 'parcelado',
  });

  const isCard     = form.type === 'Cartão de crédito';
  const isInformal = form.type === 'Familiar / Amigos';

  function buildWhatsAppUrl(): string {
    const script = `Olá! Tenho uma dívida de ${formatBRL(debt.totalBalance)} com ${debt.creditor}. Gostaria de negociar as condições de pagamento — posso pagar um valor à vista com desconto ou reparcelar em condições melhores. Qual seria a melhor opção disponível para mim?`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(script)}`;
  }

  const projection = useMemo(() => {
    const balance = form.totalBalance;
    const rate = form.interestRateMonthly;
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

  const minimoCost = useMemo(() => {
    const balance = form.totalBalance;
    const rate = form.interestRateMonthly;
    const normalPayment = form.monthlyPayment;
    const minPct = (parseFloat(minimoPct) || 15) / 100;
    if (balance <= 0 || rate <= 0) return null;

    let bal = balance;
    let totalPaid = 0;
    let totalInterest = 0;
    let months = 0;
    while (bal > 0.01 && months < 600) {
      const interest = roundCents(bal * rate);
      const payment = Math.max(roundCents(bal * minPct), 5);
      const amort = Math.max(0, roundCents(payment - interest));
      bal = Math.max(0, roundCents(bal - amort));
      totalPaid = roundCents(totalPaid + payment);
      totalInterest = roundCents(totalInterest + interest);
      months++;
    }

    let balNormal = balance;
    let totalInterestNormal = 0;
    let monthsNormal = 0;
    if (normalPayment > 0) {
      while (balNormal > 0.01 && monthsNormal < 600) {
        const interest = roundCents(balNormal * rate);
        const amort = Math.max(0, roundCents(normalPayment - interest));
        balNormal = Math.max(0, roundCents(balNormal - amort));
        totalInterestNormal = roundCents(totalInterestNormal + interest);
        monthsNormal++;
      }
    }

    return {
      minMonths: months,
      minTotalInterest: totalInterest,
      minTotalPaid: totalPaid,
      minMonthlyPayment: roundCents(balance * minPct),
      normalMonths: normalPayment > 0 ? monthsNormal : null,
      normalTotalInterest: normalPayment > 0 ? totalInterestNormal : null,
      savings: roundCents(totalInterest - totalInterestNormal),
    };
  }, [form.totalBalance, form.interestRateMonthly, form.monthlyPayment, minimoPct]);

  async function save() {
    setSaving(true);
    try {
      const newRemaining = parseInt(form.remainingInstallments) || 0;
      const patch: Record<string, unknown> = {
        creditor: form.creditor,
        type: form.type,
        totalBalance: form.totalBalance,
        monthlyPayment: form.monthlyPayment,
        interestRateMonthly: form.interestRateMonthly,
        dueDay: parseInt(form.dueDay) || 10,
        remainingInstallments: newRemaining,
        status: form.status,
        totalInstallments: debt.totalInstallments || ((debt.paidInstallments || 0) + newRemaining) || newRemaining,
      };
      if (form.notes.trim()) {
        patch.notes = form.notes.trim();
      } else if (debt.notes) {
        patch.notes = deleteField();
      }
      if (isCard) {
        if (form.statementMonth) patch.statementMonth = form.statementMonth;
        patch.cardMode = form.cardMode;
      }
      if (isInformal) patch.informalUrgency = form.informalUrgency;
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
        <div className="flex border-b overflow-x-auto no-scrollbar">
          {(['detail', 'minimo', 'parcelas', 'edit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 min-w-[70px] py-2.5 text-xs font-medium transition-colors whitespace-nowrap',
                tab === t ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'detail' ? 'Detalhes' : t === 'minimo' ? '💳 Custo' : t === 'parcelas' ? 'Parcelas' : 'Editar'}
            </button>
          ))}
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {tab === 'detail' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Saldo', value: formatBRL(debt.totalBalance) },
                  { label: 'Parcela/mês', value: formatBRL(debt.monthlyPayment) },
                  { label: 'Juros a.m.', value: formatPct(debt.interestRateMonthly * 100, 1) },
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

              {debt.status === 'active' && (
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-green-400/50 bg-green-50 dark:bg-green-500/5 dark:border-green-500/20 px-4 py-2.5 text-sm font-semibold text-green-700 dark:text-green-400 hover:bg-green-100 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  💬 Negociar via WhatsApp
                  <span className="text-[10px] font-normal opacity-70">abre com script pronto</span>
                </a>
              )}

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

          {tab === 'minimo' && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20 p-4">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Custo real de pagar só o mínimo
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-1">
                  Muitos cartões cobram apenas {minimoPct}% do saldo como mínimo. Veja o que isso custa.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Pagamento mínimo (% do saldo)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    inputMode="decimal"
                    value={minimoPct}
                    onChange={(e) => setMinimoPct(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">% por mês</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    ≈ {formatBRL(form.totalBalance * (parseFloat(minimoPct) || 15) / 100)}/mês agora
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {['10', '15', '20', '25'].map((p) => (
                    <button key={p} onClick={() => setMinimoPct(p)}
                      className={cn('text-xs px-2.5 py-1 rounded-lg border transition-colors',
                        minimoPct === p ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                      )}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {minimoCost && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-500/5 dark:border-red-500/20 p-4 space-y-2">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">😱 Pagando só o mínimo</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <div>
                        <p className="text-muted-foreground">Meses</p>
                        <p className="font-bold text-red-600 text-sm">{minimoCost.minMonths}</p>
                        <p className="text-muted-foreground">{Math.floor(minimoCost.minMonths / 12)}a {minimoCost.minMonths % 12}m</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total de juros</p>
                        <p className="font-bold text-red-600 text-sm">{formatBRL(minimoCost.minTotalInterest)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total pago</p>
                        <p className="font-bold text-red-600 text-sm">{formatBRL(minimoCost.minTotalPaid)}</p>
                      </div>
                    </div>
                  </div>

                  {minimoCost.normalMonths !== null && minimoCost.normalTotalInterest !== null && (
                    <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-500/5 dark:border-green-500/20 p-4 space-y-2">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">✅ Pagando a parcela normal ({formatBRL(form.monthlyPayment)}/mês)</p>
                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        <div>
                          <p className="text-muted-foreground">Meses</p>
                          <p className="font-bold text-green-600 text-sm">{minimoCost.normalMonths}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total de juros</p>
                          <p className="font-bold text-green-600 text-sm">{formatBRL(minimoCost.normalTotalInterest)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Você economiza</p>
                          <p className="font-bold text-green-600 text-sm">{formatBRL(minimoCost.savings)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-center text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2">
                    Cálculo educacional com base no método de amortização rotativa. Valores reais podem variar.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'parcelas' && (
            debt.cardMode === 'fatura'
              ? <InvoiceTracker debt={debt} />
              : <InstallmentTracker debt={debt} />
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
                <CurrencyInput
                  label="Saldo total"
                  value={form.totalBalance}
                  onChange={(v) => setForm({ ...form, totalBalance: v })}
                />
                <CurrencyInput
                  label="Parcela/mês"
                  value={form.monthlyPayment}
                  onChange={(v) => setForm({ ...form, monthlyPayment: v })}
                />
                <PercentInput
                  label="Juros %/mês"
                  value={form.interestRateMonthly}
                  onChange={(v) => setForm({ ...form, interestRateMonthly: v })}
                />
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
                <>
                  <div className="space-y-1">
                    <Label>Como você usa este cartão?</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'parcelado' as const, label: '📦 Parcelado', sub: 'Rastreia parcelas fixas' },
                        { id: 'fatura' as const, label: '💳 Fatura integral', sub: 'Pago todo mês no vencimento' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setForm({ ...form, cardMode: opt.id })}
                          className={cn(
                            'flex flex-col items-start rounded-lg border px-3 py-2 text-xs text-left transition-colors',
                            form.cardMode === opt.id ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-accent'
                          )}
                        >
                          <span>{opt.label}</span>
                          <span className="text-muted-foreground">{opt.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Mês de referência da fatura (AAAA-MM)</Label>
                    <Input
                      placeholder="Ex: 2026-06"
                      value={form.statementMonth}
                      onChange={(e) => setForm({ ...form, statementMonth: e.target.value })}
                    />
                  </div>
                </>
              )}

              {isInformal && (
                <div className="space-y-2">
                  <Label>Essa pessoa precisa do dinheiro quando?</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: 'whenever', label: '😌 Quando eu puder — sem prazo', sub: 'A pessoa entende a situação' },
                      { id: 'monthly',  label: '📅 Todo mês — combinamos uma data', sub: 'Trato como parcela mensal' },
                      { id: 'urgent',   label: '🚨 Tá precisando agora', sub: 'Prioridade máxima — antes das outras' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm({ ...form, informalUrgency: opt.id as typeof form.informalUrgency })}
                        className={cn(
                          'flex flex-col items-start rounded-lg border px-3 py-2 text-xs text-left transition-colors',
                          form.informalUrgency === opt.id ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-accent'
                        )}
                      >
                        <span>{opt.label}</span>
                        <span className="text-muted-foreground">{opt.sub}</span>
                      </button>
                    ))}
                  </div>
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
