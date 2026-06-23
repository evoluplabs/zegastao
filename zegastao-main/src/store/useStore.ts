import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from 'firebase/auth';
import type { Profile } from '@/types';

interface AppState {
  user: User | null;
  profile: Profile | null;
  authLoading: boolean;
  showCombined: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setAuthLoading: (loading: boolean) => void;
  toggleCombined: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      authLoading: true,
      showCombined: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setAuthLoading: (authLoading) => set({ authLoading }),
      toggleCombined: () => set((s) => ({ showCombined: !s.showCombined })),
    }),
    {
      name: 'zegastao-store',
      storage: createJSONStorage(() => localStorage),
      // Persist profile + couple mode toggle
      partialize: (state) => ({ profile: state.profile, showCombined: state.showCombined }),
    }
  )
);
