// Depósito numa caixinha compartilhada do casal.
// O parceiro deposita na caixinha do dono (autorizado pelo vínculo sharedWithUid).
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

const Schema = z.object({
  ownerUid: z.string().min(1),
  caixinhaId: z.string().min(1),
  amount: z.number().positive(),
});

export const depositToSharedCaixinha = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Não autenticado');

    const parsed = Schema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Dados inválidos');
    const { ownerUid, caixinhaId, amount } = parsed.data;

    const db = getFirestore();

    // Autorização: quem deposita deve ser o próprio dono ou o parceiro vinculado.
    if (uid !== ownerUid) {
      const myProfile = await db.collection('users').doc(uid).collection('profile').doc('main').get();
      const linkedUid = myProfile.exists ? myProfile.data()?.sharedWithUid : null;
      if (linkedUid !== ownerUid) {
        throw new HttpsError('permission-denied', 'Você não tem acesso a esta caixinha.');
      }
    }

    const ref = db.collection('users').doc(ownerUid).collection('caixinhas').doc(caixinhaId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Caixinha não encontrada.');
    const c = snap.data() as {
      totalSaved?: number;
      targetAmount?: number;
      deposits?: { date: string; amount: number; by?: string; byName?: string }[];
      shared?: boolean;
    };
    if (!c.shared) throw new HttpsError('failed-precondition', 'Esta caixinha não é compartilhada.');

    const today = new Date().toISOString().slice(0, 10);
    const newTotal = (c.totalSaved || 0) + amount;
    const completed = newTotal >= (c.targetAmount || Infinity);
    const depositorName = request.auth?.token?.name || request.auth?.token?.email || 'Parceiro(a)';

    await ref.update({
      totalSaved: newTotal,
      status: completed ? 'completed' : 'active',
      deposits: [
        ...(c.deposits || []),
        { date: today, amount, by: uid, byName: depositorName },
      ],
    });

    return { ok: true, totalSaved: newTotal, completed };
  }
);
