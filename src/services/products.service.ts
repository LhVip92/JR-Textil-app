import { supabase } from '@/lib/supabase';
import type { Product, Category, ProductImage } from '@/types/database';
import type { ProductInput } from '@/domain/product';

// ---------- Tipos estendidos ----------

export interface ProductListItem extends Product {
  category: Pick<Category, 'id' | 'name'> | null;
  images: Pick<ProductImage, 'id' | 'storage_path' | 'is_primary' | 'display_order'>[];
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  status?: string;
  isActive?: boolean;
  showArchived?: boolean;
}

// ---------- Consultas ----------

export async function listAdminProducts(filters: ProductFilters = {}): Promise<ProductListItem[]> {
  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name),
      images:product_images(id, storage_path, is_primary, display_order)
    `)
    .order('created_at', { ascending: false });

  if (filters.search && filters.search.trim() !== '') {
    const term = filters.search.trim();
    query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
  }

  if (filters.categoryId && filters.categoryId !== '') {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.status && filters.status !== '') {
    query = query.eq('general_status', filters.status);
  }

  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters.showArchived) {
    query = query.not('archived_at', 'is', null);
  } else {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(translateSupabaseError(error.message));
  return (data ?? []) as unknown as ProductListItem[];
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(translateSupabaseError(error.message));
  return (data as Product | null) ?? null;
}

// ---------- Mutações ----------

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(translateSupabaseError(error.message));
  return data as Product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(translateSupabaseError(error.message));
  return data as Product;
}

export async function archiveProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw new Error(translateSupabaseError(error.message));
}

export async function restoreProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ archived_at: null })
    .eq('id', id);
  if (error) throw new Error(translateSupabaseError(error.message));
}

export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw new Error(translateSupabaseError(error.message));
}

// ---------- Verificações de unicidade ----------

export async function checkProductCodeExists(code: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('code', code.trim());
  if (excludeId) query = query.neq('id', excludeId);
  const { count, error } = await query;
  if (error) throw new Error(translateSupabaseError(error.message));
  return (count ?? 0) > 0;
}

export async function checkProductSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug.trim());
  if (excludeId) query = query.neq('id', excludeId);
  const { count, error } = await query;
  if (error) throw new Error(translateSupabaseError(error.message));
  return (count ?? 0) > 0;
}

// ---------- Tradução de erros ----------

function translateSupabaseError(message: string): string {
  if (message.includes('products_code_key')) return 'Já existe um produto com este código.';
  if (message.includes('products_slug_key')) return 'Já existe um produto com este slug.';
  if (message.includes('duplicate key')) return 'Já existe um produto com estes dados.';
  if (message.includes('violates foreign key')) return 'A categoria selecionada não existe.';
  if (message.includes('permission denied') || message.includes('row-level security')) {
    return 'Você não tem permissão para esta operação.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }
  return 'Não foi possível completar a operação. Tente novamente.';
}