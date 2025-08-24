-- Phase 1 DB enablement for Empresário Dashboard
-- 1) Minimal share permissions + access tracking + download counter trigger
-- 2) Safe audit logging function and triggers on main tables
-- Note: No RLS changes here to avoid breaking existing flows

-- Create lightweight audit function if missing
CREATE OR REPLACE FUNCTION public.fn_audit_log(
  p_entity text,
  p_entity_id uuid,
  p_action text,
  p_diff jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (entity, entity_id, action, diff, actor_user_id, created_at)
  VALUES (p_entity, p_entity_id, p_action, p_diff, auth.uid(), now());
END;$$;

-- Shares: add basic permission flags
ALTER TABLE public.shares
  ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_upload boolean NOT NULL DEFAULT false;

-- Share access logs: store the user who accessed (if authenticated)
ALTER TABLE public.share_access_logs
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_share_access_logs_share_id ON public.share_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_cloud_files_user_created ON public.cloud_files(user_id, created_at);

-- Increment downloads when a 'download' event is recorded
DROP TRIGGER IF EXISTS trg_after_insert_share_access_logs ON public.share_access_logs;
CREATE TRIGGER trg_after_insert_share_access_logs
AFTER INSERT ON public.share_access_logs
FOR EACH ROW
EXECUTE FUNCTION public.increment_share_downloads();

-- Safe audit triggers: only on INSERT/UPDATE to avoid DELETE NEW/OLD issues
-- Ensure trigger function exists (public.trg_audit_row references public.fn_audit_log which we created above)
DROP TRIGGER IF EXISTS audit_cloud_files ON public.cloud_files;
CREATE TRIGGER audit_cloud_files
AFTER INSERT OR UPDATE ON public.cloud_files
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();

DROP TRIGGER IF EXISTS audit_shares ON public.shares;
CREATE TRIGGER audit_shares
AFTER INSERT OR UPDATE ON public.shares
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();

DROP TRIGGER IF EXISTS audit_share_files ON public.share_files;
CREATE TRIGGER audit_share_files
AFTER INSERT OR UPDATE ON public.share_files
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();

DROP TRIGGER IF EXISTS audit_acc_tx ON public.accounting_transactions;
CREATE TRIGGER audit_acc_tx
AFTER INSERT OR UPDATE ON public.accounting_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();

DROP TRIGGER IF EXISTS audit_iva_ops ON public.iva_operations;
CREATE TRIGGER audit_iva_ops
AFTER INSERT OR UPDATE ON public.iva_operations
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();

DROP TRIGGER IF EXISTS audit_calendar_events ON public.calendar_events;
CREATE TRIGGER audit_calendar_events
AFTER INSERT OR UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();