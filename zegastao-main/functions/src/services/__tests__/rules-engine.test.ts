import { describe, it, expect } from 'vitest';
import type { Rule } from '../../types';
import type { ParsedTransaction } from '../../types';

// Extrai a lógica pura do rules-engine sem depender do Firestore.
// Replica o evaluateSingleRule para triggers que não precisam de DB.
function evalPure(
  rule: Pick<Rule, 'triggerType' | 'triggerCategoryName' | 'triggerThreshold' | 'actionType' | 'actionPercentage' | 'actionFixedAmount' | 'actionGoalId'>,
  tx: Pick<ParsedTransaction, 'amount' | 'category'>
): number | null {
  const amount = Math.abs(tx.amount);
  const pct = (rule.actionPercentage || 0) / 100;
  const fixed = rule.actionFixedAmount || 0;
  const redirect = (base: number) =>
    rule.actionType === 'redirect_fixed' ? fixed : base * pct;

  if (rule.triggerType === 'transaction_in_category') {
    if (tx.category === rule.triggerCategoryName && tx.amount < 0) {
      return redirect(amount);
    }
  }

  if (rule.triggerType === 'income_received' && tx.amount > 0) {
    return redirect(amount);
  }

  return null;
}

const baseRule = {
  actionGoalId: 'goal-1',
} as Pick<Rule, 'triggerType' | 'triggerCategoryName' | 'triggerThreshold' | 'actionType' | 'actionPercentage' | 'actionFixedAmount' | 'actionGoalId'>;

describe('rules-engine — transaction_in_category', () => {
  it('redireciona percentual correto em gasto na categoria', () => {
    const rule = { ...baseRule, triggerType: 'transaction_in_category' as const, triggerCategoryName: 'Delivery', actionType: 'redirect_percentage' as const, actionPercentage: 20 };
    const result = evalPure(rule, { amount: -100, category: 'Delivery' });
    expect(result).toBeCloseTo(20, 2);
  });

  it('não dispara para categoria diferente', () => {
    const rule = { ...baseRule, triggerType: 'transaction_in_category' as const, triggerCategoryName: 'Delivery', actionType: 'redirect_percentage' as const, actionPercentage: 20 };
    expect(evalPure(rule, { amount: -100, category: 'Streaming' })).toBeNull();
  });

  it('não dispara para entradas (amount positivo)', () => {
    const rule = { ...baseRule, triggerType: 'transaction_in_category' as const, triggerCategoryName: 'Salário', actionType: 'redirect_percentage' as const, actionPercentage: 10 };
    expect(evalPure(rule, { amount: 5000, category: 'Salário' })).toBeNull();
  });

  it('redireciona valor fixo correto', () => {
    const rule = { ...baseRule, triggerType: 'transaction_in_category' as const, triggerCategoryName: 'Restaurante', actionType: 'redirect_fixed' as const, actionFixedAmount: 50 };
    const result = evalPure(rule, { amount: -200, category: 'Restaurante' });
    expect(result).toBe(50);
  });
});

describe('rules-engine — income_received', () => {
  it('redireciona 10% de qualquer entrada', () => {
    const rule = { ...baseRule, triggerType: 'income_received' as const, actionType: 'redirect_percentage' as const, actionPercentage: 10 };
    expect(evalPure(rule, { amount: 4000, category: 'Salário' })).toBeCloseTo(400, 2);
  });

  it('não dispara para saídas', () => {
    const rule = { ...baseRule, triggerType: 'income_received' as const, actionType: 'redirect_percentage' as const, actionPercentage: 10 };
    expect(evalPure(rule, { amount: -300, category: 'Alimentação' })).toBeNull();
  });

  it('redirectFixed ignora o valor da transação', () => {
    const rule = { ...baseRule, triggerType: 'income_received' as const, actionType: 'redirect_fixed' as const, actionFixedAmount: 100 };
    expect(evalPure(rule, { amount: 10000, category: 'Freelance' })).toBe(100);
    expect(evalPure(rule, { amount: 500, category: 'Pix recebido' })).toBe(100);
  });
});
