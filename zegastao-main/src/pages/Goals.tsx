import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Target } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { addUserDoc, deleteUserDoc } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatBRL, formatPct } from '@/lib/utils';
import { estimateGoalDate } from '@/lib/projection';

export function Goals() {
  const { data: goals } = useGoals();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', target: 0, current: 0, monthly: 0, date: '' });

  // Quando o usuário define uma data (ex: viagem em julho), calcula o aporte mensal necessário
  const monthsUntil = (() => {
    if (!form.date) return 0;
    const target = new Date(form.date + 'T12:00:00');
    const now = new Date();
    return Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
  })();
  const suggestedMonthly = (() => {
    if (!form.date || form.target <= form.current || monthsUntil <= 0) return 0;
    return (form.target - form.current) / monthsUntil;
  })();

  async function save() {
    if (!form.name || form.target <= 0) return;
    await addUserDoc('goals', {
      name: form.name,
      type: form.date ? 'event_goal' : 'Outros',
      targetAmount: form.target,
      currentAmount: form.current,
      ...(form.date ? { targetDate: form.date } : {}),
      priority: 1,
      status: 'active',
      monthlyContribution: form.monthly || (suggestedMonthly > 0 ? Math.ceil(suggestedMonthly) : 0),
    });
    setForm({ name: '', target: 0, current: 0, monthly: 0, date: '' });
    setOpen(false);
    toast('Meta criada!');
  }

  async function remove(id: string) {
    await deleteUserDoc('goals', id);
    toast('Meta removida', 'info');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Metas</h2>
          <p className="text-xs text-muted-foreground">
            Objetivos maiores. Quer um hábito diário de poupar?{' '}
            <Link to="/caixinha" className="text-primary hover:underline">Crie uma Caixinha</Link>.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(!open)}>
          <Plus className="h-4 w-4" /> Nova meta
        </Button>
      </div>

      {open && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="space-y-1">
              <Label>Nome da meta</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Reserva de emergência" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <CurrencyInput label="Alvo" value={form.target} onChange={(v) => setForm({ ...form, target: v })} />
              <CurrencyInput label="Já tenho" value={form.current} onChange={(v) => setForm({ ...form, current: v })} />
              <CurrencyInput label="Aporte/mês" value={form.monthly} onChange={(v) => setForm({ ...form, monthly: v })} />
            </div>
            <div className="space-y-1">
              <Label>Tem data? (viagem, festa, evento — opcional)</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              {suggestedMonthly > 0 && (
                <p className="text-xs text-primary font-medium pt-1">
                  💡 Para chegar lá em {monthsUntil} {monthsUntil > 1 ? 'meses' : 'mês'}, guarde {formatBRL(Math.ceil(suggestedMonthly))}/mês
                </p>
              )}
            </div>
            <Button onClick={save} className="w-full">Salvar meta</Button>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 && !open && (
        <div className="rounded-2xl border border-dashed bg-card/50 p-8 text-center space-y-3">
          <Target className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="font-medium">Nenhuma meta ainda</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Defina um objetivo financeiro — quitar uma dívida, criar reserva, ou juntar para algo especial.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Criar primeira meta
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {goals.map((g) => {
          const pct = Math.min(100, (g.currentAmount / (g.targetAmount || 1)) * 100);
          const monthly = (g as { monthlyContribution?: number }).monthlyContribution || 0;
          const eta = estimateGoalDate(g.currentAmount, g.targetAmount, monthly);
          return (
            <Card key={g.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {g.name}
                  {g.source === 'auto-default' && (
                    <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-medium text-primary">
                      💡 Sugestão inicial
                    </span>
                  )}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => remove(g.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{formatBRL(g.currentAmount)}</span>
                  <span className="text-muted-foreground">{formatBRL(g.targetAmount)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary">
                  <div className="h-2.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatPct(pct)} concluído{eta ? ` · previsão: ${eta}` : ''}
                </p>
                {g.targetDate && (
                  <p className="mt-1 text-xs font-medium text-primary">
                    📅 Evento em {new Date(g.targetDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
