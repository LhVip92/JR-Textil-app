import { useEffect, useState } from 'react';
import {
  Eye,
  ShoppingBag,
  MessageCircle,
  Package,
  EyeOff,
  Tag,
  AlertTriangle,
  Ban,
  ClipboardList,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MetricCard } from '@/components/admin/MetricCard';
import {
  getDashboardStats,
  getTopViewedProducts,
  getTopAddedProducts,
  getTopVariants,
  getProductTitles,
  type DashboardPeriod,
  type DashboardStats,
  type TopProduct,
  type TopVariant
} from '@/services/analytics.service';
import { listAdminProducts } from '@/services/products.service';
import clsx from 'clsx';

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'last7', label: '7 dias' },
  { value: 'last30', label: '30 dias' }
];

interface CatalogCounts {
  active: number;
  hidden: number;
  promoted: number;
  lowStock: number;
  outOfStock: number;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>('last7');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [catalog, setCatalog] = useState<CatalogCounts | null>(null);
  const [topViewed, setTopViewed] = useState<{ name: string; count: number }[]>([]);
  const [topAdded, setTopAdded] = useState<{ name: string; count: number }[]>([]);
  const [topVariants, setTopVariants] = useState<TopVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getDashboardStats(period),
      loadCatalogCounts(),
      loadTopViewed(period),
      loadTopAdded(period),
      getTopVariants(period, 5)
    ])
      .then(([statsResult, catalogResult, viewedResult, addedResult, variantsResult]) => {
        if (cancelled) return;
        setStats(statsResult);
        setCatalog(catalogResult);
        setTopViewed(viewedResult);
        setTopAdded(addedResult);
        setTopVariants(variantsResult);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar métricas.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="max-w-6xl">
      {/* Saudação */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">
          Olá{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-sm text-black/60 mt-1">
          Acompanhe as métricas do app. Os números são sinais comerciais, não vendas confirmadas.
        </p>
      </div>

      {/* Seletor de período */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-sm text-black/60 mr-1">Período:</span>
        <div className="inline-flex bg-neutral-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                period === p.value
                  ? 'bg-white text-brand-black font-semibold shadow-sm'
                  : 'text-black/60 hover:text-black'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-brand-red text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {/* ============ ESTADO DO CATÁLOGO ============ */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 mb-3">
          Estado do catálogo
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Produtos ativos"
            value={catalog?.active ?? 0}
            loading={loading && !catalog}
            icon={<Package size={20} />}
            tone="positive"
          />
          <MetricCard
            label="Produtos ocultos"
            value={catalog?.hidden ?? 0}
            loading={loading && !catalog}
            icon={<EyeOff size={20} />}
          />
          <MetricCard
            label="Produtos em promoção"
            value={catalog?.promoted ?? 0}
            loading={loading && !catalog}
            icon={<Tag size={20} />}
          />
          <MetricCard
            label="Produtos com estoque baixo"
            value={catalog?.lowStock ?? 0}
            loading={loading && !catalog}
            icon={<AlertTriangle size={20} />}
            tone={catalog && catalog.lowStock > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            label="Produtos esgotados"
            value={catalog?.outOfStock ?? 0}
            loading={loading && !catalog}
            icon={<Ban size={20} />}
            tone={catalog && catalog.outOfStock > 0 ? 'danger' : 'default'}
          />
          <MetricCard
            label="Visualizações de catálogo"
            value={stats?.catalogViews ?? 0}
            hint={`Período: ${PERIODS.find((p) => p.value === period)?.label}`}
            loading={loading && !stats}
            icon={<Eye size={20} />}
          />
        </div>
      </section>

      {/* ============ INTERAÇÕES COMERCIAIS ============ */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 mb-3">
          Interações comerciais
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Produtos vistos"
            value={stats?.productViews ?? 0}
            hint="page/product_view"
            loading={loading && !stats}
            icon={<Eye size={20} />}
          />
          <MetricCard
            label="Adicionados à sacola"
            value={stats?.addToCart ?? 0}
            hint="Ação no produto"
            loading={loading && !stats}
            icon={<ShoppingBag size={20} />}
          />
          <MetricCard
            label="Cliques no WhatsApp"
            value={stats?.whatsappClicks ?? 0}
            hint="NÃO representa venda confirmada"
            loading={loading && !stats}
            icon={<MessageCircle size={20} />}
            tone="positive"
          />
          <MetricCard
            label="Checkouts iniciados"
            value={stats?.checkoutStarted ?? 0}
            loading={loading && !stats}
            icon={<ClipboardList size={20} />}
          />
        </div>
      </section>

      {/* ============ TAXAS DE AVANÇO ============ */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 mb-3">
          Taxas de avanço
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="Do produto para a sacola"
            value={stats ? `${stats.advanceToCart}%` : '—'}
            hint="add_to_cart / product_view"
            loading={loading && !stats}
            icon={<TrendingUp size={20} />}
            tone={
              stats && stats.advanceToCart >= 20
                ? 'positive'
                : stats && stats.advanceToCart === 0
                  ? 'warning'
                  : 'default'
            }
          />
          <MetricCard
            label="Da sacola para o WhatsApp"
            value={stats ? `${stats.advanceToWhatsapp}%` : '—'}
            hint="whatsapp_click / add_to_cart"
            loading={loading && !stats}
            icon={<TrendingUp size={20} />}
            tone={
              stats && stats.advanceToWhatsapp >= 50
                ? 'positive'
                : stats && stats.advanceToWhatsapp === 0
                  ? 'warning'
                  : 'default'
            }
          />
        </div>
      </section>

      {/* ============ RANKINGS ============ */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Top vistos */}
        <RankingCard
          title="Produtos mais vistos"
          subtitle="Eventos product_view"
          items={topViewed}
          loading={loading}
          emptyMessage="Nenhuma visualização registrada neste período."
        />

        {/* Top adicionados */}
        <RankingCard
          title="Produtos mais adicionados"
          subtitle="Eventos add_to_cart"
          items={topAdded}
          loading={loading}
          emptyMessage="Nenhum produto adicionado à sacola neste período."
        />

        {/* Top cores */}
        <div className="bg-white rounded-xl border border-black/5 p-4">
          <h3 className="font-semibold text-sm">Cores mais selecionadas</h3>
          <p className="text-[11px] text-black/50 mt-0.5">
            Eventos add_to_cart com cor
          </p>

          {loading && (
            <div className="mt-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-neutral-200 rounded animate-pulse" />
              ))}
            </div>
          )}

          {!loading && topVariants.length === 0 && (
            <p className="text-xs text-black/50 mt-4">
              Nenhuma seleção de cor registrada neste período.
            </p>
          )}

          {!loading && topVariants.length > 0 && (
            <ul className="mt-4 space-y-2">
              {topVariants.map((v) => (
                <li key={v.variantId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{v.colorName}</span>
                  <span className="text-xs font-mono text-black/60">{v.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Aviso honesto */}
      <p className="text-[11px] text-black/40 mt-6 leading-relaxed">
        ⓘ Os números acima representam sinais de interesse dos visitantes. Um clique no WhatsApp
        <strong className="font-medium"> não confirma venda</strong> — a venda é sempre confirmada
        pela equipe da loja após o atendimento. O session_id usado para agrupar eventos é anônimo
        e não contém dados pessoais.
      </p>
    </div>
  );
}

// =========================================================================
// Helpers de carregamento
// =========================================================================

async function loadCatalogCounts(): Promise<CatalogCounts> {
  try {
    const all = await listAdminProducts({ showArchived: false });
    return {
      active: all.filter((p) => p.is_active).length,
      hidden: all.filter((p) => !p.is_active).length,
      promoted: all.filter((p) => p.is_promoted && p.is_active).length,
      lowStock: all.filter((p) => p.general_status === 'low_stock' && p.is_active).length,
      outOfStock: all.filter((p) => p.general_status === 'out_of_stock' && p.is_active).length
    };
  } catch {
    return { active: 0, hidden: 0, promoted: 0, lowStock: 0, outOfStock: 0 };
  }
}

async function loadTopViewed(period: DashboardPeriod): Promise<{ name: string; count: number }[]> {
  try {
    const top: TopProduct[] = await getTopViewedProducts(period, 5);
    if (top.length === 0) return [];
    const titles = await getProductTitles(top.map((t) => t.productId));
    return top.map((t) => ({
      name: titles[t.productId] ?? 'Produto removido',
      count: t.count
    }));
  } catch {
    return [];
  }
}

async function loadTopAdded(period: DashboardPeriod): Promise<{ name: string; count: number }[]> {
  try {
    const top: TopProduct[] = await getTopAddedProducts(period, 5);
    if (top.length === 0) return [];
    const titles = await getProductTitles(top.map((t) => t.productId));
    return top.map((t) => ({
      name: titles[t.productId] ?? 'Produto removido',
      count: t.count
    }));
  } catch {
    return [];
  }
}

// =========================================================================
// Componente de ranking
// =========================================================================

function RankingCard({
  title,
  subtitle,
  items,
  loading,
  emptyMessage
}: {
  title: string;
  subtitle: string;
  items: { name: string; count: number }[];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-black/5 p-4">
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-[11px] text-black/50 mt-0.5">{subtitle}</p>

      {loading && (
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-neutral-200 rounded animate-pulse" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-xs text-black/50 mt-4">{emptyMessage}</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((item, idx) => (
            <li key={`${item.name}-${idx}`} className="flex items-center gap-2 text-sm">
              <span className="text-[11px] font-mono text-black/40 w-4">
                {idx + 1}.
              </span>
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-xs font-mono text-black/60">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}