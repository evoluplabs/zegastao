// Detecção de banco e helpers de parsing de formatos brasileiros.

export function detectBank(content: string): string {
  const upper = content.toUpperCase();
  if (upper.includes('NUBANK') || upper.includes('NU PAGAMENTOS')) return 'nubank';
  if (upper.includes('BANCO INTER') || upper.includes('INTER ')) return 'inter';
  if (upper.includes('BRADESCO')) return 'bradesco';
  if (upper.includes('ITAÚ') || upper.includes('ITAU')) return 'itau';
  if (upper.includes('SANTANDER')) return 'santander';
  if (upper.includes('CAIXA ECONOMICA') || upper.includes('CEF')) return 'caixa';
  if (upper.includes('BANCO DO BRASIL') || upper.includes(' BB ')) return 'bb';
  if (upper.includes('C6 BANK') || upper.includes('C6')) return 'c6';
  if (upper.includes('PICPAY')) return 'picpay';
  return 'generico';
}

// Formato de data BR → ISO (yyyy-mm-dd)
export function parseBRDate(str: string): string | null {
  const match = str.match(/(\d{2})[/\-.](\d{2})[/\-.](\d{2,4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m}-${d}`;
}

// Valor BR ("1.234,56" ou "-1.234,56" ou "R$ 1.234,56") → number
export function parseBRAmount(str: string): number | null {
  const negative = /-/.test(str) || /\bD\b/.test(str); // "D" = débito em alguns extratos
  const clean = str
    .replace(/[R$\s]/g, '')
    .replace(/[A-Za-z]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.\-]/g, '');
  const n = parseFloat(clean);
  if (isNaN(n)) return null;
  return negative && n > 0 ? -n : n;
}
