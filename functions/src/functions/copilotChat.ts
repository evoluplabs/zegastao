// HTTP callable: chat do copiloto (Sonnet) usando contexto JÁ comprimido do cache.
// Detecta impulsos de compra e ativa o "modo impulso" (validar + custo real).
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import {
  isImpulse,
  extractAmount,
  impulseGuidance,
  saveImpulseToHistory,
} from '../services/personal-context';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const copilotChat = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Não autenticado');

    const message: string = request.data?.message || '';
    const history: ChatMessage[] = request.data?.history || [];
    if (!message.trim()) throw new HttpsError('invalid-argument', 'Mensagem vazia');

    const db = getFirestore();

    // Contexto comprimido vem do cache (gerado pelo job noturno) — não recalcula.
    const insightsDoc = await db
      .collection('users').doc(userId)
      .collection('insights').doc('latest').get();

    const contextSnapshot = insightsDoc.exists
      ? insightsDoc.data()!.contextSnapshot
      : 'Contexto ainda não disponível. O job noturno ainda não rodou.';

    // Modo impulso: detecta padrão de vontade de compra.
    const impulse = isImpulse(message);
    const impulseAmount = impulse ? extractAmount(message) : null;

    const client = new Anthropic();

    // Limitar histórico a 10 mensagens (economiza tokens)
    const recentHistory = history.slice(-10);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: impulse ? 700 : 600,
      system: `Você é o copiloto financeiro pessoal do usuário, que o acompanha da fase de
sobrevivência (endividado) até a de investidor. Fale APENAS do que é relevante para a
fase atual (descrita no contexto): não mencione investimentos para quem ainda tem dívida cara.
Responda em português brasileiro, como um amigo que entende de finanças.
Seja direto, honesto, sem julgamento. Máximo 3 parágrafos. Adapte o tom à fase.
Ao falar de qualquer investimento, inclua sempre o aviso: "Isso é orientação educacional,
não consultoria financeira regulamentada pela CVM — investimentos envolvem risco."
Se o usuário pedir para criar uma regra, retorne no final um JSON:
{"create_rule": {"name":"...","trigger_type":"...","trigger_category":"...","trigger_threshold":0,"action_percentage":0,"action_goal":"..."}}
${impulse ? `\n${impulseGuidance(impulseAmount)}` : ''}

CONTEXTO FINANCEIRO ATUAL (inclui a fase e como agir nela):
${contextSnapshot}`,
      messages: [
        ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: message },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Registra o impulso no histórico do contexto pessoal.
    if (impulse) {
      await saveImpulseToHistory(userId, message, impulseAmount, text).catch(() => {});
    }

    return {
      response: text,
      impulse, // o frontend pode destacar a resposta
      usage: response.usage,
    };
  }
);
