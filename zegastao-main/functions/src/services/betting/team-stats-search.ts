// Resolução de médias de gols por time quando não há teamId real (print-first flow).
// Código antes de IA: tenta cache → usa Claude (conhecimento histórico de seleções)
// como estimador estatístico. Copa 2026 usa os dados históricos mais recentes do modelo.
// Custo: 1 chamada Claude por par de times/dia (sem Vision, max_tokens baixo).

import Anthropic from '@anthropic-ai/sdk';
import { Firestore, Timestamp } from 'firebase-admin/firestore';

export interface TeamGoalAverages {
  scored: number;
  conceded: number;
}

export interface TeamStatsResult {
  home: TeamGoalAverages;
  away: TeamGoalAverages;
  source: 'cache' | 'inferred' | 'default';
}

const CACHE_HOURS = 24;
const DEFAULT: TeamGoalAverages = { scored: 1.2, conceded: 1.2 };

/**
 * Retorna médias de gols marcados/sofridos por jogo para o par de times.
 * Quando teamId=0 (print-first), esta função fornece priors realistas para o
 * motor Poisson em vez dos padrões 1.2/1.2 (que assumem igualdade absoluta).
 */
export async function resolveTeamAverages(
  db: Firestore,
  homeTeam: string,
  awayTeam: string,
  league: string,
): Promise<TeamStatsResult> {
  // Cache em Firestore (betting_cache) — mesma coleção do Waze das Odds.
  const key = `team_avgs_${norm(homeTeam)}_${norm(awayTeam)}`;
  const ref = db.collection('betting_cache').doc(key);
  try {
    const snap = await ref.get();
    if (snap.exists) {
      const d = snap.data()!;
      const age = Date.now() - ((d.fetchedAt as Timestamp)?.toMillis() ?? 0);
      if (age < CACHE_HOURS * 3600 * 1000 && d.home && d.away) {
        return { home: d.home as TeamGoalAverages, away: d.away as TeamGoalAverages, source: 'cache' };
      }
    }
  } catch { /* cache é best-effort */ }

  // Inferência via Claude — usa conhecimento histórico de seleções/clubes.
  // Não é web search (mais simples e determinístico); valores baseados em
  // desempenho em Copas anteriores e competições de nível equivalente.
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Estime, com base no histórico recente (últimas 2 Copas do Mundo e eliminatórias), as médias de gols por jogo de "${homeTeam}" (mandante) e "${awayTeam}" (visitante) em "${league}". Considere:
- Gols marcados por jogo (média, últimas 10–15 partidas em competições de nível similar)
- Gols sofridos por jogo (idem)
Responda APENAS com JSON válido (sem texto extra):
{"home":{"scored":X.X,"conceded":X.X},"away":{"scored":X.X,"conceded":X.X}}`,
      }],
    });

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    const result: TeamStatsResult = {
      home: {
        scored: clamp(parsed.home?.scored, 0.3, 3.5),
        conceded: clamp(parsed.home?.conceded, 0.3, 3.0),
      },
      away: {
        scored: clamp(parsed.away?.scored, 0.3, 3.5),
        conceded: clamp(parsed.away?.conceded, 0.3, 3.0),
      },
      source: 'inferred',
    };

    // Salva no cache (best-effort).
    ref.set({ home: result.home, away: result.away, fetchedAt: Timestamp.now() }).catch(() => {});
    return result;
  } catch {
    return { home: DEFAULT, away: DEFAULT, source: 'default' };
  }
}

function clamp(v: unknown, min: number, max: number): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return isFinite(n) ? Math.max(min, Math.min(max, n)) : (min + max) / 2;
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
