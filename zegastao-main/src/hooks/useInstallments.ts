import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, auth } from '@/firebase';

export interface InstallmentPayment {
  id: string;
  month: string;            // 'YYYY-MM'
  paidAt: Date;
  installmentNumber: number;
  amount: number;
  principal: number;
  interest: number;
  balanceAfter: number;
  type: 'regular' | 'advance';
  notes?: string;
}

export function useInstallments(debtId: string) {
  const [payments, setPayments] = useState<InstallmentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(db, 'users', uid, 'debts', debtId, 'payments'),
      orderBy('month', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setPayments(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            month: data.month as string,
            paidAt: data.paidAt?.toDate?.() ?? new Date(data.paidAt),
            installmentNumber: data.installmentNumber as number,
            amount: data.amount as number,
            principal: data.principal as number,
            interest: data.interest as number,
            balanceAfter: data.balanceAfter as number,
            type: (data.type as 'regular' | 'advance') ?? 'regular',
            notes: data.notes as string | undefined,
          };
        })
      );
      setLoading(false);
    });

    return unsub;
  }, [debtId]);

  return { payments, loading };
}
