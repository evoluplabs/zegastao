import { describe, it, expect } from 'vitest';
import { calcAmortization, compareScenarios } from '../amortization-engine';

describe('calcAmortization — Price', () => {
  it('gera o número correto de parcelas', () => {
    const result = calcAmortization(10000, 0.02, 12);
    expect(result.originalSchedule).toHaveLength(12);
  });

  it('saldo final é zero (sem adiantamentos)', () => {
    const result = calcAmortization(10000, 0.02, 12);
    const last = result.originalSchedule[result.originalSchedule.length - 1];
    expect(last.remainingBalance).toBeCloseTo(0, 1);
  });

  it('taxa zero — cada parcela é exatamente principal / n', () => {
    const result = calcAmortization(1200, 0, 12);
    const first = result.originalSchedule[0];
    expect(first.payment).toBeCloseTo(100, 2);
    expect(first.interest).toBeCloseTo(0, 2);
  });

  it('adiantamento reduz o número de parcelas', () => {
    const semAdiantamento = calcAmortization(10000, 0.02, 24);
    const comAdiantamento = calcAmortization(10000, 0.02, 24, [
      { installmentNumber: 1, extraAmount: 2000 },
    ]);
    expect(comAdiantamento.acceleratedSchedule.length).toBeLessThan(
      comAdiantamento.originalSchedule.length
    );
    expect(semAdiantamento.savings.monthsSaved).toBe(0);
    expect(comAdiantamento.savings.monthsSaved).toBeGreaterThan(0);
  });

  it('adiantamento economiza juros', () => {
    const result = calcAmortization(20000, 0.035, 36, [
      { installmentNumber: 1, extraAmount: 5000 },
    ]);
    expect(result.savings.interestSaved).toBeGreaterThan(0);
  });

  it('resultado total pago (juros + principal) >= principal original', () => {
    const result = calcAmortization(5000, 0.015, 18);
    const totalPaid = result.originalSchedule.reduce((s, p) => s + p.payment, 0);
    expect(totalPaid).toBeGreaterThanOrEqual(5000);
  });

  it('parcela Price é constante (tolerância de centavo)', () => {
    const result = calcAmortization(10000, 0.02, 10);
    const payments = result.originalSchedule.map((p) => p.payment);
    const first = payments[0];
    payments.forEach((p) => expect(p).toBeCloseTo(first, 0));
  });
});

describe('calcAmortization — SAC', () => {
  it('amortização é constante em todas as parcelas', () => {
    const result = calcAmortization(12000, 0.01, 12, [], 'sac');
    const principals = result.originalSchedule.map((p) => p.principal);
    const first = principals[0];
    principals.forEach((p) => expect(p).toBeCloseTo(first, 1));
  });

  it('parcelas diminuem ao longo do tempo (SAC)', () => {
    const result = calcAmortization(12000, 0.01, 12, [], 'sac');
    const sched = result.originalSchedule;
    for (let i = 1; i < sched.length; i++) {
      expect(sched[i].payment).toBeLessThanOrEqual(sched[i - 1].payment);
    }
  });

  it('saldo final é zero', () => {
    const result = calcAmortization(6000, 0.02, 12, [], 'sac');
    const last = result.originalSchedule[result.originalSchedule.length - 1];
    expect(last.remainingBalance).toBeCloseTo(0, 1);
  });
});

describe('compareScenarios', () => {
  it('cenário com pagamento extra tem menos meses', () => {
    const results = compareScenarios([
      { label: 'Sem extra', principal: 10000, monthlyRate: 0.02, totalInstallments: 24 },
      { label: 'Com R$500 extra', principal: 10000, monthlyRate: 0.02, totalInstallments: 24, extraMonthly: 500 },
    ]);
    expect(results[0].monthsToClear).toBeGreaterThan(results[1].monthsToClear);
  });

  it('baseline tem interestSavedVsBaseline igual a zero', () => {
    const results = compareScenarios([
      { label: 'Base', principal: 5000, monthlyRate: 0.015, totalInstallments: 12 },
    ]);
    expect(results[0].interestSavedVsBaseline).toBe(0);
  });

  it('cenário com extra economiza juros vs baseline', () => {
    const results = compareScenarios([
      { label: 'Base', principal: 10000, monthlyRate: 0.025, totalInstallments: 36 },
      { label: 'Extra 300', principal: 10000, monthlyRate: 0.025, totalInstallments: 36, extraMonthly: 300 },
    ]);
    expect(results[1].interestSavedVsBaseline).toBeGreaterThan(0);
    expect(results[1].totalInterest).toBeLessThan(results[0].totalInterest);
  });
});
