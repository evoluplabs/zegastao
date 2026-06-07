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

async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  const data = await pdfParse(buffer);
  const text = data.text || '';
  const bank = detectBank(text);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  switch (bank) {
    case 'nubank':
      return parseGenericLines(lines, bank); // Nubank cabe na heurística genérica
    default:
      return parseGenericLines(lines, bank);
  }
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
