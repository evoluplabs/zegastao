// Analisa um print da Betano (slip extraído) em candidatos avaliados por valor,
// cobrindo TODOS os mercados — gols, escanteios, cartões, finalizações, faltas.
// A odd vem do print (verdade da Betano); a probabilidade vem do motor (Poisson
// multi-mercado) alimentado por médias reais (stats-multi) e ajustado pelo
// contexto (context-agent). Determinístico — nenhum número sai de IA.

import { ExtractedSlip, ExtractedMarket } from './odds-extractor';
import { MarketAverages } from './stats-multi';
import { MarketMultipliers } from './context-agent';
import { estimateTotalLambda, poissonOverUnder, MarketFamily } from './engine/markets';
import { impliedProb, devig } from './engine/devig';
import { assess, blendProb } from './engine/value';
import { Candidate } from './engine/multiples';

// Famílias modeladas por médias de estatística (não-gol).
const STAT_FAMILIES: MarketFamily[] = ['corners', 'cards', 'shots', 'fouls'];

function avgFor(avgs: MarketAverages, family: MarketFamily): number {
  switch (family) {
    case 'corners': return avgs.corners;
    case 'cards': return avgs.cards;
    case 'shots': return avgs.shots;
    case 'fouls': return avgs.fouls;
    default: return 0;
  }
}

interface OU { side: 'over' | 'under'; line: number; }

/** Lê "Mais de 9.5" / "Over 9.5" / "Menos de 2.5" / "Under 2.5" → lado + linha. */
export function parseOverUnder(selection: string): OU | null {
  const s = selection.toLowerCase();
  const over = /\b(mais de|acima de|over|\+)\b/.test(s);
  const under = /\b(menos de|abaixo de|under|\-)\b/.test(s);
  const m = s.match(/(\d{1,2}[.,]\d)/);
  if (!m) return null;
  const line = parseFloat(m[1].replace(',', '.'));
  if (!isFinite(line)) return null;
  if (over && !under) return { side: 'over', line };
  if (under && !over) return { side: 'under', line };
  return null;
}

/**
 * Para cada mercado do print que sabemos modelar, calcula a prob. do modelo,
 * mistura com a prob. implícita da odd (de-vigada quando há over+under do mesmo
 * lado) e devolve um Candidate com EV. Mercados que não sabemos modelar (other)
 * são ignorados com honestidade (não chutamos número).
 */
export function analyzeExtractedSlip(params: {
  slip: ExtractedSlip;
  fixtureId: number;
  homeAvgs: MarketAverages;
  awayAvgs: MarketAverages;
  context: MarketMultipliers;
}): Candidate[] {
  const { slip, fixtureId, homeAvgs, awayAvgs, context } = params;
  const home = slip.homeTeam || 'Mandante';
  const away = slip.awayTeam || 'Visitante';
  const league = slip.league || '';
  const base = { fixtureId, homeTeam: home, awayTeam: away, league, kickoff: '' };

  // Probabilidade de mercado de-vigada por (família+linha): se o print traz over
  // E under da mesma linha, removemos a margem; senão usamos a implícita crua.
  const devigByKey = buildDevigMap(slip.markets);

  const out: Candidate[] = [];
  for (const mk of slip.markets) {
    const family = mk.market as MarketFamily;
    if (!STAT_FAMILIES.includes(family)) continue; // gols/btts/h2h ficam no pipeline de gols
    if (!mk.odd || mk.odd <= 1) continue;
    const ou = parseOverUnder(mk.selection);
    if (!ou) continue;

    const mult = context[family] ?? 1;
    const lambda = estimateTotalLambda(avgFor(homeAvgs, family), avgFor(awayAvgs, family), mult);
    const probs = poissonOverUnder(lambda, [ou.line]);
    const key = ou.line.toFixed(1);
    const modelProb = ou.side === 'over' ? probs.over[key] : probs.under[key];
    if (modelProb === undefined) continue;

    const marketProb = devigByKey.get(`${family}_${key}_${ou.side}`) ?? impliedProb(mk.odd);
    const blended = blendProb(modelProb, marketProb);
    const a = assess(blended, mk.odd);
    out.push({
      ...base,
      market: family,
      selection: mk.selection,
      modelProb: a.modelProb,
      marketOdd: a.marketOdd,
      fairOdd: a.fairOdd,
      ev: a.ev,
    });
  }
  return out;
}

/** Mapa de prob. de mercado de-vigada por família+linha+lado, quando há o par. */
function buildDevigMap(markets: ExtractedMarket[]): Map<string, number> {
  const map = new Map<string, number>();
  const groups = new Map<string, { over?: number; under?: number }>();
  for (const mk of markets) {
    const family = mk.market as MarketFamily;
    if (!STAT_FAMILIES.includes(family)) continue;
    const ou = parseOverUnder(mk.selection);
    if (!ou || !mk.odd || mk.odd <= 1) continue;
    const gk = `${family}_${ou.line.toFixed(1)}`;
    const g = groups.get(gk) || {};
    g[ou.side] = mk.odd;
    groups.set(gk, g);
  }
  for (const [gk, g] of groups) {
    if (g.over && g.under) {
      const [po, pu] = devig([g.over, g.under]);
      map.set(`${gk}_over`, po);
      map.set(`${gk}_under`, pu);
    }
  }
  return map;
}
