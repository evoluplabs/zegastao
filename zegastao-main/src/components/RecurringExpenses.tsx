import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatBRL } from '@/lib/utils';
import type { Transaction } from '@/types';

interface Props {
  transactions: Transaction[];
}

interface RecurringItem {
  name: string;
  monthlyAmount: number;
  monthsFound: number;
}

function normalizeDesc(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\s+\d{2}\/\d{2}\/\d{4}/g, '')
    .replace(/\s+#\d+/g, '')
    .replace(/\s+\d+x\s*/g, '')
    .replace(/[*\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

export function RecurringExpenses({ transactions }: Props) {
  const items = useMemo((): RecurringItem[] => {
    const map = new Map<string, { totalAmount: number; months: Set<string>; rawName: string }>();

    for (const t of transactions) {
      if (t.amount >= 0) continue; // somente gastos
      const key = t.normalizedDesc ? normalizeDesc(t.normalizedDesc) : normalizeDesc(t.description);
      const month = t.date.slice(0, 7);
      if (!map.has(key)) map.set(key, { totalAmount: 0, months: new Set(), rawName: t.description });
      const entry = map.get(key)!;
      entry.months.add(month);
      entry.totalAmount += Math.abs(t.amount);
    }

    return Array.from(map.values())
      .filter((e) => e.months.size >= 2) // aparece em 2+ meses
      .map((e) => ({
        name: e.rawName.slice(0, 35),
        monthlyAmount: e.totalAmount / e.months.size,
        monthsFound: e.months.size,
      }))
      .filter((e) => e.monthlyAmount >= 5 && e.monthlyAmount <= 500) // faixa de assinaturas
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount)
      .slice(0, 6);
  }, [transactions]);

  if (items.length === 0) return null;

  const total = items.reduce((s, i) => s + i.monthlyAmount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5 text-primary" /> Gastos recorrentes detectados
        </p>
        <span className="text-xs font-bold text-destructive">{formatBRL(total)}/mês</span>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-lg border bg-secondary/30 px-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-muted-foreground text-[10px]">encontrado em {item.monthsFound} meses</p>
            </div>
            <span className="font-semibold shrink-0 ml-2">{formatBRL(item.monthlyAmount)}/mês</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        💡 {formatBRL(total)}/mês = {formatBRL(total * 12)}/ano. Cancelar 1 serviço que não usa já faz diferença.
      </p>
    </div>
  );
}
