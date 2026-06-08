// Parser de extratos. Detecta o tipo de arquivo e delega.
// PDF: parsing HÍBRIDO em camadas (custo crescente):
//   Tier A — extração por coordenadas (pdf-coordinate) + regex Nubank/genérico  ($0)
//   Tier B — Claude Haiku (visão de documento), só se Tier A não extrair nada    (~$0.008)
import Anthropic from '@anthropic-ai/sdk';
import { ParsedTransaction } from '../../types';
import { detectBank, parseBRAmount, parseBRDate } from './bank-detector';
import { parseCSV, parseXLSX } from './csv-parser';
import { extractTextByCoordinate, CoordinateParseError } from './pdf-coordinate';

export async function parseFile(buffer: Buffer, filePath: string): Promise<ParsedTransaction[]> {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return parseCSV(buffer.toString('utf-8'));
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseXLSX(buffer);
  }
  if (lower.endsWith('.pdf')) {
    return parsePDF(buffer);
  }
  // Tentativa: assume texto/CSV
  return parseCSV(buffer.toString('utf-8'));
}

// Erro tipado para o backend mapear em mensagens amigáveis.
export class ParseError extends Error {
  code: 'password' | 'unreadable';
  constructor(code: 'password' | 'unreadable', message: string) {
    super(message);
    this.code = code;
  }
}

// Diagnóstico do último parse de PDF — o onUpload grava no doc do upload para
// inspeção no Firestore Console (independe do CLI de logs). Temporário.
export interface PdfDebug {
  version: string;
  tierAChars: number;
  bank: string;
  lineCount: number;
  sample: string[];
  tierAResult: number;
  tierBUsed: boolean;
  tierBResult: number;
  note: string;
}
// Marcador de versão do parser — se o doc do upload não tiver este valor em
// pdfDebug.version, o código rodando é antigo (deploy/pull desatualizado).
const PARSER_VERSION = 'hibrido-v5';
export let lastPdfDebug: PdfDebug | null = null;

// Orquestra os dois tiers de parsing de PDF.
async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  const dbg: PdfDebug = {
    version: PARSER_VERSION,
    tierAChars: 0, bank: '', lineCount: 0, sample: [],
    tierAResult: 0, tierBUsed: false, tierBResult: 0, note: '',
  };
  lastPdfDebug = dbg;
  console.log(`[PDF] parser ${PARSER_VERSION} iniciado`);

  // ── Tier A: extração por coordenadas + regex (grátis) ──
  try {
    const text = await extractTextByCoordinate(buffer);
    dbg.tierAChars = text.length;
    if (text.trim()) {
      const bank = detectBank(text);
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      dbg.bank = bank;
      dbg.lineCount = lines.length;
      dbg.sample = lines.slice(0, 20);
      console.log(`[PDF] TierA chars=${text.length} banco=${bank} linhas=${lines.length}`);
      console.log('[PDF] TierA amostra: ' + lines.slice(0, 15).join(' || '));
      const result = bank === 'nubank'
        ? parseNubankLines(lines, text)
        : parseGenericLines(lines, bank);

      dbg.tierAResult = result.length;
      console.log(`[PDF] TierA regex=${result.length} transações`);
      // Conseguimos extrair transações sem IA → retorna (custo $0).
      if (result.length > 0) { dbg.note = 'tierA-ok'; return result; }
      console.log('[PDF] TierA=0 → caindo para TierB (Haiku)');
      dbg.note = 'tierA-zero';
    } else {
      console.log('[PDF] TierA texto vazio → caindo para TierB (Haiku)');
      dbg.note = 'tierA-empty';
    }
  } catch (err) {
    dbg.note = 'tierA-error: ' + (err instanceof Error ? err.message : String(err));
    // PDF protegido por senha é definitivo — nem a IA resolve.
    if (err instanceof CoordinateParseError && err.code === 'password') {
      throw new ParseError('password', 'PDF protegido por senha');
    }
    // Outros erros do Tier A: cai para o Tier B silenciosamente.
    console.log(`[PDF] Tier A falhou (${err instanceof Error ? err.message : err}) → Tier B`);
  }

  // ── Tier B: Claude Haiku (fallback automático, ~$0.008) ──
  if (lastPdfDebug) lastPdfDebug.tierBUsed = true;
  const tierB = await parsePDFWithClaude(buffer);
  if (lastPdfDebug) lastPdfDebug.tierBResult = tierB.length;
  return tierB;
}

// Tier B — leitura por IA (visão de documento). Robusto para PDFs escaneados,
// layouts incomuns ou bancos sem regex específico. Usado apenas quando o Tier A
// não extraiu nenhuma transação.
async function parsePDFWithClaude(buffer: Buffer): Promise<ParsedTransaction[]> {
  // Header beta habilita input de documento (PDF) no SDK 0.32.x. Se já for GA,
  // o header é simplesmente ignorado — não quebra nada.
  const client = new Anthropic({
    defaultHeaders: { 'anthropic-beta': 'pdfs-2024-09-25' },
  });

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
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
    console.error('[PDF] Tier B: chamada Haiku falhou:', err);
    if (msg.includes('password') || msg.includes('encrypt')) {
      throw new ParseError('password', 'PDF protegido por senha');
    }
    throw new ParseError('unreadable', 'Não foi possível processar o PDF');
  }

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log(`[PDF] Tier B: Haiku respondeu ${raw.length} chars. Amostra: ${raw.slice(0, 200)}`);
  const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}';

  try {
    const { t = [] } = JSON.parse(jsonStr) as { t?: Array<{ d: string; n: string; v: number }> };
    const parsed = t
      .filter((tx) => tx.d && tx.n && typeof tx.v === 'number')
      .map((tx) => ({
        date: tx.d,
        description: tx.n.trim(),
        amount: Number(tx.v),
        type: Number(tx.v) >= 0 ? 'in' as const : 'out' as const,
      }));
    console.log(`[PDF] Tier B: Haiku extraiu ${parsed.length} transações`);
    if (parsed.length === 0) {
      throw new ParseError('unreadable', 'Nenhuma transação encontrada no PDF');
    }
    return parsed;
  } catch (err) {
    if (err instanceof ParseError) throw err;
    console.error('[PDF] Tier B: JSON inválido:', err);
    throw new ParseError('unreadable', 'Resposta inválida ao processar PDF');
  }
}

