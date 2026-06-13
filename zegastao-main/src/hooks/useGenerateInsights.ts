import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';

interface GenerateResult {
  generating: boolean;
  error: string | null;
  generate: () => Promise<void>;
}

export function useGenerateInsights(): GenerateResult {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'generateInsightsNow');
      await fn({});
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao gerar insights';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  return { generating, error, generate };
}
