// Agente 2: Histórico de confrontos diretos (Head to Head).
// Fallback Copa/print-first: quando teamId=0 (sem ID no API-Football), usa Claude
// com conhecimento histórico para estimar o H2H entre seleções/clubes.
import Anthropic from '@anthropic-ai/sdk';
import { getH2H, APIFootballFixture } from './sports-api';

const client = new Anthropic();

function summarizeH2H(fixtures: APIFootballFixture[], homeTeamId: number): string {
  if (!fixtures.length) return 'Sem dados de confronto direto';
  return fixtures.map((f) => {
    const homeGoals = f.goals.home ?? 0;
    const awayGoals = f.goals.away ?? 0;
    const homeIsTarget = f.teams.home.id === homeTeamId;
    const result = homeGoals > awayGoals
      ? (homeIsTarget ? 'Vitória mandante' : 'Vitória visitante')
      : homeGoals < awayGoals
        ? (homeIsTarget ? 'Derrota mandante' : 'Derrota visitante')
        : 'Empate';
    return `${f.teams.home.name} ${homeGoals}x${awayGoals} ${f.teams.away.name} (${result})`;
  }).join('\n');
}

async function inferH2HViaClaude(homeTeam: string, awayTeam: string, league: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: `Com base no histórico de confrontos diretos entre "${homeTeam}" e "${awayTeam}" em ${league} (Copas do Mundo anteriores, eliminatórias ou nível equivalente), responda em máx 120 palavras com:
- Número aproximado de vitórias, empates e derrotas de cada lado
- Padrão de gols nesses confrontos (jogos com muitos ou poucos gols?)
- Vantagem psicológica/histórica de algum time
- Relevância do histórico para o confronto atual

Responda em português brasileiro de forma objetiva.`,
    }],
    system: 'Você é um analista esportivo especializado em futebol internacional. Use seu amplo conhecimento histórico sobre confrontos entre seleções e clubes.',
  });
  return response.content[0].type === 'text'
    ? response.content[0].text
    : 'Análise H2H não disponível';
}

export async function runH2HAgent(
  homeTeamId: number, homeTeamName: string,
  awayTeamId: number, awayTeamName: string,
  league?: string,
): Promise<string> {
  // Fallback direto via Claude quando teamId=0 (print-first / Copa / sem ID na API)
  if (homeTeamId === 0 && awayTeamId === 0) {
    return inferH2HViaClaude(homeTeamName, awayTeamName, league || 'Copa do Mundo');
  }

  const fixtures = await getH2H(homeTeamId, awayTeamId, 10).catch(() => [] as APIFootballFixture[]);

  // Se a API não retornou dados H2H, usa Claude como fallback
  if (!fixtures.length) {
    return inferH2HViaClaude(homeTeamName, awayTeamName, league || 'Copa do Mundo');
  }

  const h2hSummary = summarizeH2H(fixtures, homeTeamId);

  const prompt = `Analise o histórico de confrontos diretos entre ${homeTeamName} e ${awayTeamName}. Responda em máx 120 palavras com:
- Número de vitórias, empates e derrotas de cada lado
- Padrão de gols (jogos com muitos ou poucos gols?)
- Vantagem psicológica/histórica de algum time
- Relevância para o confronto atual

Histórico:
${h2hSummary}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }],
    system: 'Você é um analista esportivo especializado em futebol. Responda em português brasileiro de forma objetiva.',
  });

  return response.content[0].type === 'text' ? response.content[0].text : 'Análise não disponível';
}
