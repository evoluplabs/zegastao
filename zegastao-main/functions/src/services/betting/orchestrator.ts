// Orquestrador central: dispara todos os agentes em paralelo e consolida.
// Pipeline de 9 agentes especialistas + Consolidador.
import { Firestore } from 'firebase-admin/firestore';
import { runFormAgent } from './form-agent';
import { runH2HAgent } from './h2h-agent';
import { runOddsValueAgent, OddsAnalysis } from './odds-value-agent';
import { runStrategyAgent } from './strategy-agent';
import { runInjuryAgent } from './injury-agent';
import { runStatsAgent } from './stats-agent';
import { runMatchContextAgent } from './match-context-agent';
import { runBetHistoryAgent, BetHistoryInsight } from './bet-history-agent';
import { runRiskManagerAgent } from './risk-manager-agent';
import { consolidate, BettingAnalysis } from './consolidator';
import { getOddsForMatch } from './sports-api';

export interface OrchestrationInput {
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  league: string;
  leagueSportKey: string; // ex: 'soccer_brazil_serie_a'
  date: string;            // YYYY-MM-DD
  weeklyBudget: number;
  weeklyStaked: number;
  leagueId?: number;       // para MatchContextAgent (API-Football league id)
  userId?: string;         // para BetHistoryAgent
  db?: Firestore;          // instância Admin Firestore
  financialPhase?: string; // para RiskManagerAgent
}

export async function orchestrate(input: OrchestrationInput): Promise<BettingAnalysis> {
  const {
    homeTeam, awayTeam, homeTeamId, awayTeamId,
    league, leagueSportKey, date,
    weeklyBudget, weeklyStaked,
    leagueId, userId, db, financialPhase,
  } = input;

  // Fase 1: coleta de dados em paralelo
  const [formResult, h2hResult, injuryResult, matchCtxResult, historyResult] = await Promise.allSettled([
    runFormAgent(homeTeamId, homeTeam, awayTeamId, awayTeam),
    runH2HAgent(homeTeamId, homeTeam, awayTeamId, awayTeam),
    runInjuryAgent(homeTeamId, homeTeam, awayTeamId, awayTeam),
    leagueId
      ? runMatchContextAgent(homeTeam, homeTeamId, awayTeam, awayTeamId, leagueId, date)
      : Promise.resolve(null),
    userId && db ? runBetHistoryAgent(userId, db) : Promise.resolve(null),
  ]);

  const formAnalysis = formResult.status === 'fulfilled' ? formResult.value : 'Dados de forma não disponíveis.';
  const h2hAnalysis = h2hResult.status === 'fulfilled' ? h2hResult.value : 'Dados H2H não disponíveis.';
  const injury = injuryResult.status === 'fulfilled' ? injuryResult.value : null;
  const matchCtx = matchCtxResult.status === 'fulfilled' ? matchCtxResult.value : null;
  const history: BetHistoryInsight | null = historyResult.status === 'fulfilled' ? historyResult.value : null;

  // Fase 2: estatísticas + odds em paralelo
  const [statsResult, oddsResult] = await Promise.allSettled([
    runStatsAgent(homeTeamId, homeTeam, awayTeamId, awayTeam),
    getOddsForMatch(leagueSportKey),
  ]);

  const stats = statsResult.status === 'fulfilled' ? statsResult.value : null;
  const events = oddsResult.status === 'fulfilled' ? oddsResult.value : [];

  const oddsAnalysis: OddsAnalysis = runOddsValueAgent(events, homeTeam, awayTeam);

  // Fase 3: estratégia consome todos os sinais
  const strategy = await runStrategyAgent(
    homeTeam, awayTeam,
    formAnalysis, h2hAnalysis,
    oddsAnalysis.markets, oddsAnalysis.bestValue
  );

  // Ajuste de confiança com base nos agentes contextuais
  let adj = strategy.confidenceScore;
  if (matchCtx) adj = Math.round(adj * matchCtx.confidenceMultiplier);
  if (injury) adj = Math.round(adj * (1 + injury.confidenceImpact));
  if (history && history.bestMarket && history.bestMarket === strategy.primaryMarket) adj = adj + 5;
  if (history && history.worstMarket && history.worstMarket === strategy.primaryMarket) adj = adj - 10;
  adj = Math.min(95, Math.max(5, adj));
  strategy.confidenceScore = adj;

  // Gestor de risco define o stake final
  const risk = runRiskManagerAgent({
    confidenceScore: adj,
    recommendedOdd: strategy.primaryOdd || 1.5,
    weeklyBudget,
    weeklyStaked,
    financialPhase,
  });

  // Fase 4: consolidar com Sonnet
  return consolidate({
    homeTeam, awayTeam, league, date,
    formAnalysis,
    h2hAnalysis,
    oddsValueSummary: oddsAnalysis.bestValue,
    strategy,
    availableMarkets: oddsAnalysis.markets,
    weeklyBudget,
    weeklyStaked,
    injurySummary: injury?.summary,
    statsSummary: stats?.summary,
    matchContextSummary: matchCtx?.summary,
    historySummary: history?.summary,
    riskSummary: risk.summary,
    finalStake: risk.recommendedStake,
  });
}
