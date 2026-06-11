import { useEffect, useState } from 'react';
import type { AppTheme } from '@/types';

const STORAGE_KEY = 'ze-gastao-theme';

function resolveTheme(theme: AppTheme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(theme: AppTheme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function initTheme() {
  const saved = (localStorage.getItem(STORAGE_KEY) as AppTheme) || 'dark';
  applyTheme(saved);
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(
    () => (localStorage.getItem(STORAGE_KEY) as AppTheme) || 'dark'
  );

  // Escuta mudanças do sistema quando em modo 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  function setTheme(next: AppTheme) {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    applyTheme(next);
  }

  return { theme, setTheme };
}
