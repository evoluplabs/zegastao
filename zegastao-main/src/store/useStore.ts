import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from 'firebase/auth';
import type { Profile } from '@/types';

interface AppState {
  user: User | null;
  profile: Profile | null;
  authLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setAuthLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      authLoading: true,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setAuthLoading: (authLoading) => set({ authLoading }),
    }),
    {
      name: 'zegastao-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist profile (not user/auth — Firebase handles auth state)
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);
