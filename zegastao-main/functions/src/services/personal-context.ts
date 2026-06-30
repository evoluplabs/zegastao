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
  return `O aventureiro está diante de uma TENTAÇÃO DE COMPRA${amount ? ` (~R$${amount.toFixed(0)})` : ''}.
Responda como o Sábio: um conselheiro que se preocupa de verdade com o futuro dele. OBRIGATÓRIO:
1. Valide o sentimento — não julgue nem sermone.
2. Mostre o custo real no contexto atual (impacto em metas/Bosses; se possível, traduza em "X dias a mais de dívida" ou "X% de HP do Boss").
3. Ofereça uma alternativa ou um "e se esperar X semanas?".
4. Termine com uma pergunta aberta, não uma ordem.
Se a compra for prejudicial, use a âncora de futuro: "No dia em que você derrotar o Boss [dívida], vai olhar pra trás e...".
A decisão final é sempre do aventureiro. Use toques leves do RPG, mas os números são reais. Máximo 4 parágrafos.`;
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Você é o Sábio de um RPG de finanças reais. Com base neste contexto financeiro,
atualize a leitura que o Sábio faz do aventureiro.

${compressedContext}

Transações recentes notáveis: ${recentNotable || 'nenhuma'}

Retorne APENAS JSON:
{"behaviorPatterns":["..."],"strengths":["..."],"riskAreas":["..."],"progressNotes":["..."],"suggestedFocus":"foco da semana em 1 frase","lastAnalysis":"análise em 2-3 frases, tom encorajador e honesto"}

Tom: o Sábio que torce genuinamente pelo aventureiro — sabedoria tranquila, toques leves do RPG (jornada, Bosses, ouro, cofres), mas observações 100% reais e úteis.`,
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
