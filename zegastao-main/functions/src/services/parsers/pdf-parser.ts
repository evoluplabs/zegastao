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

// Converte "14 MAR" + ano em Date. Retorna null se inválido.
function parseNubankDate(day: string, month: string, year: number): Date | null {
  const mo = MONTH_MAP[month.toUpperCase()];
  if (!mo) return null;
  const d = new Date(year, mo - 1, parseInt(day, 10));
  return isNaN(d.getTime()) ? null : d;
}

// Parser específico para fatura Nubank PDF.
// Formato das linhas de transação: "DD MMM •••• NNNN Descrição R$ X.XXX,XX"
// Pagamentos aparecem como "DD MMM Pagamento em DD MMM −R$ X.XXX,XX"
const NUBANK_TX_RE =
  /^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(?:[••]+\s*\d+\s+)?(.+?)\s+R\$\s*([\d.]+,\d{2})$/i;
const NUBANK_PAY_RE =
  /^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(.+?)\s+[−\-]R\$\s*([\d.]+,\d{2})$/i;

function parseNubankLines(lines: string[], fullText: string): ParsedTransaction[] {
  const year = extractFaturaYear(fullText);
  const out: ParsedTransaction[] = [];
  let inPayments = false;

  for (const line of lines) {
    // Detecta seção de pagamentos/financiamentos
    if (/pagamentos e financiamentos/i.test(line)) {
      inPayments = true;
      continue;
    }

    // Tenta linha de pagamento/crédito (valor negativo = entrada na conta)
    const payMatch = line.match(NUBANK_PAY_RE);
    if (payMatch) {
      const date = parseNubankDate(payMatch[1], payMatch[2], year);
      if (!date) continue;
      const amount = parseBRAmount(payMatch[4]);
      if (amount === null) continue;
      out.push({
        date,
        description: payMatch[3].trim(),
        amount: -amount, // crédito/pagamento: negativo no cartão = entrada
        type: 'in',
        bank: 'nubank',
      });
      continue;
    }

    // Tenta linha de compra (débito no cartão = saída)
    const txMatch = line.match(NUBANK_TX_RE);
    if (txMatch && !inPayments) {
      const date = parseNubankDate(txMatch[1], txMatch[2], year);
      if (!date) continue;
      const amount = parseBRAmount(txMatch[4]);
      if (amount === null) continue;
      out.push({
        date,
        description: txMatch[3].trim(),
        amount: -amount, // compra no cartão é saída (negativo)
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
