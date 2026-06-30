// E6 — Social stats
// Estrutura do doc social_stats/{uid} — SOMENTE dados de jogo, NUNCA financeiros.
// Privacidade: sem R$, saldo, dívidas ou e-mail.

import type { CharacterClassId } from '@/lib/rpg/character';
import type { Profile } from '@/types';
import { levelFromXP } from '@/lib/xp';

export interface SocialStats {
  uid: string;
  alias: string;          // nome do personagem (sem sobrenome real)
  avatarId: string;
  characterClass: CharacterClassId;
  companionSpeciesId: string;
  level: number;
  xp: number;
  dailyStreak: number;
  achievementsCount: number;
  updatedAt: string;      // ISO timestamp
}

/** Monta o doc social_stats a partir do perfil local. Nunca inclui dados financeiros. */
export function buildSocialStats(
  uid: string,
  profile: Profile,
  achievementsCount: number,
): SocialStats {
  const xp = profile.xp ?? 0;
  return {
    uid,
    alias: profile.name?.split(' ')[0] ?? 'Aventureiro',
    avatarId: profile.avatarId ?? 'mage',
    characterClass: (profile.characterClass as CharacterClassId) ?? 'guardiao',
    companionSpeciesId: profile.companionSpeciesId ?? 'dragon',
    level: levelFromXP(xp),
    xp,
    dailyStreak: profile.dailyStreak ?? 0,
    achievementsCount,
    updatedAt: new Date().toISOString(),
  };
}

export interface LeaderboardEntry {
  uid: string;
  alias: string;
  avatarId: string;
  characterClass: CharacterClassId;
  level: number;
  xp: number;
  dailyStreak: number;
  rank: number;
}

/** Coluna de ranking exibida ao usuário */
export const LEADERBOARD_COLUMNS = ['rank', 'alias', 'level', 'xp', 'streak'] as const;
