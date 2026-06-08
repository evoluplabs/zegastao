// Agente 1: Analisa a forma recente de cada time (últimos 5-10 jogos).
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

export async function runFormAgent(
  homeTeamId: number, homeTeamName: string,
  awayTeamId: number, awayTeamName: string
): Promise<string> {
  const [homeFixtures, awayFixtures] = await Promise.all([
    getFixturesByTeam(homeTeamId, 7).catch(() => [] as APIFootballFixture[]),
    getFixturesByTeam(awayTeamId, 7).catch(() => [] as APIFootballFixture[]),
  ]);

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
