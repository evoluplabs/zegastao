import { doc, collection, writeBatch } from 'firebase/firestore';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { db, auth } from '@/firebase';
import { formatBRL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useInstallments } from '@/hooks/useInstallments';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';
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

export function InvoiceTracker({ debt, onDebtUpdated }: Props) {
  const { payments } = useInstallments(debt.id);
  const { toast } = useToast();
  const [paying, setPaying] = useState(false);

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
      onDebtUpdated?.();
    } catch {
      toast('Erro ao registrar pagamento da fatura', 'error');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Fatura atual */}
      {debt.status === 'active' && (
        <div className="space-y-2">
          {!alreadyPaidThisMonth ? (
            <Button
              className="w-full gap-2"
              loading={paying}
              onClick={payInvoice}
              disabled={invoiceAmount <= 0}
            >
              <CheckCircle2 className="h-4 w-4" />
              Paguei a fatura de {monthLabel(currentMonth())} — {formatBRL(invoiceAmount)}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <p className="text-sm text-success font-medium">Fatura de {monthLabel(currentMonth())} paga!</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Após pagar, atualize o saldo da próxima fatura editando esta dívida.
          </p>
        </div>
      )}

      {/* Histórico de faturas */}
      {payments.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico de faturas</p>
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <CreditCard className="h-4 w-4 shrink-0 text-success" />
              <span className="text-sm font-medium flex-1">{monthLabel(p.month)}</span>
              <span className="text-sm text-muted-foreground">{formatBRL(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {payments.length === 0 && alreadyPaidThisMonth && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum histórico de faturas ainda.
        </p>
      )}
    </div>
  );
}
