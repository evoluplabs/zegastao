// Tier 2 — Categorização com Claude Haiku em LOTE (muito barato).
// Só chega aqui o que escapou dos tiers 0 (keyword) e 1 (cache).
import Anthropic from '@anthropic-ai/sdk';

export const CATEGORIES = [
  'Moradia', 'Alimentação', 'Delivery', 'Restaurantes',
  'Transporte', 'Transporte app', 'Combustível',
  'Saúde', 'Farmácia', 'Educação',
  'Lazer', 'Streaming', 'Vestuário', 'Beleza',
  'Tecnologia', 'Telefone/Internet', 'Energia elétrica', 'Água/esgoto',
  'Mercado', 'Investimentos', 'Fatura cartão', 'Parcela empréstimo',
  'Financiamento', 'Empréstimo', 'Transferência',
  'Salário', 'Renda extra', 'Outros',
];

const BATCH_SIZE = 50;

export async function categorizeBatch(
  transactions: Array<{ date: string; description: string; amount: number }>
): Promise<Array<{ category: string; confidence: number }>> {
  if (transactions.length === 0) return [];

  const client = new Anthropic();
  const results: Array<{ category: string; confidence: number }> = [];

  // Processar em lotes de 50 (economiza tokens — nunca 1 por 1)
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);

    const list = batch.map((t, idx) =>
      `${idx + 1}. [${t.date}] ${t.description} | R$${Math.abs(t.amount).toFixed(2)} | ${t.amount > 0 ? 'entrada' : 'saída'}`
    ).join('\n');

    const prompt = `Categorize estas transações financeiras brasileiras.

Categorias: ${CATEGORIES.join(', ')}

Transações:
${list}

JSON apenas (sem explicação):
{"r":[{"i":1,"c":"Categoria","p":0.95}]}`; // formato compacto = menos tokens

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001', // HAIKU — mais barato
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const data = JSON.parse(text.replace(/```json|```/g, '').trim());
      const map = new Map<number, { c?: string; p?: number }>(
        (data.r || []).map((x: { i: number; c?: string; p?: number }) => [x.i, x])
      );

      for (let j = 0; j < batch.length; j++) {
        const item = map.get(j + 1);
        const category = item?.c && CATEGORIES.includes(item.c) ? item.c : 'Outros';
        results.push({ category, confidence: item?.p ?? 0.5 });
      }
    } catch {
      // Fallback se a chamada falhar ou o JSON for inválido
      batch.forEach(() => results.push({ category: 'Outros', confidence: 0 }));
    }
  }

  return results;
}
