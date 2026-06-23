// Vincula dois usuários no modo casal/família.
// Recebe o email do parceiro → busca o UID → atualiza sharedWithUid em ambos os perfis.
import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';

const LinkSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('link'), partnerEmail: z.string().email() }),
  z.object({ action: z.literal('unlink') }),
]);

export const linkPartner = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    if (!request.auth) throw new Error('Não autenticado');

    const parsed = LinkSchema.safeParse(request.data);
    if (!parsed.success) throw new Error('Dados inválidos');

    const uid = request.auth.uid;
    const db = getFirestore();

    if (parsed.data.action === 'unlink') {
      // Remove vinculação: zera sharedWithUid no próprio perfil
      await db.collection('users').doc(uid).collection('profile').doc('main')
        .set({ sharedWithUid: null }, { merge: true });
      return { ok: true };
    }

    // action === 'link'
    const { partnerEmail } = parsed.data;

    // Modo Casal exige o plano Casal/Família ativo (ou em trial válido)
    const subSnap = await db.collection('users').doc(uid).collection('subscription').doc('main').get();
    const subData = subSnap.exists ? subSnap.data() : null;
    const trialValid = subData?.status === 'trialing'
      && subData?.trialEndsAt?.toMillis?.() > Date.now();
    const isActive = subData?.status === 'active' || trialValid;
    const isCasalPlan = subData?.plan === 'casal_familia_monthly' || subData?.plan === 'casal_familia_annual';
    if (!isActive || !isCasalPlan) {
      throw new Error('O Modo Casal está disponível no plano Casal/Família. Faça upgrade para vincular seu parceiro(a).');
    }

    // Não pode vincular a si mesmo
    if (partnerEmail === request.auth.token.email) {
      throw new Error('Você não pode vincular com seu próprio e-mail.');
    }

    // Busca o UID do parceiro pelo e-mail
    let partnerRecord: import('firebase-admin/auth').UserRecord;
    try {
      partnerRecord = await getAuth().getUserByEmail(partnerEmail);
    } catch {
      throw new Error('Nenhuma conta encontrada com esse e-mail.');
    }

    const partnerUid = partnerRecord.uid;

    // Atualiza ambos os perfis com sharedWithUid do outro
    const batch = db.batch();
    batch.set(
      db.collection('users').doc(uid).collection('profile').doc('main'),
      { sharedWithUid: partnerUid },
      { merge: true }
    );
    batch.set(
      db.collection('users').doc(partnerUid).collection('profile').doc('main'),
      { sharedWithUid: uid },
      { merge: true }
    );
    await batch.commit();

    return { ok: true, partnerDisplayName: partnerRecord.displayName || partnerEmail };
  }
);
