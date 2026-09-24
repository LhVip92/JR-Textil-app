import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft, AlertCircle } from 'lucide-react';
import {
  emptyProductForm,
  validateProduct,
  PRODUCT_STATUSES,
  STATUS_LABELS,
  UNIT_LABELS,
  type ProductFormData
} from '@/domain/product';
import {
  getProductById,
  createProduct,
  updateProduct,
  checkProductCodeExists,
  checkProductSlugExists
} from '@/services/products.service';
import { listAllCategories } from '@/services/categories.service';
import type { Category, Product } from '@/types/database';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { VariantsManager } from '@/components/admin/VariantsManager';
import clsx from 'clsx';

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<ProductFormData>(emptyProductForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(id ?? null);

  // Carregar categorias
  useEffect(() => {
    listAllCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Carregar produto em modo edição
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProductById(id)
      .then((p) => {
        if (!p) {
          setGeneralError('Produto não encontrado.');
          return;
        }
        setForm(productToForm(p));
        setProductId(p.id);
      })
      .catch((e) => setGeneralError(e instanceof Error ? e.message : 'Erro ao carregar produto.'))
      .finally(() => setLoading(false));
  }, [id]);

  function updateField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) {
      setErrors((e) => {
        const copy = { ...e };
        delete copy[key as string];
        return copy;
      });
    }
  }

  function generateSlugFromName() {
    updateField('slug', form.name);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    // 1. Validação local
    const validation = validateProduct(form);
    if (!validation.valid || !validation.normalized) {
      setErrors(validation.errors as Record<string, string>);
      setGeneralError('Corrija os campos destacados antes de salvar.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const data = validation.normalized;
    setSaving(true);

    try {
      // 2. Verificar duplicidade de código e slug
      const [codeExists, slugExists] = await Promise.all([
        checkProductCodeExists(data.code, id),
        checkProductSlugExists(data.slug, id)
      ]);

      if (codeExists) {
        setErrors({ code: 'Já existe um produto com este código.' });
        setGeneralError('Código duplicado. Escolha outro.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSaving(false);
        return;
      }

      if (slugExists) {
        setErrors({ slug: 'Já existe um produto com este slug.' });
        setGeneralError('Slug duplicado. Altere o nome ou o slug.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSaving(false);
        return;
      }

      // 3. Criar ou atualizar
      if (isEditing && id) {
        await updateProduct(id, data);
        setSuccessMessage('Produto atualizado.');
      } else {
        const created = await createProduct(data);
        setProductId(created.id);
        setSuccessMessage('Produto criado. Agora você pode adicionar imagens e cores.');
        navigate(`/admin/products/${created.id}/edit`, { replace: true });
      }
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-sm text-black/60">Carregando produto...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl pb-24">
      {/* ---------- Cabeçalho ---------- */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/admin/products"
          className="p-2 rounded hover:bg-black/5"
          aria-label="Voltar para produtos"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">
            {isEditing ? 'Editar produto' : 'Novo produto'}
          </h1>
          <p className="text-sm text-black/60">
            {isEditing ? 'Atualize as informações do produto.' : 'Cadastre um novo tecido no catálogo.'}
          </p>
        </div>
      </div>

      {/* ---------- Alertas ---------- */}
      {generalError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-brand-red text-sm rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{generalError}</span>
        </div>
      )}
      {successMessage && (
        <div role="status" className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4">
          {successMessage}
        </div>
      )}

      {/* ---------- Seção 1: Básico ---------- */}
      <Section title="Informações básicas">
        <Field label="Nome do produto *" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={inputClass(errors.name)}
            placeholder="Ex: Alfaiataria Barbie"
          />
        </Field>

        <Field label="Slug (URL amigável)" error={errors.slug}>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => updateField('slug', e.target.value)}
              className={clsx(inputClass(errors.slug), 'flex-1')}
              placeholder="alfaiataria-barbie"
            />
            <button
              type="button"
              onClick={generateSlugFromName}
              className="text-xs px-3 py-2 rounded-lg border border-black/15 hover:bg-black/5 whitespace-nowrap"
            >
              Gerar do nome
            </button>
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código do produto *" error={errors.code}>
            <input
              type="text"
              value={form.code}
              onChange={(e) => updateField('code', e.target.value)}
              className={inputClass(errors.code)}
              placeholder="ALFA-BARBIE-001"
            />
          </Field>

          <Field label="Categoria *" error={errors.categoryId}>
            <select
              value={form.categoryId}
              onChange={(e) => updateField('categoryId', e.target.value)}
              className={clsx(inputClass(errors.categoryId), 'bg-white')}
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Descrição curta">
          <input
            type="text"
            value={form.shortDescription}
            onChange={(e) => updateField('shortDescription', e.target.value)}
            className={inputClass()}
            placeholder="Resumo de uma linha"
          />
        </Field>

        <Field label="Descrição completa">
          <textarea
            value={form.fullDescription}
            onChange={(e) => updateField('fullDescription', e.target.value)}
            rows={3}
            className={inputClass()}
            placeholder="Detalhes, aplicações, dicas de uso..."
          />
        </Field>
      </Section>

      {/* ---------- Seção 2: Especificações ---------- */}
      <Section title="Especificações técnicas">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Composição">
            <input
              type="text"
              value={form.composition}
              onChange={(e) => updateField('composition', e.target.value)}
              className={inputClass()}
              placeholder="97% Poliéster, 3% Spandex"
            />
          </Field>

          <Field label="Largura">
            <input
              type="text"
              value={form.width}
              onChange={(e) => updateField('width', e.target.value)}
              className={inputClass()}
              placeholder="1,50m"
            />
          </Field>

          <Field label="Gramatura">
            <input
              type="text"
              value={form.weight}
              onChange={(e) => updateField('weight', e.target.value)}
              className={inputClass()}
              placeholder="200g/m²"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unidade de venda">
            <input
              type="text"
              value={UNIT_LABELS[form.unit]}
              disabled
              className={clsx(inputClass(), 'bg-neutral-100 text-black/60 cursor-not-allowed')}
            />
            <p className="text-xs text-black/50 mt-1">
              Venda exclusiva em rolo fechado (atacado).
            </p>
          </Field>

          <Field label="Quantidade mínima (rolos) *" error={errors.minQuantity}>
            <input
              type="number"
              min="1"
              step="1"
              value={form.minQuantity}
              onChange={(e) => updateField('minQuantity', e.target.value)}
              className={inputClass(errors.minQuantity)}
              placeholder="1"
            />
          </Field>
        </div>
      </Section>

      {/* ---------- Seção 3: Preço ---------- */}
      <Section title="Preço">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço do rolo (R$) *" error={errors.price}>
            <input
              type="text"
              value={form.price}
              onChange={(e) => updateField('price', e.target.value)}
              className={inputClass(errors.price)}
              placeholder="487,50"
            />
          </Field>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm select-none cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPromoted}
                onChange={(e) => updateField('isPromoted', e.target.checked)}
                className="w-4 h-4"
              />
              Produto em promoção
            </label>
          </div>
        </div>

        {form.isPromoted && (
          <Field label="Preço promocional do rolo (R$) *" error={errors.promoPrice}>
            <input
              type="text"
              value={form.promoPrice}
              onChange={(e) => updateField('promoPrice', e.target.value)}
              className={inputClass(errors.promoPrice)}
              placeholder="450,00"
            />
            <p className="text-xs text-black/50 mt-1">
              Deve ser menor que o preço normal.
            </p>
          </Field>
        )}
      </Section>

      {/* ---------- Seção 4: Status ---------- */}
      <Section title="Status e destaque">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status geral">
            <select
              value={form.generalStatus}
              onChange={(e) => updateField('generalStatus', e.target.value as ProductFormData['generalStatus'])}
              className={clsx(inputClass(), 'bg-white')}
            >
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm select-none cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="w-4 h-4"
              />
              Produto ativo no catálogo
            </label>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm select-none cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => updateField('isFeatured', e.target.checked)}
                className="w-4 h-4"
              />
              Produto em destaque
            </label>
          </div>
        </div>
      </Section>

      {/* ---------- Seção 5: Imagens ---------- */}
      <Section title="Imagens do produto">
        {productId ? (
          <ImageUploader productId={productId} />
        ) : (
          <p className="text-sm text-black/60 bg-neutral-50 border border-dashed border-black/15 rounded-lg p-4">
            Salve o produto primeiro para poder adicionar imagens.
          </p>
        )}
      </Section>

      {/* ---------- Seção 6: Variações ---------- */}
      <Section title="Cores disponíveis">
        {productId ? (
          <VariantsManager productId={productId} />
        ) : (
          <p className="text-sm text-black/60 bg-neutral-50 border border-dashed border-black/15 rounded-lg p-4">
            Salve o produto primeiro para poder adicionar cores.
          </p>
        )}
      </Section>

      {/* ---------- Seção 7: SEO ---------- */}
      <Section title="SEO (opcional)">
        <Field label="Título SEO">
          <input
            type="text"
            value={form.seoTitle}
            onChange={(e) => updateField('seoTitle', e.target.value)}
            className={inputClass()}
            placeholder="Deixe em branco para usar o nome do produto"
          />
        </Field>

        <Field label="Descrição SEO">
          <textarea
            value={form.seoDescription}
            onChange={(e) => updateField('seoDescription', e.target.value)}
            rows={2}
            className={inputClass()}
            placeholder="Aparece nos resultados de busca"
          />
        </Field>
      </Section>

      {/* ---------- Rodapé fixo ---------- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 p-4 flex items-center gap-3 justify-end z-30 md:pl-64">
        <Link
          to="/admin/products"
          className="px-4 py-2 rounded-lg border border-black/15 hover:bg-black/5 text-sm"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-redDark text-white font-semibold px-5 py-2 rounded-lg text-sm disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar produto'}
        </button>
      </div>
    </form>
  );
}

// ---------- Helpers de UI ----------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-black/5 p-4 sm:p-5 mb-4 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-black/70 border-b border-black/5 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-black/60 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-brand-red mt-1">{error}</p>}
    </div>
  );
}

function inputClass(error?: string): string {
  return clsx(
    'w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors',
    error
      ? 'border-brand-red bg-red-50 focus:border-brand-red'
      : 'border-black/15 focus:border-brand-red'
  );
}

// ---------- Conversão Product -> Form ----------

function productToForm(p: Product): ProductFormData {
  return {
    name: p.name,
    slug: p.slug,
    code: p.code,
    categoryId: p.category_id ?? '',
    shortDescription: p.short_description ?? '',
    fullDescription: p.full_description ?? '',
    composition: p.composition ?? '',
    width: p.width ?? '',
    weight: p.weight ?? '',
    unit: p.unit,
    price: p.price.toString().replace('.', ','),
    minQuantity: p.min_quantity.toString(),
    notes: p.notes ?? '',
    isFeatured: p.is_featured,
    isPromoted: p.is_promoted,
    promoPrice: p.promo_price !== null ? p.promo_price.toString().replace('.', ',') : '',
    isActive: p.is_active,
    generalStatus: p.general_status,
    seoTitle: p.seo_title ?? '',
    seoDescription: p.seo_description ?? ''
  };
}