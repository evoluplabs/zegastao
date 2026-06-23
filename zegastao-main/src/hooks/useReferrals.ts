import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, auth } from '@/firebase';

export interface ReferralEntry {
  uid: string;
  name?: string;
  email?: string;
  joinedAt: Date;
  plan: 'free' | 'paid';
  convertedAt?: Date;
}

export function useReferrals() {
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(db, 'users', uid, 'referrals'),
      orderBy('joinedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const entries: ReferralEntry[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          name: data.name,
          email: data.email,
          joinedAt: data.joinedAt?.toDate?.() ?? new Date(),
          plan: data.convertedAt ? 'paid' : 'free',
          convertedAt: data.convertedAt?.toDate?.(),
        };
      });
      setReferrals(entries);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, []);

  return { referrals, loading };
}
