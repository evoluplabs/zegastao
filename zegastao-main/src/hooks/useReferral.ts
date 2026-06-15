import { useStore } from '@/store/useStore';
import { track, Events } from '@/lib/analytics';

function hashUid(uid: string): string {
  // Gera um hash curto do UID para o link de referral
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

export function useReferral() {
  const user = useStore((s) => s.user);

  const referralCode = user ? hashUid(user.uid) : null;
  const referralUrl = referralCode
    ? `${window.location.origin}/login?ref=${referralCode}`
    : null;

  async function share(context?: string): Promise<'shared' | 'copied' | 'fallback' | undefined> {
    if (!referralUrl) return;
    const text = `Estou usando o Copiloto Financeiro para sair das dívidas com ajuda de IA. Entra grátis pelo meu link: ${referralUrl}`;
    track(Events.REFERRAL_SHARED, { context: context || 'manual' });
    if (navigator.share) {
      try {
        await navigator.share({ text, url: referralUrl });
        return 'shared';
      } catch { /* cancelou */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'fallback';
    }
  }

  return { referralCode, referralUrl, share };
}
