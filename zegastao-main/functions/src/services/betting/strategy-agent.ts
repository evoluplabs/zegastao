// Agente 9: Com base nos outputs dos outros agentes, sugere mercados e tipo de aposta.
import Anthropic from '@anthropic-ai/sdk';
import { ValueMarket } from './odds-value-agent';

const client = new Anthropic();

export interface StrategyOutput {
  primaryMarket: string;
  primarySelection: string;
  primaryOdd: number;
  alternativeMarket?: string;
  alternativeSelection?: string;
  alternativeOdd?: number;
  betType: 'simples' | 'multipla';
  confidenceScore: number; // 0-100
  minimumOdd: number;
  reasoning: string;
}

export async function runStrategyAgent(
  homeTeam: string,
  awayTeam: string,
  formAnalysis: string,
  h2hAnalysis: string,
  oddsMarkets: ValueMarket[],
  oddsValueSummary: string,
): Promise<StrategyOutput> {
  const marketsSummary = oddsMarkets
    .slice(0, 12)
    .map((m) => `${m.market} | ${m.selection} | Odd: ${m.bestOdd} | Prob implícita: ${m.impliedProb}% | Casa: ${m.bookmaker}`)
    .join('\n');

  const prompt = `Você é um especialista em value betting. Analise todas as informações abaixo sobre o jogo ${homeTeam} vs ${awayTeam} e recomende a melhor aposta.

FORMA RECENTE:
${formAnalysis}

HISTÓRICO H2H:
${h2hAnalysis}

ODDS DISPONÍVEIS:
${marketsSummary || 'Não disponível'}

ANÁLISE DE VALUE:
${oddsValueSummary}

Responda SOMENTE com um JSON válido no formato:
{
  "primaryMarket": "nome do mercado (ex: h2h, totals, btts)",
  "primarySelection": "seleção recomendada (ex: Flamengo, Over 2.5, Sim)",
  "primaryOdd": 1.85,
  "alternativeMarket": "mercado alternativo ou null",
  "alternativeSelection": "seleção alternativa ou null",
  "alternativeOdd": 1.60,
  "betType": "simples",
  "confidenceScore": 68,
  "minimumOdd": 1.75,
  "reasoning": "explicação em 2-3 frases do raciocínio"
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
    system: 'Você responde APENAS com JSON válido, sem markdown, sem texto adicional.',
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    return JSON.parse(text) as StrategyOutput;
  } catch {
    return {
      primaryMarket: 'h2h',
      primarySelection: homeTeam,
      primaryOdd: 0,
      betType: 'simples',
      confidenceScore: 0,
      minimumOdd: 1.5,
      reasoning: 'Não foi possível gerar estratégia automaticamente.',
    };
  }
}
