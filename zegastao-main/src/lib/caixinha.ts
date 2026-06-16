import type { Caixinha } from '@/types';

function daysBetween(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function getCaixinhaPlan(c: Caixinha) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(c.targetDate + 'T12:00:00');

  const daysRemaining = Math.max(0, daysBetween(today, target));
  const amountRemaining = Math.max(0, c.targetAmount - c.totalSaved);
  const dailyTarget = daysRemaining > 0 ? amountRemaining / daysRemaining : 0;

  const todayISO = todayStr();
  const todayDeposit = (c.deposits || [])
    .filter((d) => d.date === todayISO)
    .reduce((sum, d) => sum + d.amount, 0);

  const isOnTrack = amountRemaining <= 0 || todayDeposit >= dailyTarget * 0.9;
  const progressPct = Math.min(100, c.targetAmount > 0 ? (c.totalSaved / c.targetAmount) * 100 : 0);

  let estimatedCompletionDate: string | null = null;
  if (amountRemaining > 0 && dailyTarget > 0) {
    const daysNeeded = Math.ceil(amountRemaining / dailyTarget);
    const completion = new Date(today);
    completion.setDate(completion.getDate() + daysNeeded);
    estimatedCompletionDate = completion.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  } else if (amountRemaining <= 0) {
    estimatedCompletionDate = 'Concluída!';
  }

  return { daysRemaining, amountRemaining, dailyTarget, todayDeposit, isOnTrack, progressPct, estimatedCompletionDate };
}
