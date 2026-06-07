import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';
import { type Subscription, type PlanId, PLAN_LIMITS } from '@/types';

const DEFAULT_SUB: Subscription = { plan: 'free', status: 'inactive' };

export function useSubscription() {
  const user = useStore((s) => s.user);
  const [sub, setSub] = useState<Subscription>(DEFAULT_SUB);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setSub(DEFAULT_SUB); setLoading(false); return; }
    const ref = doc(db, 'users', user.uid, 'subscription', 'main');
    const unsub = onSnapshot(ref, (snap) => {
      setSub(snap.exists() ? (snap.data() as Subscription) : DEFAULT_SUB);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const plan: PlanId = sub.status === 'active' || sub.status === 'trialing' ? sub.plan : 'free';
  const limits = PLAN_LIMITS[plan];
  const isPaid = plan !== 'free';

  return { sub, plan, limits, isPaid, loading };
}
