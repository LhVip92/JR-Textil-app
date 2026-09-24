import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/database';

export async function listAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const payload = {
    name: input.name.trim(),
    slug: normalizeSlug(input.slug || input.name),
    description: input.description?.trim() || null,
    display_order: input.display_order ?? 0,
    is_active: input.is_active ?? true
  };
  const { data, error } = await supabase.from('categories').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data as Category;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.slug !== undefined) payload.slug = normalizeSlug(input.slug);
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.display_order !== undefined) payload.display_order = input.display_order;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  const { data, error } = await supabase.from('categories').update(payload).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as Category;
}