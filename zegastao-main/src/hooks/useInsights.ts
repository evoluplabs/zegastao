import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';
import type { Insight } from '@/types';

// Lê os insights gerados pelo job noturno. Nunca chama IA.
export function useInsights() {
  const user = useStore((s) => s.user);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'insights', 'latest');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setInsights(data.insights || []);
        setGeneratedAt(data.generatedAt?.toDate?.() || null);
      }
    });
    return unsub;
  }, [user]);

  return { insights, generatedAt };
}
