import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Sparkles, Tag, Package } from 'lucide-react';
import {
  listFeaturedProducts,
  listPromotedProducts,
  listLatestProducts,
  listAllActiveCategories,
  type CatalogProductListItem
} from '@/services/catalog.service';
import { ProductCard } from '@/components/catalog/ProductCard';
import { useTrackOnMount } from '@/hooks/useAnalytics';
import type { Category } from '@/types/database';

export default function HomePage() {
  useTrackOnMount({ eventType: 'page_view', source: 'home' });

  const [featured, setFeatured] = useState<CatalogProductListItem[]>([]);
  const [promoted, setPromoted] = useState<CatalogProductListItem[]>([]);
  const [latest, setLatest] = useState<CatalogProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listFeaturedProducts(4),
      listPromotedProducts(4),
      listLatestProducts(8),
      listAllActiveCategories()
    ])
      .then(([f, p, l, c]) => {
        setFeatured(f);
        setPromoted(p);
        setLatest(l);
        setCategories(c);
      })
      .catch(() => {
        // silencioso — não bloqueia a Home
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ============ BANNER PRINCIPAL ============ */}
      <section className="bg-brand-black text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <p className="text-xs uppercase tracking-widest text-brand-red font-bold mb-3">
            Atacado · Fortaleza
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight max-w-2xl">
            Tecidos para quem <span className="text-brand-red">revende</span>.
          </h1>
          <p className="mt-4 text-white/80 max-w-xl text-sm sm:text-base">
            Rolos fechados direto da fábrica. Condições especiais para lojistas, costureiras e sacoleiras.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-redDark text-white font-semibold px-5 py-3 rounded-lg text-sm"
            >
              Ver catálogo
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://wa.me/5581993620736"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/20 hover:bg-white/10 text-white font-semibold px-5 py-3 rounded-lg text-sm"
            >
              <MessageCircle size={16} />
              Falar com a loja
            </a>
          </div>
        </div>
      </section>

      {/* ============ CATEGORIAS ============ */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Categorias</h2>
            <Link to="/catalogo" className="text-sm text-brand-red hover:underline inline-flex items-center gap-1">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/catalogo?categoria=${c.id}`}
                  className="block bg-white rounded-xl border border-black/5 p-4 hover:border-brand-red hover:shadow-sm transition-all"
                >
                  <Package size={20} className="text-brand-red mb-2" />
                  <p className="text-sm font-semibold text-brand-black">{c.name}</p>
                  {c.description && (
                    <p className="text-xs text-black/50 mt-1 line-clamp-2">{c.description}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ PROMOÇÕES ============ */}
      {promoted.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold inline-flex items-center gap-2">
              <Tag size={18} className="text-brand-red" />
              Promoções
            </h2>
            <Link to="/catalogo?promo=1" className="text-sm text-brand-red hover:underline inline-flex items-center gap-1">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {promoted.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ DESTAQUES ============ */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold inline-flex items-center gap-2">
              <Sparkles size={18} className="text-brand-red" />
              Destaques
            </h2>
            <Link to="/catalogo" className="text-sm text-brand-red hover:underline inline-flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ LANÇAMENTOS ============ */}
      {latest.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Lançamentos</h2>
            <Link to="/catalogo" className="text-sm text-brand-red hover:underline inline-flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {latest.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ ESTADO VAZIO / CARREGANDO ============ */}
      {loading && (
        <section className="mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="text-sm text-black/50">Carregando...</p>
        </section>
      )}

      {!loading && latest.length === 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="text-sm font-medium text-black/70">Catálogo em preparação</p>
          <p className="text-xs text-black/50 mt-1">
            Em breve você verá os tecidos disponíveis aqui.
          </p>
        </section>
      )}

      {/* ============ CTA FINAL ============ */}
      <section className="bg-neutral-100 mt-8">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <h2 className="text-lg sm:text-xl font-bold">Precisa de ajuda para escolher?</h2>
          <p className="text-sm text-black/60 mt-1 max-w-md mx-auto">
            Fale com nossa equipe pelo WhatsApp e receba atendimento personalizado.
          </p>
          <a
            href="https://wa.me/5581993620736"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 bg-brand-red hover:bg-brand-redDark text-white font-semibold px-5 py-3 rounded-lg text-sm"
          >
            <MessageCircle size={16} />
            Falar com a loja
          </a>
        </div>
      </section>
    </div>
  );
}