// ───────────────────────── Tier A: regex helpers ─────────────────────────

// Mapa de abreviações PT-BR de mês → número (1-based)
const MONTH_MAP: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
};

// Extrai o ano da fatura a partir do cabeçalho "FATURA DD MMM AAAA".
function extractFaturaYear(text: string): number {
  const m = text.match(/FATURA\s+\d{1,2}\s+[A-Z]{3}\s+(\d{4})/);
  if (m) return parseInt(m[1], 10);
  return new Date().getFullYear();
}

// Converte "14 MAR" + ano em string ISO yyyy-mm-dd. Retorna null se inválido.
function parseNubankDate(day: string, month: string, year: number): string | null {
  const mo = MONTH_MAP[month.toUpperCase()];
  if (!mo) return null;
  const d = new Date(year, mo - 1, parseInt(day, 10));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Parser específico para fatura Nubank PDF.
// Regex: captura tudo entre data e último R$XX,XX como descrição raw.
// A máscara do cartão (ex: "•••• 6832") é removida em pós-processamento.
const MONTHS = 'JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ';
const NUBANK_TX_RE = new RegExp(
  `^(\\d{1,2})\\s+(${MONTHS})\\s+(.+?)\\s+R\\$\\s*([\\d.]+,\\d{2})$`, 'i'
);
const NUBANK_PAY_RE = new RegExp(
  `^(\\d{1,2})\\s+(${MONTHS})\\s+(.+?)\\s+[−\\-]R\\$\\s*([\\d.]+,\\d{2})$`, 'i'
);

// Remove prefixo de máscara do cartão: "•••• 6832 " ou "● •••• 6832 " etc.
function stripCardMask(s: string): string {
  return s.replace(/^[\s\S]*?[•●*●•·]+[\s\S]*?\d{4}\s+/, '').trim();
}

// Junta linhas onde a data ficou separada da descrição.
function joinNubankLines(lines: string[]): string[] {
  const DATE_ONLY = new RegExp(`^(\\d{1,2})\\s+(${MONTHS})\\s*$`, 'i');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (DATE_ONLY.test(lines[i]) && i + 1 < lines.length) {
      result.push(`${lines[i]} ${lines[i + 1]}`);
      i += 2;
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  return result;
}

function parseNubankLines(lines: string[], fullText: string): ParsedTransaction[] {
  const year = extractFaturaYear(fullText);
  const out: ParsedTransaction[] = [];
  let inPayments = false;
  const processedLines = joinNubankLines(lines);

  for (const line of processedLines) {
    if (/pagamentos e financiamentos/i.test(line)) {
      inPayments = true;
      continue;
    }

    const payMatch = line.match(NUBANK_PAY_RE);
    if (payMatch) {
      const date = parseNubankDate(payMatch[1], payMatch[2], year);
      if (!date) continue;
      const amount = parseBRAmount(payMatch[4]);
      if (amount === null) continue;
      out.push({
        date,
        description: stripCardMask(payMatch[3].trim()),
        amount: -amount,
        type: 'in',
        bank: 'nubank',
      });
      continue;
    }

    const txMatch = line.match(NUBANK_TX_RE);
    if (txMatch && !inPayments) {
      const date = parseNubankDate(txMatch[1], txMatch[2], year);
      if (!date) continue;
      const amount = parseBRAmount(txMatch[4]);
      if (amount === null) continue;
      out.push({
        date,
        description: stripCardMask(txMatch[3].trim()),
        amount: -amount,
        type: 'out',
        bank: 'nubank',
      });
    }
  }

  return out;
}

// Heurística genérica: cada linha que contém uma data BR e um valor BR vira
// uma transação. A descrição é o miolo entre a data e o valor.
const DATE_RE = /(\d{2}[/\-.]\d{2}[/\-.]\d{2,4})/;
const AMOUNT_RE = /(-?\s?R?\$?\s?\d{1,3}(?:\.\d{3})*,\d{2})/g;

function parseGenericLines(lines: string[], bank: string): ParsedTransaction[] {
  const out: ParsedTransaction[] = [];

  for (const line of lines) {
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;
    const date = parseBRDate(dateMatch[1]);
    if (!date) continue;

    const amounts = line.match(AMOUNT_RE);
    if (!amounts || amounts.length === 0) continue;
    // Último valor da linha costuma ser o valor do lançamento.
    const amount = parseBRAmount(amounts[amounts.length - 1]);
    if (amount === null || isNaN(amount)) continue;

    let description = line
      .replace(dateMatch[1], '')
      .replace(amounts[amounts.length - 1], '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!description) description = 'Lançamento';

    out.push({
      date,
      description,
      amount,
      type: amount >= 0 ? 'in' : 'out',
      bank,
    });
  }

  return out;
}
