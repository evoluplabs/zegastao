// XP engine — gamification system for Zé Gastão RPG

export const XP_EVENTS = {
  task_easy: 10,
  task_medium: 25,
  task_hard: 50,
  caixinha_deposit: 10,
  caixinha_complete: 200,
  debt_payment: 30,
  debt_cleared: 500,
  milestone: 200,
  inventory_sold: 100,
  bet_win: 50,
  bet_loss: 5,
} as const;

export type XPEventKey = keyof typeof XP_EVENTS;

// Lv formula: xp_to_reach_level_N = 100 * N * (N-1) / 2
export function levelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + 8 * xp / 100)) / 2));
}

export function xpForLevel(level: number): number {
  return Math.floor(100 * level * (level - 1) / 2);
}

export function xpProgressInLevel(xp: number): { current: number; needed: number; pct: number } {
  const lv = levelFromXP(xp);
  const current = xp - xpForLevel(lv);
  const needed = xpForLevel(lv + 1) - xpForLevel(lv);
  return { current, needed, pct: Math.min(100, Math.round((current / needed) * 100)) };
}

export const LEVEL_NAMES: Record<number, { title: string; phase: string }> = {
  1:  { title: 'Iniciante Endividado',      phase: 'survival' },
  2:  { title: 'Iniciante Endividado',      phase: 'survival' },
  3:  { title: 'Guerreiro da Reorganização', phase: 'reorganizing' },
  4:  { title: 'Guerreiro da Reorganização', phase: 'reorganizing' },
  5:  { title: 'Guardião Estável',           phase: 'stabilizing' },
  6:  { title: 'Guardião Estável',           phase: 'stabilizing' },
  7:  { title: 'Acumulador de Ouro',         phase: 'accumulating' },
  8:  { title: 'Acumulador de Ouro',         phase: 'accumulating' },
  9:  { title: 'Mestre Investidor',          phase: 'growing' },
  10: { title: 'Mestre Investidor',          phase: 'growing' },
};

export function levelName(level: number): string {
  const clamped = Math.max(1, Math.min(10, level));
  return LEVEL_NAMES[clamped]?.title ?? 'Aventureiro';
}

export type Profession = 'poupador' | 'quitador' | 'freelancer' | 'investidor';

export const PROFESSION_LABELS: Record<Profession, string> = {
  poupador:   'Poupador',
  quitador:   'Quitador',
  freelancer: 'Freelancer',
  investidor: 'Investidor',
};

export const PROFESSION_ICONS: Record<Profession, string> = {
  poupador:   '🏦',
  quitador:   '⚔️',
  freelancer: '💼',
  investidor: '📈',
};

export function professionLevel(xp: number): number {
  return Math.max(0, Math.min(10, Math.floor(xp / 50)));
}

export function hpFinanceiro(entradas: number, saidas: number): number {
  if (entradas <= 0) return saidas <= 0 ? 100 : 0;
  return Math.max(-100, Math.min(100, Math.round(((entradas - saidas) / entradas) * 100)));
}

export function hpStatus(hp: number): { label: string; color: string; pulse: boolean } {
  if (hp >= 80) return { label: 'Saudável', color: 'emerald', pulse: false };
  if (hp >= 50) return { label: 'Atenção', color: 'yellow', pulse: false };
  if (hp >= 20) return { label: 'Em Perigo', color: 'orange', pulse: false };
  if (hp >= 0)  return { label: 'Crítico', color: 'red', pulse: true };
  return { label: 'Game Over', color: 'red', pulse: true };
}
