import { Link } from 'react-router-dom';
import { ShoppingBag, Search } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

export function Header() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-brand-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <Link
          to="/"
          className="font-bold tracking-tight text-lg"
          aria-label="JR Têxtil Fortaleza — início"
        >
          JR <span className="text-brand-red">Têxtil</span> Fortaleza
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/catalogo"
            className="p-2 rounded hover:bg-white/10"
            aria-label="Buscar produtos"
          >
            <Search size={20} />
          </Link>

          <Link
            to="/sacola"
            className="relative p-2 rounded hover:bg-white/10"
            aria-label={
              itemCount > 0
                ? `Sacola com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
                : 'Sacola vazia'
            }
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 bg-brand-red text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                aria-hidden="true"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}