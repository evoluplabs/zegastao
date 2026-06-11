// Agente Gestor de Risco: define o stake final com base no Kelly fracionário
// (kelly.ts) + budget semanal + fase financeira do usuário. Determinístico —
// não consome IA. É a última trava de segurança antes da recomendação.
import { suggestedStake } from './kelly';

export interface RiskManagerOutput {
  recommendedStake: number;
  maxStake: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  reasoning: string;
  shouldSkip: boolean; // true se confiança baixa ou budget esgotado
  summary: string;     // pt-BR para o Consolidador
}

// Fases financeiras mais frágeis forçam postura conservadora
const FRAGILE_PHASES = ['survival', 'reorganizing', 'stabilizing'];

export function runRiskManagerAgent(params: {
  confidenceScore: number; // 0-100 (já ajustado pelos outros agentes)
  recommendedOdd: number;
  weeklyBudget: number;
  weeklyStaked: number;
  financialPhase?: string;
}): RiskManagerOutput {
  const { confidenceScore, recommendedOdd, weeklyBudget, weeklyStaked, financialPhase } = params;

  const remaining = Math.max(0, weeklyBudget - weeklyStaked);
  const fragile = financialPhase ? FRAGILE_PHASES.includes(financialPhase) : false;

  // Skip: confiança insuficiente ou sem budget disponível
  if (confidenceScore < 50 || remaining <= 0 || recommendedOdd <= 1) {
    const motivo = remaining <= 0
      ? 'Budget semanal esgotado.'
      : confidenceScore < 50
        ? 'Confiança abaixo do mínimo seguro (50%).'
        : 'Odd inválida.';
    return {
      recommendedStake: 0,
      maxStake: remaining,
      riskLevel: 'conservative',
      reasoning: motivo,
      shouldSkip: true,
      summary: `GESTÃO DE RISCO: aposta NÃO recomendada. ${motivo}`,
    };
  }

  // Kelly fracionário (½ Kelly já embutido em suggestedStake)
  let stake = suggestedStake(confidenceScore / 100, recommendedOdd, weeklyBudget, weeklyStaked);

  // Postura conservadora em fase financeira frágil: corta o stake pela metade
  if (fragile) stake = parseFloat((stake * 0.5).toFixed(2));

  // Teto adicional: nunca mais que 20% do restante em uma única aposta
  const cap = parseFloat((remaining * 0.2).toFixed(2));
  if (stake > cap) stake = cap;

  const pctOfBudget = weeklyBudget > 0 ? (stake / weeklyBudget) * 100 : 0;
  let riskLevel: RiskManagerOutput['riskLevel'] = 'moderate';
  if (fragile || pctOfBudget < 8) riskLevel = 'conservative';
  else if (confidenceScore >= 75 && pctOfBudget >= 15) riskLevel = 'aggressive';

  const reasoning = fragile
    ? `Fase financeira sensível: stake reduzido para postura conservadora (R$${stake.toFixed(2)}, ${pctOfBudget.toFixed(0)}% do budget).`
    : `Stake calculado por ½ Kelly: R$${stake.toFixed(2)} (${pctOfBudget.toFixed(0)}% do budget semanal), nível ${riskLevel}.`;

  return {
    recommendedStake: stake,
    maxStake: cap,
    riskLevel,
    reasoning,
    shouldSkip: stake <= 0,
    summary: `GESTÃO DE RISCO: ${reasoning} Restante na semana: R$${remaining.toFixed(2)}.`,
  };
}
