// Parser de CSV / XLSX de extratos bancários.
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ParsedTransaction } from '../../types';
import { parseBRAmount, parseBRDate } from './bank-detector';
import { detectInstallment } from './installment-detector';

const DATE_KEYS = ['data', 'date', 'data lancamento', 'data movimento', 'dt'];
const DESC_KEYS = ['descricao', 'descrição', 'description', 'historico', 'histórico', 'lancamento', 'lançamento', 'memo', 'estabelecimento', 'title'];
const AMOUNT_KEYS = ['valor', 'amount', 'value', 'montante'];
const CREDIT_KEYS = ['credito', 'crédito', 'entrada'];
const DEBIT_KEYS = ['debito', 'débito', 'saida', 'saída'];

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function findKey(row: Record<string, unknown>, candidates: string[]): string | null {
  const keys = Object.keys(row);
  for (const k of keys) {
    if (candidates.includes(norm(k))) return k;
  }
  return null;
}

export function parseCSV(content: string): ParsedTransaction[] {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    delimiter: detectDelimiter(content),
  });
  return rowsToTransactions(parsed.data);
}

export function parseXLSX(buffer: Buffer): ParsedTransaction[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: '' });
  return rowsToTransactions(rows);
}

function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) return ';';
  return ',';
}

function rowsToTransactions(rows: Record<string, string>[]): ParsedTransaction[] {
  if (!rows.length) return [];
  const sample = rows[0];
  const dateKey = findKey(sample, DATE_KEYS);
  const descKey = findKey(sample, DESC_KEYS);
  const amountKey = findKey(sample, AMOUNT_KEYS);
  const creditKey = findKey(sample, CREDIT_KEYS);
  const debitKey = findKey(sample, DEBIT_KEYS);

  const out: ParsedTransaction[] = [];
  for (const row of rows) {
    const date = dateKey ? parseBRDate(String(row[dateKey])) : null;
    const description = descKey ? String(row[descKey]).trim() : '';
    if (!date || !description) continue;

    let amount: number | null = null;
    if (amountKey) {
      amount = parseBRAmount(String(row[amountKey]));
    } else if (creditKey || debitKey) {
      const credit = creditKey ? parseBRAmount(String(row[creditKey])) || 0 : 0;
      const debit = debitKey ? Math.abs(parseBRAmount(String(row[debitKey])) || 0) : 0;
      amount = credit - debit;
    }
    if (amount === null || isNaN(amount)) continue;

    const installment = detectInstallment(description);
    out.push({
      date,
      description,
      amount,
      type: amount >= 0 ? 'in' : 'out',
      ...(installment ?? {}),
    });
  }
  return out;
}
