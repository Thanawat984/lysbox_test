-- Retry migration with safe guards (no IF NOT EXISTS on CREATE POLICY)

-- Enums (create only if missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE public.ticket_status AS ENUM ('open','pending','closed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE public.ticket_priority AS ENUM ('low','normal','high','urgent');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'share_status') THEN
    CREATE TYPE public.share_status AS ENUM ('active','revoked','expired');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'telemetry_outcome') THEN
    CREATE TYPE public.telemetry_outcome AS ENUM ('success','error');
  END IF;
END $$;

-- Tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select_own_or_admin" ON public.tickets;
CREATE POLICY "tickets_select_own_or_admin"
ON public.tickets
FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "tickets_insert_admin_only" ON public.tickets;
CREATE POLICY "tickets_insert_admin_only"
ON public.tickets
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "tickets_update_admin_only" ON public.tickets;
CREATE POLICY "tickets_update_admin_only"
ON public.tickets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "tickets_delete_admin_only" ON public.tickets;
CREATE POLICY "tickets_delete_admin_only"
ON public.tickets
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Ticket messages
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  message TEXT NOT NULL,
  internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_messages_select_own_or_admin" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select_own_or_admin"
ON public.ticket_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id AND t.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "ticket_messages_insert_admin_or_ticket_owner" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_admin_or_ticket_owner"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    author_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    AND internal = false
  )
);

DROP POLICY IF EXISTS "ticket_messages_update_delete_admin_only" ON public.ticket_messages;
CREATE POLICY "ticket_messages_update_delete_admin_only"
ON public.ticket_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Extend shares
ALTER TABLE public.shares
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_downloads INTEGER,
  ADD COLUMN IF NOT EXISTS downloads_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status public.share_status NOT NULL DEFAULT 'active';

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shares_select_owner_or_admin" ON public.shares;
CREATE POLICY "shares_select_owner_or_admin"
ON public.shares
FOR SELECT
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "shares_update_owner_or_admin" ON public.shares;
CREATE POLICY "shares_update_owner_or_admin"
ON public.shares
FOR UPDATE
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "shares_delete_owner_or_admin" ON public.shares;
CREATE POLICY "shares_delete_owner_or_admin"
ON public.shares
FOR DELETE
USING (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Telemetry events
CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  button_id TEXT NOT NULL,
  outcome public.telemetry_outcome NOT NULL,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telemetry_insert_all_auth" ON public.telemetry_events;
CREATE POLICY "telemetry_insert_all_auth"
ON public.telemetry_events
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "telemetry_select_admin_only" ON public.telemetry_events;
CREATE POLICY "telemetry_select_admin_only"
ON public.telemetry_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner ON public.shares(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_button_time ON public.telemetry_events(button_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON public.audit_logs(created_at);

-- Trigger to increment downloads_count when a download is logged
CREATE OR REPLACE FUNCTION public.increment_share_downloads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF (NEW.event = 'download') THEN
    UPDATE public.shares s
      SET downloads_count = COALESCE(s.downloads_count, 0) + 1,
          status = CASE 
                    WHEN s.max_downloads IS NOT NULL AND COALESCE(s.downloads_count, 0) + 1 >= s.max_downloads THEN 'expired'::public.share_status
                    ELSE s.status
                   END
      WHERE s.id = NEW.share_id;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_increment_share_downloads ON public.share_access_logs;

CREATE TRIGGER trg_increment_share_downloads
AFTER INSERT ON public.share_access_logs
FOR EACH ROW
EXECUTE FUNCTION public.increment_share_downloads();