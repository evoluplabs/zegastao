// HTTP callable: chat do copiloto (Sonnet) usando contexto JÁ comprimido do cache.
// Detecta impulsos de compra e ativa o "modo impulso" (validar + custo real).
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
  isImpulse,
  extractAmount,
  impulseGuidance,
  saveImpulseToHistory,
} from '../services/personal-context';
import { buildContextFallback } from '../services/context-fallback';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ChatSchema = z.object({
  message: z.string().min(1, 'Mensagem vazia').max(2000, 'Mensagem muito longa'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  })).max(20).optional().default([]),
});

const FREE_LIFETIME_LIMIT = 5;

async function checkAndIncrementRateLimit(
  db: ReturnType<typeof getFirestore>,
  userId: string
): Promise<{ allowed: boolean; remaining: number; lifetimeLimit: number; isPaid: boolean }> {
  const subDoc = await db.collection('users').doc(userId).collection('subscription').doc('main').get();
  const plan = subDoc.exists ? (subDoc.data()!.plan as string) : 'free';

  // Usuários pagos: sem limite
  if (plan !== 'free') {
    return { allowed: true, remaining: Infinity, lifetimeLimit: Infinity, isPaid: true };
  }

  // Usuários free: 5 mensagens vitalícias (sem reset)
  const usageRef = db.collection('users').doc(userId).collection('usage').doc('chat');

  return db.runTransaction(async (tx) => {
    const usageDoc = await tx.get(usageRef);
    const data = usageDoc.exists ? usageDoc.data()! : {};
    const lifetimeCount: number = (data.lifetimeCount as number) || 0;

    if (lifetimeCount >= FREE_LIFETIME_LIMIT) {
      return { allowed: false, remaining: 0, lifetimeLimit: FREE_LIFETIME_LIMIT, isPaid: false };
    }

    tx.set(usageRef, { lifetimeCount: lifetimeCount + 1 }, { merge: true });
    return {
      allowed: true,
      remaining: FREE_LIFETIME_LIMIT - lifetimeCount - 1,
      lifetimeLimit: FREE_LIFETIME_LIMIT,
      isPaid: false,
    };
  });
}

export const copilotChat = onCall(
  { region: 'southamerica-east1', enforceAppCheck: false },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Não autenticado');

    const parsed = ChatSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message || 'Dados inválidos');
    }
    const { message, history } = parsed.data;

    const db = getFirestore();

    const rateCheck = await checkAndIncrementRateLimit(db, userId);
    if (!rateCheck.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Você usou suas ${rateCheck.lifetimeLimit} mensagens gratuitas. Para conversar sem limite, assine o plano Copiloto — R$19,90/mês ou R$14,90/mês no anual.`
      );
    }

    // Contexto comprimido vem do cache (gerado pelo job noturno) — não recalcula.
    const insightsDoc = await db
      .collection('users').doc(userId)
      .collection('insights').doc('latest').get();

    // New users won't have insights yet — build a minimal fallback context from raw data
    const contextSnapshot = insightsDoc.exists && insightsDoc.data()!.contextSnapshot
      ? insightsDoc.data()!.contextSnapshot
      : await buildContextFallback(userId, db);

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
      impulse,
      remainingMessages: rateCheck.remaining,
      lifetimeLimit: rateCheck.lifetimeLimit,
      isPaid: rateCheck.isPaid,
      usage: response.usage,
    };
  }
);
