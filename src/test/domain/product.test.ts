import { describe, it, expect } from 'vitest';
import {
  validateProduct,
  parseNumberOrNull,
  normalizeOptional,
  emptyProductForm,
  type ProductFormData
} from '@/domain/product';

function form(overrides: Partial<ProductFormData> = {}): ProductFormData {
  return {
    ...emptyProductForm(),
    name: 'Tricoline',
    code: 'TRI-001',
    categoryId: 'cat-uuid',
    price: '19.90',
    minQuantity: '1',
    ...overrides
  };
}

describe('parseNumberOrNull', () => {
  it('converte número válido', () => {
    expect(parseNumberOrNull('19.90')).toBeCloseTo(19.9);
  });
  it('aceita vírgula', () => {
    expect(parseNumberOrNull('19,90')).toBeCloseTo(19.9);
  });
  it('retorna null para vazio', () => {
    expect(parseNumberOrNull('')).toBeNull();
    expect(parseNumberOrNull('   ')).toBeNull();
  });
  it('retorna null para texto inválido', () => {
    expect(parseNumberOrNull('abc')).toBeNull();
  });
});

describe('normalizeOptional', () => {
  it('transforma string vazia em null', () => {
    expect(normalizeOptional('')).toBeNull();
    expect(normalizeOptional('   ')).toBeNull();
  });
  it('preserva texto com trim', () => {
    expect(normalizeOptional('  algo ')).toBe('algo');
  });
});

describe('validateProduct', () => {
  it('aprova formulário completo', () => {
    const r = validateProduct(form());
    expect(r.valid).toBe(true);
    expect(r.normalized).toBeDefined();
    expect(r.normalized?.name).toBe('Tricoline');
    expect(r.normalized?.slug).toBe('tricoline');
    expect(r.normalized?.price).toBeCloseTo(19.9);
  });

  it('rejeita nome vazio', () => {
    const r = validateProduct(form({ name: '   ' }));
    expect(r.valid).toBe(false);
    expect(r.errors.name).toBeDefined();
  });

  it('rejeita código vazio', () => {
    const r = validateProduct(form({ code: '' }));
    expect(r.valid).toBe(false);
    expect(r.errors.code).toBeDefined();
  });

  it('rejeita categoria vazia', () => {
    const r = validateProduct(form({ categoryId: '' }));
    expect(r.valid).toBe(false);
    expect(r.errors.categoryId).toBeDefined();
  });

  it('rejeita preço negativo', () => {
    const r = validateProduct(form({ price: '-1' }));
    expect(r.valid).toBe(false);
    expect(r.errors.price).toBeDefined();
  });

  it('rejeita preço inválido', () => {
    const r = validateProduct(form({ price: 'abc' }));
    expect(r.valid).toBe(false);
    expect(r.errors.price).toBeDefined();
  });

  it('rejeita quantidade mínima zero ou negativa', () => {
    const r = validateProduct(form({ minQuantity: '0' }));
    expect(r.valid).toBe(false);
    expect(r.errors.minQuantity).toBeDefined();

    const r2 = validateProduct(form({ minQuantity: '-5' }));
    expect(r2.valid).toBe(false);
  });

  it('exige preço promocional quando isPromoted', () => {
    const r = validateProduct(form({ isPromoted: true, promoPrice: '' }));
    expect(r.valid).toBe(false);
    expect(r.errors.promoPrice).toBeDefined();
  });

  it('rejeita preço promocional maior ou igual ao normal', () => {
    const r = validateProduct(form({ isPromoted: true, promoPrice: '25' }));
    expect(r.valid).toBe(false);
    expect(r.errors.promoPrice).toBeDefined();
  });

  it('aceita promoção válida', () => {
    const r = validateProduct(form({ isPromoted: true, promoPrice: '15' }));
    expect(r.valid).toBe(true);
    expect(r.normalized?.promo_price).toBeCloseTo(15);
  });

  it('ignora promoPrice quando isPromoted=false', () => {
    const r = validateProduct(form({ isPromoted: false, promoPrice: '10' }));
    expect(r.valid).toBe(true);
    expect(r.normalized?.promo_price).toBeNull();
  });

  it('normaliza campos opcionais vazios para null', () => {
    const r = validateProduct(form());
    expect(r.normalized?.composition).toBeNull();
    expect(r.normalized?.width).toBeNull();
    expect(r.normalized?.notes).toBeNull();
    expect(r.normalized?.seo_title).toBeNull();
  });

  it('gera slug a partir do nome se slug não informado', () => {
    const r = validateProduct(form({ slug: '' }));
    expect(r.valid).toBe(true);
    expect(r.normalized?.slug).toBe('tricoline');
  });

  it('preserva slug informado', () => {
    const r = validateProduct(form({ slug: 'meu-slug-custom' }));
    expect(r.valid).toBe(true);
    expect(r.normalized?.slug).toBe('meu-slug-custom');
  });
});