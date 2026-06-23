import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSharedFinances } from '@/hooks/useSharedFinances';
import type { Caixinha } from '@/types';

// Lê as caixinhas COMPARTILHADAS do parceiro vinculado (modo casal).
// Cada item recebe ownerUid = uid do parceiro, para depósitos via depositToSharedCaixinha.
export function usePartnerCaixinhas(): { data: Caixinha[]; loading: boolean } {
  const { partnerUid } = useSharedFinances();
  const [data, setData] = useState<Caixinha[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!partnerUid) { setData([]); return; }
    setLoading(true);
    const q = query(
      collection(db, 'users', partnerUid, 'caixinhas'),
      where('shared', '==', true)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ownerUid: partnerUid, ...d.data() }) as Caixinha));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [partnerUid]);

  return { data, loading };
}
