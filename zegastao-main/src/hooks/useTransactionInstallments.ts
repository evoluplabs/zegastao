import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import type { Transaction } from '@/types';

export interface InstallmentGroup {
  group: string;           // installmentGroup key
  merchantLabel: string;   // display name
  total: number;           // número total de parcelas (ex: 12)
  found: number;           // parcelas encontradas no extrato
  paid: number;            // parcelas cujo installmentCurrent <= found e date <= hoje
  totalAmount: number;     // soma dos valores das parcelas encontradas
  transactions: Transaction[];
}

function deriveMerchantLabel(group: string): string {
  // Remove o sufixo "_12x" adicionado pelo detector
  const withoutSuffix = group.replace(/_\d+x$/, '');
  return withoutSuffix.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function useTransactionInstallments() {
  const [groups, setGroups] = useState<InstallmentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(db, 'users', uid, 'transactions'),
      where('isInstallment', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
      const today = new Date().toISOString().slice(0, 10);

      // Agrupa por installmentGroup
      const map = new Map<string, Transaction[]>();
      for (const tx of txs) {
        if (!tx.installmentGroup) continue;
        const arr = map.get(tx.installmentGroup) ?? [];
        arr.push(tx);
        map.set(tx.installmentGroup, arr);
      }

      const result: InstallmentGroup[] = [];
      for (const [group, list] of map.entries()) {
        const first = list[0];
        const total = first.installmentTotal ?? list.length;
        const paid = list.filter((t) => t.date <= today).length;
        const totalAmount = list.reduce((s, t) => s + Math.abs(t.amount), 0);

        result.push({
          group,
          merchantLabel: deriveMerchantLabel(group),
          total,
          found: list.length,
          paid,
          totalAmount,
          transactions: list.sort((a, b) =>
            (a.installmentCurrent ?? 0) - (b.installmentCurrent ?? 0)
          ),
        });
      }

      // Ordena por more parcelas faltando (maior progresso primeiro)
      result.sort((a, b) => b.paid - a.paid);
      setGroups(result);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, []);

  return { groups, loading };
}
