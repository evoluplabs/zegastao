import { useState } from 'react';
import { Plus, Trash2, TrendingDown, Handshake, Pencil, Zap, CheckCircle2 } from 'lucide-react';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { useDebts } from '@/hooks/useDebts';
import { useNegotiationAlerts } from '@/hooks/useDocuments';
import { deleteUserDoc } from '@/lib/firestore';
import { calcAmortization } from '@/lib/amortization';
import { useToast } from '@/components/ui/Toast';
import { NEGOTIATION_SCRIPTS } from '@/lib/negotiation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatPct } from '@/lib/utils';
import { DebtWizard } from '@/components/flows/DebtWizard';
import { DebtEditModal } from '@/components/flows/DebtEditModal';
import { DebtSimulator } from '@/components/DebtSimulator';
import { TransactionInstallmentGroups } from '@/components/TransactionInstallmentGroups';
import type { Debt } from '@/types';

export function Debts() {
  const { data: debts } = useDebts();
  const { toast } = useToast();
  const alerts = useNegotiationAlerts();
  const [openScript, setOpenScript] = useState<string | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [simulateDebt, setSimulateDebt] = useState<Debt | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  function currentMonth() { return new Date().toISOString().slice(0, 7); }

  async function quickPayInstallment(e: React.MouseEvent, d: Debt) {
    e.stopPropagation();
    const uid = auth.currentUser?.uid;
    if (!uid || payingId || !d.remainingInstallments || !d.interestRateMonthly) return;

    const schedule = calcAmortization(d.totalBalance, d.interestRateMonthly, d.remainingInstallments).originalSchedule;
    const inst = schedule[0];
    if (!inst) return;

    setPayingId(d.id);
    try {
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'users', uid, 'debts', d.id, 'payments')), {
        month: currentMonth(),
        paidAt: new Date(),
        installmentNumber: (d.paidInstallments || 0) + 1,
        amount: inst.payment,
        principal: inst.principal,
        interest: inst.interest,
        balanceAfter: Math.max(0, d.totalBalance - inst.principal),
        type: 'regular',
      });
      const newBal = Math.max(0, d.totalBalance - inst.principal);
      const newRem = Math.max(0, (d.remainingInstallments || 0) - 1);
      const patch: Record<string, unknown> = {
        totalBalance: newBal,
        remainingInstallments: newRem,
        paidInstallments: (d.paidInstallments || 0) + 1,
        lastPaymentMonth: currentMonth(),
        totalInstallments: d.totalInstallments || ((d.paidInstallments || 0) + (d.remainingInstallments || 0)),
      };
      if (newRem === 0) patch.status = 'paid';
      batch.update(doc(db, 'users', uid, 'debts', d.id), patch);
      await batch.commit();
      toast('Parcela registrada!');
    } catch {
      toast('Erro ao registrar', 'error');
    } finally {
      setPayingId(null);
    }
  }

  // Ranking automático: maior juros primeiro (estratégia avalanche).
  const ranked = [...debts]
    .filter((d) => d.status === 'active')
    .sort((a, b) => b.interestRateMonthly - a.interestRateMonthly);

  const totalBalance = ranked.reduce((s, d) => s + d.totalBalance, 0);

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
        <Button size="sm" onClick={() => setOpenWizard(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova dívida
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
              <span>{formatPct(d.interestRateMonthly * 100, 1)} a.m.</span>
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

            {/* Barra de progresso de parcelas */}
            {(d.remainingInstallments > 0 || (d.paidInstallments ?? 0) > 0) && (() => {
              const paid = d.paidInstallments || 0;
              const total = d.totalInstallments || (paid + d.remainingInstallments) || d.remainingInstallments;
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
              return (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Parcela {paid + 1} de {total}</span>
                    <span>{pct}% pago</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Botão "Paguei" */}
            {d.status === 'active' && d.remainingInstallments > 0 && d.interestRateMonthly > 0 && (
              <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                {d.lastPaymentMonth === currentMonth() ? (
                  <div className="flex items-center gap-1.5 rounded-lg bg-success/5 border border-success/20 px-3 py-1.5 text-xs font-medium text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Parcela deste mês registrada
                  </div>
                ) : (
                  <button
                    disabled={payingId === d.id}
                    onClick={(e) => quickPayInstallment(e, d)}
                    className="flex items-center gap-1.5 w-full justify-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {payingId === d.id ? 'Registrando…' : 'Paguei a parcela deste mês'}
                  </button>
                )}
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); setSimulateDebt(d); }}
              className="mt-2 flex items-center gap-1.5 w-full justify-center rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors"
            >
              <Zap className="h-3.5 w-3.5" /> E se eu pagar a mais?
            </button>
          </CardContent>
        </Card>
      ))}

      {/* Parcelas detectadas automaticamente no extrato */}
      <TransactionInstallmentGroups />

      {openWizard && <DebtWizard onClose={() => setOpenWizard(false)} />}
      {editDebt && <DebtEditModal debt={editDebt} onClose={() => setEditDebt(null)} />}
      {simulateDebt && <DebtSimulator debt={simulateDebt} onClose={() => setSimulateDebt(null)} />}
    </div>
  );
}
