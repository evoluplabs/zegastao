import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDateBR(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!d) return iso;
  return `${d}/${m}/${y}`;
}

export function monthLabel(date = new Date()): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function currentMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
}

export function formatPct(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0) + '%';
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0);
}

/** Converte string no formato BRL ("1.234,56" ou "1234,56") para número. */
export function parseDecimalBR(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** Arredonda para 2 casas decimais (evita acúmulo de float em simulações). */
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Converte percentual exibido ("2,5") para decimal de armazenamento (0.025). */
export function pctToDecimal(pct: string): number {
  return parseDecimalBR(pct) / 100;
}
