import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { MonthSummary } from '@/lib/projection';
import { formatBRL } from '@/lib/utils';

export function DebtTimeline({ timeline }: { timeline: MonthSummary[] }) {
  const data = timeline.map((m) => ({
    month: m.month,
    remaining: m.debts.reduce((s, d) => s + d.remaining, 0),
  }));

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Sem dívidas para projetar.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="month" tickFormatter={(m) => `${m}m`} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(v: number) => formatBRL(v)}
          labelFormatter={(m) => `Mês ${m}`}
        />
        <Line type="monotone" dataKey="remaining" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
