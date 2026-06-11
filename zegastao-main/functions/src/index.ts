// Ponto de entrada das Cloud Functions. Inicializa o Admin SDK e exporta tudo.
import { initializeApp } from 'firebase-admin/app';
import * as Sentry from '@sentry/node';

initializeApp();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'production',
    tracesSampleRate: 0.1,
  });
}

export { onStatementUpload } from './functions/onUpload';
export { analyzeContract } from './functions/analyzeContract';
export { nightlyDigest } from './functions/nightlyDigest';
export { processUserDigest } from './functions/processUserDigest';
export { copilotChat } from './functions/copilotChat';
export { categorizeManual } from './functions/categorizeManual';
export { createMPCheckout, handleMPWebhook } from './functions/mercadopago';
export { betAnalysis } from './functions/betAnalysis';
export { bettingProfile } from './functions/bettingProfile';
export { whatsappWebhook } from './functions/whatsappWebhook';
export { generateInsightsNow } from './functions/generateInsightsNow';
export { weeklyDigest } from './functions/weeklyDigest';
export { linkPartner } from './functions/linkPartner';
export { extractTaxData } from './functions/extractTaxData';
