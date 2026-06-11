// Agente de Contexto da Partida: analisa importância do jogo e o que isso significa
// para as apostas. "Malandragem brasileira" — leva em conta se o jogo é decisivo,
// morno ou já definido para ajustar a análise com inteligência de mercado.
import Anthropic from '@anthropic-ai/sdk';
import { fetchFootballJSON } from './sports-api';

const client = new Anthropic();

export interface MatchContextOutput {
  stakeLevel: 'decisive' | 'important' | 'neutral' | 'irrelevant';
  homeStanding?: number;
  awayStanding?: number;
  tacticalProfile: string;
  bettingImplications: string;
  confidenceMultiplier: number; // 0.7–1.2
  summary: string; // texto pt-BR para o Consolidador
}

interface StandingsEntry {
  rank: number;
  team: { id: number; name: string };
  points: number;
  goalsDiff: number;
  group?: string;
}

async function getStandings(leagueId: number, season: number): Promise<StandingsEntry[]> {
  const url = `/standings?league=${leagueId}&season=${season}`;
  interface Resp {
    response: {
      league: {
        standings: StandingsEntry[][];
      };
    }[];
  }
  const data = await fetchFootballJSON<Resp>(url);
  const groups = data.response[0]?.league?.standings ?? [];
  return groups.flat();
}

function determineStakeLevel(
  homeRank: number | undefined,
  awayRank: number | undefined,
  totalTeams: number
): 'decisive' | 'important' | 'neutral' | 'irrelevant' {
  if (!homeRank || !awayRank) return 'neutral';
  const topZone = 4;
  const relegationZone = totalTeams - 2;
  const midZone = Math.floor(totalTeams * 0.35);

  const homeInTitle = homeRank <= topZone;
  const awayInTitle = awayRank <= topZone;
  const homeInRelegation = homeRank >= relegationZone;
  const awayInRelegation = awayRank >= relegationZone;
  const homeIrrelevant = homeRank > midZone && homeRank < relegationZone;
  const awayIrrelevant = awayRank > midZone && awayRank < relegationZone;

  if ((homeInTitle && awayInTitle) || (homeInRelegation && awayInRelegation)) return 'decisive';
  if (homeInTitle || awayInTitle || homeInRelegation || awayInRelegation) return 'important';
  if (homeIrrelevant && awayIrrelevant) return 'irrelevant';
  return 'neutral';
}

export async function runMatchContextAgent(
  homeTeam: string,
  homeTeamId: number,
  awayTeam: string,
  awayTeamId: number,
  leagueId: number,
  date: string
): Promise<MatchContextOutput> {
  const season = new Date(date).getFullYear();

  let standings: StandingsEntry[] = [];
  try {
    standings = await getStandings(leagueId, season);
  } catch {
    // Standings not available — proceed without them
  }

  const totalTeams = standings.length;
  const homeEntry = standings.find((s) => s.team.id === homeTeamId || s.team.name.toLowerCase().includes(homeTeam.toLowerCase()));
  const awayEntry = standings.find((s) => s.team.id === awayTeamId || s.team.name.toLowerCase().includes(awayTeam.toLowerCase()));

  const stakeLevel = determineStakeLevel(homeEntry?.rank, awayEntry?.rank, totalTeams);

  const contextData = standings.length > 0
    ? `Tabela: ${homeTeam} = ${homeEntry?.rank ?? '?'}º lugar (${homeEntry?.points ?? '?'} pts), ${awayTeam} = ${awayEntry?.rank ?? '?'}º lugar (${awayEntry?.points ?? '?'} pts). Total de equipes: ${totalTeams}.`
    : 'Tabela não disponível — analise com base no contexto geral do campeonato.';

  const prompt = `Analise a importância desta partida para apostas esportivas:

JOGO: ${homeTeam} x ${awayTeam}
${contextData}

Classifique o jogo em uma categoria:
- "decisive": Jogo que DECIDE algo (título, vaga em copa, rebaixamento direto) — alta intensidade
- "important": Jogo relevante (luta por posição, semifinal, jogos que afetam a tabela) — motivação alta
- "neutral": Jogo comum de meio de tabela — sem pressão extra
- "irrelevant": Jogo sem nada em jogo (time já rebaixado/campeão, reservas esperados)

Com base na classificação, analise as implicações para apostas:
- Jogos decisivos: alta probabilidade de lances de falta, pênaltis, mais gols em situações de desespero, menos rotação
- Jogos importantes: equipes completas, esforço máximo, partida competitiva
- Jogos neutros: padrão esperado de forma e H2H
- Jogos irrelevantes: rotação de elenco, menos intensidade, menos gols esperados

Responda em JSON:
{
  "tacticalProfile": "descrição em 2-3 frases do perfil tático esperado",
  "bettingImplications": "o que isso significa para apostas em 2-3 frases",
  "confidenceMultiplier": 1.0
}

confidenceMultiplier: 1.1 se jogos decisivos favorecem análise quantitativa, 0.85 se imprevisível (decisivo com placar amplo, irrelevante com rotação).`;

  let tacticalProfile = 'Jogo regular de campeonato. Ambas as equipes devem atuar com elenco principal.';
  let bettingImplications = 'Análise baseada em forma e H2H histórico. Sem fatores contextuais extraordinários.';
  let confidenceMultiplier = 1.0;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
      system: 'Você é especialista em análise de apostas esportivas. Responde APENAS com JSON válido.',
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      tacticalProfile = parsed.tacticalProfile || tacticalProfile;
      bettingImplications = parsed.bettingImplications || bettingImplications;
      confidenceMultiplier = typeof parsed.confidenceMultiplier === 'number'
        ? Math.min(1.2, Math.max(0.7, parsed.confidenceMultiplier))
        : 1.0;
    }
  } catch {
    // Keep defaults
  }

  const standingsSummary = homeEntry && awayEntry
    ? `${homeTeam} (${homeEntry.rank}º) x ${awayTeam} (${awayEntry.rank}º na tabela)`
    : '';

  const summary = `CONTEXTO DA PARTIDA [${stakeLevel.toUpperCase()}]:\n${standingsSummary}\n${tacticalProfile}\nImplicações: ${bettingImplications}`;

  return {
    stakeLevel,
    homeStanding: homeEntry?.rank,
    awayStanding: awayEntry?.rank,
    tacticalProfile,
    bettingImplications,
    confidenceMultiplier,
    summary,
  };
}
