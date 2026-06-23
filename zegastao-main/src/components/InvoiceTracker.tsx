import { useState } from 'react';
import { doc, collection, writeBatch } from 'firebase/firestore';
import { CheckCircle2, CreditCard, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { db, auth } from '@/firebase';
import { updateUserDoc } from '@/lib/firestore';
import { formatBRL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useInstallments } from '@/hooks/useInstallments';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
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

function nextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

export function InvoiceTracker({ debt, onDebtUpdated }: Props) {
  const { payments } = useInstallments(debt.id);
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showUpdateBalance, setShowUpdateBalance] = useState(false);
  const [nextInvoice, setNextInvoice] = useState(debt.totalBalance);
  const [updatingBalance, setUpdatingBalance] = useState(false);

  const alreadyPaidThisMonth = debt.lastPaymentMonth === currentMonth();
  const invoiceAmount = debt.totalBalance;

  async function payInvoice() {
    const uid = auth.currentUser?.uid;
    if (!uid || paying || invoiceAmount <= 0) return;
    setPaying(true);
    try {
      const batch = writeBatch(db);

      const paymentRef = doc(collection(db, 'users', uid, 'debts', debt.id, 'payments'));
      batch.set(paymentRef, {
        month: currentMonth(),
        paidAt: new Date(),
        amount: invoiceAmount,
        principal: invoiceAmount,
        interest: 0,
        balanceAfter: 0,
        type: 'invoice',
      });

      batch.update(doc(db, 'users', uid, 'debts', debt.id), {
        lastPaymentMonth: currentMonth(),
      });

      await batch.commit();
      toast(`Fatura de ${monthLabel(currentMonth())} registrada!`);
      setShowUpdateBalance(true);
      onDebtUpdated?.();
    } catch {
      toast('Erro ao registrar pagamento da fatura', 'error');
    } finally {
      setPaying(false);
    }
  }

  async function updateNextBalance() {
    if (updatingBalance) return;
    setUpdatingBalance(true);
    try {
      await updateUserDoc('debts', debt.id, {
        totalBalance: nextInvoice,
        monthlyPayment: nextInvoice,
        statementMonth: nextMonth(),
      });
      toast('Valor da próxima fatura atualizado!');
      setShowUpdateBalance(false);
      onDebtUpdated?.();
    } catch {
      toast('Erro ao atualizar fatura', 'error');
    } finally {
      setUpdatingBalance(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Fatura atual */}
      {debt.status === 'active' && (
        <div className="space-y-3">
          {/* Card da fatura */}
          <div className="rounded-xl border bg-secondary/30 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Fatura de {monthLabel(currentMonth())}
              </p>
              {debt.statementMonth && (
                <span className="text-[10px] text-muted-foreground">Ref: {debt.statementMonth}</span>
              )}
            </div>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              alreadyPaidThisMonth ? 'text-success' : 'text-foreground'
            )}>
              {formatBRL(invoiceAmount)}
            </p>
            {debt.dueDay && (
              <p className="text-xs text-muted-foreground mt-1">Vence todo dia <strong>{debt.dueDay}</strong></p>
            )}
          </div>

          {/* Ação principal */}
          {!alreadyPaidThisMonth ? (
            <Button
              className="w-full gap-2"
              loading={paying}
              onClick={payInvoice}
              disabled={invoiceAmount <= 0}
            >
              <CheckCircle2 className="h-4 w-4" />
              Paguei a fatura de {monthLabel(currentMonth())}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <p className="text-sm text-success font-medium">Fatura de {monthLabel(currentMonth())} paga!</p>
            </div>
          )}

          {/* Atualizar valor da próxima fatura */}
          {(alreadyPaidThisMonth || showUpdateBalance) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-primary">
                  Qual é o valor da fatura de {monthLabel(nextMonth())}?
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Atualize para o próximo vencimento aparecer correto no dashboard.
              </p>
              <CurrencyInput
                value={nextInvoice}
                onChange={setNextInvoice}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  loading={updatingBalance}
                  onClick={updateNextBalance}
                  disabled={nextInvoice <= 0}
                >
                  Salvar próxima fatura
                </Button>
                {!alreadyPaidThisMonth && (
                  <Button size="sm" variant="ghost" onClick={() => setShowUpdateBalance(false)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}

          {!alreadyPaidThisMonth && !showUpdateBalance && (
            <button
              onClick={() => setShowUpdateBalance(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Atualizar valor desta fatura
            </button>
          )}
        </div>
      )}

      {/* Histórico de faturas */}
      {payments.length > 0 && (
        <div className="space-y-1.5">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Histórico de faturas ({payments.length})
            </span>
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showHistory && (
            <div className="space-y-1 pt-1">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  <span className="text-sm font-medium flex-1">{monthLabel(p.month)}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{formatBRL(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
