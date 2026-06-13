import { useState } from 'react';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { CheckCircle2, CircleDot, Circle, Zap, Plus } from 'lucide-react';
import { db, auth } from '@/firebase';
import { calcAmortization } from '@/lib/amortization';
import { formatBRL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Label } from '@/components/ui/label';
import { useInstallments } from '@/hooks/useInstallments';
import { useToast } from '@/components/ui/Toast';
import type { Debt } from '@/types';

interface Props {
  debt: Debt;
  onDebtUpdated?: () => void;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

export function InstallmentTracker({ debt, onDebtUpdated }: Props) {
  const { payments } = useInstallments(debt.id);
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [extraAmount, setExtraAmount] = useState(0);
  const [payingAdvance, setPayingAdvance] = useState(false);

  const balance = debt.totalBalance;
  const rate = debt.interestRateMonthly;
  const remaining = debt.remainingInstallments || 0;
  const paid = debt.paidInstallments || 0;
  const total = debt.totalInstallments || (paid + remaining) || remaining;
  const alreadyPaidThisMonth = debt.lastPaymentMonth === currentMonth();

  // Compute current installment from the live schedule
  const schedule = balance > 0 && remaining > 0 && rate > 0
    ? calcAmortization(balance, rate, remaining).originalSchedule
    : [];
  const currentInstallment = schedule[0] ?? null;

  async function payInstallment() {
    const uid = auth.currentUser?.uid;
    if (!uid || paying || !currentInstallment) return;
    setPaying(true);
    try {
      const batch = writeBatch(db);

      const paymentRef = doc(collection(db, 'users', uid, 'debts', debt.id, 'payments'));
      batch.set(paymentRef, {
        month: currentMonth(),
        paidAt: new Date(),
        installmentNumber: paid + 1,
        amount: currentInstallment.payment,
        principal: currentInstallment.principal,
        interest: currentInstallment.interest,
        balanceAfter: Math.max(0, balance - currentInstallment.principal),
        type: 'regular',
      });

      const newBalance = Math.max(0, balance - currentInstallment.principal);
      const newRemaining = Math.max(0, remaining - 1);
      const patch: Record<string, unknown> = {
        totalBalance: newBalance,
        remainingInstallments: newRemaining,
        paidInstallments: paid + 1,
        lastPaymentMonth: currentMonth(),
      };
      if (newRemaining === 0) patch.status = 'paid';

      batch.update(doc(db, 'users', uid, 'debts', debt.id), patch);
      await batch.commit();
      toast('Parcela registrada! Saldo atualizado.');
      onDebtUpdated?.();
    } catch {
      toast('Erro ao registrar pagamento', 'error');
    } finally {
      setPaying(false);
    }
  }

  async function payAdvance() {
    const uid = auth.currentUser?.uid;
    const extra = extraAmount;
    if (!uid || payingAdvance || extra <= 0) return;
    setPayingAdvance(true);
    try {
      const batch = writeBatch(db);

      const paymentRef = doc(collection(db, 'users', uid, 'debts', debt.id, 'payments'));
      batch.set(paymentRef, {
        month: currentMonth(),
        paidAt: new Date(),
        installmentNumber: paid + 1,
        amount: extra,
        principal: extra,
        interest: 0,
        balanceAfter: Math.max(0, balance - extra),
        type: 'advance',
      });

      const newBalance = Math.max(0, balance - extra);
      // Recalculate remaining installments if we have a payment and rate
      let newRemaining = remaining;
      if (currentInstallment && rate > 0 && newBalance > 0) {
        const pmt = currentInstallment.payment;
        newRemaining = Math.ceil(-Math.log(1 - newBalance * rate / pmt) / Math.log(1 + rate));
        newRemaining = Math.max(1, newRemaining);
      } else if (newBalance <= 0) {
        newRemaining = 0;
      }

      const patch: Record<string, unknown> = {
        totalBalance: newBalance,
        remainingInstallments: newRemaining,
      };
      if (newBalance <= 0) { patch.status = 'paid'; patch.remainingInstallments = 0; }

      batch.update(doc(db, 'users', uid, 'debts', debt.id), patch);
      await batch.commit();
      toast(`Pagamento de ${formatBRL(extra)} registrado!`);
      setShowAdvance(false);
      setExtraAmount('');
      onDebtUpdated?.();
    } catch {
      toast('Erro ao registrar pagamento', 'error');
    } finally {
      setPayingAdvance(false);
    }
  }

  // Build timeline: past payments + upcoming from schedule
  const paidMonths = new Set(payments.map((p) => p.month));

  // Future installments (from current schedule, up to 6 visible)
  const futureMonths: { month: string; amount: number; isCurrent: boolean }[] = [];
  const now = new Date();
  for (let i = 0; i < Math.min(schedule.length, 6); i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    const m = d.toISOString().slice(0, 7);
    if (!paidMonths.has(m)) {
      futureMonths.push({ month: m, amount: schedule[i].payment, isCurrent: i === 0 });
    }
  }

  const progressPct = total > 0 ? Math.round((paid / total) * 100) : 0;

  if (remaining === 0 && paid === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Sem parcelas configuradas. Edite a dívida para adicionar parcelas restantes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Parcela {paid + 1} de {total}</span>
            <span className="font-medium text-primary">{progressPct}% pago</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Ação principal */}
      {debt.status === 'active' && remaining > 0 && (
        <div className="space-y-2">
          {!alreadyPaidThisMonth && currentInstallment ? (
            <Button
              className="w-full gap-2"
              loading={paying}
              onClick={payInstallment}
            >
              <CheckCircle2 className="h-4 w-4" />
              Paguei a parcela de {monthLabel(currentMonth())} — {formatBRL(currentInstallment.payment)}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <p className="text-sm text-success font-medium">{monthLabel(currentMonth())} pago!</p>
            </div>
          )}

          {!showAdvance ? (
            <button
              onClick={() => setShowAdvance(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Pagar valor extra (reduz o saldo)
            </button>
          ) : (
            <div className="rounded-xl border bg-secondary/30 p-3 space-y-2">
              <Label className="text-xs">Valor extra (abate no saldo)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CurrencyInput
                    value={extraAmount}
                    onChange={setExtraAmount}
                  />
                </div>
                <Button size="sm" loading={payingAdvance} onClick={payAdvance}>
                  <Zap className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAdvance(false); setExtraAmount(0); }}>
                  ✕
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cronograma */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cronograma</p>

        {/* Pagamentos registrados */}
        {payments.map((p) => (
          <div key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span className="text-sm font-medium flex-1">{monthLabel(p.month)}</span>
            <span className="text-sm text-muted-foreground">{formatBRL(p.amount)}</span>
            {p.type === 'advance' && (
              <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5">extra</span>
            )}
          </div>
        ))}

        {/* Meses futuros */}
        {futureMonths.map(({ month, amount, isCurrent }) => (
          <div key={month} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${isCurrent ? 'bg-primary/5' : ''}`}>
            {isCurrent
              ? <CircleDot className="h-4 w-4 shrink-0 text-primary" />
              : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
            }
            <span className={`text-sm flex-1 ${isCurrent ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
              {monthLabel(month)}
              {isCurrent && ' (este mês)'}
            </span>
            <span className={`text-sm ${isCurrent ? 'font-semibold' : 'text-muted-foreground'}`}>
              {formatBRL(amount)}
            </span>
          </div>
        ))}

        {schedule.length > 6 && (
          <p className="text-xs text-muted-foreground text-center py-1">
            + {schedule.length - 6} parcelas restantes até {monthLabel(schedule[schedule.length - 1]?.dueDate?.slice(0, 7) ?? '')}
          </p>
        )}
      </div>

      {/* Simulação rápida de pagamento extra */}
      {currentInstallment && remaining > 1 && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-500/5 p-3 text-xs space-y-0.5">
          <p className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Dica de economia
          </p>
          <p className="text-amber-700/80 dark:text-amber-400/70">
            Pagar R$100 a mais por mês = quitação ~{Math.max(1, remaining - Math.ceil(remaining * 0.15))} meses antes e menos juros pagos.
          </p>
        </div>
      )}
    </div>
  );
}
