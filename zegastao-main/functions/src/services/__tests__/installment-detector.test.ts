import { describe, it, expect } from 'vitest';
import { detectInstallment } from '../parsers/installment-detector';

describe('detectInstallment', () => {
  it('detecta padrão "Parcela X de Y"', () => {
    const r = detectInstallment('AMAZON MARKETPLACE Parcela 3 de 12');
    expect(r?.isInstallment).toBe(true);
    expect(r?.installmentCurrent).toBe(3);
    expect(r?.installmentTotal).toBe(12);
    expect(r?.installmentGroup).toContain('12x');
  });

  it('detecta padrão "X/Y" no final (cartão crédito)', () => {
    const r = detectInstallment('SHOPEE 03/12');
    expect(r?.isInstallment).toBe(true);
    expect(r?.installmentCurrent).toBe(3);
    expect(r?.installmentTotal).toBe(12);
  });

  it('detecta "Parcela X/Y"', () => {
    const r = detectInstallment('Netflix Parcela 1/6');
    expect(r?.isInstallment).toBe(true);
    expect(r?.installmentCurrent).toBe(1);
    expect(r?.installmentTotal).toBe(6);
  });

  it('rejeita quando current > total', () => {
    const r = detectInstallment('SUPERMERCADO 13/12');
    expect(r).toBeNull();
  });

  it('rejeita parcelamento com 1 parcela', () => {
    const r = detectInstallment('LOJA 1/1');
    expect(r).toBeNull();
  });

  it('rejeita acima de 72 parcelas', () => {
    const r = detectInstallment('ALGO 1/73');
    expect(r).toBeNull();
  });

  it('retorna null para descrição sem parcelamento', () => {
    const r = detectInstallment('PIX RECEBIDO JOAO SILVA');
    expect(r).toBeNull();
  });

  it('installmentGroup não inclui o número da parcela', () => {
    const r1 = detectInstallment('AMAZON 01/12');
    const r2 = detectInstallment('AMAZON 06/12');
    expect(r1?.installmentGroup).toBe(r2?.installmentGroup);
  });

  it('installmentGroup diferencia totais distintos', () => {
    const r6 = detectInstallment('AMAZON 01/06');
    const r12 = detectInstallment('AMAZON 01/12');
    expect(r6?.installmentGroup).not.toBe(r12?.installmentGroup);
  });
});
