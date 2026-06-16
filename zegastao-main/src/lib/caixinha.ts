import type { Caixinha, CaixinhaDeposit } from '@/types';

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
  // O valor diário se recalcula sozinho: sempre o que falta dividido pelos dias restantes.
  const dailyTarget = daysRemaining > 0 ? amountRemaining / daysRemaining : 0;

  const todayISO = todayStr();
  const todayDeposit = (c.deposits || [])
    .filter((d) => d.date === todayISO)
    .reduce((sum, d) => sum + d.amount, 0);

  const isOnTrack = amountRemaining <= 0 || todayDeposit >= dailyTarget * 0.9;
  const progressPct = Math.min(100, c.targetAmount > 0 ? (c.totalSaved / c.targetAmount) * 100 : 0);
  // Precisa guardar hoje? (caixinha ativa, ainda falta valor e nada depositado hoje)
  const needsDepositToday = amountRemaining > 0 && daysRemaining > 0 && todayDeposit <= 0;

  // Dias seguidos sem nenhum depósito (até ontem) — usado para a mensagem de recálculo.
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
    amountRemaining,
    dailyTarget,
    todayDeposit,
    isOnTrack,
    progressPct,
    needsDepositToday,
    missedDays,
    estimatedCompletionDate,
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
