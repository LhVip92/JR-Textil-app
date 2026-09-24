import { supabase } from '@/lib/supabase';
import type { AnalyticsEventType } from '@/types/database';
import { getSessionId } from '@/utils/session';

// =========================================================================
// Tipos
// =========================================================================

export interface TrackEventInput {
  eventType: AnalyticsEventType;
  productId?: string | null;
  variantId?: string | null;
  categoryId?: string | null;
  searchTerm?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type DashboardPeriod = 'today' | 'last7' | 'last30';

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

export interface DashboardStats {
  productViews: number;
  catalogViews: number;
  addToCart: number;
  whatsappClicks: number;
  checkoutStarted: number;
  searches: number;
  // Taxas de avanço (%)
  advanceToCart: number;      // add_to_cart / product_view
  advanceToWhatsapp: number;  // whatsapp_click / add_to_cart
}

export interface TopProduct {
  productId: string;
  count: number;
}

export interface TopVariant {
  variantId: string;
  colorName: string;
  count: number;
}

// =========================================================================
// Ranges de período
// =========================================================================

export function getPeriodRange(period: DashboardPeriod): PeriodRange {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start, end: now, label: 'Hoje' };
    case 'last7':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end: now, label: 'Últimos 7 dias' };
    case 'last30':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end: now, label: 'Últimos 30 dias' };
  }
}

// =========================================================================
// Registro de eventos
// =========================================================================

/**
 * Registra um evento analítico. Nunca lança erro (silencioso em caso de falha)
 * para não interromper a experiência do usuário.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    const payload = {
      session_id: getSessionId(),
      event_type: input.eventType,
      product_id: input.productId ?? null,
      variant_id: input.variantId ?? null,
      category_id: input.categoryId ?? null,
      search_term: input.searchTerm ? input.searchTerm.slice(0, 200) : null,
      source: input.source ?? 'app-jr-textil-fortaleza',
      metadata: input.metadata ?? null
    };

    await supabase.from('analytics_events').insert(payload);
  } catch {
    // silencioso — não bloqueia a UI
  }
}

// =========================================================================
// Consultas para o dashboard
// =========================================================================

/**
 * Retorna a contagem total de eventos por tipo em um período.
 */
export async function getEventCounts(period: DashboardPeriod): Promise<Record<AnalyticsEventType, number>> {
  const { start, end } = getPeriodRange(period);

  const { data, error } = await supabase
    .from('analytics_events')
    .select('event_type')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) throw new Error('Não foi possível carregar as métricas.');

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { event_type: string }) => {
    counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
  });

  return {
    page_view: counts['page_view'] ?? 0,
    catalog_view: counts['catalog_view'] ?? 0,
    product_view: counts['product_view'] ?? 0,
    search: counts['search'] ?? 0,
    filter_applied: counts['filter_applied'] ?? 0,
    add_to_cart: counts['add_to_cart'] ?? 0,
    remove_from_cart: counts['remove_from_cart'] ?? 0,
    checkout_started: counts['checkout_started'] ?? 0,
    whatsapp_click: counts['whatsapp_click'] ?? 0
  };
}

/**
 * Retorna as estatísticas agregadas do dashboard.
 */
export async function getDashboardStats(period: DashboardPeriod): Promise<DashboardStats> {
  const counts = await getEventCounts(period);

  const advanceToCart =
    counts.product_view > 0
      ? Math.round((counts.add_to_cart / counts.product_view) * 1000) / 10
      : 0;

  const advanceToWhatsapp =
    counts.add_to_cart > 0
      ? Math.round((counts.whatsapp_click / counts.add_to_cart) * 1000) / 10
      : 0;

  return {
    productViews: counts.product_view,
    catalogViews: counts.catalog_view,
    addToCart: counts.add_to_cart,
    whatsappClicks: counts.whatsapp_click,
    checkoutStarted: counts.checkout_started,
    searches: counts.search,
    advanceToCart,
    advanceToWhatsapp
  };
}

/**
 * Top N produtos mais visualizados.
 */
export async function getTopViewedProducts(
  period: DashboardPeriod,
  limit = 5
): Promise<TopProduct[]> {
  const { start, end } = getPeriodRange(period);

  const { data, error } = await supabase
    .from('analytics_events')
    .select('product_id')
    .eq('event_type', 'product_view')
    .not('product_id', 'is', null)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) return [];

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { product_id: string | null }) => {
    if (row.product_id) counts[row.product_id] = (counts[row.product_id] ?? 0) + 1;
  });

  return Object.entries(counts)
    .map(([productId, count]) => ({ productId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Top N produtos mais adicionados à sacola.
 */
export async function getTopAddedProducts(
  period: DashboardPeriod,
  limit = 5
): Promise<TopProduct[]> {
  const { start, end } = getPeriodRange(period);

  const { data, error } = await supabase
    .from('analytics_events')
    .select('product_id')
    .eq('event_type', 'add_to_cart')
    .not('product_id', 'is', null)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) return [];

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { product_id: string | null }) => {
    if (row.product_id) counts[row.product_id] = (counts[row.product_id] ?? 0) + 1;
  });

  return Object.entries(counts)
    .map(([productId, count]) => ({ productId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Top N cores mais selecionadas (add_to_cart com variant_id).
 */
export async function getTopVariants(
  period: DashboardPeriod,
  limit = 5
): Promise<TopVariant[]> {
  const { start, end } = getPeriodRange(period);

  const { data, error } = await supabase
    .from('analytics_events')
    .select('variant_id')
    .eq('event_type', 'add_to_cart')
    .not('variant_id', 'is', null)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) return [];

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { variant_id: string | null }) => {
    if (row.variant_id) counts[row.variant_id] = (counts[row.variant_id] ?? 0) + 1;
  });

  const topIds = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (topIds.length === 0) return [];

  // Busca os nomes das cores
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, color_name')
    .in('id', topIds.map(([id]) => id));

  const nameById: Record<string, string> = {};
  (variants ?? []).forEach((v: { id: string; color_name: string }) => {
    nameById[v.id] = v.color_name;
  });

  return topIds.map(([variantId, count]) => ({
    variantId,
    colorName: nameById[variantId] ?? 'Desconhecida',
    count
  }));
}

/**
 * Retorna os títulos dos produtos por IDs (para complementar as consultas de top).
 */
export async function getProductTitles(
  productIds: string[]
): Promise<Record<string, string>> {
  if (productIds.length === 0) return {};

  const { data } = await supabase
    .from('products')
    .select('id, name')
    .in('id', productIds);

  const map: Record<string, string> = {};
  (data ?? []).forEach((p: { id: string; name: string }) => {
    map[p.id] = p.name;
  });
  return map;
}