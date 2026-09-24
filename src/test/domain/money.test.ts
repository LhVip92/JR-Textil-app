import { describe, it, expect } from 'vitest';
import { formatBRL, computeSubtotal, computeTotal } from '@/domain/money';
import { isQuantityValid, isVariantSelectable } from '@/domain/cart';

describe('money', () => {
  it('formata em BRL', () => {
    expect(formatBRL(12.5)).toMatch(/12,50/);
  });
  it('calcula subtotal com arredondamento', () => {
    expect(computeSubtotal(9.99, 3)).toBeCloseTo(29.97, 2);
  });
  it('total soma itens', () => {
    expect(computeTotal([{ unitPrice: 10, quantity: 2 }, { unitPrice: 5.5, quantity: 4 }]))
      .toBeCloseTo(42, 2);
  });
});

describe('cart domain', () => {
  it('rejeita quantidade abaixo do mínimo', () => {
    expect(isQuantityValid(0.5, 1)).toBe(false);
    expect(isQuantityValid(1, 1)).toBe(true);
  });
  it('cor esgotada não é selecionável', () => {
    expect(isVariantSelectable('out_of_stock')).toBe(false);
    expect(isVariantSelectable('available')).toBe(true);
  });
});