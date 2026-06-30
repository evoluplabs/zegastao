// E2 — Caçada de Renda Extra
// Adapta o catálogo de incomeTaskSuggestions em "encontros" de Caçada por tier.
// Zero IA — completamente determinístico.

import { generateIncomeTaskSuggestions, type IncomeTask } from '@/lib/incomeTaskSuggestions';
import type { Debt } from '@/types';

export type HuntTier = 'T1' | 'T2' | 'T3';

export const TIER_CONFIG: Record<HuntTier, {
  label: string;
  emoji: string;
  xp: number;
  difficulty: IncomeTask['difficulty'];
  color: string;
  bg: string;
  desc: string;
}> = {
  T1: {
    label: 'Explorador',
    emoji: '🗡️',
    xp: 10,
    difficulty: 'easy',
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
    desc: 'Missões rápidas, baixo risco. Ideal para começar.',
  },
  T2: {
    label: 'Caçador',
    emoji: '⚔️',
    xp: 25,
    difficulty: 'medium',
    color: 'text-gold',
    bg: 'bg-gold/10 border-gold/20',
    desc: 'Missões medianas com retorno maior.',
  },
  T3: {
    label: 'Lendário',
    emoji: '🏹',
    xp: 50,
    difficulty: 'hard',
    color: 'text-boss',
    bg: 'bg-boss/10 border-boss/20',
    desc: 'Alta recompensa, exige mais tempo e esforço.',
  },
};

export interface HuntEncounter extends IncomeTask {
  tier: HuntTier;
  xpReward: number;
  drop: string;
}

function taskToTier(difficulty: IncomeTask['difficulty']): HuntTier {
  if (difficulty === 'medium') return 'T2';
  if (difficulty === 'hard') return 'T3';
  return 'T1';
}

// Drops de sabor por tier (sem impacto real no inventário — visual apenas)
const DROPS: Record<HuntTier, string[]> = {
  T1: ['Moeda de Bronze', 'Pergaminho Básico', 'Erva do Poupador', 'Pedra Bruta'],
  T2: ['Moeda de Prata', 'Cristal Raro', 'Amuleto do Caçador', 'Fragmento de Armadura'],
  T3: ['Moeda de Ouro', 'Gema Lendária', 'Sela do Mestre', 'Pergaminho Épico'],
};

function pickDrop(tier: HuntTier, taskId: string): string {
  const pool = DROPS[tier];
  const idx = taskId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % pool.length;
  return pool[idx];
}

export function generateHuntEncounters(
  skills: string[],
  debts: Debt[],
  tier?: HuntTier,
): HuntEncounter[] {
  const tasks = generateIncomeTaskSuggestions(skills, debts, []);
  return tasks
    .filter((t) => !tier || taskToTier(t.difficulty) === tier)
    .slice(0, 8)
    .map((t) => {
      const taskTier = taskToTier(t.difficulty);
      return {
        ...t,
        tier: taskTier,
        xpReward: TIER_CONFIG[taskTier].xp,
        drop: pickDrop(taskTier, t.id),
      };
    });
}

// "Seu Poder" = level do freelancer derivado de professionXP.freelancer
export function freelancerPower(freelancerXP = 0): number {
  return Math.max(1, Math.min(10, Math.floor(freelancerXP / 50) + 1));
}

// Quantos encontros o usuário pode ver por sessão de caçada
export function maxEncountersByPower(power: number): number {
  if (power <= 2) return 3;
  if (power <= 5) return 5;
  return 8;
}
