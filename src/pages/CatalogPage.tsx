import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  listPublicProducts,
  listAllActiveCategories,
  type CatalogFilters,
  type CatalogProductListItem,
  type CatalogSort
} from '@/services/catalog.service';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useTrackOnMount, useTrack } from '@/hooks/useAnalytics';
import type { Category } from '@/types/database';
import clsx from 'clsx';

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'featured_first', label: 'Destaques primeiro' },
  { value: 'newest', label: 'Mais recentes' },
  { value: 'name_asc', label: 'Nome (A-Z)' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' }
];

export default function CatalogPage() {
  useTrackOnMount({ eventType: 'catalog_view', source: 'catalog' });
  const track = useTrack();

  const [products, setProducts] = useState<CatalogProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState<CatalogFilters>({
    search: '',
    categoryId: '',
    colorName: '',
    composition: '',
    onlyAvailable: false,
    onlyPromoted: false
  });
  const [sort, setSort] = useState<CatalogSort>('featured_first');

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const list = await listPublicProducts(filters, sort);
      setProducts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar catálogo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listAllActiveCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort]);

  // Registra busca com debounce (500ms)
  useEffect(() => {
    const term = filters.search?.trim();
    if (!term || term.length < 3) return;

    const timer = window.setTimeout(() => {
      track({ eventType: 'search', searchTerm: term, source: 'catalog' });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [filters.search, track]);

  // Registra aplicação de filtro
  useEffect(() => {
    const hasFilter =
      (filters.categoryId && filters.categoryId !== '') ||
      (filters.colorName && filters.colorName.trim() !== '') ||
      (filters.composition && filters.composition.trim() !== '') ||
      filters.onlyAvailable === true ||
      filters.onlyPromoted === true;

    if (hasFilter) {
      track({ eventType: 'filter_applied', source: 'catalog' });
    }
  }, [
    filters.categoryId,
    filters.colorName,
    filters.composition,
    filters.onlyAvailable,
    filters.onlyPromoted,
    track
  ]);

  // Conta filtros ativos (para o badge do botão mobile)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.colorName && filters.colorName.trim() !== '') count++;
    if (filters.composition && filters.composition.trim() !== '') count++;
    if (filters.onlyAvailable) count++;
    if (filters.onlyPromoted) count++;
    return count;
  }, [filters]);

  function clearFilters() {
    setFilters({
      search: '',
      categoryId: '',
      colorName: '',
      composition: '',
      onlyAvailable: false,
      onlyPromoted: false
    });
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      {/* Cabeçalho */}
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold">Catálogo</h1>
        <p className="text-sm text-brand-black/60 mt-1">
          Tecidos atacadistas em rolos fechados.
        </p>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
        <input
          type="text"
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Buscar por nome, código ou palavra-chave"
          aria-label="Buscar produtos"
          className="w-full pl-10 pr-3 py-3 border border-black/15 rounded-xl text-sm focus:border-brand-red outline-none bg-white"
        />
      </div>

      {/* Barra de controles */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-black/15 hover:bg-black/5 text-sm bg-white"
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={16} />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-1 bg-brand-red text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as CatalogSort)}
          aria-label="Ordenar"
          className="px-3 py-2 rounded-lg border border-black/15 hover:bg-black/5 text-sm bg-white focus:border-brand-red outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="ml-auto text-xs text-black/50">
          {loading ? 'Carregando...' : `${products.length} ${products.length === 1 ? 'produto' : 'produtos'}`}
        </div>
      </div>

      {/* Painel de filtros (colapsável) */}
      {filtersOpen && (
        <div className="bg-white rounded-xl border border-black/5 p-4 mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Filtros</p>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-brand-red hover:underline inline-flex items-center gap-1"
              >
                <X size={12} /> Limpar
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Categoria */}
            <div>
              <label htmlFor="f-cat" className="block text-xs font-medium text-black/60 mb-1">
                Categoria
              </label>
              <select
                id="f-cat"
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

            {/* Cor */}
            <div>
              <label htmlFor="f-color" className="block text-xs font-medium text-black/60 mb-1">
                Cor
              </label>
              <input
                id="f-color"
                type="text"
                value={filters.colorName ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, colorName: e.target.value }))}
                placeholder="Ex: preto, rosa"
                className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:border-brand-red outline-none"
              />
            </div>

            {/* Composição */}
            <div>
              <label htmlFor="f-comp" className="block text-xs font-medium text-black/60 mb-1">
                Composição
              </label>
              <input
                id="f-comp"
                type="text"
                value={filters.composition ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, composition: e.target.value }))}
                placeholder="Ex: poliéster, algodão"
                className="w-full px-3 py-2 border border-black/15 rounded-lg text-sm focus:border-brand-red outline-none"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col justify-end gap-2">
              <label className="text-sm flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.onlyAvailable === true}
                  onChange={(e) => setFilters((f) => ({ ...f, onlyAvailable: e.target.checked }))}
                  className="w-4 h-4"
                />
                Só disponíveis
              </label>
              <label className="text-sm flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.onlyPromoted === true}
                  onChange={(e) => setFilters((f) => ({ ...f, onlyPromoted: e.target.checked }))}
                  className="w-4 h-4"
                />
                Só em promoção
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Estados */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-brand-red text-sm rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => void reload()} className="underline">Tentar novamente</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-black/5 overflow-hidden animate-pulse">
              <div className="aspect-square bg-neutral-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-neutral-200 rounded w-2/3" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-black/5">
          <p className="text-sm font-medium text-black/70">Nenhum produto encontrado</p>
          <p className="text-xs text-black/50 mt-1">
            Tente ajustar a busca ou limpar os filtros.
          </p>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-sm text-brand-red hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Grid de produtos */}
      {!loading && !error && products.length > 0 && (
        <ul className={clsx('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3')}>
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}