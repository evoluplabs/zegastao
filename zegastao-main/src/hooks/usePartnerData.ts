import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSharedFinances } from '@/hooks/useSharedFinances';
import { currentMonthStart } from '@/lib/utils';
import { isNeutral } from '@/lib/finance';
import type { Profile, Transaction } from '@/types';

export interface PartnerData {
  profile: Pick<Profile, 'name' | 'email' | 'monthlyIncome'> | null;
  income: number;
  expenses: number;
  transactions: Transaction[];
}

export function usePartnerData(): { data: PartnerData | null; loading: boolean } {
  const { isLinked, partnerUid } = useSharedFinances();
  const [data, setData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!partnerUid) { setData(null); return; }

    setLoading(true);
    let profileData: Pick<Profile, 'name' | 'email' | 'monthlyIncome'> | null = null;

    // Load partner profile (one-time, cheap)
    const profileRef = doc(db, 'users', partnerUid, 'profile', 'main');
    const profileUnsub = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const p = snap.data() as Profile;
        profileData = { name: p.name, email: p.email, monthlyIncome: p.monthlyIncome };
      }
    });

    // Load partner current-month transactions only (cost controlled)
    const monthStart = currentMonthStart();
    const txQuery = query(
      collection(db, 'users', partnerUid, 'transactions'),
      where('date', '>=', monthStart),
      orderBy('date', 'desc'),
      limit(200)
    );

    const txUnsub = onSnapshot(txQuery, (snap) => {
      const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
      // Exclui categorias neutras (transferências internas, fatura cartão)
      const realTxs = txs.filter((t) => !isNeutral(t.category));
      const income = realTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expenses = realTxs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      setData({ profile: profileData, income, expenses, transactions: txs });
      setLoading(false);
    }, () => setLoading(false));

    return () => {
      profileUnsub();
      txUnsub();
    };
  }, [partnerUid]);

  if (!isLinked) return { data: null, loading: false };
  return { data, loading };
}
