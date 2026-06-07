import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { formatBRL } from '@/lib/utils';

export interface FlowDatum {
  label: string;
  value: number;
  color: string;
}

export function FlowChart({ data }: { data: FlowDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis hide />
        <Tooltip formatter={(v: number) => formatBRL(v)} cursor={{ fill: 'transparent' }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
