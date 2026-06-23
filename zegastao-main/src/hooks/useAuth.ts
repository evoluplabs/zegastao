import { useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/firebase';
import { useStore } from '@/store/useStore';
import type { Profile, Subscription } from '@/types';

function hashUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

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
    await setDoc(ref, { ...profile, referralCode: hashUid(uid), createdAt: new Date() });
    return profile;
  }
  // Backfill referralCode for existing profiles that don't have it
  const data = snap.data() as Profile;
  if (!(data as Record<string, unknown>)['referralCode']) {
    setDoc(ref, { referralCode: hashUid(uid) }, { merge: true }).catch(() => {});
  }
  return data;
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
  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      // Cancel any previous profile listener when auth state changes
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
      if (user) {
        try {
          await ensureProfile(user.uid, user.email, user.displayName);
          await ensureSubscription(user.uid);
          // Real-time listener so phase/insights updates from nightly job appear instantly
          const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
          profileUnsubRef.current = onSnapshot(profileRef, (snap) => {
            if (snap.exists()) setProfile(snap.data() as Profile);
          });
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return () => {
      unsub();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
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
