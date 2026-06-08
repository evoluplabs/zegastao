// Trigger: upload em contracts/{userId}/{contractId} → Sonnet extrai os termos.
// O arquivo original NUNCA é deletado do Storage — o usuário tem direito a ele.
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import Anthropic from '@anthropic-ai/sdk';
import pdfParse from 'pdf-parse';
import { ExtractedContract } from '../services/contract-types';

export const analyzeContract = onObjectFinalized(
  { region: 'us-east1', memory: '1GiB', timeoutSeconds: 300 },
  async (event) => {
    const filePath = event.data.name;
    const bucket = event.data.bucket;
    if (!filePath || !filePath.startsWith('contracts/')) return;

    const [, userId, contractId] = filePath.split('/');
    if (!userId || !contractId) return;

    const db = getFirestore();
    const contractRef = db
      .collection('users').doc(userId).collection('contracts').doc(contractId);

    try {
      await contractRef.set({ status: 'analyzing', storagePath: filePath }, { merge: true });

      const [buffer] = await getStorage().bucket(bucket).file(filePath).download();
      const { text } = await pdfParse(buffer);

      const client = new Anthropic();
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Analise este contrato financeiro brasileiro e extraia as informações em JSON.

CONTRATO:
${text.substring(0, 8000)}

Retorne APENAS JSON válido com esta estrutura:
{"contractNumber":"","creditor":"","contractDate":"yyyy-mm-dd","contractType":"personal_loan|financing|credit_card|overdraft|consortium|other","principalAmount":0,"totalAmount":0,"monthlyInterestRate":0,"annualInterestRate":0,"cetRate":0,"totalInstallments":0,"installmentAmount":0,"firstDueDate":"yyyy-mm-dd","lastDueDate":"yyyy-mm-dd","amortizationType":"price|sac|other","latePaymentFee":0,"lateInterestRate":0,"earlyPaymentDiscount":false,"keyClausesForUser":[],"redFlags":[],"negotiationOpportunities":[]}

Em "keyClausesForUser": explique em linguagem simples o que o usuário PRECISA saber.
Em "redFlags": cláusulas desvantajosas ou abusivas.
Em "negotiationOpportunities": onde e como negociar.
Valores monetários como number (sem R$ ou vírgulas). Taxas como decimal (12% = 0.12).`,
          },
        ],
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const extracted = JSON.parse(raw.replace(/```json|```/g, '').trim()) as ExtractedContract;

      let linkedDebtId: string | null = null;
      if (extracted.principalAmount && extracted.monthlyInterestRate) {
        const debtRef = await db
          .collection('users').doc(userId).collection('debts').add({
            creditor: extracted.creditor || 'Contrato',
            type: extracted.contractType || 'other',
            totalBalance: extracted.principalAmount,
            monthlyPayment: extracted.installmentAmount || 0,
            interestRateMonthly: extracted.monthlyInterestRate,
            remainingInstallments: extracted.totalInstallments || 0,
            dueDay: 10,
            status: 'active',
            contractId,
            source: 'contract_upload',
            createdAt: new Date(),
          });
        linkedDebtId = debtRef.id;
      }

      await contractRef.set(
        {
          status: 'analyzed',
          extracted,
          linkedDebtId,
          analyzedAt: new Date(),
        },
        { merge: true }
      );
      // Importante: o PDF do contrato permanece no Storage.
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await contractRef.set({ status: 'error', errorMessage: message }, { merge: true });
      console.error(`analyzeContract failed for ${filePath}:`, error);
    }
  }
);
