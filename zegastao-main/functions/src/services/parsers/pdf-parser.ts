// Parser de extratos. Para PDF usa Claude Haiku (visão nativa) — mais confiável
// que extração de texto puro para layouts de tabela como Nubank, Inter etc.
import Anthropic from '@anthropic-ai/sdk';
import { ParsedTransaction } from '../../types';
import { parseCSV, parseXLSX } from './csv-parser';

export async function parseFile(buffer: Buffer, filePath: string): Promise<ParsedTransaction[]> {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) return parseCSV(buffer.toString('utf-8'));
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return parseXLSX(buffer);
  if (lower.endsWith('.pdf')) return parsePDFWithClaude(buffer);
  return parseCSV(buffer.toString('utf-8'));
}

export class ParseError extends Error {
  code: 'password' | 'unreadable';
  constructor(code: 'password' | 'unreadable', message: string) {
    super(message);
    this.code = code;
  }
}

async function parsePDFWithClaude(buffer: Buffer): Promise<ParsedTransaction[]> {
  const client = new Anthropic();

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: buffer.toString('base64'),
            },
          } as unknown as Anthropic.TextBlockParam,
          {
            type: 'text',
            text: `Extraia TODAS as transações individuais deste extrato bancário brasileiro.
Retorne SOMENTE este JSON (sem texto adicional):
{"t":[{"d":"YYYY-MM-DD","n":"descrição sem número do cartão","v":-99.90}]}

Regras:
- d: data ISO YYYY-MM-DD
- n: nome do estabelecimento/descrição, sem máscara de cartão (ex: "•••• 6832")
- v: negativo=compra/débito/saída, positivo=pagamento recebido/crédito/entrada/salário
- Incluir: compras, pagamentos, transferências, saques, tarifas
- NÃO incluir: totais, saldos, limites disponíveis, cabeçalhos, rodapés`,
          },
        ],
      }] as Anthropic.MessageParam[],
    });
  } catch (err) {
    const msg = String(err).toLowerCase();
    if (msg.includes('password') || msg.includes('encrypt')) {
      throw new ParseError('password', 'PDF protegido por senha');
    }
    throw new ParseError('unreadable', 'Não foi possível processar o PDF');
  }

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}';

  try {
    const { t = [] } = JSON.parse(jsonStr) as { t?: Array<{ d: string; n: string; v: number }> };
    return t
      .filter((tx) => tx.d && tx.n && typeof tx.v === 'number')
      .map((tx) => ({
        date: tx.d,
        description: tx.n.trim(),
        amount: Number(tx.v),
        type: Number(tx.v) >= 0 ? 'in' as const : 'out' as const,
      }));
  } catch {
    throw new ParseError('unreadable', 'Resposta inválida ao processar PDF');
  }
}
