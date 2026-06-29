// E4 — Árvore de Skills por profissão
// Determinístico — sem IA. Desbloqueadas por nível de profissão.

import type { Profession } from '@/lib/xp';

export interface Skill {
  id: string;
  profession: Profession;
  name: string;
  desc: string;
  emoji: string;
  unlockLevel: number; // nível de profissão necessário (professionLevel)
}

export const SKILL_TREE: Skill[] = [
  // ── Poupador ──────────────────────────────────────────────
  { id: 'poupador_1', profession: 'poupador', name: 'Cofre Inicial',       emoji: '🏦', unlockLevel: 1, desc: 'Habilidade de criar sua primeira caixinha de meta.' },
  { id: 'poupador_2', profession: 'poupador', name: 'Depósito Diário',     emoji: '📅', unlockLevel: 2, desc: 'Streak de depósito diário ganha +5 XP de bônus.' },
  { id: 'poupador_3', profession: 'poupador', name: 'Cofre Avançado',      emoji: '💰', unlockLevel: 3, desc: 'Você pode criar múltiplas caixinhas simultâneas.' },
  { id: 'poupador_4', profession: 'poupador', name: 'Escudo da Reserva',   emoji: '🛡️', unlockLevel: 5, desc: 'Reserva de 1 mês desbloqueia escudo visual no perfil.' },
  { id: 'poupador_5', profession: 'poupador', name: 'Muralha de Cristal',  emoji: '🏰', unlockLevel: 8, desc: 'Reserva de 3 meses — o HP nunca cai abaixo de 30.' },

  // ── Quitador ──────────────────────────────────────────────
  { id: 'quitador_1', profession: 'quitador', name: 'Golpe Básico',       emoji: '⚔️', unlockLevel: 1, desc: 'Registrar pagamento de parcela ganha +5 XP extra.' },
  { id: 'quitador_2', profession: 'quitador', name: 'Foco no Boss',       emoji: '🎯', unlockLevel: 2, desc: 'Boss mais caro aparece em destaque no topo da lista.' },
  { id: 'quitador_3', profession: 'quitador', name: 'Golpe Crítico',      emoji: '💥', unlockLevel: 3, desc: 'Pagamento acima da parcela mínima dá +10 XP de bônus.' },
  { id: 'quitador_4', profession: 'quitador', name: 'Caça aos Bosses',    emoji: '🗡️', unlockLevel: 5, desc: 'Cada Boss derrotado adiciona +50 XP de profissão.' },
  { id: 'quitador_5', profession: 'quitador', name: 'Purificador de Mapa',emoji: '🌟', unlockLevel: 8, desc: 'Sem dívidas ativas: HP base sobe +10 pontos.' },

  // ── Freelancer ────────────────────────────────────────────
  { id: 'freelancer_1', profession: 'freelancer', name: 'Bounty Básico',   emoji: '📌', unlockLevel: 1, desc: 'Acesso às missões de renda extra T1 (Explorador).' },
  { id: 'freelancer_2', profession: 'freelancer', name: 'Mapa do Caçador', emoji: '🗺️', unlockLevel: 2, desc: 'Acesso às missões T2 (Caçador) e drop de Prata.' },
  { id: 'freelancer_3', profession: 'freelancer', name: 'Instinto de Renda',emoji: '💡', unlockLevel: 3, desc: 'Missões de renda aparecem personalizadas por habilidade.' },
  { id: 'freelancer_4', profession: 'freelancer', name: 'Cédula de Elite',  emoji: '💵', unlockLevel: 5, desc: 'Acesso às missões T3 (Lendário) e drop de Ouro.' },
  { id: 'freelancer_5', profession: 'freelancer', name: 'Mercador Lendário',emoji: '🏆', unlockLevel: 8, desc: 'XP de missões de renda extra dobrado.' },

  // ── Investidor ────────────────────────────────────────────
  { id: 'investidor_1', profession: 'investidor', name: 'Primeira Semeadura', emoji: '🌱', unlockLevel: 1, desc: 'Registrar primeiro investimento ganha +50 XP extra.' },
  { id: 'investidor_2', profession: 'investidor', name: 'Fazendeiro Básico',  emoji: '🪙', unlockLevel: 2, desc: 'Visualização de renda passiva estimada na Fazenda.' },
  { id: 'investidor_3', profession: 'investidor', name: 'Portfólio Diverso',  emoji: '📊', unlockLevel: 3, desc: 'Painel mostra distribuição da carteira por tipo.' },
  { id: 'investidor_4', profession: 'investidor', name: 'Colheita Mensal',    emoji: '🌾', unlockLevel: 5, desc: 'Renda passiva acima de R$ 1.000/mês destrava badge.' },
  { id: 'investidor_5', profession: 'investidor', name: 'Arcano do Patrimônio',emoji: '🔮', unlockLevel: 8, desc: 'Visão de projeção de patrimônio por 12 meses.' },
];

export function getSkillsForProfession(profession: Profession): Skill[] {
  return SKILL_TREE.filter((s) => s.profession === profession);
}

export function isSkillUnlocked(skill: Skill, profLevel: number): boolean {
  return profLevel >= skill.unlockLevel;
}
