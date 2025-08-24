-- Create private storage bucket for cloud files
insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', false)
on conflict (id) do nothing;

-- Storage policies for per-user folder access in 'user-files'
-- Users can read their own objects
create policy if not exists "cloud_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'user-files'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can upload to their own folder (prefix = user id)
create policy if not exists "cloud_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'user-files'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own objects
create policy if not exists "cloud_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'user-files'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'user-files'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own objects
create policy if not exists "cloud_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'user-files'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Cloud files metadata table (separate from any existing tables)
create table if not exists public.cloud_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bucket text not null default 'user-files',
  path text not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (user_id, path)
);

-- Enable RLS
alter table public.cloud_files enable row level security;

-- Policies: CRUD own records only
create policy if not exists "cloud_files_select_own"
  on public.cloud_files for select
  using (user_id = auth.uid());

create policy if not exists "cloud_files_insert_own"
  on public.cloud_files for insert
  with check (user_id = auth.uid());

create policy if not exists "cloud_files_update_own"
  on public.cloud_files for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "cloud_files_delete_own"
  on public.cloud_files for delete
  using (user_id = auth.uid());

-- Trigger to maintain updated_at
create trigger if not exists trg_cloud_files_updated_at
before update on public.cloud_files
for each row execute function public.update_updated_at_column();

-- Favorites table
create table if not exists public.cloud_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_id uuid not null references public.cloud_files(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, file_id)
);

alter table public.cloud_favorites enable row level security;

create policy if not exists "cloud_favorites_select_own"
  on public.cloud_favorites for select
  using (user_id = auth.uid());

create policy if not exists "cloud_favorites_insert_own"
  on public.cloud_favorites for insert
  with check (user_id = auth.uid());

create policy if not exists "cloud_favorites_delete_own"
  on public.cloud_favorites for delete
  using (user_id = auth.uid());