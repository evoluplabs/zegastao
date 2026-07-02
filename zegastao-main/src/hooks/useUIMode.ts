import { useCallback, useState } from 'react';
import { setProfile } from '@/lib/firestore';

export type UIMode = 'rpg' | 'classic';

const STORAGE_KEY = 'ze-gastao-ui-mode';

export function useUIMode() {
  const [uiMode, setUIModeState] = useState<UIMode>(
    () => (localStorage.getItem(STORAGE_KEY) as UIMode) || 'rpg'
  );

  const setUIMode = useCallback((next: UIMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setUIModeState(next);
    setProfile({ uiMode: next }).catch(() => {});
  }, []);

  return { uiMode, setUIMode, isRPG: uiMode === 'rpg', isClassic: uiMode === 'classic' };
}
