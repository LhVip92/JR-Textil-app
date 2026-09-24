-- =========================================================================
-- JR Têxtil Fortaleza — Migration inicial
-- Cria extensões, tabelas, índices, triggers e RLS.
-- Escopo: uma única unidade (Fortaleza). Preparado para futura expansão.
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------- helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles (admins) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- helper is_admin
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_categories_active_order on public.categories (is_active, display_order);
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------- products ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  code text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  short_description text,
  full_description text,
  composition text,
  width text,
  weight text,
  unit text not null default 'metro' check (unit in ('metro','kg','rolo','peca')),
  price numeric(12,2) not null default 0 check (price >= 0),
  min_quantity numeric(12,2) not null default 1 check (min_quantity > 0),
  notes text,
  is_featured boolean not null default false,
  is_promoted boolean not null default false,
  promo_price numeric(12,2) check (promo_price is null or promo_price >= 0),
  is_active boolean not null default true,
  general_status text not null default 'available'
    check (general_status in ('available','low_stock','on_request','out_of_stock')),
  seo_title text,
  seo_description text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_requires_price check (not is_promoted or promo_price is not null)
);
create index idx_products_active on public.products (is_active) where archived_at is null;
create index idx_products_category on public.products (category_id);
create index idx_products_featured on public.products (is_featured) where is_active and archived_at is null;
create index idx_products_promoted on public.products (is_promoted) where is_active and archived_at is null;
create index idx_products_search on public.products
  using gin (to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(code,'') || ' ' || coalesce(short_description,'')));
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- product_variants (cores) ----------
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_name text not null,
  internal_code text,
  hex_color text check (hex_color is null or hex_color ~* '^#[0-9a-f]{6}$'),
  image_url text,
  status text not null default 'available'
    check (status in ('available','low_stock','on_request','out_of_stock')),
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_variants_product on public.product_variants (product_id, display_order);
create trigger trg_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---------- product_images ----------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  storage_path text not null,
  alt_text text,
  display_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_images_product on public.product_images (product_id, display_order);
create unique index uq_primary_image_per_product
  on public.product_images (product_id) where is_primary;

-- ---------- settings (single row) ----------
create table public.settings (
  id int primary key default 1 check (id = 1),
  commercial_name text,
  logo_url text,
  whatsapp_number text,
  default_message text,
  address text,
  hours text,
  instagram text,
  minimum_order_value numeric(12,2),
  delivery_options text,
  footer_text text,
  banner_url text,
  updated_at timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.settings
  for each row execute function public.set_updated_at();
insert into public.settings (id) values (1) on conflict do nothing;

-- ---------- analytics_events ----------
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  event_type text not null check (event_type in (
    'page_view','catalog_view','product_view','search','filter_applied',
    'add_to_cart','remove_from_cart','checkout_started','whatsapp_click'
  )),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  search_term text,
  source text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_events_created on public.analytics_events (created_at desc);
create index idx_events_type on public.analytics_events (event_type, created_at desc);
create index idx_events_product on public.analytics_events (product_id, created_at desc)
  where product_id is not null;
create index idx_events_session on public.analytics_events (session_id);

-- ---------- order_intents ----------
create table public.order_intents (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  company text,
  city text not null,
  phone text,
  delivery_preference text check (delivery_preference in ('pickup','delivery')),
  notes text,
  estimated_total numeric(12,2) not null default 0,
  session_id uuid,
  source text not null default 'app-jr-textil-fortaleza',
  status text not null default 'started' check (status in ('started','sent_to_whatsapp','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_order_intents_created on public.order_intents (created_at desc);
create trigger trg_order_intents_updated before update on public.order_intents
  for each row execute function public.set_updated_at();

-- ---------- order_intent_items ----------
create table public.order_intent_items (
  id uuid primary key default gen_random_uuid(),
  order_intent_id uuid not null references public.order_intents(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  product_code text not null,
  color_name text,
  unit text,
  unit_price numeric(12,2) not null,
  quantity numeric(12,2) not null check (quantity > 0),
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index idx_order_items_intent on public.order_intent_items (order_intent_id);

-- ---------- audit_logs ----------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_created on public.audit_logs (created_at desc);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.profiles             enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.product_variants     enable row level security;
alter table public.product_images       enable row level security;
alter table public.settings             enable row level security;
alter table public.analytics_events     enable row level security;
alter table public.order_intents        enable row level security;
alter table public.order_intent_items   enable row level security;
alter table public.audit_logs           enable row level security;

-- profiles: usuário lê o próprio; admin lê todos; admin edita.
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_admin_write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- categories: público lê ativas; admin tudo
create policy "categories_public_read" on public.categories
  for select using (is_active = true);
create policy "categories_admin_all" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- products: público lê ativos e não arquivados; admin tudo
create policy "products_public_read" on public.products
  for select using (is_active = true and archived_at is null);
create policy "products_admin_all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- product_variants: público lê ativas de produtos visíveis; admin tudo
create policy "variants_public_read" on public.product_variants
  for select using (
    is_active = true
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active and p.archived_at is null
    )
  );
create policy "variants_admin_all" on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

-- product_images: público lê imagens de produtos visíveis; admin tudo
create policy "images_public_read" on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_active and p.archived_at is null
    )
  );
create policy "images_admin_all" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

-- settings: público lê; admin atualiza
create policy "settings_public_read" on public.settings
  for select using (true);
create policy "settings_admin_update" on public.settings
  for update using (public.is_admin()) with check (public.is_admin());

-- analytics_events: público insere apenas eventos válidos; admin lê
create policy "events_public_insert" on public.analytics_events
  for insert with check (
    length(coalesce(search_term,'')) <= 200
    and (metadata is null or pg_column_size(metadata) < 4096)
  );
create policy "events_admin_read" on public.analytics_events
  for select using (public.is_admin());

-- order_intents: público insere; admin lê
create policy "orders_public_insert" on public.order_intents
  for insert with check (
    length(customer_name) between 1 and 200
    and length(city) between 1 and 120
    and length(coalesce(notes,'')) <= 2000
    and estimated_total >= 0
  );
create policy "orders_admin_read" on public.order_intents
  for select using (public.is_admin());
create policy "orders_admin_update" on public.order_intents
  for update using (public.is_admin()) with check (public.is_admin());

-- order_intent_items: público insere; admin lê
create policy "order_items_public_insert" on public.order_intent_items
  for insert with check (quantity > 0 and unit_price >= 0);
create policy "order_items_admin_read" on public.order_intent_items
  for select using (public.is_admin());

-- audit_logs: apenas admin lê
create policy "audit_admin_read" on public.audit_logs
  for select using (public.is_admin());

-- =========================================================================
-- Storage: bucket product-images (público para leitura, admin para escrita)
-- =========================================================================
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

create policy "storage_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "storage_admin_write" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "storage_admin_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());
create policy "storage_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());