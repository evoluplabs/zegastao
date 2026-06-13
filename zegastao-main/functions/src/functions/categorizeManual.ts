// HTTP callable: recategorizar uma transação manualmente.
// Salva a correção no cache pessoal (source: user_correction) para o app aprender.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { saveCategoryCache } from '../services/category-cache';
import { normalizeDescription } from '../services/keyword-classifier';
import { CATEGORIES } from '../services/ai-categorizer';

export const categorizeManual = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Não autenticado');

    const transactionId: string = request.data?.transactionId;
    const rawCategory: string = request.data?.category;
    if (!transactionId || !rawCategory) {
      throw new HttpsError('invalid-argument', 'transactionId e category são obrigatórios');
    }
    const newCategory = CATEGORIES.includes(rawCategory) ? rawCategory : 'Outros';

    const db = getFirestore();
    const txRef = db
      .collection('users').doc(userId)
      .collection('transactions').doc(transactionId);
    const snap = await txRef.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Transação não encontrada');

    const tx = snap.data()!;
    const normalized = tx.normalizedDesc || normalizeDescription(tx.description || '');

    // Atualiza a transação
    await txRef.update({
      category: newCategory,
      aiConfidence: 1.0,
      aiCategorized: false,
      userCorrected: true,
    });

    // Aprende: correção do usuário tem confiança máxima e prioridade no cache
    await saveCategoryCache(userId, normalized, newCategory, 1.0, 'user_correction');

    return { ok: true };
  }
);
