// Agente de Desfalques: lê lesões e suspensões dos dois times via API-Football
// (endpoint /injuries, já disponível em sports-api mas até então sem uso) e
// interpreta o impacto na partida. Muitos titulares de fora → menos confiança
// em apostas a favor daquele time.
import Anthropic from '@anthropic-ai/sdk';
import { getInjuries } from './sports-api';

const client = new Anthropic();

export interface InjuryOutput {
  homeMissing: number;
  awayMissing: number;
  keyPlayersOut: string[];
  summary: string;          // pt-BR para o Consolidador
  confidenceImpact: number; // -0.1 a +0.05
}

interface APIInjury {
  player?: { id?: number; name?: string };
  team?: { id?: number; name?: string };
  type?: string;   // "Missing Fixture", etc
  reason?: string; // "Injury", "Suspended", etc
}

function describeInjuries(injuries: APIInjury[], teamName: string): { count: number; names: string[]; text: string } {
  if (!injuries.length) {
    return { count: 0, names: [], text: `${teamName}: nenhum desfalque relevante reportado.` };
  }
  const names = injuries
    .map((i) => i.player?.name)
    .filter((n): n is string => Boolean(n));
  const lines = injuries
    .slice(0, 8)
    .map((i) => `- ${i.player?.name ?? 'Jogador'} (${i.reason ?? i.type ?? 'desfalque'})`)
    .join('\n');
  return {
    count: injuries.length,
    names,
    text: `${teamName} — ${injuries.length} desfalque(s):\n${lines}`,
  };
}

export async function runInjuryAgent(
  homeTeamId: number,
  homeTeam: string,
  awayTeamId: number,
  awayTeam: string,
  fixtureId?: number
): Promise<InjuryOutput> {
  const [homeRaw, awayRaw] = await Promise.all([
    getInjuries(homeTeamId, fixtureId).catch(() => [] as unknown[]),
    getInjuries(awayTeamId, fixtureId).catch(() => [] as unknown[]),
  ]);

  const homeInfo = describeInjuries(homeRaw as APIInjury[], homeTeam);
  const awayInfo = describeInjuries(awayRaw as APIInjury[], awayTeam);

  // Defaults — usados se a IA falhar ou se não houver dados
  let summary = `DESFALQUES:\n${homeInfo.text}\n${awayInfo.text}`;
  let confidenceImpact = 0;

  // Heurística de impacto: muitos desfalques de um lado torna o jogo menos previsível
  const diff = Math.abs(homeInfo.count - awayInfo.count);
  if (homeInfo.count === 0 && awayInfo.count === 0) {
    confidenceImpact = 0.02; // elencos completos → leve aumento de previsibilidade
  } else if (diff >= 4) {
    confidenceImpact = -0.08; // desequilíbrio grande → imprevisível
  } else if (homeInfo.count + awayInfo.count >= 6) {
    confidenceImpact = -0.05;
  }

  // Se não há dados de nenhum lado, não vale gastar chamada de IA
  if (homeInfo.count === 0 && awayInfo.count === 0) {
    return {
      homeMissing: 0,
      awayMissing: 0,
      keyPlayersOut: [],
      summary: 'DESFALQUES: nenhum desfalque relevante reportado para os dois times. Elencos presumidamente completos.',
      confidenceImpact,
    };
  }

  const prompt = `Analise os desfalques (lesões e suspensões) abaixo e o impacto para a partida ${homeTeam} x ${awayTeam}.

${homeInfo.text}

${awayInfo.text}

Em 2-3 frases (português), diga: qual time é mais afetado, se há titulares importantes de fora, e o que isso significa para as apostas (ex: ataque enfraquecido → menos gols esperados daquele time).`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 220,
      messages: [{ role: 'user', content: prompt }],
      system: 'Você é analista esportivo. Responda em português brasileiro, objetivo e técnico.',
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    if (text) summary = `DESFALQUES (${homeInfo.count} x ${awayInfo.count}):\n${text}`;
  } catch {
    // Mantém o summary heurístico
  }

  return {
    homeMissing: homeInfo.count,
    awayMissing: awayInfo.count,
    keyPlayersOut: [...homeInfo.names, ...awayInfo.names].slice(0, 6),
    summary,
    confidenceImpact,
  };
}
