// E3 — Recompensa diária + streak
// Lógica local determinística — sem IA.
// Persiste lastCheckIn + dailyStreak no perfil (Firestore via setProfile).

export interface DailyRewardState {
  /** Pode fazer check-in hoje? */
  canCheckIn: boolean;
  streak: number;
  /** XP que ganha ao fazer check-in agora. */
  xpReward: number;
  /** Horas restantes até o próximo check-in (0 se pode fazer). */
  hoursUntilNext: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** XP crescente com streak — base 15 + bônus capped em 100 */
export function calcDailyXP(streak: number): number {
  const bonus = Math.min(streak * 5, 85);
  return 15 + bonus;
}

/** Mensagem de streak para exibição */
export function streakMessage(streak: number, companionName = 'seu parceiro'): string {
  if (streak === 0) return `${companionName} está esperando por você!`;
  if (streak === 1) return 'Primeiro dia! Volte amanhã e o bônus cresce.';
  if (streak < 7) return `${streak} dias seguidos! ${companionName} está animado.`;
  if (streak < 14) return `${streak} dias! ${companionName} está radiante. Não quebre agora!`;
  if (streak < 30) return `${streak} dias de lenda! ${companionName} está no nível máximo de felicidade.`;
  return `${streak} dias! Você é uma lenda viva. ${companionName} te ama demais. 🏆`;
}

export function getDailyRewardState(
  lastCheckIn?: string,
  streak = 0,
): DailyRewardState {
  const today = todayStr();
  const yesterday = yesterdayStr();

  if (!lastCheckIn || lastCheckIn < yesterday) {
    // Nunca fez ou perdeu o streak
    return { canCheckIn: true, streak: 0, xpReward: calcDailyXP(0), hoursUntilNext: 0 };
  }

  if (lastCheckIn === yesterday) {
    // Fez ontem — pode fazer hoje, mantém streak
    return { canCheckIn: true, streak, xpReward: calcDailyXP(streak), hoursUntilNext: 0 };
  }

  if (lastCheckIn === today) {
    // Já fez hoje — calcula horas até meia-noite
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const hoursUntilNext = Math.ceil((midnight.getTime() - now.getTime()) / 3_600_000);
    return { canCheckIn: false, streak, xpReward: 0, hoursUntilNext };
  }

  return { canCheckIn: true, streak: 0, xpReward: calcDailyXP(0), hoursUntilNext: 0 };
}
