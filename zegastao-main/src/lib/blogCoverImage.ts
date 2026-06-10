// Generates a gradient CSS class + icon for blog posts that don't have a cover photo.
// Each category gets a distinct visual identity.

export interface CoverConfig {
  gradient: string;     // Tailwind bg gradient classes
  iconEmoji: string;    // Emoji used as hero icon
  textColor: string;    // Text color on the cover
}

const CATEGORY_COVERS: Record<string, CoverConfig> = {
  'Dívidas': {
    gradient: 'bg-gradient-to-br from-red-500 to-orange-600',
    iconEmoji: '💳',
    textColor: 'text-white',
  },
  'Orçamento': {
    gradient: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    iconEmoji: '📊',
    textColor: 'text-white',
  },
  'Renda Extra': {
    gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',
    iconEmoji: '💰',
    textColor: 'text-white',
  },
  'Poupança': {
    gradient: 'bg-gradient-to-br from-violet-500 to-purple-600',
    iconEmoji: '🏦',
    textColor: 'text-white',
  },
  'Direitos': {
    gradient: 'bg-gradient-to-br from-amber-500 to-yellow-600',
    iconEmoji: '⚖️',
    textColor: 'text-white',
  },
  'Psicologia Financeira': {
    gradient: 'bg-gradient-to-br from-pink-500 to-rose-600',
    iconEmoji: '🧠',
    textColor: 'text-white',
  },
  'Ferramentas': {
    gradient: 'bg-gradient-to-br from-cyan-500 to-teal-600',
    iconEmoji: '🛠️',
    textColor: 'text-white',
  },
  'Especiais': {
    gradient: 'bg-gradient-to-br from-orange-500 to-red-600',
    iconEmoji: '⭐',
    textColor: 'text-white',
  },
};

const DEFAULT_COVER: CoverConfig = {
  gradient: 'bg-gradient-to-br from-primary/80 to-primary',
  iconEmoji: '📝',
  textColor: 'text-white',
};

export function getCoverConfig(category: string): CoverConfig {
  return CATEGORY_COVERS[category] || DEFAULT_COVER;
}
