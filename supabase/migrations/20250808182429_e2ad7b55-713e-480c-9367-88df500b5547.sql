-- Create private storage bucket for cloud files
insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', false)
on conflict (id) do nothing;

-- Storage policies for per-user folder access in 'user-files'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cloud_select_own'
  ) THEN
    CREATE POLICY "cloud_select_own"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'user-files'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cloud_insert_own'
  ) THEN
    CREATE POLICY "cloud_insert_own"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'user-files'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cloud_update_own'
  ) THEN
    CREATE POLICY "cloud_update_own"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'user-files'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'user-files'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'cloud_delete_own'
  ) THEN
    CREATE POLICY "cloud_delete_own"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'user-files'
        AND auth.role() = 'authenticated'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_files' AND policyname = 'cloud_files_select_own'
  ) THEN
    CREATE POLICY "cloud_files_select_own"
      ON public.cloud_files FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_files' AND policyname = 'cloud_files_insert_own'
  ) THEN
    CREATE POLICY "cloud_files_insert_own"
      ON public.cloud_files FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_files' AND policyname = 'cloud_files_update_own'
  ) THEN
    CREATE POLICY "cloud_files_update_own"
      ON public.cloud_files FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_files' AND policyname = 'cloud_files_delete_own'
  ) THEN
    CREATE POLICY "cloud_files_delete_own"
      ON public.cloud_files FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_cloud_files_updated_at ON public.cloud_files;
CREATE TRIGGER trg_cloud_files_updated_at
BEFORE UPDATE ON public.cloud_files
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Favorites table
create table if not exists public.cloud_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  file_id uuid not null references public.cloud_files(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, file_id)
);

alter table public.cloud_favorites enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_favorites' AND policyname = 'cloud_favorites_select_own'
  ) THEN
    CREATE POLICY "cloud_favorites_select_own"
      ON public.cloud_favorites FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_favorites' AND policyname = 'cloud_favorites_insert_own'
  ) THEN
    CREATE POLICY "cloud_favorites_insert_own"
      ON public.cloud_favorites FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_favorites' AND policyname = 'cloud_favorites_delete_own'
  ) THEN
    CREATE POLICY "cloud_favorites_delete_own"
      ON public.cloud_favorites FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;