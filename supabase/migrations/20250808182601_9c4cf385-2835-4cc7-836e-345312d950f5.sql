-- Add original_path column to support restore from trash
alter table public.cloud_files
  add column if not exists original_path text;

-- When item is active (not deleted), original_path should be null; when moved to trash, store previous path
-- (Handled at application level)
