import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { addUserDoc, deleteUserDoc } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBRL } from '@/lib/utils';
import { estimateGoalDate } from '@/lib/projection';

export function Goals() {
  const { data: goals } = useGoals();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', target: '', current: '', monthly: '' });

  async function save() {
    const target = parseFloat(form.target.replace(',', '.')) || 0;
    if (!form.name || target <= 0) return;
    await addUserDoc('goals', {
      name: form.name,
      type: 'Outros',
      targetAmount: target,
      currentAmount: parseFloat(form.current.replace(',', '.')) || 0,
      priority: 1,
      status: 'active',
      monthlyContribution: parseFloat(form.monthly.replace(',', '.')) || 0,
    });
    setForm({ name: '', target: '', current: '', monthly: '' });
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Metas</h2>
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
              <div className="space-y-1">
                <Label>Alvo</Label>
                <Input inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Já tenho</Label>
                <Input inputMode="decimal" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Aporte/mês</Label>
                <Input inputMode="decimal" value={form.monthly} onChange={(e) => setForm({ ...form, monthly: e.target.value })} />
              </div>
            </div>
            <Button onClick={save} className="w-full">Salvar meta</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {goals.map((g) => {
          const pct = Math.min(100, (g.currentAmount / (g.targetAmount || 1)) * 100);
          const monthly = (g as { monthlyContribution?: number }).monthlyContribution || 0;
          const eta = estimateGoalDate(g.currentAmount, g.targetAmount, monthly);
          return (
            <Card key={g.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{g.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => deleteUserDoc('goals', g.id)}>
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
                  {pct.toFixed(0)}% concluído{eta ? ` · previsão: ${eta}` : ''}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
