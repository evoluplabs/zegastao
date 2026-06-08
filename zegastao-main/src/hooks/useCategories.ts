import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { CATEGORIES } from '@/types';

export function useCategories() {
  const [custom, setCustom] = useState<string[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'settings', 'categories');
    const unsub = onSnapshot(ref, (snap) => {
      setCustom(snap.data()?.custom ?? []);
    });
    return unsub;
  }, []);

  const all = [...CATEGORIES, ...custom];

  async function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed || all.includes(trimmed)) return false;
    const user = auth.currentUser;
    if (!user) return false;
    const ref = doc(db, 'users', user.uid, 'settings', 'categories');
    await setDoc(ref, { custom: [...custom, trimmed] }, { merge: true });
    return true;
  }

  async function remove(name: string) {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'settings', 'categories');
    await setDoc(ref, { custom: custom.filter((c) => c !== name) }, { merge: true });
  }

  return { all, custom, add, remove };
}
