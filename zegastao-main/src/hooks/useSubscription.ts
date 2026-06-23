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

  // Trial expira: se está em 'trialing' mas já passou de trialEndsAt, trata como free.
  const trialEndsAtMs = sub.trialEndsAt ? sub.trialEndsAt.toDate().getTime() : 0;
  const isTrialing = sub.status === 'trialing' && trialEndsAtMs > Date.now();
  const trialUsed = !!sub.trialStartedAt;
  const trialDaysLeft = isTrialing
    ? Math.max(0, Math.ceil((trialEndsAtMs - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isActive = sub.status === 'active' || isTrialing;
  const plan: PlanId = isActive ? sub.plan : 'free';
  const limits = PLAN_LIMITS[plan];
  const isPaid = plan !== 'free';

  return { sub, plan, limits, isPaid, isTrialing, trialUsed, trialDaysLeft, loading };
}
