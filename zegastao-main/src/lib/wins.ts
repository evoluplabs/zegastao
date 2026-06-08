// Deriva "mini-vitórias" compartilháveis a partir dos dados do mês. Ao contrário
// dos marcos (raros), estas aparecem com frequência → mais momentos de orgulho
// para o usuário postar, gerando alcance orgânico. Função pura, testável.
import { formatBRL } from '@/lib/utils';
import type { Goal } from '@/types';

export interface Win {
  id: string;
  emoji: string;
  title: string;
  metric?: string;
  subtitle?: string;
}

export function deriveWins(input: {
  balance: number;
  topGoal?: Goal;
  redirectedThisMonth: number;
  topCategoryDropPct?: number; // queda % na maior categoria vs mês anterior (opcional)
}): Win[] {
  const wins: Win[] = [];

  // Mês no azul
  if (input.balance > 0) {
    wins.push({
      id: 'positive_month',
      emoji: '💚',
      title: 'Fechei o mês no azul!',
      metric: `+${formatBRL(input.balance)}`,
      subtitle: 'Sobrou dinheiro este mês',
    });
  }

  // Progresso em meta
  if (input.topGoal && input.topGoal.targetAmount > 0) {
    const pct = Math.round((input.topGoal.currentAmount / input.topGoal.targetAmount) * 100);
    if (pct >= 25) {
      wins.push({
        id: 'goal_progress',
        emoji: '🎯',
        title: `Já juntei ${pct}% da minha meta`,
        metric: input.topGoal.name,
        subtitle: `${formatBRL(input.topGoal.currentAmount)} de ${formatBRL(input.topGoal.targetAmount)}`,
      });
    }
  }

  // Dinheiro redirecionado por regras automáticas
  if (input.redirectedThisMonth > 0) {
    wins.push({
      id: 'redirected',
      emoji: '🔁',
      title: 'Coloquei no automático!',
      metric: formatBRL(input.redirectedThisMonth),
      subtitle: 'Redirecionado para minhas metas este mês',
    });
  }

  // Queda numa categoria de gasto
  if (input.topCategoryDropPct && input.topCategoryDropPct >= 15) {
    wins.push({
      id: 'category_drop',
      emoji: '✂️',
      title: 'Cortei meus gastos!',
      metric: `-${input.topCategoryDropPct}%`,
      subtitle: 'na minha maior categoria de gasto',
    });
  }

  return wins;
}
