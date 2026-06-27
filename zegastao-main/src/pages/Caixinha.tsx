import { useEffect, useState } from 'react';
import { Plus, Trash2, PiggyBank, ChevronLeft, Flame, Crown, Users, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useCaixinhas } from '@/hooks/useCaixinhas';
import { usePartnerCaixinhas } from '@/hooks/usePartnerCaixinhas';
import { useSubscription } from '@/hooks/useSubscription';
import { useSharedFinances } from '@/hooks/useSharedFinances';
import { useStore } from '@/store/useStore';
import { addUserDoc, deleteUserDoc, updateUserDoc, setUserDoc } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { formatBRL } from '@/lib/utils';
import { getCaixinhaPlan, getStreak } from '@/lib/caixinha';
import type { Caixinha as CaixinhaType, CaixinhaDeposit } from '@/types';

const EMOJIS = ['✈️', '🏠', '🎮', '🎓', '💍', '🚗', '🏖️', '🎁', '💻', '🐶'];

const depositSharedFn = httpsCallable<
  { ownerUid: string; caixinhaId: string; amount: number },
  { ok: boolean; totalSaved: number; completed: boolean }
>(functions, 'depositToSharedCaixinha');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* Pequeno confete CSS — celebra a conclusão da caixinha. */
function Confetti() {
  const pieces = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className="absolute top-0 h-2 w-2 rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              animation: `confetti-fall ${1.8 + Math.random()}s ease-in ${delay}s forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

function CaixinhaDetail({
  caixinha,
  isOwner,
  partnerName,
  onBack,
  onCelebrate,
}: {
  caixinha: CaixinhaType;
  isOwner: boolean;
  partnerName?: string;
  onBack: () => void;
  onCelebrate: () => void;
}) {
  const { toast } = useToast();
  const profile = useStore((s) => s.profile);
  const [depositAmount, setDepositAmount] = useState(0);
  const plan = getCaixinhaPlan(caixinha);
  const streak = getStreak(caixinha.deposits || []);

  const recentDeposits = [...(caixinha.deposits || [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  async function recordDeposit() {
    if (depositAmount <= 0) return;
    const today = todayStr();
    let completed = false;
    if (isOwner) {
      const newDeposit: CaixinhaDeposit = {
        date: today,
        amount: depositAmount,
        ...(caixinha.shared ? { byName: profile?.name || 'Você' } : {}),
      };
      const updatedDeposits = [...(caixinha.deposits || []), newDeposit];
      const newTotal = caixinha.totalSaved + depositAmount;
      completed = newTotal >= caixinha.targetAmount;
      await updateUserDoc('caixinhas', caixinha.id, {
        deposits: updatedDeposits,
        totalSaved: newTotal,
        status: completed ? 'completed' : 'active',
      });
    } else {
      // Caixinha do parceiro → depósito via Cloud Function autorizada
      const res = await depositSharedFn({
        ownerUid: caixinha.ownerUid!,
        caixinhaId: caixinha.id,
        amount: depositAmount,
      });
      completed = res.data.completed;
    }
    setDepositAmount(0);
    if (completed) {
      onCelebrate();
      // Marco na Jornada: primeira caixinha concluída
      try {
        await setUserDoc('journey_milestones', 'caixinha_completed', {
          id: 'caixinha_completed',
          name: 'Primeira caixinha concluída',
          achievedAt: new Date(),
          celebrationShown: false,
        });
      } catch {
        // não-crítico
      }
      toast('🏆 Baú completo! Missão concluída!');
    } else {
      toast('Depósito registrado!');
    }
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
          <h2 className="text-xl font-bold flex items-center gap-2">
            {caixinha.name}
            {caixinha.shared && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
                <Users className="h-3 w-3" /> Casal
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatBRL(caixinha.totalSaved)} de {formatBRL(caixinha.targetAmount)}
          </p>
        </div>
        {streak > 1 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 px-3 py-1 text-xs font-bold">
            <Flame className="h-3.5 w-3.5" /> {streak} dias no cofre
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
        {plan.progressPct.toFixed(0)}% do baú
        {plan.daysRemaining > 0 && ` · ${plan.daysRemaining} dia${plan.daysRemaining !== 1 ? 's' : ''} restantes`}
      </p>

      {caixinha.status !== 'completed' && plan.periodTarget > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              {plan.isWeekly ? 'Poupar esta semana:' : 'Poupar hoje:'}
            </p>
            <p className="text-3xl font-extrabold text-primary animate-pulse">
              {formatBRL(plan.periodTarget)}
            </p>
            <p className="text-xs text-muted-foreground">
              {plan.isOnTrack
                ? '✅ Você está em dia!'
                : plan.isWeekly
                  ? `Guarde ${formatBRL(plan.weeklyTarget)} esta semana para chegar na meta.`
                  : plan.missedDays > 0
                    ? `Você ficou ${plan.missedDays} dia${plan.missedDays !== 1 ? 's' : ''} sem guardar — recalculamos o valor pra você chegar lá.`
                    : 'Recalculado com base no que falta'}
            </p>
            {plan.isWeekly && plan.thisWeekDeposit > 0 && (
              <p className="text-xs font-medium text-success">
                Já guardou {formatBRL(plan.thisWeekDeposit)} esta semana
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {caixinha.status !== 'completed' && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Label>{plan.isWeekly ? 'Registrar depósito desta semana' : 'Registrar depósito de hoje'}</Label>
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
                  {caixinha.shared && d.byName ? ` · ${d.byName}` : ''}
                </span>
                <span className="font-semibold text-green-600">+{formatBRL(d.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isOwner && (
        <p className="text-xs text-center text-muted-foreground">
          Caixinha compartilhada de {partnerName || 'seu parceiro(a)'}.
        </p>
      )}
    </div>
  );
}

export function Caixinha() {
  const { data: caixinhas } = useCaixinhas();
  const { data: partnerCaixinhas } = usePartnerCaixinhas();
  const { limits } = useSubscription();
  const { isLinked } = useSharedFinances();
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.profile);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '✈️', target: 0, date: '', shared: false, frequency: 'daily' as 'daily' | 'weekly' });

  const canShare = limits.sharedPartner && isLinked;
  const atLimit = caixinhas.length >= limits.caixinhasTotal;

  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => setCelebrating(false), 2600);
    return () => clearTimeout(t);
  }, [celebrating]);

  const ownSelected = caixinhas.find((c) => c.id === selected);
  const partnerSelected = partnerCaixinhas.find((c) => c.id === selected);
  const selectedCaixinha = ownSelected || partnerSelected;

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
      frequency: form.frequency,
      ...(form.shared && canShare ? { shared: true, ownerUid: user?.uid } : {}),
    });
    setForm({ name: '', emoji: '✈️', target: 0, date: '', shared: false, frequency: 'daily' });
    setOpen(false);
    toast('🏛️ Cofre criado!');
  }

  async function remove(id: string) {
    await deleteUserDoc('caixinhas', id);
    toast('Caixinha removida', 'info');
  }

  if (selectedCaixinha) {
    return (
      <div className="space-y-4">
        {celebrating && <Confetti />}
        <CaixinhaDetail
          caixinha={selectedCaixinha}
          isOwner={!!ownSelected}
          partnerName={profile?.name}
          onBack={() => setSelected(null)}
          onCelebrate={() => setCelebrating(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {celebrating && <Confetti />}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">🏛️ Cofres da Guilda</h2>
          <p className="text-xs text-muted-foreground">
            Guarde ouro para seus objetivos. Metas maiores?{' '}
            <Link to="/financas?tab=goals" className="text-primary hover:underline">Use as Metas</Link>.
          </p>
        </div>
        {!atLimit && (
          <Button size="sm" onClick={() => setOpen(!open)}>
            <Plus className="h-4 w-4" /> Novo Cofre
          </Button>
        )}
      </div>

      {/* Lembrete: caixinha ativa sem depósito no período */}
      {(() => {
        const pending = caixinhas
          .filter((c) => c.status !== 'completed')
          .map((c) => ({ c, plan: getCaixinhaPlan(c) }))
          .find(({ plan }) => (plan.needsDepositToday || plan.needsDepositThisWeek) && plan.periodTarget > 0);
        if (!pending) return null;
        return (
          <button
            onClick={() => setSelected(pending.c.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10 transition-colors"
          >
            <Bell className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm">
              Deposite <span className="font-semibold text-primary">{formatBRL(pending.plan.periodTarget)}</span> no cofre
              {' '}{pending.c.emoji} {pending.c.name}{pending.plan.isWeekly ? ' esta semana.' : ' hoje.'}
            </span>
          </button>
        );
      })()}

      {/* Upsell quando atingiu o limite do plano gratuito */}
      {atLimit && (
        <Link
          to="/pricing"
          className="flex items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-500/5 p-4 hover:bg-amber-100/60 dark:hover:bg-amber-500/10 transition-colors"
        >
          <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Quer mais de uma caixinha?
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
              Assine o Copiloto para criar caixinhas ilimitadas, automáticas e com lembretes.
            </p>
          </div>
        </Link>
      )}

      {open && !atLimit && (
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
            <div className="space-y-1.5">
              <Label>Frequência de depósito</Label>
              <div className="flex gap-2">
                {(['daily', 'weekly'] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setForm({ ...form, frequency: freq })}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      form.frequency === freq
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/40 text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {freq === 'daily' ? '📅 Todo dia' : '📆 Toda semana'}
                  </button>
                ))}
              </div>
            </div>
            {canShare && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.shared}
                  onChange={(e) => setForm({ ...form, shared: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <Users className="h-4 w-4 text-primary" />
                Compartilhar com meu parceiro(a)
              </label>
            )}
            <Button onClick={save} className="w-full" disabled={!form.name || form.target <= 0 || !form.date}>
              Criar Cofre
            </Button>
          </CardContent>
        </Card>
      )}

      {caixinhas.length === 0 && partnerCaixinhas.length === 0 && !open && !atLimit && (
        <div className="rounded-2xl border border-dashed bg-card/50 p-8 text-center space-y-3">
          <PiggyBank className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="font-medium">🏛️ Nenhum cofre ainda</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Defina um objetivo, uma data e o Zé calcula quanto depositar por dia para encher o baú.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Criar Primeiro Cofre
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {caixinhas.map((c) => (
          <CaixinhaCard key={c.id} c={c} onOpen={() => setSelected(c.id)} onRemove={() => remove(c.id)} />
        ))}
      </div>

      {partnerCaixinhas.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground pt-2 flex items-center gap-2">
            <Users className="h-4 w-4" /> Cofres da Guilda do Casal
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {partnerCaixinhas.map((c) => (
              <CaixinhaCard key={c.id} c={c} onOpen={() => setSelected(c.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CaixinhaCard({ c, onOpen, onRemove }: { c: CaixinhaType; onOpen: () => void; onRemove?: () => void }) {
  const plan = getCaixinhaPlan(c);
  const streak = getStreak(c.deposits || []);
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onOpen}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{c.emoji}</span>
          <CardTitle className="text-base flex items-center gap-1.5">
            {c.name}
            {c.shared && <Users className="h-3.5 w-3.5 text-primary" />}
          </CardTitle>
        </div>
        {onRemove ? (
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        ) : streak > 1 ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500">
            <Flame className="h-3.5 w-3.5" /> {streak}
          </span>
        ) : null}
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
          <p className="mt-2 text-xs font-semibold text-green-600">🏆 Baú completo!</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {plan.isWeekly ? 'Esta semana:' : 'Hoje:'}{' '}
            <span className="font-semibold text-primary">{formatBRL(plan.periodTarget)}</span>
            {plan.daysRemaining > 0 && ` · ${plan.daysRemaining} dia${plan.daysRemaining !== 1 ? 's' : ''}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
