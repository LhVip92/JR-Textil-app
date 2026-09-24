import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import {
  listProductVariants,
  createVariant,
  updateVariant,
  deleteVariant,
  reorderVariants
} from '@/services/variants.service';
import {
  emptyVariantForm,
  validateVariant,
  VARIANT_STATUSES,
  VARIANT_STATUS_LABELS,
  type VariantFormData
} from '@/domain/variant';
import type { ProductVariant, VariantStatus } from '@/types/database';
import clsx from 'clsx';

interface VariantsManagerProps {
  productId: string;
}

export function VariantsManager({ productId }: VariantsManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setVariants(await listProductVariants(productId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar cores.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function handleDelete(v: ProductVariant) {
    if (!confirm(`Remover a cor "${v.color_name}"?`)) return;
    setBusyId(v.id);
    try {
      await deleteVariant(v.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover cor.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(v: ProductVariant) {
    setBusyId(v.id);
    try {
      await updateVariant(v.id, { is_active: !v.is_active });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar cor.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(v: ProductVariant, direction: 'up' | 'down') {
    const index = variants.findIndex((x) => x.id === v.id);
    if (index < 0) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= variants.length) return;

    const reordered = [...variants];
    const a = reordered[index];
    const b = reordered[target];
    if (!a || !b) return;
    reordered[index] = b;
    reordered[target] = a;

    setBusyId(v.id);
    try {
      await reorderVariants(productId, reordered.map((x) => x.id));
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao reordenar.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <NewVariantForm productId={productId} onCreated={reload} />

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-brand-red text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-black/60">Carregando cores...</p>}

      {!loading && variants.length === 0 && (
        <p className="text-sm text-black/60 bg-white border border-dashed border-black/15 rounded-lg p-6 text-center">
          Nenhuma cor cadastrada. Adicione a primeira.
        </p>
      )}

      {!loading && variants.length > 0 && (
        <ul className="divide-y divide-black/5 bg-white rounded-xl border border-black/5">
          {variants.map((v, index) => (
            <li key={v.id} className={clsx('p-3 flex items-center gap-3', busyId === v.id && 'opacity-60')}>
              {editingId === v.id ? (
                <EditVariantRow
                  variant={v}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null);
                    void reload();
                  }}
                />
              ) : (
                <>
                  <span
                    className="w-6 h-6 rounded-full border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: v.hex_color ?? '#e5e5e5' }}
                    aria-hidden="true"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {v.color_name}
                      {!v.is_active && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide bg-black/10 text-black/60 px-2 py-0.5 rounded">
                          inativa
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-black/50 truncate">
                      {v.internal_code ? `${v.internal_code} · ` : ''}
                      {VARIANT_STATUS_LABELS[v.status]}
                      {v.hex_color ? ` · ${v.hex_color}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleMove(v, 'up')}
                      disabled={busyId === v.id || index === 0}
                      className="p-1.5 rounded hover:bg-black/5 disabled:opacity-30"
                      aria-label="Mover para cima"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMove(v, 'down')}
                      disabled={busyId === v.id || index === variants.length - 1}
                      className="p-1.5 rounded hover:bg-black/5 disabled:opacity-30"
                      aria-label="Mover para baixo"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(v)}
                      disabled={busyId === v.id}
                      className="text-[11px] px-2 py-1 rounded hover:bg-black/5 disabled:opacity-50"
                    >
                      {v.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(v.id)}
                      className="p-1.5 rounded hover:bg-black/5"
                      aria-label={`Editar ${v.color_name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(v)}
                      disabled={busyId === v.id}
                      className="p-1.5 rounded hover:bg-black/5 text-brand-red disabled:opacity-50"
                      aria-label={`Remover ${v.color_name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Formulário de criação ----------

function NewVariantForm({ productId, onCreated }: { productId: string; onCreated: () => void }) {
  const [form, setForm] = useState<VariantFormData>(emptyVariantForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  async function handleSubmit() {
    setGeneralError(null);
    const validation = validateVariant(form);
    setErrors(validation.errors);
    if (!validation.valid || !validation.normalized) return;

    setSubmitting(true);
    try {
      await createVariant(productId, {
        ...validation.normalized,
        image_url: null,
        display_order: 0
      });
      setForm(emptyVariantForm());
      setErrors({});
      onCreated();
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Erro ao criar cor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-black/70">Adicionar nova cor</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="variant-color-name" className="block text-xs font-medium text-black/60 mb-1">
            Nome da cor *
          </label>
          <input
            id="variant-color-name"
            type="text"
            value={form.color_name}
            onChange={(e) => setForm((f) => ({ ...f, color_name: e.target.value }))}
            placeholder="Branco, Preto, Rosa..."
            className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:border-brand-red outline-none"
          />
          {errors.color_name && <p className="text-xs text-brand-red mt-1">{errors.color_name}</p>}
        </div>

        <div>
          <label htmlFor="variant-internal-code" className="block text-xs font-medium text-black/60 mb-1">
            Código interno
          </label>
          <input
            id="variant-internal-code"
            type="text"
            value={form.internal_code}
            onChange={(e) => setForm((f) => ({ ...f, internal_code: e.target.value }))}
            placeholder="Opcional"
            className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:border-brand-red outline-none"
          />
          {errors.internal_code && <p className="text-xs text-brand-red mt-1">{errors.internal_code}</p>}
        </div>

        <div>
          <label htmlFor="variant-hex" className="block text-xs font-medium text-black/60 mb-1">
            Cor (hex)
          </label>
          <div className="flex gap-2">
            <input
              id="variant-hex"
              type="text"
              value={form.hex_color}
              onChange={(e) => setForm((f) => ({ ...f, hex_color: e.target.value }))}
              placeholder="#RRGGBB"
              className="flex-1 px-3 py-2 border border-black/15 rounded-lg text-sm focus:border-brand-red outline-none"
            />
            <input
              type="color"
              value={form.hex_color && /^#[0-9a-fA-F]{6}$/.test(form.hex_color) ? form.hex_color : '#ffffff'}
              onChange={(e) => setForm((f) => ({ ...f, hex_color: e.target.value }))}
              aria-label="Seletor de cor"
              className="w-10 h-10 rounded border border-black/15 cursor-pointer"
            />
          </div>
          {errors.hex_color && <p className="text-xs text-brand-red mt-1">{errors.hex_color}</p>}
        </div>

        <div>
          <label htmlFor="variant-status" className="block text-xs font-medium text-black/60 mb-1">
            Status
          </label>
          <select
            id="variant-status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VariantStatus }))}
            className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm bg-white focus:border-brand-red outline-none"
          >
            {VARIANT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VARIANT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {generalError && <p className="text-xs text-brand-red">{generalError}</p>}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="inline-flex items-center gap-1 bg-brand-red hover:bg-brand-redDark text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-60"
      >
        <Plus size={16} />
        {submitting ? 'Adicionando...' : 'Adicionar cor'}
      </button>
    </div>
  );
}

// ---------- Edição inline ----------

function EditVariantRow({
  variant,
  onCancel,
  onSaved
}: {
  variant: ProductVariant;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<VariantFormData>({
    color_name: variant.color_name,
    internal_code: variant.internal_code ?? '',
    hex_color: variant.hex_color ?? '',
    status: variant.status,
    is_active: variant.is_active
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const validation = validateVariant(form);
    if (!validation.valid || !validation.normalized) {
      const firstError = Object.values(validation.errors)[0];
      setError(firstError ?? 'Verifique os campos.');
      return;
    }

    setSaving(true);
    try {
      await updateVariant(variant.id, validation.normalized);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 space-y-2">
      <div className="grid gap-2 sm:grid-cols-4">
        <input
          type="text"
          value={form.color_name}
          onChange={(e) => setForm((f) => ({ ...f, color_name: e.target.value }))}
          placeholder="Nome"
          className="px-2 py-1 border border-black/15 rounded text-sm"
          aria-label="Nome da cor"
        />
        <input
          type="text"
          value={form.internal_code}
          onChange={(e) => setForm((f) => ({ ...f, internal_code: e.target.value }))}
          placeholder="Código"
          className="px-2 py-1 border border-black/15 rounded text-sm"
          aria-label="Código interno"
        />
        <input
          type="text"
          value={form.hex_color}
          onChange={(e) => setForm((f) => ({ ...f, hex_color: e.target.value }))}
          placeholder="#RRGGBB"
          className="px-2 py-1 border border-black/15 rounded text-sm"
          aria-label="Cor hexadecimal"
        />
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VariantStatus }))}
          className="px-2 py-1 border border-black/15 rounded text-sm bg-white"
          aria-label="Status"
        >
          {VARIANT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {VARIANT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-brand-red">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="p-1.5 rounded hover:bg-black/5 disabled:opacity-50"
          aria-label="Salvar"
        >
          <Check size={16} className="text-green-600" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="p-1.5 rounded hover:bg-black/5 disabled:opacity-50"
          aria-label="Cancelar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}