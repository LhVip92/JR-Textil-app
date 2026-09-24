import { Link } from 'react-router-dom';
import type { CatalogProductListItem } from '@/services/catalog.service';
import { formatBRL } from '@/domain/money';
import clsx from 'clsx';

interface ProductCardProps {
  product: CatalogProductListItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
  const isUnavailable = product.general_status === 'out_of_stock';
  const isLowStock = product.general_status === 'low_stock';
  const isOnRequest = product.general_status === 'on_request';

  // Preço exibido: promo se houver, senão normal
  const displayPrice = product.is_promoted && product.promo_price !== null
    ? product.promo_price
    : product.price;

  const hasPromo = product.is_promoted && product.promo_price !== null && product.promo_price < product.price;

  return (
    <Link
      to={`/produto/${product.slug}`}
      className="group block bg-white rounded-xl border border-black/5 overflow-hidden hover:shadow-md hover:border-black/10 transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-red"
    >
      {/* Imagem */}
      <div className="relative aspect-square bg-neutral-100 overflow-hidden">
        {primary ? (
          <img
            src={primary.storage_path}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-black/40">Sem imagem</span>
          </div>
        )}

        {/* Selos */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasPromo && (
            <span className="bg-brand-red text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded shadow">
              Promoção
            </span>
          )}
          {product.is_featured && !hasPromo && (
            <span className="bg-brand-black text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded shadow">
              Destaque
            </span>
          )}
        </div>

        {/* Status de esgotado */}
        {isUnavailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs font-bold uppercase tracking-wide">Esgotado</span>
          </div>
        )}
      </div>

      {/* Informações */}
      <div className="p-3 space-y-1">
        {/* Categoria */}
        {product.category && (
          <p className="text-[10px] uppercase tracking-wide text-brand-black/50 truncate">
            {product.category.name}
          </p>
        )}

        {/* Nome */}
        <h3 className="text-sm font-semibold text-brand-black leading-tight line-clamp-2 group-hover:text-brand-red transition-colors">
          {product.name}
        </h3>

        {/* Código + cores */}
        <p className="text-xs text-brand-black/50 truncate">
          {product.code}
          {product.variants_count > 0 && ` · ${product.variants_count} ${product.variants_count === 1 ? 'cor' : 'cores'}`}
        </p>

        {/* Preço */}
        <div className="pt-2 flex items-end gap-2 flex-wrap">
          {hasPromo && (
            <span className="text-xs text-brand-black/40 line-through">
              {formatBRL(product.price)}
            </span>
          )}
          <span className={clsx('text-base font-bold', hasPromo ? 'text-brand-red' : 'text-brand-black')}>
            {formatBRL(displayPrice)}
          </span>
        </div>

        {/* Info de rolo */}
        <p className="text-[11px] text-brand-black/60">
          Rolo fechado · Mín. {product.min_quantity}
        </p>

        {/* Status de baixo estoque */}
        {isLowStock && (
          <p className="text-[11px] font-medium text-orange-600 mt-1">
            Últimos rolos
          </p>
        )}
        {isOnRequest && (
          <p className="text-[11px] font-medium text-brand-black/60 mt-1">
            Sob consulta
          </p>
        )}
      </div>
    </Link>
  );
}