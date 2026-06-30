// Tier 1 da pirâmide de extração: parser por REGEX sobre o texto de OCR de um
// print da Betano (estilo statement-extractor.ts, zero IA). Reconhece os mercados
// e odds. Se a confiança vier baixa, o chamador cai para o Tier 2 (Claude Vision).
// 100% determinístico e testável.

export interface ExtractedMarket {
  market: string;    // chave: h2h | totals | btts | corners | cards | shots | fouls | other
  selection: string; // texto da seleção (ex: "Mais de 9.5", "Flamengo", "Sim")
  odd: number;
}

export interface ExtractedSlip {
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  markets: ExtractedMarket[];
  confidence: number; // 0-1 — abaixo de MIN_CONFIDENCE, use o Vision
  superOdds?: boolean; // print traz "SuperOdds"/"SO" — sinal forte (turbinado), não verdade absoluta
}

export const MIN_CONFIDENCE = 0.6;

function norm(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

// Detecta a família de mercado a partir de um cabeçalho de seção.
function marketOf(line: string): string | null {
  const l = norm(line);
  if (/\bescanteio/.test(l)) return 'corners';
  if (/\bcart(a|oe)/.test(l)) return 'cards';
  if (/\bchute/.test(l)) return 'shots';
  if (/\bfalta/.test(l)) return 'fouls';
  if (/ambas (as )?(marcam|equipes)|ambos marcam/.test(l)) return 'btts';
  if (/total de gols|mais\/menos|over\/under|gols?\b/.test(l)) return 'totals';
  if (/resultado|vencedor|1x2|match odds|moneyline/.test(l)) return 'h2h';
  return null;
}

const ODD_RE = /(?<![\d.,])(\d{1,3}[.,]\d{2})(?![\d])/g;

function toOdd(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'));
  if (!isFinite(n) || n < 1.01 || n > 1000) return null;
  return n;
}

// Tenta achar "Time A x Time B" no topo do print.
function findTeams(text: string): { home?: string; away?: string } {
  const m = text.match(/([A-Za-zÀ-ú][\w .'-]{1,30}?)\s*(?:x|vs\.?|-)\s*([A-Za-zÀ-ú][\w .'-]{1,30})/i);
  if (m) return { home: m[1].trim(), away: m[2].trim() };
  return {};
}

/**
 * Faz o parse de um texto de OCR de print da Betano em mercados estruturados.
 * Varre linha a linha: cabeçalhos definem o mercado corrente; odds na linha viram
 * seleções com o texto que as precede.
 */
export function parseBetanoText(text: string): ExtractedSlip {
  if (!text || text.trim().length < 3) {
    return { markets: [], confidence: 0 };
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const { home, away } = findTeams(text);
  // SuperOdds: a Betano turbina algumas odds ("SuperOdds"/"SO"). É sinal forte de
  // valor, mas NÃO verdade absoluta — captado para futura recalibração de λ.
  const superOdds = /\bsuper\s*odds?\b|\bsuperodds?\b/i.test(text);

  const markets: ExtractedMarket[] = [];
  let current = 'other';
  let plausibleOdds = 0;
  let totalOddTokens = 0;

  for (const line of lines) {
    const header = marketOf(line);
    if (header) current = header;

    // Coleta odds da linha
    ODD_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    let lastIdx = 0;
    while ((match = ODD_RE.exec(line)) !== null) {
      totalOddTokens += 1;
      const odd = toOdd(match[1]);
      if (odd === null) continue;
      plausibleOdds += 1;
      // Seleção = trecho antes da odd (ou o cabeçalho do mercado)
      let selection = line.slice(lastIdx, match.index).replace(/[|·:>-]+$/, '').trim();
      if (!selection) selection = current === 'other' ? 'Seleção' : line.trim();
      lastIdx = match.index + match[1].length;
      markets.push({ market: current, selection: cleanSel(selection), odd });
    }
  }

  // Confiança heurística
  let confidence = 0.2;
  if (home && away) confidence += 0.3;
  const distinctMarkets = new Set(markets.map((m) => m.market)).size;
  if (distinctMarkets >= 2) confidence += 0.2;
  if (markets.length >= 3) confidence += 0.15;
  if (totalOddTokens > 0 && plausibleOdds / totalOddTokens > 0.8) confidence += 0.15;
  confidence = Math.min(1, Math.round(confidence * 100) / 100);

  return { homeTeam: home, awayTeam: away, markets, confidence, superOdds };
}

function cleanSel(s: string): string {
  return s.replace(/\s{2,}/g, ' ').slice(0, 40).trim();
}
