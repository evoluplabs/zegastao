// Gera sugestões proativas baseadas nos dados do usuário — sem custo de IA.
// Analisa padrões detectáveis: streaming excessivo, delivery alto, meta parada, etc.
import { useMemo } from 'react';
import type { Transaction, Debt, Goal } from '@/types';

export interface ProactiveSuggestion {
  id: string;
  emoji: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  type: 'alert' | 'tip' | 'win';
}

interface SuggestionInput {
  transactions: Transaction[];
  debts: Debt[];
  goals: Goal[];
  monthlyIncome?: number;
}

export function useProactiveSuggestions({
  transactions,
  debts,
  goals,
  monthlyIncome = 0,
}: SuggestionInput): ProactiveSuggestion[] {
  return useMemo(() => {
    const suggestions: ProactiveSuggestion[] = [];
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000).toISOString().slice(0, 10);

    const recent = transactions.filter((t) => t.date >= thirtyDaysAgo && t.amount < 0);
    const sumCat = (cat: string) =>
      recent.filter((t) => t.category === cat).reduce((s, t) => s + Math.abs(t.amount), 0);

    // 1. Delivery > 20% da renda
    if (monthlyIncome > 0) {
      const deliveryTotal = sumCat('Delivery') + sumCat('Restaurantes');
      if (deliveryTotal > monthlyIncome * 0.2) {
        suggestions.push({
          id: 'delivery_high',
          emoji: '🛵',
          title: 'Delivery está pesando no bolso',
          body: `R$${deliveryTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} em delivery/restaurantes este mês — ${Math.round((deliveryTotal / monthlyIncome) * 100)}% da sua renda. Criar uma regra de orçamento pode ajudar.`,
          actionLabel: 'Criar regra de orçamento',
          actionUrl: '/financas?tab=rules',
          type: 'alert',
        });
      }
    }

    // 2. Streaming duplicado (≥3 diferentes)
    const streamingTxs = recent.filter((t) =>
      t.category === 'Streaming' ||
      /netflix|spotify|hbo|disney|prime|globoplay|paramount|apple tv|deezer/i.test(t.description)
    );
    const uniqueStreaming = new Set(
      streamingTxs.map((t) => t.normalizedDesc || t.description.slice(0, 12).toLowerCase())
    );
    if (uniqueStreaming.size >= 3) {
      suggestions.push({
        id: 'streaming_overload',
        emoji: '📺',
        title: `${uniqueStreaming.size} streamings ativos`,
        body: 'Você tem múltiplos serviços de streaming. Cancelar um ou dois pode economizar R$30–80/mês sem grande impacto.',
        actionLabel: 'Ver gastos por categoria',
        actionUrl: '/transactions',
        type: 'tip',
      });
    }

    // 3. Dívida de alto custo (juros > 3% ao mês) sem pagamento registrado no mês
    const expensiveDebt = debts.find(
      (d) => d.status === 'active' && d.interestRateMonthly > 3 && d.lastPaymentMonth !== thisMonth
    );
    if (expensiveDebt) {
      suggestions.push({
        id: `expensive_debt_${expensiveDebt.id}`,
        emoji: '🔥',
        title: `${expensiveDebt.creditor} com juros altos`,
        body: `${expensiveDebt.interestRateMonthly.toFixed(1)}% ao mês — esta dívida deve ser prioridade. Cada mês de atraso aumenta o saldo significativamente.`,
        actionLabel: 'Ver dívidas',
        actionUrl: '/financas?tab=debts',
        type: 'alert',
      });
    }

    // 4. Meta ativa sem meta de contribuição configurada
    const activeGoalWithoutRule = goals.find(
      (g) => g.status === 'active' && g.currentAmount < g.targetAmount
    );
    const hasGoalRule = goals.length > 0; // simplificado — se há metas, sugerimos regra
    if (activeGoalWithoutRule && !hasGoalRule) {
      suggestions.push({
        id: `idle_goal_${activeGoalWithoutRule.id}`,
        emoji: '🎯',
        title: `Meta "${activeGoalWithoutRule.name}" parada`,
        body: 'Crie uma regra automática para redirecionar parte da sua renda todo mês para esta meta.',
        actionLabel: 'Criar regra automática',
        actionUrl: '/financas?tab=rules',
        type: 'tip',
      });
    }

    // 5. Sem reserva de emergência
    const hasReserveGoal = goals.some(
      (g) => /reserva|emergência|emergencia/i.test(g.name) && g.status === 'active'
    );
    if (!hasReserveGoal && debts.filter((d) => d.status === 'active').length === 0) {
      suggestions.push({
        id: 'no_reserve',
        emoji: '🏦',
        title: 'Sem reserva de emergência',
        body: 'Uma reserva de 3–6 meses de gastos protege você de imprevistos. Crie uma meta agora.',
        actionLabel: 'Criar meta de reserva',
        actionUrl: '/financas?tab=goals',
        type: 'tip',
      });
    }

    // Máximo 3 sugestões por vez (priorizando alertas)
    return suggestions
      .sort((a, b) => (a.type === 'alert' ? -1 : b.type === 'alert' ? 1 : 0))
      .slice(0, 3);
  }, [transactions, debts, goals, monthlyIncome]);
}
