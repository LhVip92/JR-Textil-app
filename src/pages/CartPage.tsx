import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useTrack } from '@/hooks/useAnalytics';
import { listProductVariants } from '@/services/variants.service';
import { formatBRL } from '@/domain/money';
import type { CartItem, ProductVariant } from '@/types/database';
import clsx from 'clsx';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, total, itemCount, addItem, removeItem, updateQuantity, clear } = useCart();
  const track = useTrack();

  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, ProductVariant[]>>({});
  const [loadingVariants, setLoadingVariants] = useState(true);

  useEffect(() => {
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    if (productIds.length === 0) {
      setLoadingVariants(false);
      return;
    }

    let cancelled = false;

    Promise.all(productIds.map((id) => listProductVariants(id)))
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, ProductVariant[]> = {};
        productIds.forEach((id, index) => {
          const variants = results[index] ?? [];
          map[id] = variants.filter((v) => v.is_active);
        });
        setVariantsByProduct(map);
      })
      .catch(() => {
        // silencioso
      })
      .finally(() => {
        if (!cancelled) setLoadingVariants(false);
      });

    return () => {
      cancelled = true;
    };
  }, [items]);

  function handleClear() {
    if (!confirm('Limpar a sacola? Todos os itens serão removidos.')) return;
    clear();
  }

  function handleQuantityChange(item: CartItem, delta: number) {
    const next = item.quantity + delta;
    if (next < item.minQuantity) return;
    updateQuantity(item.productId, item.variantId, next);
  }

  function handleRemove(item: CartItem) {
    removeItem(item.productId, item.variantId);

    void track({
      eventType: 'remove_from_cart',
      productId: item.productId,
      variantId: item.variantId,
      source: 'cart',
      metadata: { quantity: item.quantity }
    });
  }

  function handleVariantChange(item: CartItem, newVariantId: string) {
    if (newVariantId === item.variantId) return;

    const variants = variantsByProduct[item.productId] ?? [];
    const newVariant = variants.find((v) => v.id === newVariantId);
    if (!newVariant) return;

    const newItem: CartItem = {
      ...item,
      variantId: newVariant.id,
      colorName: newVariant.color_name
    };

    removeItem(item.productId, item.variantId);
    addItem(newItem);
  }

  // ---------- Estado vazio ----------
  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={28} className="text-black/30" />
        </div>
        <h1 className="text-xl font-bold">Sua sacola está vazia</h1>
        <p className="text-sm text-brand-black/60 mt-2">
          Adicione produtos do catálogo para começar seu pedido.
        </p>
        <Link
          to="/catalogo"
          className="mt-6 inline-flex items-center gap-2 bg-brand-red hover:bg-brand-redDark text-white font-semibold px-5 py-3 rounded-lg text-sm"
        >
          <ArrowLeft size={16} />
          Ir para o catálogo
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sacola</h1>
          <p className="text-sm text-brand-black/60">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-brand-red hover:underline"
        >
          Limpar sacola
        </button>
      </div>

      <ul className="space-y-3 mb-5">
        {items.map((item) => {
          const subtotal = Math.round(item.unitPrice * item.quantity * 100) / 100;
          const variants = variantsByProduct[item.productId] ?? [];
          const canChangeVariant = !loadingVariants && variants.length > 1;

          return (
            <li
              key={`${item.productId}-${item.variantId}`}
              className="bg-white rounded-xl border border-black/5 p-3 sm:p-4"
            >
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={20} className="text-black/20" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-black/50 truncate">
                        {item.productCode} · {item.colorName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      className="p-1.5 rounded hover:bg-black/5 text-brand-red flex-shrink-0"
                      aria-label={`Remover ${item.productName} da sacola`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {canChangeVariant && (
                    <div className="mt-2">
                      <label
                        htmlFor={`variant-${item.productId}-${item.variantId}`}
                        className="text-[11px] text-black/50 block mb-0.5"
                      >
                        Cor
                      </label>
                      <select
                        id={`variant-${item.productId}-${item.variantId}`}
                        value={item.variantId}
                        onChange={(e) => handleVariantChange(item, e.target.value)}
                        className="text-xs px-2 py-1 border border-black/15 rounded bg-white focus:border-brand-red outline-none max-w-[180px]"
                      >
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.color_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-3 mt-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item, -1)}
                        disabled={item.quantity <= item.minQuantity}
                        className="w-8 h-8 rounded border border-black/15 hover:bg-black/5 disabled:opacity-30 flex items-center justify-center"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center text-sm font-medium" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item, 1)}
                        className="w-8 h-8 rounded border border-black/15 hover:bg-black/5 flex items-center justify-center"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={14} />
                      </button>
                      <span className="text-[11px] text-black/50 ml-1">
                        {item.quantity === 1 ? 'rolo' : 'rolos'}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] text-black/50">
                        {item.quantity} × {formatBRL(item.unitPrice)}
                      </p>
                      <p className="text-sm font-bold">{formatBRL(subtotal)}</p>
                    </div>
                  </div>

                  {item.quantity < item.minQuantity && (
                    <p className="text-xs text-brand-red mt-1">
                      Mínimo: {item.minQuantity}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="bg-white rounded-xl border border-black/5 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-brand-black/60">Total estimado</span>
          <span className="text-2xl font-bold">{formatBRL(total)}</span>
        </div>
        <p className="text-[11px] text-black/50 mb-4">
          Disponibilidade, frete e condições serão confirmados pela equipe.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to="/catalogo"
            className="flex-1 text-center px-4 py-3 rounded-lg border border-black/15 hover:bg-black/5 text-sm font-medium"
          >
            Continuar comprando
          </Link>
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className={clsx(
              'flex-1 text-center px-4 py-3 rounded-lg bg-brand-red hover:bg-brand-redDark text-white text-sm font-semibold'
            )}
          >
            Finalizar pedido
          </button>
        </div>
      </div>
    </section>
  );
}