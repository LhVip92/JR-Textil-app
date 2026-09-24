import { supabase } from '@/lib/supabase';

const BUCKET = 'product-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface UploadedImage {
  id: string;
  storage_path: string;
  publicUrl: string;
}

export interface ProductImageRecord {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

// ---------- Validação ----------

function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato inválido. Use JPG, PNG ou WebP.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Imagem muito grande. Máximo 5MB.');
  }
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-');
}

// ---------- Upload ----------

export async function uploadProductImage(productId: string, file: File): Promise<UploadedImage> {
  validateFile(file);

  const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
  const path = `${productId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    throw new Error('Falha no upload da imagem. Tente novamente.');
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // Verifica se já existe alguma imagem deste produto
  const existing = await listProductImages(productId);
  const isFirst = existing.length === 0;

  const { data: inserted, error: dbError } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: publicUrl,
      alt_text: null,
      display_order: existing.length,
      is_primary: isFirst
    })
    .select()
    .single();

  if (dbError) {
    // Se falhou ao inserir no banco, tenta remover do storage
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error('Falha ao salvar a imagem. Tente novamente.');
  }

  return {
    id: inserted.id,
    storage_path: inserted.storage_path,
    publicUrl
  };
}

// ---------- Listagem ----------

export async function listProductImages(productId: string): Promise<ProductImageRecord[]> {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('display_order', { ascending: true });

  if (error) throw new Error('Não foi possível carregar as imagens.');
  return (data ?? []) as ProductImageRecord[];
}

// ---------- Ações ----------

export async function setPrimaryImage(imageId: string, productId: string): Promise<void> {
  // Desmarca todas as outras
  const { error: clearError } = await supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId);

  if (clearError) throw new Error('Não foi possível atualizar a imagem principal.');

  // Marca a escolhida
  const { error: setError } = await supabase
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId);

  if (setError) throw new Error('Não foi possível definir a imagem principal.');
}

export async function updateImageAltText(imageId: string, altText: string): Promise<void> {
  const { error } = await supabase
    .from('product_images')
    .update({ alt_text: altText.trim() || null })
    .eq('id', imageId);

  if (error) throw new Error('Não foi possível atualizar o texto alternativo.');
}

export async function updateImageOrder(imageId: string, displayOrder: number): Promise<void> {
  const { error } = await supabase
    .from('product_images')
    .update({ display_order: displayOrder })
    .eq('id', imageId);

  if (error) throw new Error('Não foi possível reordenar a imagem.');
}

export async function deleteProductImage(imageId: string, publicUrl: string): Promise<void> {
  // Extrai o path do storage da URL pública
  const bucketMarker = `/${BUCKET}/`;
  const markerIndex = publicUrl.indexOf(bucketMarker);
  const storagePath = markerIndex >= 0 ? publicUrl.slice(markerIndex + bucketMarker.length) : null;

  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }

  const { error } = await supabase.from('product_images').delete().eq('id', imageId);
  if (error) throw new Error('Não foi possível remover a imagem.');
}

/**
 * Reordena uma lista de imagens inteira.
 * A primeira da lista recebe display_order 0, a segunda 1, etc.
 * Se a principal foi removida, a primeira restante vira principal.
 */
export async function reorderProductImages(productId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    if (!id) continue;
    const { error } = await supabase
      .from('product_images')
      .update({ display_order: i })
      .eq('id', id);
    if (error) throw new Error('Não foi possível reordenar as imagens.');
  }

  // Se não houver principal, marca a primeira
  const imgs = await listProductImages(productId);
  if (imgs.length > 0 && !imgs.some((i) => i.is_primary)) {
    const first = imgs[0];
    if (first) await setPrimaryImage(first.id, productId);
  }
}