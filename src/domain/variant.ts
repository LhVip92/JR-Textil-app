import type { VariantStatus } from '@/types/database';

// ---------- Constantes ----------

export const VARIANT_STATUSES: readonly VariantStatus[] = [
  'available',
  'low_stock',
  'on_request',
  'out_of_stock'
] as const;

export const VARIANT_STATUS_LABELS: Record<VariantStatus, string> = {
  available: 'Disponível',
  low_stock: 'Estoque baixo',
  on_request: 'Sob consulta',
  out_of_stock: 'Esgotado'
};

// ---------- Tipos do formulário ----------

export interface VariantFormData {
  color_name: string;
  internal_code: string;
  hex_color: string;
  status: VariantStatus;
  is_active: boolean;
}

export interface VariantNormalized {
  color_name: string;
  internal_code: string | null;
  hex_color: string | null;
  status: VariantStatus;
  is_active: boolean;
}

export type VariantValidationErrors = Partial<Record<keyof VariantFormData, string>>;

export interface VariantValidationResult {
  valid: boolean;
  errors: VariantValidationErrors;
  normalized?: VariantNormalized;
}

// ---------- Helpers ----------

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_REGEX.test(value.trim());
}

// ---------- Formulário vazio ----------

export function emptyVariantForm(): VariantFormData {
  return {
    color_name: '',
    internal_code: '',
    hex_color: '',
    status: 'available',
    is_active: true
  };
}

// ---------- Validação ----------

export function validateVariant(form: VariantFormData): VariantValidationResult {
  const errors: VariantValidationErrors = {};

  // --- nome da cor ---
  const colorName = form.color_name.trim();
  if (colorName.length === 0) {
    errors.color_name = 'Informe o nome da cor.';
  } else if (colorName.length > 100) {
    errors.color_name = 'Nome da cor muito longo (máx. 100 caracteres).';
  }

  // --- código interno ---
  const internalCode = form.internal_code.trim();
  if (internalCode.length > 50) {
    errors.internal_code = 'Código interno muito longo (máx. 50 caracteres).';
  }

  // --- hex ---
  const hexColor = form.hex_color.trim();
  if (hexColor.length > 0 && !isValidHexColor(hexColor)) {
    errors.hex_color = 'Cor hexadecimal inválida. Use formato #RRGGBB.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const normalized: VariantNormalized = {
    color_name: colorName,
    internal_code: internalCode || null,
    hex_color: hexColor || null,
    status: form.status,
    is_active: form.is_active
  };

  return { valid: true, errors: {}, normalized };
}