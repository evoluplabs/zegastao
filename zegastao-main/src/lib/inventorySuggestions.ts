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

export function getSuggestionsByCategory(category: InventoryCategory): InventorySuggestion[] {
  return INVENTORY_SUGGESTIONS.filter((s) => s.category === category);
}

export function findSuggestion(name: string): InventorySuggestion | undefined {
  const lower = name.toLowerCase();
  return INVENTORY_SUGGESTIONS.find((s) => s.name.toLowerCase().includes(lower));
}
