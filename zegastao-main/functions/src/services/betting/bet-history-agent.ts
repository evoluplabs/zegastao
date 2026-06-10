// Agente de Histórico: lê o histórico de apostas do usuário (betting_history) e
// extrai calibração pessoal — em quais mercados ele/os agentes mais acertam.
// É o feedback loop: o resultado real das apostas passadas alimenta a próxima
// análise, fechando o ciclo de inteligência.
import { Firestore } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface BetHistoryInsight {
  totalBets: number;
  overallHitRate: number; // 0-100
  bestMarket: string;     // mercado com maior taxa de acerto (ou '')
  worstMarket: string;
  summary: string;        // pt-BR para o Consolidador
}

interface HistoryRecord {
  market?: string;
  outcome?: 'pending' | 'hit' | 'miss';
  profit?: number;
}

const EMPTY: BetHistoryInsight = {
  totalBets: 0,
  overallHitRate: 0,
  bestMarket: '',
  worstMarket: '',
  summary: 'HISTÓRICO: sem dados suficientes para personalização.',
};

export async function runBetHistoryAgent(
  userId: string,
  db: Firestore
): Promise<BetHistoryInsight> {
  let records: HistoryRecord[] = [];
  try {
    const snap = await db
      .collection('users').doc(userId)
      .collection('betting_history')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();
    records = snap.docs.map((d) => d.data() as HistoryRecord);
  } catch {
    return EMPTY;
  }

  // Só apostas com resultado definido contam para taxa de acerto
  const settled = records.filter((r) => r.outcome === 'hit' || r.outcome === 'miss');
  if (settled.length < 3) return EMPTY;

  const hits = settled.filter((r) => r.outcome === 'hit').length;
  const overallHitRate = Math.round((hits / settled.length) * 100);

  // Acerto por mercado
  const byMarket = new Map<string, { hit: number; total: number }>();
  for (const r of settled) {
    const m = r.market || 'desconhecido';
    const entry = byMarket.get(m) || { hit: 0, total: 0 };
    entry.total += 1;
    if (r.outcome === 'hit') entry.hit += 1;
    byMarket.set(m, entry);
  }

  // Considera só mercados com pelo menos 2 apostas para ranquear
  const ranked = [...byMarket.entries()]
    .filter(([, v]) => v.total >= 2)
    .map(([market, v]) => ({ market, rate: v.hit / v.total, total: v.total }))
    .sort((a, b) => b.rate - a.rate);

  const bestMarket = ranked.length ? ranked[0].market : '';
  const worstMarket = ranked.length > 1 ? ranked[ranked.length - 1].market : '';

  const marketBreakdown = ranked
    .map((r) => `${r.market}: ${Math.round(r.rate * 100)}% (${r.total} apostas)`)
    .join(', ');

  // Resumo via Haiku (curto) — com fallback determinístico
  let summary = `HISTÓRICO DO USUÁRIO: ${settled.length} apostas avaliadas, ${overallHitRate}% de acerto geral. Por mercado: ${marketBreakdown}.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 180,
      system: 'Você é analista de apostas. Responda em português brasileiro, 2 frases, objetivo.',
      messages: [{
        role: 'user',
        content: `Histórico de apostas do usuário: ${settled.length} apostas, ${overallHitRate}% de acerto geral.
Acerto por mercado: ${marketBreakdown || 'sem dados por mercado'}.
Em 2 frases, resuma onde o usuário tem se saído melhor/pior e que ajuste isso sugere para a próxima recomendação.`,
      }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    if (text) summary = `HISTÓRICO DO USUÁRIO (${overallHitRate}% acerto em ${settled.length} apostas): ${text}`;
  } catch {
    // mantém o summary determinístico
  }

  return {
    totalBets: settled.length,
    overallHitRate,
    bestMarket,
    worstMarket,
    summary,
  };
}
