// MercadoPago: criação de preferência de pagamento e webhook de assinatura.
import crypto from 'crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';

const PLAN_DETAILS: Record<string, { title: string; priceReais: number; months: number }> = {
  copiloto_monthly: { title: 'Copiloto Financeiro — Mensal', priceReais: 19.90, months: 1 },
  copiloto_annual: { title: 'Copiloto Financeiro — Anual', priceReais: 178.80, months: 12 },
};

export const createMPCheckout = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Não autenticado');

    const plan = request.data?.plan as string;
    const successUrl = request.data?.successUrl as string;
    const failureUrl = request.data?.failureUrl as string;

    const details = PLAN_DETAILS[plan];
    if (!details) throw new HttpsError('invalid-argument', 'Plano inválido');
    if (!MP_ACCESS_TOKEN) throw new HttpsError('internal', 'Pagamento não configurado');

    const preference = {
      items: [{
        id: plan,
        title: details.title,
        quantity: 1,
        unit_price: details.priceReais,
        currency_id: 'BRL',
      }],
      external_reference: `${userId}|${plan}|${Date.now()}`,
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: failureUrl,
      },
      auto_return: 'approved',
      metadata: { userId, plan },
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('MP error:', err);
      throw new HttpsError('internal', 'Erro ao criar preferência de pagamento');
    }

    const data = await response.json() as { sandbox_init_point?: string; init_point?: string };
    const checkoutUrl = data.sandbox_init_point || data.init_point || '';
    return { checkoutUrl };
  }
);

export const handleMPWebhook = onRequest(
  { region: 'southamerica-east1' },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    const body = req.body as { type?: string; data?: { id?: string } };
    const paymentId = body.data?.id;

    // Validação HMAC-SHA256 da assinatura do MercadoPago (formato: ts=TIMESTAMP,v1=HASH)
    const xSignature = (req.headers['x-signature'] as string) || '';
    const xRequestId = (req.headers['x-request-id'] as string) || '';
    // O MP assina usando o data.id da query string em minúsculas (fallback ao body)
    const queryDataId = (req.query['data.id'] as string) || '';
    const signedId = (queryDataId || paymentId || '').toLowerCase();
    if (MP_WEBHOOK_SECRET && xSignature) {
      const parts: Record<string, string> = {};
      xSignature.split(',').forEach(part => {
        const [key, val] = part.split('=');
        if (key && val) parts[key.trim()] = val.trim();
      });
      const ts = parts['ts'];
      const v1 = parts['v1'];
      if (ts && v1) {
        // Inclui apenas os segmentos presentes, igual ao spec do MercadoPago
        let manifest = '';
        if (signedId) manifest += `id:${signedId};`;
        if (xRequestId) manifest += `request-id:${xRequestId};`;
        manifest += `ts:${ts};`;
        const expected = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex');
        if (expected !== v1) {
          console.warn('MP webhook signature mismatch', { hasId: !!signedId, hasReqId: !!xRequestId });
          res.status(401).send('Unauthorized');
          return;
        }
      }
    }

    if (body.type !== 'payment') { res.status(200).send('ok'); return; }

    if (!paymentId) { res.status(200).send('ok'); return; }

    try {
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
      });
      const payment = await paymentRes.json() as {
        status?: string;
        external_reference?: string;
        metadata?: { userId?: string; plan?: string };
      };

      if (payment.status !== 'approved') { res.status(200).send('ok'); return; }

      const userId = payment.metadata?.userId;
      const plan = payment.metadata?.plan as string | undefined;
      if (!userId || !plan || !PLAN_DETAILS[plan]) { res.status(200).send('ok'); return; }

      const db = getFirestore();

      // Idempotência: ignorar pagamento já processado
      const existingSub = await db.collection('users').doc(userId)
        .collection('subscription').doc('main').get();
      if (existingSub.exists && existingSub.data()?.mpPaymentId === paymentId) {
        res.status(200).send('ok');
        return;
      }

      const months = PLAN_DETAILS[plan].months;
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + months);

      await db.collection('users').doc(userId).collection('subscription').doc('main').set({
        plan,
        status: 'active',
        mpPaymentId: paymentId,
        currentPeriodEnd: Timestamp.fromDate(periodEnd),
        activatedAt: Timestamp.now(),
        uploadsThisMonth: 0,
      });

      await db.collection('admin_logs').add({
        event: 'subscription_activated',
        userId,
        plan,
        paymentId,
        timestamp: new Date(),
        source: 'mp_webhook',
      });

      // Mark referral conversion using reverse index (cheap single-doc lookup)
      try {
        const indexDoc = await db.collection('referral_index').doc(userId).get();
        if (indexDoc.exists) {
          const { referralPath } = indexDoc.data() as { referralPath: string };
          const referralRef = db.doc(referralPath);
          const referral = await referralRef.get();
          if (referral.exists && !referral.data()?.convertedAt) {
            await referralRef.update({ convertedAt: new Date(), plan: 'paid' });
          }
        }
      } catch (e) {
        console.warn('Referral conversion update failed (non-critical):', e);
      }

      res.status(200).send('ok');
    } catch (err) {
      console.error('Webhook error:', err);
      res.status(500).send('error');
    }
  }
);
