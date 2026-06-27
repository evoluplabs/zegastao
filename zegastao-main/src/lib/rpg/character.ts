// Modelo de personagem e companion do Zé Gastão MMORPG.
// Identidade ORIGINAL — classes, avatares e mascotes próprios, inspirados no
// gênero MMORPG idle, mapeados às 4 profissões financeiras reais do app.

export type CharacterClassId = 'guardiao' | 'cacador' | 'mercador' | 'arcano';
export type ProfessionId = 'poupador' | 'quitador' | 'freelancer' | 'investidor';

export interface CharacterClass {
  id: CharacterClassId;
  name: string;
  title: string;
  emoji: string;
  /** Profissão financeira que esta classe favorece (foco inicial). */
  focus: ProfessionId;
  tagline: string;
  /** Bônus de sabor exibido no card de seleção. */
  perk: string;
  accent: 'green' | 'red' | 'gold' | 'sky';
}

export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    id: 'guardiao',
    name: 'Guardião',
    title: 'Protetor do Cofre',
    emoji: '🛡️',
    focus: 'poupador',
    tagline: 'Defesa alta. Constrói reserva e dorme tranquilo.',
    perk: '+ Foco em poupança e reserva de emergência',
    accent: 'green',
  },
  {
    id: 'cacador',
    name: 'Caçador',
    title: 'Caçador de Bosses',
    emoji: '⚔️',
    focus: 'quitador',
    tagline: 'Ataque alto. Vive para derrotar dívidas caras.',
    perk: '+ Foco em quitar dívidas (Bosses) na ordem certa',
    accent: 'red',
  },
  {
    id: 'mercador',
    name: 'Mercador',
    title: 'Mestre do Comércio',
    emoji: '🪙',
    focus: 'freelancer',
    tagline: 'Faro para ouro. Transforma talento em renda extra.',
    perk: '+ Foco em missões de renda e venda de itens',
    accent: 'gold',
  },
  {
    id: 'arcano',
    name: 'Arcano',
    title: 'Vidente do Ouro',
    emoji: '🔮',
    focus: 'investidor',
    tagline: 'Visão de futuro. Faz o ouro trabalhar sozinho.',
    perk: '+ Foco em investimentos e renda passiva',
    accent: 'sky',
  },
];

export function getClass(id?: CharacterClassId | string): CharacterClass {
  return CHARACTER_CLASSES.find((c) => c.id === id) ?? CHARACTER_CLASSES[0];
}

// ─────────────────────────────────────────────
//  Avatares (originais, à base de emoji — leves e mobile-first)
// ─────────────────────────────────────────────

export interface AvatarOption {
  id: string;
  emoji: string;
  label: string;
}

export const AVATARS: AvatarOption[] = [
  { id: 'mage', emoji: '🧙', label: 'Mago' },
  { id: 'elf', emoji: '🧝', label: 'Elfo' },
  { id: 'hero', emoji: '🦸', label: 'Herói' },
  { id: 'ninja', emoji: '🥷', label: 'Ninja' },
  { id: 'knight', emoji: '🤴', label: 'Nobre' },
  { id: 'queen', emoji: '👸', label: 'Nobreza' },
  { id: 'ranger', emoji: '🧑‍🌾', label: 'Plebeu' },
  { id: 'fairy', emoji: '🧚', label: 'Fada' },
  { id: 'vampire', emoji: '🧛', label: 'Sombrio' },
  { id: 'genie', emoji: '🧞', label: 'Gênio' },
];

export function getAvatar(id?: string): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

// ─────────────────────────────────────────────
//  Companion (mascote) — cuida dele cuidando das finanças
// ─────────────────────────────────────────────

export interface CompanionSpecies {
  id: string;
  emoji: string;
  name: string;
  /** Sugestão de nome pré-preenchida. */
  suggestedName: string;
  blurb: string;
}

export const COMPANION_SPECIES: CompanionSpecies[] = [
  { id: 'dragon', emoji: '🐲', name: 'Dragãozinho', suggestedName: 'Fagulha', blurb: 'Solta faísca quando você economiza.' },
  { id: 'fox', emoji: '🦊', name: 'Raposa', suggestedName: 'Ruivo', blurb: 'Esperta com ouro. Fareja bons negócios.' },
  { id: 'owl', emoji: '🦉', name: 'Coruja', suggestedName: 'Sábia', blurb: 'Sábia e econômica. Adora um bom plano.' },
  { id: 'cat', emoji: '🐱', name: 'Gato', suggestedName: 'Moeda', blurb: 'Independente, mas ronrona com reserva cheia.' },
  { id: 'dog', emoji: '🐶', name: 'Cão', suggestedName: 'Fiel', blurb: 'Companheiro leal da sua jornada.' },
  { id: 'chick', emoji: '🐥', name: 'Pintinho', suggestedName: 'Pip', blurb: 'Cresce junto com o seu cofre.' },
];

export function getSpecies(id?: string): CompanionSpecies {
  return COMPANION_SPECIES.find((s) => s.id === id) ?? COMPANION_SPECIES[0];
}

export type CompanionMood = 'thriving' | 'happy' | 'ok' | 'worried' | 'critical';

export interface CompanionState {
  mood: CompanionMood;
  /** Carinha sobreposta ao mascote. */
  face: string;
  /** Fala curta, em tom de RPG mas honesta sobre as finanças. */
  line: string;
  /** Classe de animação CSS. */
  anim: 'companion-happy' | 'companion-idle' | 'companion-sad';
  /** Cor do humor (token Tailwind). */
  color: 'text-primary' | 'text-gold' | 'text-amber-400' | 'text-boss';
  /** Rótulo do humor. */
  label: string;
}

/**
 * Deriva o estado do companion a partir do HP financeiro (0–100).
 * HP = (entradas - saídas) / entradas * 100, calculado fora daqui.
 */
export function companionStateFromHP(hp: number, companionName = 'seu parceiro'): CompanionState {
  const name = companionName;
  if (hp >= 80) {
    return {
      mood: 'thriving', face: '😄', anim: 'companion-happy', color: 'text-primary', label: 'Radiante',
      line: `${name} tá radiante! Suas finanças estão voando este mês. 🌟`,
    };
  }
  if (hp >= 55) {
    return {
      mood: 'happy', face: '🙂', anim: 'companion-idle', color: 'text-primary', label: 'Feliz',
      line: `${name} está feliz. Você está no controle — continua assim!`,
    };
  }
  if (hp >= 30) {
    return {
      mood: 'ok', face: '😐', anim: 'companion-idle', color: 'text-gold', label: 'Atento',
      line: `${name} está de olho. Dá pra segurar, mas cuidado com os gastos.`,
    };
  }
  if (hp >= 10) {
    return {
      mood: 'worried', face: '😟', anim: 'companion-sad', color: 'text-amber-400', label: 'Preocupado',
      line: `${name} está preocupado... o mês ficou apertado. Bora atacar um Boss?`,
    };
  }
  return {
    mood: 'critical', face: '😣', anim: 'companion-sad', color: 'text-boss', label: 'Em perigo',
    line: `${name} precisa de você! O HP está crítico. Vamos respirar e organizar juntos.`,
  };
}

/** HP financeiro a partir de entradas/saídas do mês. */
export function financialHP(entradas: number, saidas: number): number {
  if (entradas <= 0) return saidas > 0 ? 0 : 50;
  const hp = ((entradas - saidas) / entradas) * 100;
  return Math.max(0, Math.min(100, Math.round(hp)));
}

export interface CharacterIdentity {
  name: string;
  classId: CharacterClassId;
  avatarId: string;
  companionSpeciesId: string;
  companionName: string;
}
