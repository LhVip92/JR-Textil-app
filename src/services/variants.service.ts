import { supabase } from '@/lib/supabase';
import type { ProductVariant, VariantStatus } from '@/types/database';

export interface VariantInput {
  color_name: string;
  internal_code: string | null;
  hex_color: string | null;
  image_url: string | null;
  status: VariantStatus;
  display_order: number;
  is_active: boolean;
}

// ---------- Listagem ----------

export async function listProductVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('display_order', { ascending: true });

  if (error) throw new Error('Não foi possível carregar as cores do produto.');
  return (data ?? []) as ProductVariant[];
}

// ---------- Criação ----------

export async function createVariant(productId: string, input: VariantInput): Promise<ProductVariant> {
  // Próxima posição na ordem
  const existing = await listProductVariants(productId);
  const nextOrder = existing.length;

  const payload = {
    product_id: productId,
    color_name: input.color_name.trim(),
    internal_code: input.internal_code?.trim() || null,
    hex_color: input.hex_color?.trim() || null,
    image_url: input.image_url?.trim() || null,
    status: input.status,
    display_order: nextOrder,
    is_active: input.is_active
  };

  const { data, error } = await supabase
    .from('product_variants')
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.message.includes('duplicate')) {
      throw new Error('Já existe uma cor com estes dados neste produto.');
    }
    throw new Error('Não foi possível adicionar a cor.');
  }

  return data as ProductVariant;
}

// ---------- Atualização ----------

export async function updateVariant(id: string, input: Partial<VariantInput>): Promise<ProductVariant> {
  const payload: Record<string, unknown> = {};

  if (input.color_name !== undefined) payload.color_name = input.color_name.trim();
  if (input.internal_code !== undefined) payload.internal_code = input.internal_code?.trim() || null;
  if (input.hex_color !== undefined) payload.hex_color = input.hex_color?.trim() || null;
  if (input.image_url !== undefined) payload.image_url = input.image_url?.trim() || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.display_order !== undefined) payload.display_order = input.display_order;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  const { data, error } = await supabase
    .from('product_variants')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Não foi possível atualizar a cor.');
  return data as ProductVariant;
}

// ---------- Exclusão ----------

export async function deleteVariant(id: string): Promise<void> {
  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.message.includes('foreign key') || error.message.includes('violates')) {
      throw new Error('Não é possível remover: esta cor está em uso em algum pedido.');
    }
    throw new Error('Não foi possível remover a cor.');
  }
}

// ---------- Reordenação ----------

export async function reorderVariants(_productId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    if (!id) continue;
    const { error } = await supabase
      .from('product_variants')
      .update({ display_order: i })
      .eq('id', id);
    if (error) throw new Error('Não foi possível reordenar as cores.');
  }
}