// Tier 0 — Classificação por palavra-chave (GRÁTIS, sem IA).
// Resolve a maior parte das transações antes de qualquer chamada de API.

const KEYWORD_MAP: Record<string, string> = {
  // Streaming
  'NETFLIX': 'Streaming', 'SPOTIFY': 'Streaming', 'PRIME VIDEO': 'Streaming',
  'DISNEY+': 'Streaming', 'DISNEY PLUS': 'Streaming', 'MAX ': 'Streaming',
  'GLOBOPLAY': 'Streaming', 'YOUTUBE PREMIUM': 'Streaming', 'APPLE TV': 'Streaming',
  'DEEZER': 'Streaming', 'CRUNCHYROLL': 'Streaming',

  // Delivery
  'IFOOD': 'Delivery', 'RAPPI': 'Delivery', 'UBER EATS': 'Delivery',
  '99FOOD': 'Delivery', 'AIQFOME': 'Delivery', 'JAMES': 'Delivery',

  // Transporte app
  'UBER*': 'Transporte app', '99 ': 'Transporte app', '99*': 'Transporte app',
  'DL*99': 'Transporte app', '99 RIDE': 'Transporte app',
  'CABIFY': 'Transporte app', 'INDRIVE': 'Transporte app', 'INDRIVER': 'Transporte app',

  // Combustível / transporte
  'POSTO ': 'Combustível', 'AUTO POSTO': 'Combustível', 'SHELL': 'Combustível',
  'PETROBRAS': 'Combustível', 'IPIRANGA': 'Combustível', 'BR DISTRIBUIDORA': 'Combustível',

  // Mercado / alimentação
  'SUPERMERCADO': 'Mercado', 'MERCADO': 'Mercado', 'ATACADO': 'Mercado',
  'ASSAI': 'Mercado', 'CARREFOUR': 'Mercado', 'EXTRA ': 'Mercado',
  'HORTIFRUTI': 'Mercado', 'PEIXARIA': 'Mercado', 'ACOUGUE': 'Mercado',
  'PADARIA': 'Mercado', 'PANIFICADORA': 'Mercado', 'PANIFIC': 'Mercado',
  'DEPOSITO': 'Mercado', 'EMPORIO': 'Mercado',

  // Comida pronta / restaurante
  'ACAI': 'Alimentação', 'PIZZARIA': 'Restaurantes', 'RAGAZZO': 'Restaurantes',
  'LANCHONETE': 'Restaurantes', 'RESTAURANTE': 'Restaurantes', 'BAR ': 'Restaurantes',

  // Farmácia / saúde
  'FARMACIA': 'Farmácia', 'DROGARIA': 'Farmácia', 'DROGA': 'Farmácia',
  'ULTRAFARMA': 'Farmácia', 'PACHECO': 'Farmácia',

  // Salário / renda
  'SALARIO': 'Salário', 'HOLERITE': 'Salário', 'PAGAMENTO FUNCIONARIO': 'Salário',
  'FOLHA PGTO': 'Salário', 'VR PAGAMENTO': 'Salário',

  // Dívida / parcelas
  'PAGAMENTO FATURA': 'Fatura cartão', 'PARCELA': 'Parcela empréstimo',
  'FINANCIAMENTO': 'Financiamento', 'EMPRESTIMO': 'Empréstimo',

  // Utilidades
  'ENEL': 'Energia elétrica', 'CEMIG': 'Energia elétrica', 'CPFL': 'Energia elétrica',
  'SABESP': 'Água/esgoto', 'SANEPAR': 'Água/esgoto',
  'VIVO': 'Telefone/Internet', 'CLARO': 'Telefone/Internet', 'TIM ': 'Telefone/Internet',
  'OI ': 'Telefone/Internet', 'NET ': 'Telefone/Internet',

  // Pix / transferência
  'PIX ENVIADO': 'Transferência', 'TED ': 'Transferência',
  'DOC ': 'Transferência', 'TRANSFERENCIA': 'Transferência',
};

export function classifyByKeyword(description: string): string | null {
  const upper = description.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
    if (upper.includes(keyword.trim())) return category;
  }
  return null;
}

// Normaliza descrição para uso como chave de cache
export function normalizeDescription(desc: string): string {
  return desc
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // remove acentos
    .replace(/\d{4,}/g, '')           // remove números longos (datas, IDs)
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);                // trunca para economizar Firestore
}
