import { useState } from 'react';
import { Plus, Trash2, PiggyBank, ChevronLeft } from 'lucide-react';
import { useCaixinhas } from '@/hooks/useCaixinhas';
import { addUserDoc, deleteUserDoc, updateUserDoc } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatBRL } from '@/lib/utils';
import { getCaixinhaPlan } from '@/lib/caixinha';
import type { Caixinha as CaixinhaType, CaixinhaDeposit } from '@/types';

const EMOJIS = ['✈️', '🏠', '🎮', '🎓', '💍', '🚗', '🏖️', '🎁', '💻', '🐶'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function CaixinhaDetail({ caixinha, onBack }: { caixinha: CaixinhaType; onBack: () => void }) {
  const { toast } = useToast();
  const [depositAmount, setDepositAmount] = useState(0);
  const plan = getCaixinhaPlan(caixinha);

  const recentDeposits = [...(caixinha.deposits || [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  async function recordDeposit() {
    if (depositAmount <= 0) return;
    const today = todayStr();
    const newDeposit: CaixinhaDeposit = { date: today, amount: depositAmount };
    const updatedDeposits = [...(caixinha.deposits || []), newDeposit];
    const newTotal = caixinha.totalSaved + depositAmount;
    const newStatus: CaixinhaType['status'] = newTotal >= caixinha.targetAmount ? 'completed' : 'active';
    await updateUserDoc('caixinhas', caixinha.id, {
      deposits: updatedDeposits,
      totalSaved: newTotal,
      status: newStatus,
    });
    setDepositAmount(0);
    toast(newStatus === 'completed' ? '🎉 Meta atingida! Parabéns!' : 'Depósito registrado!');
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex items-center gap-3">
        <span className="text-4xl">{caixinha.emoji}</span>
        <div>
          <h2 className="text-xl font-bold">{caixinha.name}</h2>
          <p className="text-sm text-muted-foreground">
            {formatBRL(caixinha.totalSaved)} de {formatBRL(caixinha.targetAmount)}
          </p>
        </div>
        {caixinha.status === 'completed' && (
          <span className="ml-auto rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-bold">
            Concluída!
          </span>
        )}
      </div>

      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-700"
          style={{ width: `${plan.progressPct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {plan.progressPct.toFixed(0)}% concluído
        {plan.daysRemaining > 0 && ` · ${plan.daysRemaining} dia${plan.daysRemaining !== 1 ? 's' : ''} restantes`}
      </p>

      {caixinha.status !== 'completed' && plan.dailyTarget > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">Poupar hoje:</p>
            <p className="text-3xl font-extrabold text-primary animate-pulse">
              {formatBRL(plan.dailyTarget)}
            </p>
            <p className="text-xs text-muted-foreground">
              {plan.isOnTrack ? '✅ Você está em dia!' : 'Recalculado com base no que falta'}
            </p>
          </CardContent>
        </Card>
      )}

      {caixinha.status !== 'completed' && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Label>Registrar depósito de hoje</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <CurrencyInput label="" value={depositAmount} onChange={setDepositAmount} />
              </div>
              <Button onClick={recordDeposit} disabled={depositAmount <= 0}>
                Guardar
              </Button>
            </div>
            {plan.todayDeposit > 0 && (
              <p className="text-xs text-green-600 font-medium">
                Você já guardou {formatBRL(plan.todayDeposit)} hoje
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {recentDeposits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Últimos depósitos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDeposits.map((d, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                </span>
                <span className="font-semibold text-green-600">+{formatBRL(d.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function Caixinha() {
  const { data: caixinhas } = useCaixinhas();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', emoji: '✈️', target: 0, date: '' });

  const selectedCaixinha = caixinhas.find((c) => c.id === selected);

  async function save() {
    if (!form.name || form.target <= 0 || !form.date) return;
    await addUserDoc('caixinhas', {
      name: form.name,
      emoji: form.emoji,
      targetAmount: form.target,
      targetDate: form.date,
      startDate: todayStr(),
      totalSaved: 0,
      deposits: [],
      status: 'active',
    });
    setForm({ name: '', emoji: '✈️', target: 0, date: '' });
    setOpen(false);
    toast('Caixinha criada!');
  }

  async function remove(id: string) {
    await deleteUserDoc('caixinhas', id);
    toast('Caixinha removida', 'info');
  }

  if (selectedCaixinha) {
    return (
      <div className="space-y-4">
        <CaixinhaDetail caixinha={selectedCaixinha} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Caixinhas</h2>
        <Button size="sm" onClick={() => setOpen(!open)}>
          <Plus className="h-4 w-4" /> Nova caixinha
        </Button>
      </div>

      {open && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="space-y-1">
              <Label>Nome do objetivo</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Viagem para Europa"
              />
            </div>
            <div className="space-y-1">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setForm({ ...form, emoji: e })}
                    className={`text-xl rounded-lg p-1.5 border-2 transition-colors ${
                      form.emoji === e ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <CurrencyInput label="Valor alvo" value={form.target} onChange={(v) => setForm({ ...form, target: v })} />
            <div className="space-y-1">
              <Label>Data alvo</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <Button onClick={save} className="w-full" disabled={!form.name || form.target <= 0 || !form.date}>
              Criar caixinha
            </Button>
          </CardContent>
        </Card>
      )}

      {caixinhas.length === 0 && !open && (
        <div className="rounded-2xl border border-dashed bg-card/50 p-8 text-center space-y-3">
          <PiggyBank className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="font-medium">Nenhuma caixinha ainda</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Defina um objetivo, uma data e o Zé Gastão calcula exatamente quanto poupar por dia.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Criar primeira caixinha
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {caixinhas.map((c) => {
          const plan = getCaixinhaPlan(c);
          return (
            <Card
              key={c.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(c.id)}
            >
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{c.emoji}</span>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{formatBRL(c.totalSaved)}</span>
                  <span className="text-muted-foreground">{formatBRL(c.targetAmount)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500"
                    style={{ width: `${plan.progressPct}%` }}
                  />
                </div>
                {c.status === 'completed' ? (
                  <p className="mt-2 text-xs font-semibold text-green-600">🎉 Meta atingida!</p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Poupar hoje: <span className="font-semibold text-primary">{formatBRL(plan.dailyTarget)}</span>
                    {plan.daysRemaining > 0 && ` · ${plan.daysRemaining} dia${plan.daysRemaining !== 1 ? 's' : ''}`}
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
