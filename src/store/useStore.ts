import { create } from 'zustand';
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

export const useStore = create<AppState>((set) => ({
  user: null,
  profile: null,
  authLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setAuthLoading: (authLoading) => set({ authLoading }),
}));
