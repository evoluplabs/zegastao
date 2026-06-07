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
