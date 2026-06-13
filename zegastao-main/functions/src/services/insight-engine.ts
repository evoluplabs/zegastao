// Tier 3 — Geração de insights com Claude Sonnet (1x/dia por usuário).
// Recebe o contexto JÁ comprimido (~300 tokens) e devolve insights estruturados.
import Anthropic from '@anthropic-ai/sdk';
import { Insight } from '../types';

const SYSTEM = `Você é o copiloto financeiro pessoal do usuário.
Gere de 2 a 4 insights curtos sobre a situação financeira, em português brasileiro.
Tom: amigo que entende de finanças, honesto, sem julgamento, linguagem humana.
Seja proativo: avise antes do problema, celebre vitórias, dê uma dica acionável.

Responda APENAS com JSON neste formato (sem texto fora do JSON):
{"insights":[{"type":"alert|tip|win|projection","emoji":"💡","title":"curto","body":"1-2 frases"}]}`;

export async function generateInsights(compressedContext: string): Promise<Insight[]> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Gere os insights de hoje a partir deste contexto:\n\n${compressedContext}`,
      },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('generateInsights: resposta vazia ou tipo inesperado do modelo');
  }

  let data: { insights?: unknown };
  try {
    data = JSON.parse(block.text.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error(`generateInsights: JSON inválido na resposta: ${block.text.slice(0, 200)}`);
  }

  if (!Array.isArray(data.insights)) {
    throw new Error(`generateInsights: campo "insights" ausente ou não é array`);
  }

  return (data.insights as Insight[]).slice(0, 4);
}
