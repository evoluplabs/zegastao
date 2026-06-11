// Orquestrador central: dispara todos os agentes em paralelo e consolida.
import { runFormAgent } from './form-agent';
import { runH2HAgent } from './h2h-agent';
import { runOddsValueAgent, OddsAnalysis } from './odds-value-agent';
import { runStrategyAgent } from './strategy-agent';
import { consolidate, BettingAnalysis } from './consolidator';
import { searchFixture, getOddsForMatch } from './sports-api';

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
}

export async function orchestrate(input: OrchestrationInput): Promise<BettingAnalysis> {
  const {
    homeTeam, awayTeam, homeTeamId, awayTeamId,
    league, leagueSportKey, date,
    weeklyBudget, weeklyStaked,
  } = input;

  // Fase 1: buscar dados brutos em paralelo
  const [formResult, h2hResult, oddsEvents] = await Promise.allSettled([
    runFormAgent(homeTeamId, homeTeam, awayTeamId, awayTeam),
    runH2HAgent(homeTeamId, homeTeam, awayTeamId, awayTeam),
    getOddsForMatch(leagueSportKey),
  ]);

  const formAnalysis = formResult.status === 'fulfilled' ? formResult.value : 'Dados de forma não disponíveis.';
  const h2hAnalysis = h2hResult.status === 'fulfilled' ? h2hResult.value : 'Dados H2H não disponíveis.';
  const events = oddsEvents.status === 'fulfilled' ? oddsEvents.value : [];

  // Fase 2: análise de odds e estratégia em paralelo
  const oddsAnalysis: OddsAnalysis = runOddsValueAgent(events, homeTeam, awayTeam);

  const strategy = await runStrategyAgent(
    homeTeam, awayTeam,
    formAnalysis, h2hAnalysis,
    oddsAnalysis.markets, oddsAnalysis.bestValue
  );

  // Fase 3: consolidar com Sonnet
  return consolidate({
    homeTeam, awayTeam, league, date,
    formAnalysis,
    h2hAnalysis,
    oddsValueSummary: oddsAnalysis.bestValue,
    strategy,
    availableMarkets: oddsAnalysis.markets,
    weeklyBudget,
    weeklyStaked,
  });
}
