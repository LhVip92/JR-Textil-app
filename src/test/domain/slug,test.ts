import { describe, it, expect } from 'vitest';
import { slugify, isValidSlug } from '@/domain/slug';

describe('slugify', () => {
  it('remove acentos e coloca em minúsculas', () => {
    expect(slugify('Tricoline Premium')).toBe('tricoline-premium');
  });
  it('substitui espaços por hífen', () => {
    expect(slugify('linho 100 algodao')).toBe('linho-100-algodao');
  });
  it('remove caracteres especiais', () => {
    expect(slugify('Voil 2 brilho')).toBe('voil-2-brilho');
  });
  it('evita hífens duplicados', () => {
    expect(slugify('Tricoline   --  Premium')).toBe('tricoline-premium');
  });
  it('remove hífen no início e no fim', () => {
    expect(slugify('--tricoline--')).toBe('tricoline');
  });
  it('lida com string vazia', () => {
    expect(slugify('')).toBe('');
  });
  it('lida com string só de símbolos', () => {
    expect(slugify('@#$%')).toBe('');
  });
  it('preserva números', () => {
    expect(slugify('Linho 200 fios')).toBe('linho-200-fios');
  });
});

describe('isValidSlug', () => {
  it('aceita slugs válidos', () => {
    expect(isValidSlug('tricoline')).toBe(true);
  });
  it('rejeita strings vazias', () => {
    expect(isValidSlug('')).toBe(false);
  });
  it('rejeita strings só com símbolos', () => {
    expect(isValidSlug('---')).toBe(false);
    expect(isValidSlug('@#$')).toBe(false);
  });
});