// Tier 1 — Cache de categorias no Firestore (GRÁTIS).
// Reutiliza categorizações anteriores e aprende com correções do usuário.
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export interface CacheEntry {
  category: string;
  confidence: number;
  source: 'keyword' | 'ai' | 'user_correction';
  hitCount: number;
  normalizedDesc?: string;
  updatedAt: Timestamp;
}

function cacheHash(normalizedDesc: string): string {
  // Base64 da descrição normalizada. Determinístico => mesma descrição, mesma chave.
  return Buffer.from(normalizedDesc).toString('base64').replace(/[/+=]/g, '').substring(0, 40);
}

export async function getCachedCategory(
  userId: string,
  normalizedDesc: string
): Promise<CacheEntry | null> {
  const db = getFirestore();
  const hash = cacheHash(normalizedDesc);
  const doc = await db
    .collection('users').doc(userId)
    .collection('category_cache').doc(hash)
    .get();

  if (!doc.exists) return null;

  // Incrementar hitCount (lazy — não espera)
  doc.ref.update({ hitCount: (doc.data()!.hitCount || 0) + 1 }).catch(() => {});

  return doc.data() as CacheEntry;
}

export async function saveCategoryCache(
  userId: string,
  normalizedDesc: string,
  category: string,
  confidence: number,
  source: CacheEntry['source']
): Promise<void> {
  const db = getFirestore();
  const hash = cacheHash(normalizedDesc);
  await db
    .collection('users').doc(userId)
    .collection('category_cache').doc(hash)
    .set({
      category, confidence, source,
      normalizedDesc,
      hitCount: 1,
      updatedAt: new Date(),
    }, { merge: true });
}

// Fuzzy match simples (Levenshtein normalizado) — retorna similaridade 0..1
export function fuzzyMatch(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;
  const distance = levenshtein(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = i === 0 ? j :
        Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + (b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1)
        );
    }
  }
  return matrix[b.length][a.length];
}

// Tier 1b — busca aproximada contra o cache existente do usuário.
// Carrega o cache (poucas dezenas de docs no MVP single-user) e procura a
// melhor correspondência acima do limiar.
export async function fuzzyLookup(
  userId: string,
  normalizedDesc: string,
  threshold = 0.85
): Promise<CacheEntry | null> {
  const db = getFirestore();
  const snap = await db
    .collection('users').doc(userId)
    .collection('category_cache')
    .get();

  let best: CacheEntry | null = null;
  let bestScore = threshold;

  for (const doc of snap.docs) {
    const data = doc.data() as CacheEntry;
    const candidate = data.normalizedDesc;
    if (!candidate) continue;
    const score = fuzzyMatch(normalizedDesc, candidate);
    if (score >= bestScore) {
      bestScore = score;
      best = data;
    }
  }

  return best;
}
