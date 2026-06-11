import { describe, it, expect } from 'vitest';
import { calculatePhase, MILESTONES } from '../phase-engine';
import type { MilestoneState } from '../phase-engine';

describe('calculatePhase', () => {
  it('retorna survival quando saldo mensal é negativo', () => {
    expect(calculatePhase({
      monthlyBalance: -500, totalDebt: 1000, emergencyFund: 0, fixedExpenses: 2000, totalInvestments: 0,
    })).toBe('survival');
  });

  it('retorna reorganizing com saldo positivo mas com dívidas', () => {
    expect(calculatePhase({
      monthlyBalance: 500, totalDebt: 5000, emergencyFund: 0, fixedExpenses: 2000, totalInvestments: 0,
    })).toBe('reorganizing');
  });

  it('retorna stabilizing sem dívidas mas reserva insuficiente', () => {
    expect(calculatePhase({
      monthlyBalance: 500, totalDebt: 0, emergencyFund: 1000, fixedExpenses: 2000, totalInvestments: 0,
    })).toBe('stabilizing');
  });

  it('retorna accumulating com reserva de 3 meses mas pouco investido', () => {
    expect(calculatePhase({
      monthlyBalance: 500, totalDebt: 0, emergencyFund: 6000, fixedExpenses: 2000, totalInvestments: 500,
    })).toBe('accumulating');
  });

  it('retorna growing com reserva ok e R$10.000+ investidos', () => {
    expect(calculatePhase({
      monthlyBalance: 1000, totalDebt: 0, emergencyFund: 9000, fixedExpenses: 2000, totalInvestments: 15000,
    })).toBe('growing');
  });

  it('survival tem prioridade sobre dívidas', () => {
    expect(calculatePhase({
      monthlyBalance: -100, totalDebt: 50000, emergencyFund: 0, fixedExpenses: 3000, totalInvestments: 20000,
    })).toBe('survival');
  });

  it('exatamente no limite de reserva 3× fica em stabilizing', () => {
    // emergencyFund = fixedExpenses * 3 - 1 → ainda stabilizing
    expect(calculatePhase({
      monthlyBalance: 500, totalDebt: 0, emergencyFund: 5999, fixedExpenses: 2000, totalInvestments: 500,
    })).toBe('stabilizing');
  });

  it('saldo zero não entra em survival', () => {
    // monthlyBalance >= 0 e sem dívidas → stabilizing ou acima
    expect(calculatePhase({
      monthlyBalance: 0, totalDebt: 0, emergencyFund: 0, fixedExpenses: 1000, totalInvestments: 0,
    })).toBe('stabilizing');
  });
});

describe('MILESTONES', () => {
  const baseState: MilestoneState = {
    monthlyBalance: 0,
    highestRateDebtCleared: false,
    allDebtsCleared: false,
    emergencyFund: 0,
    fixedExpenses: 2000,
    totalInvestments: 0,
    passiveIncome: 0,
    monthlyExpenses: 2000,
  };

  it('first_positive dispara com saldo positivo', () => {
    const m = MILESTONES.find((m) => m.id === 'first_positive')!;
    expect(m.reached({ ...baseState, monthlyBalance: 1 })).toBe(true);
    expect(m.reached({ ...baseState, monthlyBalance: 0 })).toBe(false);
  });

  it('reserve_3m dispara quando emergencyFund >= fixedExpenses × 3', () => {
    const m = MILESTONES.find((m) => m.id === 'reserve_3m')!;
    expect(m.reached({ ...baseState, emergencyFund: 6000 })).toBe(true);
    expect(m.reached({ ...baseState, emergencyFund: 5999 })).toBe(false);
  });

  it('invested_10k dispara com R$10.000 em investimentos', () => {
    const m = MILESTONES.find((m) => m.id === 'invested_10k')!;
    expect(m.reached({ ...baseState, totalInvestments: 10000 })).toBe(true);
    expect(m.reached({ ...baseState, totalInvestments: 9999 })).toBe(false);
  });

  it('passive_100 (liberdade financeira) dispara quando passiveIncome >= monthlyExpenses', () => {
    const m = MILESTONES.find((m) => m.id === 'passive_100')!;
    expect(m.reached({ ...baseState, passiveIncome: 2000, monthlyExpenses: 2000 })).toBe(true);
    expect(m.reached({ ...baseState, passiveIncome: 1999, monthlyExpenses: 2000 })).toBe(false);
  });

  it('todos os milestones têm id único', () => {
    const ids = MILESTONES.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
