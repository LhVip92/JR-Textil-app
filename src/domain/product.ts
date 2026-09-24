import type { ProductUnit, VariantStatus } from '@/types/database';
import { slugify } from './slug';

// ---------- Constantes de domínio ----------

/**
 * Regra de negócio JR Têxtil: venda exclusiva no atacado,
 * em rolos fechados. Apenas 'rolo' é permitido.
 */
export const PRODUCT_UNITS: readonly ProductUnit[] = ['rolo'] as const;

export const PRODUCT_STATUSES: readonly VariantStatus[] = [
  'available',
  'low_stock',
  'on_request',
  'out_of_stock'
] as const;

export const UNIT_LABELS: Record<ProductUnit, string> = {
  metro: 'Metro',
  kg: 'Quilograma',
  rolo: 'Rolo fechado',
  peca: 'Peça'
};

export const STATUS_LABELS: Record<VariantStatus, string> = {
  available: 'Disponível',
  low_stock: 'Estoque baixo',
  on_request: 'Sob consulta',
  out_of_stock: 'Esgotado'
};

// ---------- Tipos do formulário ----------

export interface ProductFormData {
  name: string;
  slug: string;
  code: string;
  categoryId: string;
  shortDescription: string;
  fullDescription: string;
  composition: string;
  width: string;
  weight: string;
  unit: ProductUnit;
  price: string;
  minQuantity: string;
  notes: string;
  isFeatured: boolean;
  isPromoted: boolean;
  promoPrice: string;
  isActive: boolean;
  generalStatus: VariantStatus;
  seoTitle: string;
  seoDescription: string;
}

export interface ProductInput {
  name: string;
  slug: string;
  code: string;
  category_id: string;
  short_description: string | null;
  full_description: string | null;
  composition: string | null;
  width: string | null;
  weight: string | null;
  unit: ProductUnit;
  price: number;
  min_quantity: number;
  notes: string | null;
  is_featured: boolean;
  is_promoted: boolean;
  promo_price: number | null;
  is_active: boolean;
  general_status: VariantStatus;
  seo_title: string | null;
  seo_description: string | null;
}

export type ValidationErrors = Partial<Record<keyof ProductFormData, string>>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
  normalized?: ProductInput;
}

// ---------- Helpers de conversão ----------

export function parseNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const normalized = trimmed.replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function normalizeOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// ---------- Validação principal ----------

export function validateProduct(form: ProductFormData): ValidationResult {
  const errors: ValidationErrors = {};

  const name = form.name.trim();
  if (name.length === 0) {
    errors.name = 'Informe o nome do produto.';
  } else if (name.length > 200) {
    errors.name = 'Nome muito longo (máx. 200 caracteres).';
  }

  const code = form.code.trim();
  if (code.length === 0) {
    errors.code = 'Informe o código do produto.';
  } else if (code.length > 50) {
    errors.code = 'Código muito longo (máx. 50 caracteres).';
  }

  const categoryId = form.categoryId.trim();
  if (categoryId.length === 0) {
    errors.categoryId = 'Selecione uma categoria.';
  }

  const price = parseNumberOrNull(form.price);
  if (price === null) {
    errors.price = 'Informe o preço do rolo.';
  } else if (price < 0) {
    errors.price = 'O preço não pode ser negativo.';
  }

  const minQuantity = parseNumberOrNull(form.minQuantity);
  if (minQuantity === null) {
    errors.minQuantity = 'Informe a quantidade mínima.';
  } else if (minQuantity <= 0) {
    errors.minQuantity = 'A quantidade mínima deve ser maior que zero.';
  } else if (!Number.isInteger(minQuantity)) {
    errors.minQuantity = 'A quantidade deve ser em rolos inteiros (ex: 1, 2, 5).';
  }

  let promoPrice: number | null = null;
  if (form.isPromoted) {
    promoPrice = parseNumberOrNull(form.promoPrice);
    if (promoPrice === null) {
      errors.promoPrice = 'Informe o preço promocional.';
    } else if (promoPrice < 0) {
      errors.promoPrice = 'O preço promocional não pode ser negativo.';
    } else if (price !== null && promoPrice >= price) {
      errors.promoPrice = 'O preço promocional deve ser menor que o preço normal.';
    }
  }

  const slugSource = form.slug.trim() || name;
  const slug = slugify(slugSource);
  if (slug.length === 0) {
    errors.slug = 'Não foi possível gerar um slug válido.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const normalized: ProductInput = {
    name,
    slug,
    code,
    category_id: categoryId,
    short_description: normalizeOptional(form.shortDescription),
    full_description: normalizeOptional(form.fullDescription),
    composition: normalizeOptional(form.composition),
    width: normalizeOptional(form.width),
    weight: normalizeOptional(form.weight),
    unit: 'rolo',
    price: price!,
    min_quantity: minQuantity!,
    notes: normalizeOptional(form.notes),
    is_featured: form.isFeatured,
    is_promoted: form.isPromoted,
    promo_price: promoPrice,
    is_active: form.isActive,
    general_status: form.generalStatus,
    seo_title: normalizeOptional(form.seoTitle),
    seo_description: normalizeOptional(form.seoDescription)
  };

  return { valid: true, errors: {}, normalized };
}

// ---------- Formulário vazio ----------

export function emptyProductForm(): ProductFormData {
  return {
    name: '',
    slug: '',
    code: '',
    categoryId: '',
    shortDescription: '',
    fullDescription: '',
    composition: '',
    width: '',
    weight: '',
    unit: 'rolo',
    price: '',
    minQuantity: '1',
    notes: '',
    isFeatured: false,
    isPromoted: false,
    promoPrice: '',
    isActive: true,
    generalStatus: 'available',
    seoTitle: '',
    seoDescription: ''
  };
}