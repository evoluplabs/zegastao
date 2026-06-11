// Agente Consolidador: Claude Sonnet recebe outputs de todos os agentes e gera análise final.
import Anthropic from '@anthropic-ai/sdk';
import { StrategyOutput } from './strategy-agent';
import { ValueMarket } from './odds-value-agent';
import { suggestedStake } from './kelly';

const client = new Anthropic();

export interface BettingAnalysis {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;

  // Outputs de agentes
  agentOutputs: {
    form: string;
    h2h: string;
    oddsValue: string;
    strategy: StrategyOutput;
    injury?: string;         // InjuryAgent
    stats?: string;          // StatsAgent
    matchContext?: string;   // MatchContextAgent
    historyInsight?: string; // BetHistoryAgent
    risk?: string;           // RiskManagerAgent
  };

  // Recomendação final
  finalAnalysis: string;
  confidenceScore: number;
  recommendedMarket: string;
  recommendedSelection: string;
  recommendedOdd: number;
  minimumOdd: number;
  alternativeMarket?: string;
  alternativeSelection?: string;
  alternativeOdd?: number;
  suggestedStake: number;
  betType: 'simples' | 'multipla';

  // Mercados disponíveis
  availableMarkets: ValueMarket[];

  disclaimer: string;
}

export async function consolidate(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  formAnalysis: string;
  h2hAnalysis: string;
  oddsValueSummary: string;
  strategy: StrategyOutput;
  availableMarkets: ValueMarket[];
  weeklyBudget: number;
  weeklyStaked: number;
  injurySummary?: string;
  statsSummary?: string;
  matchContextSummary?: string;
  historySummary?: string;
  riskSummary?: string;
  finalStake?: number;
}): Promise<BettingAnalysis> {
  const {
    homeTeam, awayTeam, league, date,
    formAnalysis, h2hAnalysis, oddsValueSummary,
    strategy, availableMarkets, weeklyBudget, weeklyStaked,
    injurySummary, statsSummary, matchContextSummary, historySummary, riskSummary,
    finalStake,
  } = params;

  // Stake final: o RiskManager tem prioridade; cai para o Kelly direto se ausente
  const stake = typeof finalStake === 'number'
    ? finalStake
    : suggestedStake(strategy.confidenceScore / 100, strategy.primaryOdd || 1.5, weeklyBudget, weeklyStaked);

  // Seções extras só entram no prompt se o agente correspondente produziu dados
  const extraSections = [
    injurySummary ? `\nDESFALQUES:\n${injurySummary}` : '',
    statsSummary ? `\nESTATÍSTICAS:\n${statsSummary}` : '',
    matchContextSummary ? `\nCONTEXTO DA PARTIDA:\n${matchContextSummary}` : '',
    historySummary ? `\nHISTÓRICO DO USUÁRIO:\n${historySummary}` : '',
    riskSummary ? `\nGESTÃO DE RISCO:\n${riskSummary}` : '',
  ].join('');

  const prompt = `Você é o Zé Apostador, analista de apostas esportivas especialista em value betting.
Produza uma análise final do jogo ${homeTeam} vs ${awayTeam} (${league}, ${date}).

DADOS DOS AGENTES:

FORMA RECENTE:
${formAnalysis}

HISTÓRICO H2H:
${h2hAnalysis}

VALUE DAS ODDS:
${oddsValueSummary}
${extraSections}

ESTRATÉGIA RECOMENDADA:
Mercado: ${strategy.primaryMarket} | Seleção: ${strategy.primarySelection} | Odd: ${strategy.primaryOdd}
Confiança: ${strategy.confidenceScore}% | Tipo: ${strategy.betType}
Raciocínio: ${strategy.reasoning}

Gere uma análise narrativa em português (3-4 parágrafos, máx 350 palavras) que:
1. Contextualize o confronto e o momento dos times
2. Explique POR QUÊ a recomendação faz sentido (cruzando todos os dados, incluindo desfalques, contexto da partida e o histórico do usuário quando disponíveis)
3. Mencione os riscos e o que poderia invalidar a análise
4. Finalize com a recomendação clara

Seja honesto sobre incertezas. Não prometa resultados.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
    system: 'Você é um analista de apostas esportivas experiente e honesto. Responde em português brasileiro.',
  });

  const finalAnalysis = response.content[0].type === 'text' ? response.content[0].text : '';

  return {
    homeTeam,
    awayTeam,
    league,
    date,
    agentOutputs: {
      form: formAnalysis,
      h2h: h2hAnalysis,
      oddsValue: oddsValueSummary,
      strategy,
      injury: injurySummary,
      stats: statsSummary,
      matchContext: matchContextSummary,
      historyInsight: historySummary,
      risk: riskSummary,
    },
    finalAnalysis,
    confidenceScore: strategy.confidenceScore,
    recommendedMarket: strategy.primaryMarket,
    recommendedSelection: strategy.primarySelection,
    recommendedOdd: strategy.primaryOdd,
    minimumOdd: strategy.minimumOdd,
    alternativeMarket: strategy.alternativeMarket ?? undefined,
    alternativeSelection: strategy.alternativeSelection ?? undefined,
    alternativeOdd: strategy.alternativeOdd ?? undefined,
    suggestedStake: stake,
    betType: strategy.betType,
    availableMarkets,
    disclaimer: 'Esta análise é educacional e não garante resultados. Apostas esportivas envolvem risco de perda total do valor apostado. Aposte com responsabilidade e dentro do seu limite semanal.',
  };
}
