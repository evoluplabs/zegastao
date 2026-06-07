import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useStore } from '@/store/useStore';

// Listener genérico de subcoleção do usuário, em tempo real (usa cache offline).
export function useUserCollection<T>(
  name: string,
  constraints: QueryConstraint[] = []
): { data: T[]; loading: boolean } {
  const user = useStore((s) => s.user);
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Serializa constraints para dependência estável.
  const depKey = JSON.stringify(constraints.map((c) => c.type));

  useEffect(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = collection(db, 'users', user.uid, name);
    const q = query(ref, ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, name, depKey]);

  return { data, loading };
}
