// =========================================================================
// Tipos do banco de dados — JR Têxtil Fortaleza
// Sincronizado com a migration inicial + coluna meters_per_roll
// =========================================================================

export type UUID = string;
export type ISODate = string;

// ---------- Enums (via CHECK no banco) ----------

export type VariantStatus = 'available' | 'low_stock' | 'on_request' | 'out_of_stock';
export type ProductUnit = 'metro' | 'kg' | 'rolo' | 'peca';
export type DeliveryPreference = 'pickup' | 'delivery';
export type OrderStatus = 'started' | 'sent_to_whatsapp' | 'cancelled';
export type ProfileRole = 'admin' | 'viewer';

export type AnalyticsEventType =
  | 'page_view'
  | 'catalog_view'
  | 'product_view'
  | 'search'
  | 'filter_applied'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_started'
  | 'whatsapp_click';

// ---------- Perfis administrativos ----------

export interface Profile {
  id: UUID;
  full_name: string | null;
  role: ProfileRole;
  created_at: ISODate;
  updated_at: ISODate;
}

// ---------- Categorias ----------

export interface Category {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

// ---------- Produtos ----------

export interface Product {
  id: UUID;
  name: string;
  slug: string;
  code: string;
  category_id: UUID | null;
  short_description: string | null;
  full_description: string | null;
  composition: string | null;
  width: string | null;
  weight: string | null;
  meters_per_roll: number | null;
  unit: ProductUnit;
  price: number;
  min_quantity: number;
  notes: string | null;
  is_featured: boolean;
  is_promoted: boolean;
  promo_price: number | null;
  is_active: boolean;
  general_status: VariantStatus;
  seo_title: string | null;
  seo_description: string | null;
  archived_at: ISODate | null;
  created_at: ISODate;
  updated_at: ISODate;
}

// ---------- Variações (cores) ----------

export interface ProductVariant {
  id: UUID;
  product_id: UUID;
  color_name: string;
  internal_code: string | null;
  hex_color: string | null;
  image_url: string | null;
  status: VariantStatus;
  display_order: number;
  is_active: boolean;
  created_at: ISODate;
  updated_at: ISODate;
}

// ---------- Imagens ----------

export interface ProductImage {
  id: UUID;
  product_id: UUID;
  variant_id: UUID | null;
  storage_path: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: ISODate;
}

// ---------- Configurações (linha única) ----------

export interface Settings {
  id: 1;
  commercial_name: string | null;
  logo_url: string | null;
  whatsapp_number: string | null;
  default_message: string | null;
  address: string | null;
  hours: string | null;
  instagram: string | null;
  minimum_order_value: number | null;
  delivery_options: string | null;
  footer_text: string | null;
  banner_url: string | null;
  updated_at: ISODate;
}

// ---------- Eventos analíticos ----------

export interface AnalyticsEvent {
  id: UUID;
  session_id: UUID;
  event_type: AnalyticsEventType;
  product_id: UUID | null;
  variant_id: UUID | null;
  category_id: UUID | null;
  search_term: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: ISODate;
}

// ---------- Pedidos iniciados ----------

export interface OrderIntent {
  id: UUID;
  reference: string;
  customer_name: string;
  company: string | null;
  city: string;
  phone: string | null;
  delivery_preference: DeliveryPreference | null;
  notes: string | null;
  estimated_total: number;
  session_id: UUID | null;
  source: string;
  status: OrderStatus;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface OrderIntentItem {
  id: UUID;
  order_intent_id: UUID;
  product_id: UUID | null;
  variant_id: UUID | null;
  product_name: string;
  product_code: string;
  color_name: string | null;
  unit: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  created_at: ISODate;
}

// ---------- Log de auditoria ----------

export interface AuditLog {
  id: UUID;
  actor_id: UUID | null;
  action: string;
  entity: string;
  entity_id: UUID | null;
  changes: Record<string, unknown> | null;
  created_at: ISODate;
}

// =========================================================================
// Tipos de uso interno (não vão para o banco)
// =========================================================================

/**
 * Item da sacola persistido em localStorage.
 * Será usado na Etapa 5.
 */
export interface CartItem {
  productId: UUID;
  variantId: UUID;
  productName: string;
  productCode: string;
  colorName: string;
  unit: ProductUnit;
  unitPrice: number;
  quantity: number;
  minQuantity: number;
}