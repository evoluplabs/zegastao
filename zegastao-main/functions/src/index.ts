// Ponto de entrada das Cloud Functions. Inicializa o Admin SDK e exporta tudo.
import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onStatementUpload } from './functions/onUpload';
export { analyzeContract } from './functions/analyzeContract';
export { nightlyDigest } from './functions/nightlyDigest';
export { copilotChat } from './functions/copilotChat';
export { categorizeManual } from './functions/categorizeManual';
export { createMPCheckout, handleMPWebhook } from './functions/mercadopago';
