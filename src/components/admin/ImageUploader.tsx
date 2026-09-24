import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Upload, Trash2, Star, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import {
  uploadProductImage,
  listProductImages,
  setPrimaryImage,
  updateImageAltText,
  deleteProductImage,
  reorderProductImages,
  type ProductImageRecord
} from '@/services/images.service';
import clsx from 'clsx';

interface ImageUploaderProps {
  productId: string;
}

interface UploadingFile {
  tempId: string;
  filename: string;
  error: string | null;
}

export function ImageUploader({ productId }: ImageUploaderProps) {
  const [images, setImages] = useState<ProductImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setImages(await listProductImages(productId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar imagens.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    // Registra todos como "enviando"
    const pending: UploadingFile[] = fileList.map((f, i) => ({
      tempId: `${Date.now()}-${i}`,
      filename: f.name,
      error: null
    }));
    setUploading((prev) => [...prev, ...pending]);

    // Faz upload um por um para preservar ordem
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const temp = pending[i];
      if (!file || !temp) continue;

      try {
        await uploadProductImage(productId, file);
        setUploading((prev) => prev.filter((u) => u.tempId !== temp.tempId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha no upload.';
        setUploading((prev) =>
          prev.map((u) => (u.tempId === temp.tempId ? { ...u, error: message } : u))
        );
      }
    }

    // Limpa input
    if (fileInputRef.current) fileInputRef.current.value = '';
    await reload();
  }

  async function handleSetPrimary(id: string) {
    setBusyId(id);
    try {
      await setPrimaryImage(id, productId);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao definir principal.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(img: ProductImageRecord) {
    if (!confirm('Remover esta imagem? A ação não pode ser desfeita.')) return;
    setBusyId(img.id);
    try {
      await deleteProductImage(img.id, img.storage_path);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover imagem.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(img: ProductImageRecord, direction: 'up' | 'down') {
    const index = images.findIndex((i) => i.id === img.id);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    const a = reordered[index];
    const b = reordered[targetIndex];
    if (!a || !b) return;
    reordered[index] = b;
    reordered[targetIndex] = a;

    setBusyId(img.id);
    try {
      await reorderProductImages(productId, reordered.map((i) => i.id));
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao reordenar.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleAltTextBlur(img: ProductImageRecord, value: string) {
    if (value === (img.alt_text ?? '')) return;
    try {
      await updateImageAltText(img.id, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar texto alternativo.');
    }
  }

  return (
    <div className="space-y-4">
      {/* ---------- Input de upload ---------- */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFiles}
          className="hidden"
          id="image-upload-input"
        />
        <label
          htmlFor="image-upload-input"
          className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-redDark text-white font-semibold px-4 py-2 rounded-lg cursor-pointer text-sm"
        >
          <Upload size={16} />
          Adicionar imagens
        </label>
        <p className="text-xs text-black/50 mt-2">
          JPG, PNG ou WebP · máx 5MB cada
        </p>
      </div>

      {/* ---------- Erros gerais ---------- */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-brand-red text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* ---------- Uploads em andamento ---------- */}
      {uploading.length > 0 && (
        <ul className="space-y-1">
          {uploading.map((u) => (
            <li
              key={u.tempId}
              className={clsx(
                'text-xs px-3 py-2 rounded flex items-center gap-2',
                u.error ? 'bg-red-50 text-brand-red' : 'bg-blue-50 text-blue-700'
              )}
            >
              {u.error ? <AlertCircle size={14} /> : <Upload size={14} className="animate-pulse" />}
              <span className="truncate flex-1">{u.filename}</span>
              {u.error && <span className="text-[10px]">{u.error}</span>}
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Estados ---------- */}
      {loading && <p className="text-sm text-black/60">Carregando imagens...</p>}

      {!loading && images.length === 0 && (
        <p className="text-sm text-black/60 bg-white border border-dashed border-black/15 rounded-lg p-6 text-center">
          Nenhuma imagem. Adicione a primeira.
        </p>
      )}

      {/* ---------- Grid de imagens ---------- */}
      {!loading && images.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {images.map((img, index) => (
            <li
              key={img.id}
              className={clsx(
                'bg-white border rounded-xl overflow-hidden',
                img.is_primary ? 'border-brand-red' : 'border-black/5',
                busyId === img.id && 'opacity-60'
              )}
            >
              <div className="relative aspect-square bg-neutral-100">
                <img
                  src={img.storage_path}
                  alt={img.alt_text ?? `Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {img.is_primary && (
                  <span className="absolute top-2 left-2 bg-brand-red text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded">
                    Principal
                  </span>
                )}
              </div>

              <div className="p-2 space-y-2">
                <input
                  type="text"
                  defaultValue={img.alt_text ?? ''}
                  onBlur={(e) => void handleAltTextBlur(img, e.target.value)}
                  placeholder="Texto alternativo (acessibilidade)"
                  className="w-full text-xs px-2 py-1 border border-black/10 rounded focus:border-brand-red outline-none"
                  aria-label={`Texto alternativo da imagem ${index + 1}`}
                />

                <div className="flex flex-wrap gap-1">
                  {!img.is_primary && (
                    <button
                      onClick={() => void handleSetPrimary(img.id)}
                      disabled={busyId === img.id}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-black/5 disabled:opacity-50"
                      aria-label="Definir como principal"
                    >
                      <Star size={12} /> Principal
                    </button>
                  )}
                  <button
                    onClick={() => void handleMove(img, 'up')}
                    disabled={busyId === img.id || index === 0}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-black/5 disabled:opacity-30"
                    aria-label="Mover para cima"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => void handleMove(img, 'down')}
                    disabled={busyId === img.id || index === images.length - 1}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-black/5 disabled:opacity-30"
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    onClick={() => void handleDelete(img)}
                    disabled={busyId === img.id}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-black/5 text-brand-red disabled:opacity-50 ml-auto"
                    aria-label="Remover imagem"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}