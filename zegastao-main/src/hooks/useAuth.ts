import { useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/firebase';
import { useStore } from '@/store/useStore';
import type { Profile, Subscription } from '@/types';

// Garante que exista um documento de profile para o usuário.
async function ensureProfile(uid: string, email: string | null, name: string | null) {
  const ref = doc(db, 'users', uid, 'profile', 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile: Profile = {
      name: name || email?.split('@')[0] || '',
      email: email || '',
      monthlyIncome: 0,
      onboardingDone: false,
    };
    await setDoc(ref, { ...profile, createdAt: new Date() });
    return profile;
  }
  return snap.data() as Profile;
}

// Garante o documento de assinatura no schema padrão (free/inactive).
// O webhook do MercadoPago promove para active ao confirmar pagamento.
async function ensureSubscription(uid: string) {
  const ref = doc(db, 'users', uid, 'subscription', 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const sub: Subscription = {
      plan: 'free',
      status: 'inactive',
      uploadsThisMonth: 0,
    };
    await setDoc(ref, sub);
  }
}

export function useAuthListener() {
  const { setUser, setProfile, setAuthLoading } = useStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const profile = await ensureProfile(user.uid, user.email, user.displayName);
          await ensureSubscription(user.uid);
          setProfile(profile);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, [setUser, setProfile, setAuthLoading]);
}

export const authActions = {
  loginEmail: (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password),
  registerEmail: (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password),
  loginGoogle: () => signInWithPopup(auth, googleProvider),
  logout: () => fbSignOut(auth),
};
