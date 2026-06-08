// Resumos mensais via AGREGAÇÃO server-side (getAggregateFromServer).
// Custo: 1 read por mês consultado — não 1 por transação. Para um usuário com
// centenas de transações, a tela de Transações abre lendo ~12 docs em vez de
// centenas. A lista detalhada só é carregada quando o usuário abre um mês.
import { useEffect, useState } from 'react';
import {
  collection, query, where, getAggregateFromServer, sum, count,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';

export interface MonthSummary {
  month: string;        // 'YYYY-MM'
  label: string;        // 'maio de 2026'
  start: string;        // 'YYYY-MM-01'
  endExclusive: string; // primeiro dia do mês seguinte
  net: number;          // saldo líquido (soma dos amounts)
  count: number;        // nº de transações
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const ny = month === 11 ? year + 1 : year;
  const nm = month === 11 ? 0 : month + 1;
  const endExclusive = `${ny}-${String(nm + 1).padStart(2, '0')}-01`;
  return { start, endExclusive };
}

export function useMonthlySummaries(monthsBack = 12) {
  const user = useStore((s) => s.user);
  const [data, setData] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const col = collection(db, 'users', user.uid, 'transactions');
      const now = new Date();
      const results: MonthSummary[] = [];

      for (let i = 0; i < monthsBack; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const { start, endExclusive } = monthBounds(d.getFullYear(), d.getMonth());
        const q = query(
          col,
          where('date', '>=', start),
          where('date', '<', endExclusive),
        );
        try {
          const snap = await getAggregateFromServer(q, {
            net: sum('amount'),
            count: count(),
          });
          const c = snap.data().count;
          if (c > 0) {
            results.push({
              month: start.slice(0, 7),
              label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
              start,
              endExclusive,
              net: snap.data().net ?? 0,
              count: c,
            });
          }
        } catch {
          /* mês sem dados ou erro de índice → ignora */
        }
      }

      if (!cancelled) {
        setData(results);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, monthsBack]);

  return { data, loading };
}
