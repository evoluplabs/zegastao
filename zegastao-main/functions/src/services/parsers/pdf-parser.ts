// Parser de extratos. Detecta o tipo de arquivo e delega.
// PDF: pdf-parse → linhas → regex genérica + heurística por banco (Nubank).
import pdfParse from 'pdf-parse';
import { ParsedTransaction } from '../../types';
import { detectBank, parseBRAmount, parseBRDate } from './bank-detector';
import { parseCSV, parseXLSX } from './csv-parser';

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

async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  let data;
  try {
    data = await pdfParse(buffer);
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (msg.includes('password') || msg.includes('encrypt')) {
      throw new ParseError('password', 'PDF protegido por senha');
    }
    throw new ParseError('unreadable', 'Não foi possível ler o PDF');
  }
  const text = data.text || '';
  if (!text.trim()) {
    throw new ParseError('unreadable', 'PDF sem texto legível (pode ser uma imagem digitalizada)');
  }
  const bank = detectBank(text);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  switch (bank) {
    case 'nubank':
      return parseNubankLines(lines, text);
    default:
      return parseGenericLines(lines, bank);
  }
}

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
// Regex simplificado: captura tudo entre data e último R$XX,XX como descrição raw.
// A máscara do cartão (ex: "•••• 6832" ou "● •••• 6832") é removida em pós-processamento.
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

// Junta linhas onde a data ficou separada da descrição pelo pdf-parse.
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
