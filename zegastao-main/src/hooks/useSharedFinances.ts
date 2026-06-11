import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useStore } from '@/store/useStore';

interface LinkResult {
  ok: boolean;
  partnerDisplayName?: string;
}

export function useSharedFinances() {
  const profile = useStore((s) => s.profile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLinked = !!profile?.sharedWithUid;
  const partnerUid = profile?.sharedWithUid ?? null;

  async function linkPartner(partnerEmail: string): Promise<string | null> {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ action: 'link'; partnerEmail: string }, LinkResult>(functions, 'linkPartner');
      const result = await fn({ action: 'link', partnerEmail });
      return result.data.partnerDisplayName ?? partnerEmail;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao vincular parceiro.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function unlinkPartner(): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ action: 'unlink' }, LinkResult>(functions, 'linkPartner');
      await fn({ action: 'unlink' });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao desvincular.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { isLinked, partnerUid, loading, error, linkPartner, unlinkPartner };
}
