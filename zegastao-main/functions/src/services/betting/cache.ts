// Cache coletivo no Firestore para chamadas às APIs esportivas.
// Como vários usuários analisam os mesmos jogos (ex: a Copa), o 2º usuário em
// diante lê do cache → request à API = 0. É o que estica o plano grátis e
// mantém o custo em ~R$ 0. Coleção global `betting_cache`, sem PII.

import { Firestore, Timestamp } from 'firebase-admin/firestore';

const COLLECTION = 'betting_cache';

interface CacheDoc {
  payload: unknown;
  fetchedAt: Timestamp;
  ttlHours: number;
}

/**
 * Retorna o valor cacheado se ainda fresco; senão chama `fetcher`, grava e
 * retorna. Em caso de erro no fetcher, devolve o valor velho (stale) se existir.
 */
export async function getCached<T>(
  db: Firestore,
  cacheKey: string,
  ttlHours: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const ref = db.collection(COLLECTION).doc(sanitize(cacheKey));

  let existing: CacheDoc | undefined;
  try {
    const snap = await ref.get();
    if (snap.exists) {
      existing = snap.data() as CacheDoc;
      const ageMs = Date.now() - existing.fetchedAt.toMillis();
      if (ageMs < existing.ttlHours * 3600 * 1000) {
        return existing.payload as T;
      }
    }
  } catch {
    // ignora erro de leitura do cache e tenta buscar fresco
  }

  try {
    const fresh = await fetcher();
    await ref.set({ payload: fresh ?? null, fetchedAt: Timestamp.now(), ttlHours }).catch(() => {});
    return fresh;
  } catch (err) {
    // Sem rede / cota estourada: usa o valor velho se houver
    if (existing) return existing.payload as T;
    throw err;
  }
}

/** Firestore não aceita '/' em doc id. */
function sanitize(key: string): string {
  return key.replace(/[/\s]+/g, '_');
}

// Helpers de chave — padronizam os nomes para maximizar o reaproveitamento.
export const cacheKeys = {
  teamForm: (teamId: number, date: string) => `form_team_${teamId}_${date}`,
  h2h: (a: number, b: number) => `h2h_${Math.min(a, b)}_${Math.max(a, b)}`,
  fixturesByLeague: (leagueId: number, date: string) => `fixtures_${leagueId}_${date}`,
  injuries: (teamId: number, date: string) => `injuries_${teamId}_${date}`,
  standings: (leagueId: number, season: number) => `standings_${leagueId}_${season}`,
};

export const TTL = {
  form: 12,
  h2h: 24,
  fixtures: 6,
  injuries: 6,
  standings: 24,
};
