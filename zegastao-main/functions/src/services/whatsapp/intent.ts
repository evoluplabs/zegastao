// Detecção de intenção via Claude Haiku — custo < R$0,01/mensagem com prompt caching.
import Anthropic from '@anthropic-ai/sdk';

export type IntentType =
  | 'register_expense'
  | 'register_income'
  | 'register_debt_payment'
  | 'query_balance'
  | 'query_boss'
  | 'query_summary'
  | 'store_document'
  | 'greeting'
  | 'unknown';

export interface ParsedIntent {
  type: IntentType;
  amount?: number;
  description?: string;
  category?: string;
  creditorHint?: string;
  rawText: string;
}

const INTENT_SYSTEM = `Você é o analisador de intenções do Zé Gastão (RPG financeiro).
Analise a mensagem e retorne APENAS JSON válido, sem markdown:

{
  "type": "register_expense|register_income|register_debt_payment|query_balance|query_boss|query_summary|greeting|unknown",
  "amount": 50.00,
  "description": "Mercado Extra",
  "category": "Alimentação|Transporte|Moradia|Saúde|Lazer|Educação|Vestuário|Serviços|Outros",
  "creditorHint": "Nubank"
}

Regras:
- register_expense: "gastei X", "comprei X", "paguei X por/em/no Y", "saiu X"
- register_income: "recebi X", "ganhei X", "entrou X de salário/freela/pix"
- register_debt_payment: "paguei parcela/boleto/fatura de Y", "paguei a dívida do Y"
- query_balance: "quanto tenho?", "meu saldo", "sobrou quanto?"
- query_boss: "boss", "maior dívida", "qual dívida pagar primeiro?"
- query_summary: "resumo", "relatório", "como estou?", "situação"
- greeting: oi, olá, menu, ajuda, help, vincular, start
Valores: extrair número (R$ 50,00 → 50, "cinquenta" → 50, "50 conto" → 50).
Omita campos não aplicáveis.`;

const client = new Anthropic();

export async function detectIntent(text: string): Promise<ParsedIntent> {
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: INTENT_SYSTEM,
      messages: [{ role: 'user', content: text }],
    });
    const raw = (msg.content[0] as Anthropic.TextBlock).text.trim();
    const json = JSON.parse(raw);
    return { ...json, rawText: text };
  } catch {
    return { type: 'unknown', rawText: text };
  }
}

// Analisa imagem/documento com Claude Vision — extrai valor e descrição financeira.
export async function analyzeMediaIntent(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
): Promise<ParsedIntent> {
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `Analise esta imagem financeira (nota fiscal, comprovante, cupom).
Retorne APENAS JSON: {"type":"register_expense|register_income|store_document","amount":0,"description":"","category":"Alimentação|Transporte|Moradia|Saúde|Lazer|Educação|Vestuário|Serviços|Outros"}
Se não for financeiro, retorne {"type":"store_document","description":"Documento guardado"}.`,
            },
          ],
        },
      ],
    });
    const raw = (msg.content[0] as Anthropic.TextBlock).text.trim();
    const json = JSON.parse(raw);
    return { ...json, rawText: '[imagem]' };
  } catch {
    return { type: 'store_document', rawText: '[imagem]', description: 'Imagem recebida' };
  }
}
