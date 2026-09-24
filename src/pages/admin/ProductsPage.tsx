import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Archive, RotateCcw, Eye, EyeOff, Pencil } from 'lucide-react';
import {
  listAdminProducts,
  archiveProduct,
  restoreProduct,
  setProductActive,
  type ProductFilters,
  type ProductListItem
} from '@/services/products.service';
import { listAllCategories } from '@/services/categories.service';
import type { Category } from '@/types/database';
import { UNIT_LABELS, STATUS_LABELS, PRODUCT_STATUSES } from '@/domain/product';
import { formatBRL } from '@/domain/money';
import clsx from 'clsx';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    categoryId: '',
    status: '',
    isActive: undefined,
    showArchived: false
  });

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [list, cats] = await Promise.all([
        listAdminProducts(filters),
        listAllCategories()
      ]);
      setProducts(list);
      setCategories(cats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function handleArchive(p: ProductListItem) {
    if (!confirm(`Arquivar o produto "${p.name}"? Ele deixará de aparecer no catálogo.`)) return;
    setBusyId(p.id);
    try {
      await archiveProduct(p.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao arquivar.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(p: ProductListItem) {
    setBusyId(p.id);
    try {
      await restoreProduct(p.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao restaurar.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(p: ProductListItem) {
    setBusyId(p.id);
    try {
      await setProductActive(p.id, !p.is_active);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar status.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-xl font-bold">Produtos</h1>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-1 bg-brand-red hover:bg-brand-redDark text-white font-semibold px-3 py-2 rounded-lg text-sm"
        >
          <Plus size={16} />
          Novo produto
        </Link>
      </div>
      <p className="text-sm text-black/60 mb-5">
        Gerencie o catálogo da loja. Produtos arquivados não aparecem no site.
      </p>

      <div className="bg-white rounded-xl border border-black/5 p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs font-medium text-black/60 mb-1" htmlFor="search">
            Buscar
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              id="search"
              type="text"
              value={filters.search ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Nome ou código"
              className="w-full pl-9 pr-3 py-2 border border-black/15 rounded-lg text-sm focus:border-brand-red outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-black/60 mb-1" htmlFor="filter-cat">
            Categoria
          </label>
          <select
            id="filter-cat"
            value={filters.categoryId ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
            className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm bg-white focus:border-brand-red outline-none"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-black/60 mb-1" htmlFor="filter-status">
            Status
          </label>
          <select
            id="filter-status"
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm bg-white focus:border-brand-red outline-none"
          >
            <option value="">Todos</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-3">
          <label className="text-xs flex items-center gap-1 select-none">
            <input
              type="checkbox"
              checked={filters.isActive === false}
              onChange={(e) =>
                setFilters((f) => ({ ...f, isActive: e.target.checked ? false : undefined }))
              }
            />
            Só ocultos
          </label>
          <label className="text-xs flex items-center gap-1 select-none">
            <input
              type="checkbox"
              checked={filters.showArchived === true}
              onChange={(e) =>
                setFilters((f) => ({ ...f, showArchived: e.target.checked }))
              }
            />
            Arquivados
          </label>
        </div>
      </div>

      {loading && <p className="text-sm text-black/60">Carregando...</p>}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-brand-red text-sm rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => void reload()} className="underline">Tentar novamente</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="text-xs text-black/50 mb-3">
            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
          </p>

          {products.length === 0 && (
            <p className="text-sm text-black/60 bg-white rounded-xl border border-black/5 p-6 text-center">
              Nenhum produto encontrado com estes filtros.
            </p>
          )}

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                busy={busyId === p.id}
                onToggleActive={() => void handleToggleActive(p)}
                onArchive={() => void handleArchive(p)}
                onRestore={() => void handleRestore(p)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ProductCard({
  product,
  busy,
  onToggleActive,
  onArchive,
  onRestore
}: {
  product: ProductListItem;
  busy: boolean;
  onToggleActive: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
  const isArchived = product.archived_at !== null;

  return (
    <li className={clsx('bg-white rounded-xl border border-black/5 overflow-hidden flex flex-col', busy && 'opacity-60')}>
      <div className="aspect-video bg-neutral-100 flex items-center justify-center overflow-hidden">
        {primary ? (
          <img
            src={primary.storage_path}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-xs text-black/40">Sem imagem</span>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{product.name}</p>
            <p className="text-xs text-black/50 truncate">
              {product.code} · {product.category?.name ?? 'Sem categoria'}
            </p>
          </div>
          {isArchived && (
            <span className="text-[10px] uppercase tracking-wide bg-black/10 text-black/60 px-2 py-0.5 rounded">arquivado</span>
          )}
          {!isArchived && !product.is_active && (
            <span className="text-[10px] uppercase tracking-wide bg-black/10 text-black/60 px-2 py-0.5 rounded">oculto</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-black/60 mt-1">
          <span>{formatBRL(product.price)}</span>
          <span>·</span>
          <span>{UNIT_LABELS[product.unit]}</span>
          <span>·</span>
          <span>{STATUS_LABELS[product.general_status]}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-black/5">
          <Link
            to={`/admin/products/${product.id}/edit`}
            className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:bg-black/5"
            aria-label={`Editar ${product.name}`}
          >
            <Pencil size={14} /> Editar
          </Link>

          {!isArchived && (
            <>
              <button
                onClick={onToggleActive}
                disabled={busy}
                className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:bg-black/5 disabled:opacity-50"
                aria-label={product.is_active ? `Ocultar ${product.name}` : `Reativar ${product.name}`}
              >
                {product.is_active ? <><EyeOff size={14} /> Ocultar</> : <><Eye size={14} /> Reativar</>}
              </button>

              <button
                onClick={onArchive}
                disabled={busy}
                className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:bg-black/5 text-brand-red disabled:opacity-50"
                aria-label={`Arquivar ${product.name}`}
              >
                <Archive size={14} /> Arquivar
              </button>
            </>
          )}

          {isArchived && (
            <button
              onClick={onRestore}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:bg-black/5 disabled:opacity-50"
              aria-label={`Restaurar ${product.name}`}
            >
              <RotateCcw size={14} /> Restaurar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}