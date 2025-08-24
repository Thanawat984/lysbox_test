-- Create content tables and secure them with RLS
-- 1) FAQs
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  "order" integer,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Testimonials
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author text not null,
  role text,
  rating integer not null default 5,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Logos
create table if not exists public.logos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  alt text,
  "order" integer,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) KPIs
create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) Promotions
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  active boolean not null,
  text text not null,
  button_label text,
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6) Site settings (key-value)
create table if not exists public.site_settings (
  key text primary key,
  value_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Update updated_at trigger for all tables
create trigger tg_faqs_updated_at
before update on public.faqs
for each row execute procedure public.update_updated_at_column();

create trigger tg_testimonials_updated_at
before update on public.testimonials
for each row execute procedure public.update_updated_at_column();

create trigger tg_logos_updated_at
before update on public.logos
for each row execute procedure public.update_updated_at_column();

create trigger tg_kpis_updated_at
before update on public.kpis
for each row execute procedure public.update_updated_at_column();

create trigger tg_promotions_updated_at
before update on public.promotions
for each row execute procedure public.update_updated_at_column();

create trigger tg_site_settings_updated_at
before update on public.site_settings
for each row execute procedure public.update_updated_at_column();

-- Ensure the RBAC role used in policies exists: 'content_admin'
insert into public.rbac_roles (id, code, description)
select gen_random_uuid(), 'content_admin', 'Pode gerenciar conteúdo do site (concedido pelo super_admin)'
where not exists (select 1 from public.rbac_roles where code = 'content_admin');

-- Enable RLS on all content tables
alter table public.faqs enable row level security;
alter table public.testimonials enable row level security;
alter table public.logos enable row level security;
alter table public.kpis enable row level security;
alter table public.promotions enable row level security;
alter table public.site_settings enable row level security;

-- Policies: public read; write restricted to super_admin or content_admin
-- FAQs
create policy if not exists faqs_select_public on public.faqs for select using (true);
create policy if not exists faqs_write_super_or_content_admin on public.faqs for all
using (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
)
with check (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
);

-- Testimonials
create policy if not exists testimonials_select_public on public.testimonials for select using (true);
create policy if not exists testimonials_write_super_or_content_admin on public.testimonials for all
using (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
)
with check (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
);

-- Logos
create policy if not exists logos_select_public on public.logos for select using (true);
create policy if not exists logos_write_super_or_content_admin on public.logos for all
using (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
)
with check (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
);

-- KPIs
create policy if not exists kpis_select_public on public.kpis for select using (true);
create policy if not exists kpis_write_super_or_content_admin on public.kpis for all
using (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
)
with check (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
);

-- Promotions
create policy if not exists promotions_select_public on public.promotions for select using (true);
create policy if not exists promotions_write_super_or_content_admin on public.promotions for all
using (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
)
with check (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
);

-- Site settings
create policy if not exists site_settings_select_public on public.site_settings for select using (true);
create policy if not exists site_settings_write_super_or_content_admin on public.site_settings for all
using (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
)
with check (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  or public.rbac_has_role(auth.uid(), 'content_admin')
);
