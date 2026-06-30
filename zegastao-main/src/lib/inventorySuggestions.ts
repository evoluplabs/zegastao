// Catálogo de itens físicos para o Inventário Real → Missão
// Valores estimados baseados em preços médios OLX/Mercado Livre

export type InventoryCategory =
  | 'electronics'
  | 'appliances'
  | 'furniture'
  | 'clothing'
  | 'vehicle'
  | 'other';

export interface InventorySuggestion {
  name: string;
  category: InventoryCategory;
  minValue: number;
  maxValue: number;
  emoji: string;
}

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  electronics: 'Eletrônicos',
  appliances:  'Eletrodomésticos',
  furniture:   'Móveis',
  clothing:    'Roupas e Calçados',
  vehicle:     'Veículos',
  other:       'Outros',
};

export const CATEGORY_ICONS: Record<InventoryCategory, string> = {
  electronics: '📱',
  appliances:  '🔌',
  furniture:   '🪑',
  clothing:    '👗',
  vehicle:     '🏍️',
  other:       '📦',
};

export const INVENTORY_SUGGESTIONS: InventorySuggestion[] = [
  // Eletrônicos
  { name: 'Celular',         category: 'electronics', minValue: 300,  maxValue: 800,  emoji: '📱' },
  { name: 'Notebook',        category: 'electronics', minValue: 500,  maxValue: 1500, emoji: '💻' },
  { name: 'TV 32"',          category: 'electronics', minValue: 200,  maxValue: 400,  emoji: '📺' },
  { name: 'TV 55"+',         category: 'electronics', minValue: 600,  maxValue: 1200, emoji: '📺' },
  { name: 'Tablet',          category: 'electronics', minValue: 200,  maxValue: 600,  emoji: '📟' },
  { name: 'Videogame',       category: 'electronics', minValue: 400,  maxValue: 1000, emoji: '🎮' },
  { name: 'Fone Bluetooth',  category: 'electronics', minValue: 80,   maxValue: 300,  emoji: '🎧' },
  { name: 'Câmera',          category: 'electronics', minValue: 200,  maxValue: 800,  emoji: '📷' },
  // Eletrodomésticos
  { name: 'Microondas',      category: 'appliances',  minValue: 100,  maxValue: 250,  emoji: '📦' },
  { name: 'Geladeira',       category: 'appliances',  minValue: 400,  maxValue: 900,  emoji: '🧊' },
  { name: 'Máquina de lavar',category: 'appliances',  minValue: 300,  maxValue: 700,  emoji: '🌀' },
  { name: 'Aspirador',       category: 'appliances',  minValue: 80,   maxValue: 300,  emoji: '🌪️' },
  { name: 'Ar-condicionado', category: 'appliances',  minValue: 300,  maxValue: 800,  emoji: '❄️' },
  { name: 'Liquidificador',  category: 'appliances',  minValue: 40,   maxValue: 150,  emoji: '🫙' },
  // Móveis
  { name: 'Sofá',            category: 'furniture',   minValue: 200,  maxValue: 600,  emoji: '🛋️' },
  { name: 'Mesa',            category: 'furniture',   minValue: 150,  maxValue: 350,  emoji: '🪑' },
  { name: 'Armário',         category: 'furniture',   minValue: 200,  maxValue: 500,  emoji: '🗄️' },
  { name: 'Cama/colchão',    category: 'furniture',   minValue: 150,  maxValue: 600,  emoji: '🛏️' },
  { name: 'Estante',         category: 'furniture',   minValue: 80,   maxValue: 250,  emoji: '📚' },
  // Roupas
  { name: 'Tênis de marca',  category: 'clothing',    minValue: 80,   maxValue: 300,  emoji: '👟' },
  { name: 'Bolsa/mochila',   category: 'clothing',    minValue: 50,   maxValue: 200,  emoji: '👜' },
  { name: 'Pacote de roupas',category: 'clothing',    minValue: 50,   maxValue: 200,  emoji: '👗' },
  // Veículos
  { name: 'Bicicleta',       category: 'vehicle',     minValue: 200,  maxValue: 800,  emoji: '🚲' },
  { name: 'Moto',            category: 'vehicle',     minValue: 3000, maxValue: 15000,emoji: '🏍️' },
  { name: 'Patinete elétrico',category:'vehicle',     minValue: 300,  maxValue: 900,  emoji: '🛴' },
];

export function estimatedValue(suggestion: InventorySuggestion): number {
  return Math.round((suggestion.minValue + suggestion.maxValue) / 2);
}

// ─────────────────────────────────────────────
//  Raridade (MMORPG) — derivada do valor, 100% determinística (zero IA).
// ─────────────────────────────────────────────

export type Rarity = 'comum' | 'refinado' | 'premium' | 'epico' | 'lendario';

export const RARITY_ORDER: Rarity[] = ['comum', 'refinado', 'premium', 'epico', 'lendario'];

export interface RarityMeta {
  label: string;
  emoji: string;
  /** Classes Tailwind para o tema escuro do Inventário. */
  text: string;
  border: string;
  bg: string;
  ring: string;
}

export const RARITY_META: Record<Rarity, RarityMeta> = {
  comum:    { label: 'Comum',    emoji: '⚪', text: 'text-stone-300',  border: 'border-stone-600',     bg: 'bg-stone-500/10',  ring: 'ring-stone-500/20' },
  refinado: { label: 'Refinado', emoji: '🟢', text: 'text-green-400',  border: 'border-green-500/40',  bg: 'bg-green-500/10',  ring: 'ring-green-500/20' },
  premium:  { label: 'Premium',  emoji: '🔵', text: 'text-sky-400',    border: 'border-sky-500/40',    bg: 'bg-sky-500/10',    ring: 'ring-sky-500/20' },
  epico:    { label: 'Épico',    emoji: '🟣', text: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/10', ring: 'ring-purple-500/20' },
  lendario: { label: 'Lendário', emoji: '🟡', text: 'text-amber-400',  border: 'border-amber-500/50',  bg: 'bg-amber-500/10',  ring: 'ring-amber-500/30' },
};

/** Faixas de valor (R$) → raridade. Itens mais valiosos viram itens mais raros. */
export function rarityForValue(value: number): Rarity {
  if (value >= 3000) return 'lendario';
  if (value >= 1000) return 'epico';
  if (value >= 500)  return 'premium';
  if (value >= 200)  return 'refinado';
  return 'comum';
}

// ─────────────────────────────────────────────
//  Condição do item
// ─────────────────────────────────────────────

export type ItemCondition = 'novo' | 'otimo' | 'bom' | 'aceitavel' | 'desgastado';

export const CONDITION_ORDER: ItemCondition[] = ['novo', 'otimo', 'bom', 'aceitavel', 'desgastado'];

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  novo:       'Novo / lacrado',
  otimo:      'Ótimo estado',
  bom:        'Bom estado',
  aceitavel:  'Aceitável',
  desgastado: 'Desgastado',
};

export function getSuggestionsByCategory(category: InventoryCategory): InventorySuggestion[] {
  return INVENTORY_SUGGESTIONS.filter((s) => s.category === category);
}

export function findSuggestion(name: string): InventorySuggestion | undefined {
  const lower = name.toLowerCase();
  return INVENTORY_SUGGESTIONS.find((s) => s.name.toLowerCase().includes(lower));
}
