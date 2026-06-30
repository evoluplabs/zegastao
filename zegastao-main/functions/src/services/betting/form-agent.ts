// Agente 1: Analisa a forma recente de cada time (últimos 5-10 jogos).
// Fallback Copa/print-first: quando teamId=0 (sem ID no API-Football), usa Claude
// com conhecimento histórico para estimar forma recente de seleções/clubes.
import Anthropic from '@anthropic-ai/sdk';
import { getFixturesByTeam, APIFootballFixture } from './sports-api';

const client = new Anthropic();

function summarizeFixtures(fixtures: APIFootballFixture[], teamId: number): string {
  return fixtures.map((f) => {
    const isHome = f.teams.home.id === teamId;
    const scored = isHome ? f.goals.home : f.goals.away;
    const conceded = isHome ? f.goals.away : f.goals.home;
    const opponent = isHome ? f.teams.away.name : f.teams.home.name;
    const venue = isHome ? 'Casa' : 'Fora';
    let result = 'Empate';
    if (scored !== null && conceded !== null) {
      result = scored > conceded ? 'Vitória' : scored < conceded ? 'Derrota' : 'Empate';
    }
    return `${venue} vs ${opponent}: ${result} ${scored ?? '?'}-${conceded ?? '?'}`;
  }).join('\n');
}

async function inferFormViaClaude(homeTeam: string, awayTeam: string, league: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Com base no histórico recente de "${homeTeam}" e "${awayTeam}" na competição "${league}" (ou nível equivalente — eliminatórias, amistosos preparatórios, última Copa), forneça um resumo conciso (máx 150 palavras) com:
- Aproveitamento percentual de cada time nas últimas 8-10 partidas
- Tendência de gols marcados/sofridos
- Sequências notáveis (ex: "3 vitórias seguidas", "4 jogos sem sofrer gols")
- Qual time chega em melhor momento

Responda em português brasileiro de forma objetiva e técnica.`,
    }],
    system: 'Você é um analista esportivo especializado em futebol internacional. Use seu amplo conhecimento histórico sobre seleções e clubes para esta análise.',
  });
  return response.content[0].type === 'text'
    ? response.content[0].text
    : 'Análise de forma não disponível';
}

export async function runFormAgent(
  homeTeamId: number, homeTeamName: string,
  awayTeamId: number, awayTeamName: string,
  league?: string,
): Promise<string> {
  // Fallback direto via Claude quando teamId=0 (print-first / Copa / sem ID na API)
  if (homeTeamId === 0 && awayTeamId === 0) {
    return inferFormViaClaude(homeTeamName, awayTeamName, league || 'Copa do Mundo');
  }

  const [homeFixtures, awayFixtures] = await Promise.all([
    getFixturesByTeam(homeTeamId, 7).catch(() => [] as APIFootballFixture[]),
    getFixturesByTeam(awayTeamId, 7).catch(() => [] as APIFootballFixture[]),
  ]);

  // Se a API não retornou dados de nenhum dos dois times, usa Claude como fallback
  if (!homeFixtures.length && !awayFixtures.length) {
    return inferFormViaClaude(homeTeamName, awayTeamName, league || 'Copa do Mundo');
  }

  const homeForm = summarizeFixtures(homeFixtures, homeTeamId);
  const awayForm = summarizeFixtures(awayFixtures, awayTeamId);

  const prompt = `Analise a forma recente dos dois times e forneça um resumo conciso (máx 150 palavras) com:
- Aproveitamento percentual de cada time nos últimos jogos
- Tendência de gols marcados/sofridos
- Destaque para sequências (ex: "3 vitórias seguidas", "4 jogos sem marcar em casa")
- Qual time chega em melhor momento

${homeTeamName} (casa) — últimos jogos:
${homeForm || 'Dados não disponíveis'}

${awayTeamName} (fora) — últimos jogos:
${awayForm || 'Dados não disponíveis'}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
    system: 'Você é um analista esportivo especializado em futebol. Responda em português brasileiro de forma objetiva e técnica.',
  });

  return response.content[0].type === 'text' ? response.content[0].text : 'Análise não disponível';
}
