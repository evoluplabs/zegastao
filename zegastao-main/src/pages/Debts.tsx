import { useState } from 'react';
import { Plus, Trash2, Handshake, Pencil, Zap } from 'lucide-react';
import { doc, writeBatch, collection } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { useDebts } from '@/hooks/useDebts';
import { useNegotiationAlerts } from '@/hooks/useDocuments';
import { deleteUserDoc } from '@/lib/firestore';
import { calcAmortization } from '@/lib/amortization';
import { useToast } from '@/components/ui/Toast';
import { NEGOTIATION_SCRIPTS } from '@/lib/negotiation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';
import { DebtWizard } from '@/components/flows/DebtWizard';
import { DebtEditModal } from '@/components/flows/DebtEditModal';
import { DebtSimulator } from '@/components/DebtSimulator';
import { TransactionInstallmentGroups } from '@/components/TransactionInstallmentGroups';
import { BossCard } from '@/components/BossCard';
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

  async function quickPayInstallment(d: Debt) {
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
      if (newRem === 0) {
        toast('🏆 Boss derrotado! Dívida quitada!');
      } else {
        toast('⚔️ Ataque registrado! +30 XP');
      }
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
    toast('Boss removido', 'info');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">⚔️ Bosses Ativos</h2>
          <p className="text-sm text-muted-foreground">HP total: {formatBRL(totalBalance)}</p>
        </div>
        <Button size="sm" onClick={() => setOpenWizard(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Boss
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
            Nenhum boss ativo. Cadastre suas dívidas e o Sábio monta o plano de quitação. 🎯
          </CardContent>
        </Card>
      )}

      {ranked.map((d, i) => {
        const paidThisMonth = d.lastPaymentMonth === currentMonth();
        const canAttack = d.status === 'active' && d.remainingInstallments > 0 && d.interestRateMonthly > 0 && !paidThisMonth && payingId !== d.id;
        return (
          <div key={d.id} className="space-y-2">
            {i === 0 && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1 px-1">
                ☠️ Ataque este boss primeiro — juros mais altos
              </p>
            )}
            <BossCard
              debt={d}
              onAttack={canAttack ? () => quickPayInstallment(d) : undefined}
            />
            {paidThisMonth && (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                ✅ Ataque deste mês registrado — próximo round no mês que vem
              </div>
            )}
            {payingId === d.id && (
              <div className="flex items-center gap-1.5 rounded-lg bg-primary/5 border border-primary/20 px-3 py-1.5 text-xs text-muted-foreground">
                ⚔️ Registrando ataque…
              </div>
            )}
            <div className="flex items-center gap-3 px-1">
              <button
                onClick={() => setEditDebt(d)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button
                onClick={() => setSimulateDebt(d)}
                className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors"
              >
                <Zap className="h-3.5 w-3.5" /> Simular ataque extra
              </button>
              <button
                onClick={() => remove(d.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </button>
            </div>
          </div>
        );
      })}

      {/* Parcelas detectadas automaticamente no extrato */}
      <TransactionInstallmentGroups />

      {openWizard && <DebtWizard onClose={() => setOpenWizard(false)} />}
      {editDebt && <DebtEditModal debt={editDebt} onClose={() => setEditDebt(null)} />}
      {simulateDebt && <DebtSimulator debt={simulateDebt} onClose={() => setSimulateDebt(null)} />}
    </div>
  );
}
