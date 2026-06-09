import { useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/firebase';
import { useStore } from '@/store/useStore';
import type { Profile, Subscription } from '@/types';

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

async function ensureSubscription(uid: string) {
  const ref = doc(db, 'users', uid, 'subscription', 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const sub: Subscription = { plan: 'free', status: 'inactive', uploadsThisMonth: 0 };
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

  registerEmail: async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Envia verificação de e-mail em background — não bloqueia o fluxo
    sendEmailVerification(cred.user).catch(() => {});
    return cred;
  },

  updateDisplayName: (name: string) => {
    const user = auth.currentUser;
    if (user) return updateProfile(user, { displayName: name });
    return Promise.resolve();
  },

  resendVerification: () => {
    const user = auth.currentUser;
    if (user && !user.emailVerified) return sendEmailVerification(user);
    return Promise.resolve();
  },

  loginGoogle: () => signInWithPopup(auth, googleProvider),
  logout: () => fbSignOut(auth),
};
