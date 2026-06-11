import { useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { useRules } from '@/hooks/useRules';
import { useGoals } from '@/hooks/useGoals';
import { addUserDoc, deleteUserDoc, updateUserDoc } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES, type TriggerType } from '@/types';
import { formatBRL } from '@/lib/utils';

const TRIGGER_LABELS: Record<TriggerType, string> = {
  transaction_in_category: 'a cada gasto na categoria',
  category_monthly_over: 'ultrapassar no mês',
  income_received: 'receber renda',
};

export function Rules() {
  const { data: rules } = useRules();
  const { data: goals } = useGoals();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    triggerType: 'income_received' as TriggerType,
    triggerCategoryName: CATEGORIES[0] as string,
    triggerThreshold: '',
    actionPercentage: '30',
    actionGoalId: '',
  });

  async function save() {
    if (!form.name) return;
    await addUserDoc('rules', {
      name: form.name,
      isActive: true,
      triggerType: form.triggerType,
      triggerCategoryName: form.triggerType === 'income_received' ? null : form.triggerCategoryName,
      triggerThreshold: parseFloat(form.triggerThreshold.replace(',', '.')) || 0,
      actionType: 'redirect_percentage',
      actionPercentage: parseFloat(form.actionPercentage.replace(',', '.')) || 0,
      actionGoalId: form.actionGoalId || null,
      timesTriggered: 0,
      totalRedirected: 0,
      monthRedirected: 0,
    });
    setForm({ ...form, name: '', triggerThreshold: '' });
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Regras automáticas</h2>
        <Button size="sm" onClick={() => setOpen(!open)}>
          <Plus className="h-4 w-4" /> Nova regra
        </Button>
      </div>

      {open && (
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            <Input
              placeholder="Nome da regra (ex: Guardar parte da renda extra)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span>SE</span>
              <Select
                className="w-auto"
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value as TriggerType })}
              >
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              {form.triggerType !== 'income_received' && (
                <Select
                  className="w-auto"
                  value={form.triggerCategoryName}
                  onChange={(e) => setForm({ ...form, triggerCategoryName: e.target.value })}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              )}
              {form.triggerType === 'category_monthly_over' && (
                <Input
                  className="w-28"
                  inputMode="decimal"
                  placeholder="R$/mês"
                  value={form.triggerThreshold}
                  onChange={(e) => setForm({ ...form, triggerThreshold: e.target.value })}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>ENTÃO redirecionar</span>
              <Input
                className="w-20"
                inputMode="decimal"
                value={form.actionPercentage}
                onChange={(e) => setForm({ ...form, actionPercentage: e.target.value })}
              />
              <span>% para</span>
              <Select
                className="w-auto"
                value={form.actionGoalId}
                onChange={(e) => setForm({ ...form, actionGoalId: e.target.value })}
              >
                <option value="">(escolha uma meta)</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </div>
            <Button onClick={save} className="w-full">Salvar regra</Button>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Crie regras que guardam dinheiro automaticamente. Ex: "30% de toda renda extra → reserva".
          </CardContent>
        </Card>
      )}

      {rules.map((r) => (
        <Card key={r.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" /> {r.name}
              <Badge variant={r.isActive ? 'success' : 'secondary'}>
                {r.isActive ? 'Ativa' : 'Pausada'}
              </Badge>
              {r.source === 'auto-default' && (
                <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-medium text-primary">
                  💡 Sugestão inicial
                </span>
              )}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => updateUserDoc('rules', r.id, { isActive: !r.isActive })}>
                {r.isActive ? 'Pausar' : 'Ativar'}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteUserDoc('rules', r.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Redirecionou <span className="font-semibold text-foreground">{formatBRL(r.totalRedirected || 0)}</span> em{' '}
            {r.timesTriggered || 0} aplicação(ões) · {formatBRL(r.monthRedirected || 0)} este mês.
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
