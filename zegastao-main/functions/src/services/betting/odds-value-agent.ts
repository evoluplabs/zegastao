// Agente 8: Value betting — analisa odds de múltiplas casas e calcula edge.
import { OddsEvent, OddsMarket } from './sports-api';
import { impliedProbability, houseMargin } from './kelly';

export interface ValueMarket {
  market: string;       // Ex: "1X2", "BTTS", "Over 2.5"
  selection: string;    // Ex: "Flamengo", "Sim", "Over"
  bestOdd: number;
  worstOdd: number;
  impliedProb: number;  // % implícita pela melhor odd
  marginPct: number;    // Margem da casa
  bookmaker: string;    // Casa com melhor odd
  hasValue: boolean;    // Edge identificado
}

export interface OddsAnalysis {
  markets: ValueMarket[];
  bestValue: string;    // Resumo textual do melhor mercado
  topPick: ValueMarket | null;
}

function parseMarkets(event: OddsEvent): ValueMarket[] {
  const markets: ValueMarket[] = [];

  for (const bk of event.bookmakers) {
    for (const mkt of bk.markets) {
      for (const outcome of mkt.outcomes) {
        const existing = markets.find(
          (m) => m.market === mkt.key && m.selection === outcome.name
        );
        if (!existing) {
          markets.push({
            market: mkt.key,
            selection: outcome.name,
            bestOdd: outcome.price,
            worstOdd: outcome.price,
            impliedProb: parseFloat((impliedProbability(outcome.price) * 100).toFixed(1)),
            marginPct: 0,
            bookmaker: bk.title,
            hasValue: false,
          });
        } else if (outcome.price > existing.bestOdd) {
          existing.bestOdd = outcome.price;
          existing.bookmaker = bk.title;
          existing.impliedProb = parseFloat((impliedProbability(outcome.price) * 100).toFixed(1));
        } else if (outcome.price < existing.worstOdd) {
          existing.worstOdd = outcome.price;
        }
      }
    }
  }

  // Calcular margem por mercado
  const marketKeys = [...new Set(markets.map((m) => m.market))];
  for (const key of marketKeys) {
    const group = markets.filter((m) => m.market === key);
    const margin = houseMargin(group.map((m) => m.bestOdd));
    group.forEach((m) => (m.marginPct = margin));
    // Value = margem baixa (< 5%) = melhor para o apostador
    if (margin < 5) group.forEach((m) => (m.hasValue = true));
  }

  return markets;
}

export function runOddsValueAgent(events: OddsEvent[], homeTeam: string, awayTeam: string): OddsAnalysis {
  const match = events.find(
    (e) =>
      e.home_team.toLowerCase().includes(homeTeam.toLowerCase()) ||
      e.away_team.toLowerCase().includes(awayTeam.toLowerCase())
  );

  if (!match) {
    return {
      markets: [],
      bestValue: 'Odds não encontradas para este jogo. Verifique o nome dos times e a liga.',
      topPick: null,
    };
  }

  const markets = parseMarkets(match);
  const valueMkts = markets.filter((m) => m.hasValue);
  const topPick = valueMkts.sort((a, b) => b.bestOdd - a.bestOdd)[0] ?? null;

  const bestValue = topPick
    ? `Melhor edge: ${topPick.selection} (${topPick.market}) @ ${topPick.bestOdd} na ${topPick.bookmaker}. Margem da casa: ${topPick.marginPct}%. Probabilidade implícita: ${topPick.impliedProb}%.`
    : `Margem das casas está alta (>${markets[0]?.marginPct ?? '?'}%). Não há edge claro neste jogo.`;

  return { markets, bestValue, topPick };
}
