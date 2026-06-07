import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatBRL } from '@/lib/utils';

const COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export interface CategorySlice {
  name: string;
  amount: number;
}

export function CategoryBreakdown({ data }: { data: CategorySlice[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Sem gastos categorizados ainda.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="amount" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatBRL(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
