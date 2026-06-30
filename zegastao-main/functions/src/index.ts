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

// Avisos de startup — não causa process.exit para não derrubar functions independentes
const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.warn(`[startup] Variável de ambiente ausente: ${key}. Funções que dependem dela podem falhar.`);
  }
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
// Zé Apostador 2.0
export { zeMandate, zeCycle, zeRecalcCard, zeFeedback, zeScan, zeLearnNightly } from './functions/zeApostador';
// Zé Apostador 2.1 — Vision-first (extração de print, desmascarador de guru,
// trava de dopamina e liquidação expressa por print)
export { zeExtractOdds, zeGuruAudit, zeWithdrawalProof, zeSettleByPrint } from './functions/zeVision';
export { whatsappWebhook } from './functions/whatsappWebhook';
export { generateInsightsNow } from './functions/generateInsightsNow';
export { onBossDefeated } from './functions/proactiveSage';
export { weeklyDigest } from './functions/weeklyDigest';
export { linkPartner } from './functions/linkPartner';
export { extractTaxData } from './functions/extractTaxData';
export { recordReferral } from './functions/recordReferral';
export { startTrial } from './functions/startTrial';
export { depositToSharedCaixinha } from './functions/depositToSharedCaixinha';
