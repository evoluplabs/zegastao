// Trigger: Storage finalize → parse → categoriza (cascata) → grava em lote → regras.
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { classifyByKeyword, normalizeDescription } from '../services/keyword-classifier';
import {
  getCachedCategory,
  saveCategoryCache,
  fuzzyLookup,
} from '../services/category-cache';
import { categorizeBatch } from '../services/ai-categorizer';
import { evaluateRules } from '../services/rules-engine';
import { parseFile } from '../services/parsers/pdf-parser';
import { ParsedTransaction } from '../types';

export const onStatementUpload = onObjectFinalized(
  { region: 'southamerica-east1', memory: '512MiB', timeoutSeconds: 300 },
  async (event) => {
    const filePath = event.data.name;
    const bucket = event.data.bucket;
    if (!filePath || !filePath.startsWith('uploads/')) return;

    const [, userId, uploadId] = filePath.split('/');
    if (!userId || !uploadId) return;

    const db = getFirestore();
    const uploadRef = db
      .collection('users').doc(userId).collection('uploads').doc(uploadId);

    try {
      await uploadRef.set({ status: 'processing' }, { merge: true });

      // 1. Download do arquivo
      const file = getStorage().bucket(bucket).file(filePath);
      const [buffer] = await file.download();

      // 2. Parse → transações raw
      const rawTransactions = await parseFile(buffer, filePath);

      // 3. Categorização em cascata (Tier 0 → 1 → 2)
      const toAI: ParsedTransaction[] = [];
      const ready: ParsedTransaction[] = [];

      for (const tx of rawTransactions) {
        const normalized = normalizeDescription(tx.description);
        tx.normalizedDesc = normalized;

        // Tier 0: keyword
        const kw = classifyByKeyword(tx.description);
        if (kw) {
          tx.category = kw;
          tx.aiConfidence = 1.0;
          tx.aiCategorized = false;
          ready.push(tx);
          await saveCategoryCache(userId, normalized, kw, 1.0, 'keyword');
          continue;
        }

        // Tier 1: cache exato
        const cached = await getCachedCategory(userId, normalized);
        if (cached && cached.confidence >= 0.75) {
          tx.category = cached.category;
          tx.aiConfidence = cached.confidence;
          tx.aiCategorized = cached.source === 'ai';
          ready.push(tx);
          continue;
        }

        // Tier 1b: fuzzy match (≥85%) contra o cache existente
        const fuzzy = await fuzzyLookup(userId, normalized, 0.85);
        if (fuzzy && fuzzy.confidence >= 0.75) {
          tx.category = fuzzy.category;
          tx.aiConfidence = fuzzy.confidence;
          tx.aiCategorized = fuzzy.source === 'ai';
          ready.push(tx);
          continue;
        }

        toAI.push(tx);
      }

      // Tier 2: Haiku para o que sobrou (em lote)
      if (toAI.length > 0) {
        const aiResults = await categorizeBatch(
          toAI.map((t) => ({ date: t.date, description: t.description, amount: t.amount }))
        );

        for (let i = 0; i < toAI.length; i++) {
          toAI[i].category = aiResults[i].category;
          toAI[i].aiConfidence = aiResults[i].confidence;
          toAI[i].aiCategorized = true;
          await saveCategoryCache(
            userId,
            toAI[i].normalizedDesc!,
            aiResults[i].category,
            aiResults[i].confidence,
            'ai'
          );
        }
      }

      const allTransactions = [...ready, ...toAI];

      // 4. Gravar no Firestore em LOTE (nunca writes individuais em loop)
      const txCollection = db
        .collection('users').doc(userId).collection('transactions');
      const BATCH_SIZE = 499; // Firestore max é 500
      const writtenIds: string[] = [];
      for (let i = 0; i < allTransactions.length; i += BATCH_SIZE) {
        const batch: WriteBatch = db.batch();
        allTransactions.slice(i, i + BATCH_SIZE).forEach((tx) => {
          const ref = txCollection.doc();
          tx.id = ref.id;
          writtenIds.push(ref.id);
          batch.set(ref, {
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            category: tx.category || 'Outros',
            aiConfidence: tx.aiConfidence ?? 0,
            aiCategorized: tx.aiCategorized ?? false,
            normalizedDesc: tx.normalizedDesc || null,
            bank: tx.bank || null,
            isRecurring: tx.isRecurring ?? false,
            source: 'upload',
            uploadId,
            createdAt: new Date(),
          });
        });
        await batch.commit();
      }

      // 5. Avaliar regras contra as novas transações
      await evaluateRules(userId, allTransactions);

      // 6. Atualizar status do upload
      await uploadRef.set(
        {
          status: 'done',
          totalTransactions: allTransactions.length,
          aiCategorized: toAI.length,
          processedAt: new Date(),
        },
        { merge: true }
      );

      // 7. Deletar arquivo do Storage (dados sensíveis)
      await file.delete().catch(() => {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await uploadRef.set({ status: 'error', errorMessage: message }, { merge: true });
      console.error(`onStatementUpload failed for ${filePath}:`, error);
    }
  }
);
