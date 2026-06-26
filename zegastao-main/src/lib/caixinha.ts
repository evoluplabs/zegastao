import type { Caixinha, CaixinhaDeposit } from '@/types';

function daysBetween(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Retorna a data (YYYY-MM-DD) da segunda-feira da semana atual. */
function thisWeekMondayStr(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Dom, 1=Seg, ...6=Sáb
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(mon.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().slice(0, 10);
}

export function getCaixinhaPlan(c: Caixinha) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(c.targetDate + 'T12:00:00');
  const isWeekly = c.frequency === 'weekly';

  const daysRemaining = Math.max(0, daysBetween(today, target));
  const amountRemaining = Math.max(0, c.targetAmount - c.totalSaved);

  // Valor diário: falta / dias restantes.
  const dailyTarget = daysRemaining > 0 ? amountRemaining / daysRemaining : 0;

  // Valor semanal: falta / semanas restantes (mínimo 1 semana).
  const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
  const weeklyTarget = amountRemaining > 0 ? amountRemaining / weeksRemaining : 0;

  const todayISO = todayStr();
  const weekMondayISO = thisWeekMondayStr();

  const todayDeposit = (c.deposits || [])
    .filter((d) => d.date === todayISO)
    .reduce((sum, d) => sum + d.amount, 0);

  const thisWeekDeposit = (c.deposits || [])
    .filter((d) => d.date >= weekMondayISO)
    .reduce((sum, d) => sum + d.amount, 0);

  const periodTarget = isWeekly ? weeklyTarget : dailyTarget;
  const periodDeposit = isWeekly ? thisWeekDeposit : todayDeposit;
  const isOnTrack = amountRemaining <= 0 || periodDeposit >= periodTarget * 0.9;
  const progressPct = Math.min(100, c.targetAmount > 0 ? (c.totalSaved / c.targetAmount) * 100 : 0);

  const needsDepositToday = !isWeekly && amountRemaining > 0 && daysRemaining > 0 && todayDeposit <= 0;
  const needsDepositThisWeek = isWeekly && amountRemaining > 0 && daysRemaining > 0 && thisWeekDeposit <= 0;

  const missedDays = getMissedDays(c.deposits || []);

  let estimatedCompletionDate: string | null = null;
  if (amountRemaining > 0 && dailyTarget > 0) {
    const daysNeeded = Math.ceil(amountRemaining / dailyTarget);
    const completion = new Date(today);
    completion.setDate(completion.getDate() + daysNeeded);
    estimatedCompletionDate = completion.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  } else if (amountRemaining <= 0) {
    estimatedCompletionDate = 'Concluída!';
  }

  return {
    daysRemaining,
    weeksRemaining,
    amountRemaining,
    dailyTarget,
    weeklyTarget,
    periodTarget,
    todayDeposit,
    thisWeekDeposit,
    isOnTrack,
    progressPct,
    needsDepositToday,
    needsDepositThisWeek,
    missedDays,
    estimatedCompletionDate,
    isWeekly,
  };
}

/** Dias consecutivos (terminando hoje ou ontem) com pelo menos um depósito. */
export function getStreak(deposits: CaixinhaDeposit[]): number {
  if (!deposits || deposits.length === 0) return 0;
  const days = new Set(deposits.map((d) => d.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  // Se ainda não guardou hoje, a sequência pode terminar ontem.
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Dias seguidos sem depósito, contados a partir de ontem para trás. */
function getMissedDays(deposits: CaixinhaDeposit[]): number {
  const days = new Set(deposits.map((d) => d.date));
  let missed = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - 1); // começa em ontem
  while (!days.has(cursor.toISOString().slice(0, 10)) && missed < 60) {
    missed++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return missed;
}
