-- Enable RLS and policies for plans table
alter table if exists public.plans enable row level security;

-- Clean existing policies (if any) to avoid duplicates
drop policy if exists plans_select_public on public.plans;
drop policy if exists plans_insert_super on public.plans;
drop policy if exists plans_update_super on public.plans;
drop policy if exists plans_delete_super on public.plans;

-- Allow public read of plans (for landing/pricing pages)
create policy plans_select_public
on public.plans
for select
using (true);

-- Only super_admin can write plans
create policy plans_insert_super
on public.plans
for insert to authenticated
with check (has_role(auth.uid(), 'super_admin'::public.app_role));

create policy plans_update_super
on public.plans
for update to authenticated
using (has_role(auth.uid(), 'super_admin'::public.app_role))
with check (has_role(auth.uid(), 'super_admin'::public.app_role));

create policy plans_delete_super
on public.plans
for delete to authenticated
using (has_role(auth.uid(), 'super_admin'::public.app_role));

-- CMS: site_content table to manage landing copy, palette and media references
create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,        -- e.g., 'landing'
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Clean and (re)create site_content policies
drop policy if exists site_content_select_public on public.site_content;
drop policy if exists site_content_insert_super on public.site_content;
drop policy if exists site_content_update_super on public.site_content;
drop policy if exists site_content_delete_super on public.site_content;

create policy site_content_select_public
on public.site_content
for select
using (true);

create policy site_content_insert_super
on public.site_content
for insert to authenticated
with check (has_role(auth.uid(), 'super_admin'::public.app_role));

create policy site_content_update_super
on public.site_content
for update to authenticated
using (has_role(auth.uid(), 'super_admin'::public.app_role))
with check (has_role(auth.uid(), 'super_admin'::public.app_role));

create policy site_content_delete_super
on public.site_content
for delete to authenticated
using (has_role(auth.uid(), 'super_admin'::public.app_role));

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_content_updated_at on public.site_content;
create trigger set_site_content_updated_at
before update on public.site_content
for each row execute function public.tg_set_updated_at();

-- Public bucket for site assets (images used on landing)
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

-- Storage policies for 'site-assets'
drop policy if exists "Public read site-assets" on storage.objects;
drop policy if exists "Super admin upload site-assets" on storage.objects;
drop policy if exists "Super admin update site-assets" on storage.objects;
drop policy if exists "Super admin delete site-assets" on storage.objects;

create policy "Public read site-assets"
on storage.objects
for select
using (bucket_id = 'site-assets');

create policy "Super admin upload site-assets"
on storage.objects
for insert to authenticated
with check (bucket_id = 'site-assets' and has_role(auth.uid(), 'super_admin'::public.app_role));

create policy "Super admin update site-assets"
on storage.objects
for update to authenticated
using (bucket_id = 'site-assets' and has_role(auth.uid(), 'super_admin'::public.app_role))
with check (bucket_id = 'site-assets' and has_role(auth.uid(), 'super_admin'::public.app_role));

create policy "Super admin delete site-assets"
on storage.objects
for delete to authenticated
using (bucket_id = 'site-assets' and has_role(auth.uid(), 'super_admin'::public.app_role));