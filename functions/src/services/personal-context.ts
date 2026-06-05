// Contexto pessoal: anotações automáticas do copiloto + detecção de impulso.
import Anthropic from '@anthropic-ai/sdk';
import { getFirestore } from 'firebase-admin/firestore';

// ---- Modo impulso ----

const IMPULSE_RE =
  /quero comprar|posso comprar|t[oô] pensando em|devo parcelar|vale a pena comprar|posso gastar|tô a fim de comprar/i;

export function isImpulse(message: string): boolean {
  return IMPULSE_RE.test(message);
}

export function extractAmount(message: string): number | null {
  const m = message.match(/R\$\s?(\d[\d.,]*)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Instrução extra injetada no system prompt quando há impulso de compra.
export function impulseGuidance(amount: number | null): string {
  return `O usuário está tendo um IMPULSO DE COMPRA${amount ? ` (~R$${amount.toFixed(0)})` : ''}.
Responda como um amigo honesto que se preocupa com o futuro dele. OBRIGATÓRIO:
1. Valide o sentimento — não julgue nem sermone.
2. Mostre o custo real no contexto atual (impacto em metas/dívidas; se possível, traduza em "X dias a mais de dívida").
3. Ofereça uma alternativa ou um "e se esperar X semanas?".
4. Termine com uma pergunta aberta, não uma ordem.
Se o impulso for prejudicial, use a âncora de futuro: "Na data em que você quita [dívida], vai olhar pra trás e...".
A decisão final é sempre do usuário. Máximo 4 parágrafos.`;
}

// Registra o impulso no histórico do contexto pessoal.
export async function saveImpulseToHistory(
  userId: string,
  impulse: string,
  amount: number | null,
  copilotResponse: string
): Promise<void> {
  const db = getFirestore();
  await db
    .collection('users').doc(userId)
    .collection('personal_context').doc('impulse_history')
    .collection('items').add({
      impulse,
      impactIfActed: amount,
      copilotResponse,
      outcome: 'pending',
      recordedAt: new Date(),
    });
}

// ---- Anotações automáticas do copiloto (job noturno) ----

export async function updateCopilotNotes(
  userId: string,
  compressedContext: string,
  recentNotable: string
): Promise<void> {
  const db = getFirestore();
  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Com base neste contexto financeiro, atualize as anotações do copiloto.

${compressedContext}

Transações recentes notáveis: ${recentNotable || 'nenhuma'}

Retorne APENAS JSON:
{"behaviorPatterns":["..."],"strengths":["..."],"riskAreas":["..."],"progressNotes":["..."],"suggestedFocus":"foco da semana em 1 frase","lastAnalysis":"análise em 2-3 frases, tom encorajador e honesto"}

Tom: como um consultor que torce genuinamente pelo usuário.`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const notes = JSON.parse(raw.replace(/```json|```/g, '').trim());

    await db
      .collection('users').doc(userId)
      .collection('personal_context').doc('copilot_notes')
      .set({ ...notes, updatedAt: new Date() }, { merge: true });
  } catch (e) {
    console.error('updateCopilotNotes failed:', e);
  }
}
