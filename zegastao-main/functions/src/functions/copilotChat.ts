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
  const subData = subDoc.exists ? subDoc.data()! : null;
  // Plano efetivo: respeita status e expiração do trial (trial vencido = free).
  const trialValid = subData?.status === 'trialing' && subData?.trialEndsAt?.toMillis?.() > Date.now();
  const planActive = subData?.status === 'active' || trialValid;
  const plan = planActive ? (subData!.plan as string) : 'free';

  // Usuários pagos: cap diário de segurança de 200 msgs/dia (evita custo explosivo por abuso)
  if (plan !== 'free') {
    const usageDailyRef = db.collection('users').doc(userId).collection('usage').doc('chat_daily');
    return db.runTransaction(async (tx) => {
      const dailyDoc = await tx.get(usageDailyRef);
      const today = new Date().toISOString().slice(0, 10);
      const data = dailyDoc.exists ? dailyDoc.data()! : {};
      const count = data.date === today ? (data.count as number || 0) : 0;
      const PAID_DAILY_CAP = 200;
      if (count >= PAID_DAILY_CAP) {
        return { allowed: false, remaining: 0, lifetimeLimit: PAID_DAILY_CAP, isPaid: true };
      }
      tx.set(usageDailyRef, { date: today, count: count + 1 }, { merge: true });
      return { allowed: true, remaining: PAID_DAILY_CAP - count - 1, lifetimeLimit: PAID_DAILY_CAP, isPaid: true };
    });
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

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new HttpsError('internal', 'Serviço de IA temporariamente indisponível. Tente novamente mais tarde.');
    }

    const parsed = ChatSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.errors[0]?.message || 'Dados inválidos');
    }
    const { message, history } = parsed.data;

    const db = getFirestore();

    const rateCheck = await checkAndIncrementRateLimit(db, userId);
    if (!rateCheck.allowed) {
      const msg = rateCheck.isPaid
        ? `Limite diário de ${rateCheck.lifetimeLimit} mensagens atingido. O limite será renovado amanhã.`
        : `Você usou suas ${rateCheck.lifetimeLimit} mensagens gratuitas. Para conversar sem limite, assine o plano Copiloto — R$19,90/mês ou R$14,90/mês no anual.`;
      throw new HttpsError('resource-exhausted', msg);
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

    let response: Awaited<ReturnType<typeof client.messages.create>>;
    try {
      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: impulse ? 700 : 600,
        system: `Você é o Sábio — o conselheiro ancião da jornada financeira do aventureiro,
num RPG de finanças REAIS. Acompanha-o da fase de sobrevivência (endividado) até a de investidor.
Fale APENAS do que é relevante para a fase atual (descrita no contexto): não mencione
investimentos para quem ainda tem dívida cara (Boss vivo).
Responda em português brasileiro com a voz do Sábio: sabedoria tranquila e acolhedora,
com toques leves do mundo do jogo (jornada, fases, Bosses = dívidas, ouro = dinheiro,
cofres = reservas/metas) — mas os números e conselhos são 100% reais e honestos.
Seja direto, sem julgamento, sem sermão. Máximo 3 parágrafos. Adapte o tom à fase.
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('authentication') || msg.includes('invalid x-api-key')) {
        throw new HttpsError('internal', 'Serviço de IA temporariamente indisponível. Tente novamente mais tarde.');
      }
      if (msg.includes('529') || msg.includes('overloaded')) {
        throw new HttpsError('unavailable', 'Serviço de IA sobrecarregado. Tente em alguns minutos.');
      }
      throw new HttpsError('internal', 'Não consegui processar sua mensagem. Tente novamente.');
    }

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
