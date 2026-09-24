import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  getPublicProductBySlug,
  type CatalogProductDetail
} from '@/services/catalog.service';
import { formatBRL } from '@/domain/money';
import { STATUS_LABELS, UNIT_LABELS } from '@/domain/product';
import { isVariantSelectable, isQuantityValid } from '@/domain/cart';
import { useCart } from '@/hooks/useCart';
import { useTrack } from '@/hooks/useAnalytics';
import type { ProductVariant } from '@/types/database';
import clsx from 'clsx';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const track = useTrack();

  const [product, setProduct] = useState<CatalogProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getPublicProductBySlug(slug)
      .then((p) => {
        if (!p) {
          setNotFound(true);
          return;
        }
        setProduct(p);
        const firstSelectable = p.variants.find((v) => isVariantSelectable(v.status));
        setSelectedVariantId(firstSelectable?.id ?? null);
        setQuantity(p.min_quantity);
        setQuantityInput(String(p.min_quantity));

        // Registra visualização do produto
        void track({
          eventType: 'product_view',
          productId: p.id,
          categoryId: p.category?.id ?? null,
          source: 'product_detail'
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar produto.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const selectedVariant: ProductVariant | null = useMemo(() => {
    if (!product || !selectedVariantId) return null;
    return product.variants.find((v) => v.id === selectedVariantId) ?? null;
  }, [product, selectedVariantId]);

  const displayPrice = useMemo(() => {
    if (!product) return 0;
    return product.is_promoted && product.promo_price !== null
      ? product.promo_price
      : product.price;
  }, [product]);

  const hasPromo =
    product?.is_promoted === true &&
    product.promo_price !== null &&
    product.promo_price < product.price;

  const subtotal = useMemo(() => {
    return Math.round(displayPrice * quantity * 100) / 100;
  }, [displayPrice, quantity]);

  const quantityInvalid = !isQuantityValid(quantity, product?.min_quantity ?? 1);
  const variantNotSelectable =
    selectedVariant !== null && !isVariantSelectable(selectedVariant.status);

  function handleQuantityChange(value: string) {
    setQuantityInput(value);
    const num = Number(value.replace(',', '.'));
    if (Number.isFinite(num)) setQuantity(num);
  }

  function changeQuantity(delta: number) {
    if (!product) return;
    const next = quantity + delta;
    if (next < product.min_quantity) return;
    setQuantity(next);
    setQuantityInput(String(next));
  }

  function handleAddToCart() {
    if (!product || !selectedVariant) return;

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      productName: product.name,
      productCode: product.code,
      colorName: selectedVariant.color_name,
      unit: product.unit,
      unitPrice: displayPrice,
      quantity,
      minQuantity: product.min_quantity
    });

    void track({
      eventType: 'add_to_cart',
      productId: product.id,
      variantId: selectedVariant.id,
      categoryId: product.category?.id ?? null,
      source: 'product_detail',
      metadata: { quantity, unitPrice: displayPrice }
    });

    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 2500);
  }

  // ---------- Estados de carregamento/erro ----------

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 animate-pulse">
          <div className="aspect-square bg-neutral-200 rounded-xl" />
          <div className="space-y-3">
            <div className="h-6 bg-neutral-200 rounded w-1/3" />
            <div className="h-8 bg-neutral-200 rounded w-2/3" />
            <div className="h-4 bg-neutral-200 rounded w-1/2" />
            <div className="h-10 bg-neutral-200 rounded w-1/3" />
          </div>
        </div>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Produto não encontrado</h1>
        <p className="text-sm text-brand-black/60 mt-2">
          Este produto pode ter sido removido ou está indisponível.
        </p>
        <Link to="/catalogo" className="mt-4 inline-block text-brand-red underline text-sm">
          ← Voltar ao catálogo
        </Link>
      </section>
    );
  }

  if (error || !product) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-brand-red text-sm rounded-lg p-3 inline-flex items-center gap-2"
        >
          <AlertCircle size={16} />
          <span>{error ?? 'Erro ao carregar produto.'}</span>
        </div>
        <Link to="/catalogo" className="mt-4 block text-brand-red underline text-sm">
          ← Voltar ao catálogo
        </Link>
      </section>
    );
  }

  const images = product.images;
  const activeImage = images[activeImageIndex];

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <Link
        to="/catalogo"
        className="inline-flex items-center gap-1 text-sm text-brand-black/60 hover:text-brand-red mb-4"
      >
        <ArrowLeft size={16} />
        Voltar ao catálogo
      </Link>

      <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
        <div>
          <div className="relative aspect-square bg-neutral-100 rounded-xl overflow-hidden border border-black/5">
            {activeImage ? (
              <img
                src={activeImage.storage_path}
                alt={activeImage.alt_text ?? product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm text-black/40">Sem imagem</span>
              </div>
            )}

            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {hasPromo && (
                <span className="bg-brand-red text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded shadow">
                  Promoção
                </span>
              )}
              {product.is_featured && !hasPromo && (
                <span className="bg-brand-black text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded shadow">
                  Destaque
                </span>
              )}
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((i) => (i - 1 + images.length) % images.length)
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {images.map((img, idx) => (
                <li key={img.id}>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={clsx(
                      'aspect-square w-full rounded-lg overflow-hidden border-2 transition-colors',
                      idx === activeImageIndex
                        ? 'border-brand-red'
                        : 'border-transparent hover:border-black/20'
                    )}
                    aria-label={`Ver imagem ${idx + 1}`}
                  >
                    <img
                      src={img.storage_path}
                      alt={img.alt_text ?? `${product.name} — imagem ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs text-brand-black/60 mb-1">
            {product.category && (
              <Link
                to={`/catalogo?categoria=${product.category.id}`}
                className="uppercase tracking-wide hover:text-brand-red"
              >
                {product.category.name}
              </Link>
            )}
            <span>·</span>
            <span>{product.code}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-brand-black leading-tight">
            {product.name}
          </h1>

          <div className="mt-4 flex items-end gap-3 flex-wrap">
            {hasPromo && (
              <span className="text-base text-brand-black/40 line-through">
                {formatBRL(product.price)}
              </span>
            )}
            <span
              className={clsx(
                'text-2xl sm:text-3xl font-bold',
                hasPromo ? 'text-brand-red' : 'text-brand-black'
              )}
            >
              {formatBRL(displayPrice)}
            </span>
            <span className="text-sm text-brand-black/60 mb-1">
              / {UNIT_LABELS[product.unit].toLowerCase()}
            </span>
          </div>

          <p className="mt-1 text-xs text-brand-black/60">
            {product.meters_per_roll ? `Rolo de ${product.meters_per_roll}m · ` : ''}
            Quantidade mínima: {product.min_quantity}{' '}
            {product.min_quantity === 1 ? 'rolo' : 'rolos'}
          </p>

          {product.variants.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">
                Cor{' '}
                {selectedVariant && (
                  <span className="text-brand-black/60 font-normal">
                    — {selectedVariant.color_name}
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const selectable = isVariantSelectable(v.status);
                  const selected = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectable && setSelectedVariantId(v.id)}
                      disabled={!selectable}
                      title={!selectable ? `${v.color_name} — ${STATUS_LABELS[v.status]}` : v.color_name}
                      className={clsx(
                        'relative w-10 h-10 rounded-full border-2 transition-all',
                        selected ? 'border-brand-red scale-110' : 'border-black/10',
                        !selectable && 'opacity-30 cursor-not-allowed'
                      )}
                      style={{ backgroundColor: v.hex_color ?? '#e5e5e5' }}
                      aria-label={`Cor ${v.color_name}`}
                      aria-pressed={selected}
                    />
                  );
                })}
              </div>

              {selectedVariant && selectedVariant.status !== 'available' && (
                <p
                  className={clsx(
                    'text-xs mt-2 font-medium',
                    selectedVariant.status === 'low_stock' && 'text-orange-600',
                    selectedVariant.status === 'on_request' && 'text-black/60',
                    selectedVariant.status === 'out_of_stock' && 'text-brand-red'
                  )}
                >
                  {STATUS_LABELS[selectedVariant.status]}
                </p>
              )}
            </div>
          )}

          <div className="mt-6">
            <label htmlFor="qty" className="block text-sm font-medium mb-2">
              Quantidade (rolos)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeQuantity(-1)}
                disabled={quantity <= product.min_quantity}
                className="w-10 h-10 rounded-lg border border-black/15 hover:bg-black/5 disabled:opacity-30 flex items-center justify-center text-lg font-bold"
                aria-label="Diminuir quantidade"
              >
                −
              </button>
              <input
                id="qty"
                type="text"
                inputMode="numeric"
                value={quantityInput}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-20 h-10 text-center border border-black/15 rounded-lg focus:border-brand-red outline-none"
                aria-label="Quantidade em rolos"
              />
              <button
                type="button"
                onClick={() => changeQuantity(1)}
                className="w-10 h-10 rounded-lg border border-black/15 hover:bg-black/5 flex items-center justify-center text-lg font-bold"
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
            {quantityInvalid && (
              <p className="text-xs text-brand-red mt-1">
                Quantidade mínima: {product.min_quantity}
              </p>
            )}
          </div>

          {!quantityInvalid && (
            <div className="mt-4 p-3 bg-neutral-50 rounded-lg border border-black/5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-black/60">Subtotal estimado</span>
                <span className="font-bold text-brand-black text-lg">
                  {formatBRL(subtotal)}
                </span>
              </div>
              <p className="text-[11px] text-brand-black/50 mt-1">
                Disponibilidade, frete e condições serão confirmados pela equipe.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={quantityInvalid || variantNotSelectable || !selectedVariant}
            className={clsx(
              'mt-4 w-full inline-flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              addedFeedback
                ? 'bg-green-600 text-white'
                : 'bg-brand-red hover:bg-brand-redDark text-white'
            )}
          >
            <Package size={18} />
            {addedFeedback ? 'Adicionado à sacola!' : 'Adicionar à sacola'}
          </button>

          {product.full_description && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold mb-2">Descrição</h2>
              <p className="text-sm text-brand-black/70 whitespace-pre-line">
                {product.full_description}
              </p>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-sm font-semibold mb-2">Especificações</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {product.composition && (
                <>
                  <dt className="text-brand-black/60">Composição</dt>
                  <dd>{product.composition}</dd>
                </>
              )}
              {product.width && (
                <>
                  <dt className="text-brand-black/60">Largura</dt>
                  <dd>{product.width}</dd>
                </>
              )}
              {product.weight && (
                <>
                  <dt className="text-brand-black/60">Gramatura</dt>
                  <dd>{product.weight}</dd>
                </>
              )}
              {product.meters_per_roll && (
                <>
                  <dt className="text-brand-black/60">Metragem do rolo</dt>
                  <dd>{product.meters_per_roll}m</dd>
                </>
              )}
              <dt className="text-brand-black/60">Unidade de venda</dt>
              <dd>{UNIT_LABELS[product.unit]}</dd>
            </dl>
          </div>

          {product.notes && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-brand-black/70">
              <strong className="text-xs uppercase tracking-wide">Observações</strong>
              <p className="mt-1 whitespace-pre-line">{product.notes}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}