import { supabase } from '@/lib/supabase';
import type { Product, Category, ProductVariant, ProductImage } from '@/types/database';

// ---------- Tipos ----------

export interface CatalogFilters {
  search?: string;
  categoryId?: string;
  colorName?: string;
  composition?: string;
  onlyAvailable?: boolean;
  onlyPromoted?: boolean;
}

export type CatalogSort = 'name_asc' | 'price_asc' | 'price_desc' | 'featured_first' | 'newest';

export interface CatalogProductListItem extends Product {
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  images: Pick<ProductImage, 'id' | 'storage_path' | 'is_primary' | 'display_order'>[];
  variants_count: number;
}

export interface CatalogProductDetail extends Product {
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

// ---------- Listagem pública ----------

export async function listPublicProducts(
  filters: CatalogFilters = {},
  sort: CatalogSort = 'featured_first'
): Promise<CatalogProductListItem[]> {
  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      images:product_images(id, storage_path, is_primary, display_order),
      variants:product_variants(id, status, is_active)
    `)
    .eq('is_active', true)
    .is('archived_at', null);

  // Busca por nome ou código
  if (filters.search && filters.search.trim() !== '') {
    const term = filters.search.trim();
    query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%,short_description.ilike.%${term}%`);
  }

  // Filtro por categoria
  if (filters.categoryId && filters.categoryId !== '') {
    query = query.eq('category_id', filters.categoryId);
  }

  // Filtro por composição (texto)
  if (filters.composition && filters.composition.trim() !== '') {
    query = query.ilike('composition', `%${filters.composition.trim()}%`);
  }

  // Filtro por promoção
  if (filters.onlyPromoted) {
    query = query.eq('is_promoted', true);
  }

  // Filtro por disponibilidade (status geral)
  if (filters.onlyAvailable) {
    query = query.in('general_status', ['available', 'low_stock']);
  }

  // Ordenação
  switch (sort) {
    case 'name_asc':
      query = query.order('name', { ascending: true });
      break;
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'featured_first':
    default:
      query = query.order('is_featured', { ascending: false }).order('name', { ascending: true });
      break;
  }

  const { data, error } = await query;
  if (error) throw new Error('Não foi possível carregar o catálogo.');

  // Processa o retorno: extrai variants_count e mantém apenas a ordem certa das imagens
  const rows = (data ?? []) as unknown as (Product & {
    category: Category | null;
    images: ProductImage[];
    variants: Pick<ProductVariant, 'id' | 'status' | 'is_active'>[];
  })[];

  let list: CatalogProductListItem[] = rows.map((row) => {
    const activeVariants = row.variants.filter((v) => v.is_active);
    const sortedImages = [...row.images].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.display_order - b.display_order;
    });

    return {
      ...row,
      category: row.category ? { id: row.category.id, name: row.category.name, slug: row.category.slug } : null,
      images: sortedImages.map((i) => ({
        id: i.id,
        storage_path: i.storage_path,
        is_primary: i.is_primary,
        display_order: i.display_order
      })),
      variants_count: activeVariants.length
    };
  });

  // Filtro por cor (aplica depois, pois precisa checar variants)
  if (filters.colorName && filters.colorName.trim() !== '') {
    const colorTerm = filters.colorName.trim().toLowerCase();
    // Busca produtos que tenham ao menos 1 variante ativa com essa cor
    const productIds = rows
      .filter((r) =>
        r.variants.some(
          (v) => v.is_active && (v as unknown as { color_name?: string }).color_name?.toLowerCase().includes(colorTerm)
        )
      )
      .map((r) => r.id);
    list = list.filter((p) => productIds.includes(p.id));
  }

  return list;
}

// ---------- Detalhes de um produto ----------

export async function getPublicProductBySlug(slug: string): Promise<CatalogProductDetail | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, slug),
      images:product_images(*),
      variants:product_variants(*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .is('archived_at', null)
    .maybeSingle();

  if (error) throw new Error('Não foi possível carregar o produto.');

  if (!data) return null;

  const row = data as unknown as Product & {
    category: Category | null;
    images: ProductImage[];
    variants: ProductVariant[];
  };

  const sortedImages = [...row.images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  const sortedVariants = [...row.variants]
    .filter((v) => v.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  return {
    ...row,
    category: row.category ? { id: row.category.id, name: row.category.name, slug: row.category.slug } : null,
    images: sortedImages,
    variants: sortedVariants
  };
}

// ---------- Destaques e lançamentos (para a Home) ----------

export async function listFeaturedProducts(limit = 6): Promise<CatalogProductListItem[]> {
  return listPublicProducts({}, 'featured_first').then((list) =>
    list.filter((p) => p.is_featured).slice(0, limit)
  );
}

export async function listPromotedProducts(limit = 6): Promise<CatalogProductListItem[]> {
  return listPublicProducts({ onlyPromoted: true }, 'newest').then((list) => list.slice(0, limit));
}

export async function listLatestProducts(limit = 6): Promise<CatalogProductListItem[]> {
  return listPublicProducts({}, 'newest').then((list) => list.slice(0, limit));
}

export async function listAllActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error('Não foi possível carregar as categorias.');
  return (data ?? []) as Category[];
}