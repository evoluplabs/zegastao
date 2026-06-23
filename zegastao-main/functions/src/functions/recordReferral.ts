import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Replicate the same hash as src/hooks/useReferral.ts
function hashUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    const char = uid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

export const recordReferral = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    const refereeUid = request.auth?.uid;
    if (!refereeUid) throw new HttpsError('unauthenticated', 'Não autenticado');

    const referralCode = request.data?.referralCode as string | undefined;
    if (!referralCode) throw new HttpsError('invalid-argument', 'Código de indicação inválido');

    // Prevent self-referral
    if (hashUid(refereeUid) === referralCode) return { ok: true };

    const db = getFirestore();

    // Find referrer by querying their profile for matching referralCode
    const profilesSnap = await db
      .collectionGroup('profile')
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

    if (profilesSnap.empty) return { ok: true }; // Code not found — ignore silently

    const referrerProfileDoc = profilesSnap.docs[0];
    // Path: users/{uid}/profile/main → parent.parent.id = uid
    const referrerUid = referrerProfileDoc.ref.parent.parent?.id;
    if (!referrerUid || referrerUid === refereeUid) return { ok: true };

    const referralRef = db.collection('users').doc(referrerUid).collection('referrals').doc(refereeUid);

    // Idempotent: skip if already recorded
    const existing = await referralRef.get();
    if (existing.exists) return { ok: true };

    // Get referee display info
    let refereeName: string | undefined;
    let refereeEmail: string | undefined;
    try {
      const authUser = await getAuth().getUser(refereeUid);
      refereeName = authUser.displayName || undefined;
      refereeEmail = authUser.email || undefined;
    } catch { /* ignore */ }

    const batch = db.batch();

    batch.set(referralRef, {
      joinedAt: Timestamp.now(),
      plan: 'free',
      convertedAt: null,
      name: refereeName,
      email: refereeEmail,
    });

    // Reverse index for fast conversion lookup in webhook
    const indexRef = db.collection('referral_index').doc(refereeUid);
    batch.set(indexRef, { referrerUid, referralPath: referralRef.path }, { merge: true });

    await batch.commit();

    return { ok: true };
  }
);
