-- FULL Lysbox schema and security (final)
-- Fix extensions schema placement to satisfy linter
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Clean up minimal placeholder created earlier
DROP TABLE IF EXISTS public.shares CASCADE;

-- ENUMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'regime_tributario') THEN
    CREATE TYPE public.regime_tributario AS ENUM ('mei','simples','lucro_presumido','lucro_real');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crc_status') THEN
    CREATE TYPE public.crc_status AS ENUM ('pendente','validado','recusado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_tier') THEN
    CREATE TYPE public.plan_tier AS ENUM ('gratuito','essencial','pro','ultra','contabil','contador_prof','contador_avancado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM ('trial','active','past_due','canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE public.invoice_status AS ENUM ('open','paid','void','refunded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
    CREATE TYPE public.payment_provider AS ENUM ('mercadopago','stripe');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('succeeded','failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bucket_provider') THEN
    CREATE TYPE public.bucket_provider AS ENUM ('s3','wasabi','backblaze','supabase');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'share_visibility') THEN
    CREATE TYPE public.share_visibility AS ENUM ('private','password','public_restricted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'watermark_mode') THEN
    CREATE TYPE public.watermark_mode AS ENUM ('off','visible','invisible','dynamic');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ocr_status') THEN
    CREATE TYPE public.ocr_status AS ENUM ('queued','processing','done','error');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ocr_engine') THEN
    CREATE TYPE public.ocr_engine AS ENUM ('tesseract','vision');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_doc_type') THEN
    CREATE TYPE public.ai_doc_type AS ENUM ('nf','das','recibo','folha','outros');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_tipo') THEN
    CREATE TYPE public.tax_tipo AS ENUM ('DAS','DCTF','FGTS','IRPJ','NF','RECIBO','FOLHA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_status') THEN
    CREATE TYPE public.tax_status AS ENUM ('pago','pendente');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_status') THEN
    CREATE TYPE public.calendar_status AS ENUM ('previsto','enviado','pago','atrasado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_channel') THEN
    CREATE TYPE public.alert_channel AS ENUM ('painel','email','whatsapp');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status') THEN
    CREATE TYPE public.queue_status AS ENUM ('queued','sent','error');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'security_event_type') THEN
    CREATE TYPE public.security_event_type AS ENUM ('login_fail','bruteforce','mass_download','jit_activate');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_provider') THEN
    CREATE TYPE public.integration_provider AS ENUM ('openai','ocr','whatsapp','email_smtp','payment');
  END IF;
END $$;

-- RBAC advanced tables
CREATE TABLE IF NOT EXISTS public.rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS public.rbac_user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.seed_pending_roles (
  email text PRIMARY KEY,
  role_codes text[] NOT NULL,
  primary_app_role public.app_role DEFAULT 'empresario',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seed_pending_roles ENABLE ROW LEVEL SECURITY;

-- Companies and accountants
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text UNIQUE NOT NULL,
  regime public.regime_tributario NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.accountants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crc text,
  crc_status public.crc_status NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.client_accountant_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  accountant_id uuid NOT NULL REFERENCES public.accountants(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, accountant_id)
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_accountant_link ENABLE ROW LEVEL SECURITY;

-- Plans/billing
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  storage_gb int NOT NULL,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  monthly_price_cents int NOT NULL,
  yearly_price_cents int,
  tier public.plan_tier NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status public.subscription_status NOT NULL,
  trial_until date,
  current_period_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount_cents int NOT NULL,
  status public.invoice_status NOT NULL,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  provider public.payment_provider NOT NULL,
  provider_charge_id text,
  amount_cents int NOT NULL,
  status public.payment_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_sub ON public.subscriptions(user_id) WHERE status IN ('trial','active');

-- Cloud storage metadata
CREATE TABLE IF NOT EXISTS public.buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  owner_id uuid not null,
  type public.bucket_type NOT NULL DEFAULT 'cloud',
  total_size bigint NOT NULL DEFAULT 0,
  limit_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz,
);
ALTER TABLE public.buckets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  bucket_id uuid NOT NULL REFERENCES public.buckets(id) ON DELETE RESTRICT,
  path text NOT NULL,
  filename text NOT NULL,
  size_bytes bigint NOT NULL,
  mime_type text,
  hash_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  version int NOT NULL,
  size_bytes bigint,
  hash_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(file_id, version)
);
CREATE TABLE IF NOT EXISTS public.file_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text
);
CREATE TABLE IF NOT EXISTS public.file_blobs (
  file_id uuid PRIMARY KEY REFERENCES public.files(id) ON DELETE CASCADE,
  content bytea NOT NULL
);
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_blobs ENABLE ROW LEVEL SECURITY;

-- Shares
CREATE TABLE IF NOT EXISTS public.shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid REFERENCES public.files(id) ON DELETE CASCADE,
  folder_path text,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility public.share_visibility NOT NULL DEFAULT 'private',
  allow_download boolean NOT NULL DEFAULT true,
  allow_upload boolean NOT NULL DEFAULT false,
  allow_comment boolean NOT NULL DEFAULT false,
  max_downloads int NOT NULL DEFAULT 0,
  max_views int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  password_salt text,
  watermark_mode public.watermark_mode NOT NULL DEFAULT 'off',
  anti_print boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_downloads >= 0),
  CHECK (max_views >= 0)
);
CREATE TABLE IF NOT EXISTS public.share_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.shares(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('view','download','upload')),
  ip inet,
  user_agent text,
  geo jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_access_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_share_logs ON public.share_access_logs(share_id, created_at);

-- OCR + AI
CREATE TABLE IF NOT EXISTS public.ocr_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  status public.ocr_status NOT NULL DEFAULT 'queued',
  engine public.ocr_engine NOT NULL DEFAULT 'tesseract',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.ai_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  doc_type public.ai_doc_type NOT NULL,
  competencia_month int NOT NULL CHECK (competencia_month BETWEEN 1 AND 12),
  competencia_year int NOT NULL,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_classifications ENABLE ROW LEVEL SECURITY;

-- Tax vault & calendar & alerts
CREATE TABLE IF NOT EXISTS public.tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE RESTRICT,
  tipo public.tax_tipo NOT NULL,
  competencia_month int NOT NULL CHECK (competencia_month BETWEEN 1 AND 12),
  competencia_year int NOT NULL,
  status public.tax_status NOT NULL,
  valor_centavos int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tax_docs_search ON public.tax_documents(company_id, competencia_year, competencia_month, tipo);
CREATE TABLE IF NOT EXISTS public.tax_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regime public.regime_tributario NOT NULL,
  tipo public.tax_tipo NOT NULL,
  regra_vencimento jsonb NOT NULL,
  ativo boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  obligation_id uuid REFERENCES public.tax_obligations(id) ON DELETE SET NULL,
  referencia date NOT NULL,
  due_date date NOT NULL,
  status public.calendar_status NOT NULL DEFAULT 'previsto',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel public.alert_channel NOT NULL,
  template_code text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  status public.queue_status NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Audit & security
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  hash_curr text,
  hash_prev text
);
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.security_event_type NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_code text NOT NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  reason text,
  window_minutes int,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.jit_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jit_tokens ENABLE ROW LEVEL SECURITY;

-- Integrations & queues
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider public.integration_provider NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  secret text,
  event_codes text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  status public.queue_status NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone text NOT NULL,
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.queue_status NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.jwt_roles()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'roles')::text[] , ARRAY[]::text[]);
$$;

CREATE OR REPLACE FUNCTION public.rbac_has_role(_user uuid, _role_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (_role_code = ANY(public.jwt_roles()))
  OR EXISTS (SELECT 1 FROM public.rbac_user_roles ur JOIN public.rbac_roles r ON r.id = ur.role_id WHERE ur.user_id = _user AND r.code = _role_code)
  OR ((_role_code IN ('super_admin','admin','contador','cliente')) AND (
    CASE _role_code
      WHEN 'cliente' THEN public.has_role(_user, 'empresario')
      WHEN 'contador' THEN public.has_role(_user, 'contador')
      WHEN 'admin' THEN public.has_role(_user, 'admin')
      WHEN 'super_admin' THEN public.has_role(_user, 'super_admin')
    END));
$$;

CREATE OR REPLACE FUNCTION public.rbac_has_permission(_user uuid, _perm_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.rbac_has_role(_user, 'super_admin') OR EXISTS (
    SELECT 1 FROM public.rbac_user_roles ur
    JOIN public.rbac_role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.rbac_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user AND p.code = _perm_code);
$$;

CREATE OR REPLACE FUNCTION public.is_linked_accountant(_user uuid, _company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.accountants a JOIN public.client_accountant_link l ON l.accountant_id = a.id WHERE a.user_id = _user AND l.company_id = _company);
$$;

CREATE OR REPLACE FUNCTION public.has_active_jit(_user uuid, _role_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.jit_tokens jt WHERE jt.user_id = _user AND jt.role_code = _role_code AND now() < jt.expires_at);
$$;

CREATE OR REPLACE FUNCTION public.fn_audit_log(_entity text, _entity_id uuid, _action text, _diff jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_prev text; v_curr text; BEGIN
  SELECT hash_curr INTO v_prev FROM public.audit_logs WHERE entity = _entity AND entity_id = _entity_id ORDER BY created_at DESC LIMIT 1;
  v_curr := encode(digest(coalesce(v_prev,'') || coalesce(_entity,'') || coalesce(_action,'') || coalesce(_entity_id::text,'') || coalesce(_diff::text,''), 'sha256'), 'hex');
  INSERT INTO public.audit_logs(actor_user_id, entity, entity_id, action, diff, hash_prev, hash_curr)
  VALUES (auth.uid(), _entity, _entity_id, _action, _diff, v_prev, v_curr);
END; $$;

CREATE OR REPLACE FUNCTION public.trg_audit_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN PERFORM public.fn_audit_log(TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW)); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.fn_schedule_tax_events(_company uuid, _year int, _month int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_due_day int; v_count int := 0; v_ref date := make_date(_year, _month, 1); BEGIN
  FOR v_due_day IN SELECT COALESCE((regra_vencimento->>'day')::int, 20) FROM public.tax_obligations WHERE ativo LOOP
    INSERT INTO public.calendar_events(company_id, obligation_id, referencia, due_date, status)
    SELECT _company, o.id, v_ref, make_date(_year, _month, v_due_day), 'previsto' FROM public.tax_obligations o WHERE o.ativo ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP; RETURN v_count; END; $$;

CREATE OR REPLACE FUNCTION public.fn_enforce_jit(_user uuid, _role_code text, _window_minutes int, _approval_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid := gen_random_uuid(); v_status public.approval_status; BEGIN
  SELECT status INTO v_status FROM public.approvals WHERE id = _approval_id AND requested_by = _user; IF v_status <> 'approved' THEN RAISE EXCEPTION 'Approval not approved'; END IF;
  INSERT INTO public.jit_tokens(id, user_id, role_code, expires_at, reason) VALUES (v_id, _user, _role_code, now() + (_window_minutes || ' minutes')::interval, 'JIT via approval ' || _approval_id::text);
  RETURN v_id; END; $$;

-- Extend handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE role_text text; role_value public.app_role := 'empresario'; full_name text; company_name text; seed text[]; r_id uuid; BEGIN
  role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'empresario');
  full_name := NEW.raw_user_meta_data->>'full_name'; company_name := NEW.raw_user_meta_data->>'company_name';
  IF role_text IN ('empresario','contador','admin','super_admin') THEN role_value := role_text::public.app_role; ELSE role_value := 'empresario'::public.app_role; END IF;
  INSERT INTO public.profiles (id, full_name, company_name) VALUES (NEW.id, full_name, company_name) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, role_value) ON CONFLICT (user_id, role) DO NOTHING;
  SELECT role_codes INTO seed FROM public.seed_pending_roles WHERE lower(email) = lower(NEW.email);
  IF seed IS NOT NULL THEN FOREACH role_text IN ARRAY seed LOOP SELECT id INTO r_id FROM public.rbac_roles WHERE code = role_text; IF r_id IS NOT NULL THEN INSERT INTO public.rbac_user_roles(user_id, role_id) VALUES (NEW.id, r_id) ON CONFLICT DO NOTHING; END IF; END LOOP; END IF; RETURN NEW; END; $$;

-- TRIGGERS
DROP TRIGGER IF EXISTS trg_companies_updated ON public.companies; CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_accountants_updated ON public.accountants; CREATE TRIGGER trg_accountants_updated BEFORE UPDATE ON public.accountants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_shares_updated ON public.shares; CREATE TRIGGER trg_shares_updated BEFORE UPDATE ON public.shares FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.subscriptions; CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_audit_subscriptions ON public.subscriptions; CREATE TRIGGER trg_audit_subscriptions BEFORE INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();
DROP TRIGGER IF EXISTS trg_audit_shares ON public.shares; CREATE TRIGGER trg_audit_shares BEFORE INSERT ON public.shares FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();
DROP TRIGGER IF EXISTS trg_audit_integrations ON public.integrations; CREATE TRIGGER trg_audit_integrations BEFORE INSERT ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();
DROP TRIGGER IF EXISTS trg_audit_role_permissions ON public.rbac_role_permissions; CREATE TRIGGER trg_audit_role_permissions BEFORE INSERT ON public.rbac_role_permissions FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS POLICIES
-- RBAC tables
DROP POLICY IF EXISTS r_rbac_roles ON public.rbac_roles; CREATE POLICY r_rbac_roles ON public.rbac_roles FOR SELECT USING (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_rbac_roles ON public.rbac_roles; CREATE POLICY w_rbac_roles ON public.rbac_roles FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_rbac_permissions ON public.rbac_permissions; CREATE POLICY r_rbac_permissions ON public.rbac_permissions FOR SELECT USING (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_rbac_permissions ON public.rbac_permissions; CREATE POLICY w_rbac_permissions ON public.rbac_permissions FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_rbac_role_permissions ON public.rbac_role_permissions; CREATE POLICY r_rbac_role_permissions ON public.rbac_role_permissions FOR SELECT USING (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_rbac_role_permissions ON public.rbac_role_permissions; CREATE POLICY w_rbac_role_permissions ON public.rbac_role_permissions FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_rbac_user_roles ON public.rbac_user_roles; CREATE POLICY r_rbac_user_roles ON public.rbac_user_roles FOR SELECT USING (public.rbac_has_role(auth.uid(), 'super_admin') OR auth.uid() = user_id);
DROP POLICY IF EXISTS w_rbac_user_roles ON public.rbac_user_roles; CREATE POLICY w_rbac_user_roles ON public.rbac_user_roles FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS all_seed_roles ON public.seed_pending_roles; CREATE POLICY all_seed_roles ON public.seed_pending_roles FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));

-- Companies/Accountants
DROP POLICY IF EXISTS c_companies_owner ON public.companies; CREATE POLICY c_companies_owner ON public.companies FOR ALL USING (owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_companies_linked ON public.companies; CREATE POLICY r_companies_linked ON public.companies FOR SELECT USING (public.is_linked_accountant(auth.uid(), id));
DROP POLICY IF EXISTS r_accountants_self ON public.accountants; CREATE POLICY r_accountants_self ON public.accountants FOR SELECT USING (user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_accountants_self ON public.accountants; CREATE POLICY w_accountants_self ON public.accountants FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS w_accountants_admin ON public.accountants; CREATE POLICY w_accountants_admin ON public.accountants FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_links ON public.client_accountant_link; CREATE POLICY r_links ON public.client_accountant_link FOR SELECT USING (public.is_linked_accountant(auth.uid(), company_id) OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_links_owner_admin ON public.client_accountant_link; CREATE POLICY w_links_owner_admin ON public.client_accountant_link FOR ALL USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_user_id = auth.uid()) OR public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_user_id = auth.uid()) OR public.rbac_has_role(auth.uid(), 'super_admin'));

-- Files and related
DROP POLICY IF EXISTS r_files ON public.files; CREATE POLICY r_files ON public.files FOR SELECT USING (owner_user_id = auth.uid() OR (company_id IS NOT NULL AND public.is_linked_accountant(auth.uid(), company_id)) OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_files_owner ON public.files; CREATE POLICY w_files_owner ON public.files FOR ALL USING (owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_file_versions ON public.file_versions; CREATE POLICY r_file_versions ON public.file_versions FOR SELECT USING (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR (f.company_id IS NOT NULL AND public.is_linked_accountant(auth.uid(), f.company_id)) OR public.rbac_has_role(auth.uid(), 'super_admin'))));
DROP POLICY IF EXISTS w_file_versions ON public.file_versions; CREATE POLICY w_file_versions ON public.file_versions FOR ALL USING (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'))));
DROP POLICY IF EXISTS r_file_tags ON public.file_tags; CREATE POLICY r_file_tags ON public.file_tags FOR SELECT USING (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR (f.company_id IS NOT NULL AND public.is_linked_accountant(auth.uid(), f.company_id)) OR public.rbac_has_role(auth.uid(), 'super_admin'))));
DROP POLICY IF EXISTS w_file_tags ON public.file_tags; CREATE POLICY w_file_tags ON public.file_tags FOR ALL USING (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'))));
DROP POLICY IF EXISTS r_file_blobs ON public.file_blobs; CREATE POLICY r_file_blobs ON public.file_blobs FOR SELECT USING (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR (f.company_id IS NOT NULL AND public.is_linked_accountant(auth.uid(), f.company_id)) OR public.rbac_has_role(auth.uid(), 'super_admin'))));
DROP POLICY IF EXISTS w_file_blobs ON public.file_blobs; CREATE POLICY w_file_blobs ON public.file_blobs FOR ALL USING (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin')))) WITH CHECK (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'))));

-- Shares policies
DROP POLICY IF EXISTS r_shares ON public.shares; CREATE POLICY r_shares ON public.shares FOR SELECT USING (owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_shares_owner ON public.shares; CREATE POLICY w_shares_owner ON public.shares FOR INSERT WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS u_shares_owner ON public.shares; CREATE POLICY u_shares_owner ON public.shares FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS d_shares_owner ON public.shares; CREATE POLICY d_shares_owner ON public.shares FOR DELETE USING (owner_user_id = auth.uid());
DROP POLICY IF EXISTS revoke_shares_incident ON public.shares; CREATE POLICY revoke_shares_incident ON public.shares FOR UPDATE USING (public.rbac_has_role(auth.uid(), 'admin_incident') AND public.has_active_jit(auth.uid(), 'admin_incident')) WITH CHECK (public.rbac_has_role(auth.uid(), 'admin_incident') AND public.has_active_jit(auth.uid(), 'admin_incident'));
DROP POLICY IF EXISTS r_share_logs ON public.share_access_logs; CREATE POLICY r_share_logs ON public.share_access_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.shares s WHERE s.id = share_id AND s.owner_user_id = auth.uid()) OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS i_share_logs ON public.share_access_logs; CREATE POLICY i_share_logs ON public.share_access_logs FOR INSERT WITH CHECK (true);

-- OCR/AI
DROP POLICY IF EXISTS r_ocr ON public.ocr_jobs; CREATE POLICY r_ocr ON public.ocr_jobs FOR SELECT USING (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR (f.company_id IS NOT NULL AND public.is_linked_accountant(auth.uid(), f.company_id)) OR public.rbac_has_role(auth.uid(), 'super_admin'))));
DROP POLICY IF EXISTS w_ocr ON public.ocr_jobs; CREATE POLICY w_ocr ON public.ocr_jobs FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_ai ON public.ai_classifications; CREATE POLICY r_ai ON public.ai_classifications FOR SELECT USING (EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND (f.owner_user_id = auth.uid() OR (f.company_id IS NOT NULL AND public.is_linked_accountant(auth.uid(), f.company_id)) OR public.rbac_has_role(auth.uid(), 'super_admin'))));

-- Tax/Calendar/Alerts
DROP POLICY IF EXISTS r_tax_documents ON public.tax_documents; CREATE POLICY r_tax_documents ON public.tax_documents FOR SELECT USING (EXISTS (SELECT 1 FROM public.companies c JOIN public.files f ON f.id = file_id AND f.company_id = c.id WHERE c.owner_user_id = auth.uid() OR public.is_linked_accountant(auth.uid(), c.id)) OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_tax_documents_owner ON public.tax_documents; CREATE POLICY w_tax_documents_owner ON public.tax_documents FOR ALL USING (EXISTS (SELECT 1 FROM public.companies c JOIN public.files f ON f.id = file_id AND f.company_id = c.id WHERE c.owner_user_id = auth.uid()) OR public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.companies c JOIN public.files f ON f.id = file_id AND f.company_id = c.id WHERE c.owner_user_id = auth.uid()) OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_calendar_events ON public.calendar_events; CREATE POLICY r_calendar_events ON public.calendar_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND (c.owner_user_id = auth.uid() OR public.is_linked_accountant(auth.uid(), c.id))) OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_calendar_events_owner ON public.calendar_events; CREATE POLICY w_calendar_events_owner ON public.calendar_events FOR ALL USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_user_id = auth.uid()) OR public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_user_id = auth.uid()) OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_alerts ON public.alerts; CREATE POLICY r_alerts ON public.alerts FOR SELECT USING (company_id IN (SELECT id FROM public.companies WHERE owner_user_id = auth.uid()) OR user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_alerts_owner ON public.alerts; CREATE POLICY w_alerts_owner ON public.alerts FOR ALL USING (company_id IN (SELECT id FROM public.companies WHERE owner_user_id = auth.uid()) OR public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE owner_user_id = auth.uid()) OR public.rbac_has_role(auth.uid(), 'super_admin'));

-- Audit/Security
DROP POLICY IF EXISTS r_audit_logs ON public.audit_logs; CREATE POLICY r_audit_logs ON public.audit_logs FOR SELECT USING (public.rbac_has_role(auth.uid(), 'admin_sec_audit_ro') OR public.rbac_has_role(auth.uid(), 'admin_analytics_ro') OR public.rbac_has_role(auth.uid(), 'admin_incident') OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_security_events ON public.security_events; CREATE POLICY r_security_events ON public.security_events FOR SELECT USING (public.rbac_has_role(auth.uid(), 'admin_sec_audit_ro') OR public.rbac_has_role(auth.uid(), 'admin_analytics_ro') OR public.rbac_has_role(auth.uid(), 'admin_incident') OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_approvals ON public.approvals; CREATE POLICY r_approvals ON public.approvals FOR SELECT USING (requested_by = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin') OR public.rbac_has_role(auth.uid(), 'admin_sec_audit_ro'));
DROP POLICY IF EXISTS w_approvals_admin ON public.approvals; CREATE POLICY w_approvals_admin ON public.approvals FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_jit_tokens ON public.jit_tokens; CREATE POLICY r_jit_tokens ON public.jit_tokens FOR SELECT USING (user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_jit_tokens_admin ON public.jit_tokens; CREATE POLICY w_jit_tokens_admin ON public.jit_tokens FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));

-- Plans visibility
DROP POLICY IF EXISTS r_plans ON public.plans; CREATE POLICY r_plans ON public.plans FOR SELECT USING (true);
DROP POLICY IF EXISTS w_plans ON public.plans; CREATE POLICY w_plans ON public.plans FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));

-- Billing RLS
DROP POLICY IF EXISTS r_subscriptions ON public.subscriptions; CREATE POLICY r_subscriptions ON public.subscriptions FOR SELECT USING (user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'admin_billing') OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_subscriptions ON public.subscriptions; CREATE POLICY w_subscriptions ON public.subscriptions FOR ALL USING (user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'admin_billing') OR public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'admin_billing') OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS r_invoices ON public.invoices; CREATE POLICY r_invoices ON public.invoices FOR SELECT USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id AND (s.user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'admin_billing') OR public.rbac_has_role(auth.uid(), 'super_admin'))));
DROP POLICY IF EXISTS r_payments ON public.payments; CREATE POLICY r_payments ON public.payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices i JOIN public.subscriptions s ON s.id = i.subscription_id WHERE i.id = payments.invoice_id AND (s.user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'admin_billing') OR public.rbac_has_role(auth.uid(), 'super_admin'))));

-- SEEDS
INSERT INTO public.rbac_roles(code, description) VALUES
  ('admin_support_n1','Admin Suporte N1'),
  ('admin_onboarding','Admin Onboarding'),
  ('admin_billing','Admin Billing'),
  ('admin_ops_contabil','Admin Operações Contábeis'),
  ('admin_sec_audit_ro','Admin Segurança/Auditoria (somente leitura)'),
  ('admin_incident','Admin Incidentes JIT'),
  ('admin_analytics_ro','Admin Analytics (somente leitura)'),
  ('super_admin','Super Admin'),
  ('contador','Contador'),
  ('cliente','Cliente') ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_permissions(code, description) VALUES
  ('user.read','Ler usuários'),('user.write_basic','Editar básico de usuários'),('user.reset_password','Resetar senha de usuários'),('user.approve','Aprovar usuários'),('user.block_unblock','Bloquear/Desbloquear usuário'),('role.assign','Atribuir papéis'),('role.read','Ler papéis'),('plan.read','Ler planos'),('plan.change','Alterar planos'),('billing.invoice.read','Ler faturas'),('billing.refund','Reembolsar'),('trial.manage','Gerenciar trial'),('accounting.module.toggle','Alternar módulo contábil'),('accounting.alerts.configure','Configurar alertas contábeis'),('accounting.link.manage','Gerenciar vínculos cliente-contador'),('share.create','Criar compartilhamentos'),('share.update','Atualizar compartilhamentos'),('share.revoke','Revogar compartilhamentos'),('share.mass_revoke','Revogação em massa'),('logs.read','Ler logs'),('security.events.read','Ler eventos de segurança'),('auth.force_logout_all','Forçar logout geral'),('integrations.manage','Gerenciar integrações'),('incident.activate_jit','Ativar JIT'),('incident.perform_critical','Executar ação crítica') ON CONFLICT (code) DO NOTHING;

-- Role-permission mapping inserts
INSERT INTO public.rbac_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.rbac_roles r, public.rbac_permissions p WHERE r.code = 'admin_support_n1' AND p.code IN ('user.read','user.write_basic','user.reset_password','user.block_unblock') ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.rbac_roles r, public.rbac_permissions p WHERE r.code = 'admin_onboarding' AND p.code IN ('user.approve','accounting.link.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.rbac_roles r, public.rbac_permissions p WHERE r.code = 'admin_billing' AND p.code IN ('plan.read','plan.change','billing.invoice.read','trial.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.rbac_roles r, public.rbac_permissions p WHERE r.code = 'admin_ops_contabil' AND p.code IN ('accounting.module.toggle','accounting.alerts.configure') ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.rbac_roles r, public.rbac_permissions p WHERE r.code = 'admin_sec_audit_ro' AND p.code IN ('logs.read','security.events.read') ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.rbac_roles r, public.rbac_permissions p WHERE r.code = 'admin_incident' AND p.code IN ('share.mass_revoke','auth.force_logout_all','integrations.manage','incident.perform_critical') ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.rbac_roles r, public.rbac_permissions p WHERE r.code = 'admin_analytics_ro' AND p.code IN ('logs.read') ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.rbac_roles r, public.rbac_permissions p WHERE r.code = 'contador' AND p.code IN ('share.create','share.update','accounting.link.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.rbac_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.rbac_roles r, public.rbac_permissions p WHERE r.code = 'cliente' AND p.code IN ('share.create','share.update') ON CONFLICT DO NOTHING;

-- Plans
INSERT INTO public.plans(code, name, storage_gb, features, monthly_price_cents, yearly_price_cents, tier) VALUES
('gratuito','Gratuito', 2, '{"limits":{"companies":1}}', 0, NULL, 'gratuito'),
('essencial','Essencial', 200, '{"limits":{"companies":1}}', 4900, 49000, 'essencial'),
('pro','Pro', 500, '{"limits":{"companies":3}}', 9900, 99000, 'pro'),
('ultra','Ultra', 1024, '{"limits":{"companies":5}}', 19900, 199000, 'ultra'),
('contabil_mei','Contábil MEI', 10, '{"notes":"inclui processamento MEI"}', 2900, 29000, 'contabil'),
('contabil_pro','Contábil Pro', 30, '{"notes":"inclui folha"}', 9900, 99000, 'contabil'),
('contador_prof','Contador Prof', 0, '{"limits":{"clients":10}}', 14900, 149000, 'contador_prof'),
('contador_avancado','Contador Avançado', 0, '{"limits":{"clients":30}}', 29900, 299000, 'contador_avancado') ON CONFLICT (code) DO NOTHING;

-- Obligations
INSERT INTO public.tax_obligations(regime, tipo, regra_vencimento, ativo) VALUES
('mei','DAS', '{"day":20}', true),
('simples','DAS', '{"day":20}', true),
('lucro_presumido','DCTF', '{"day":25}', true),
('lucro_real','DCTF', '{"day":25}', true),
('simples','FGTS', '{"day":7}', true),
('lucro_presumido','IRPJ', '{"day":30}', true),
('lucro_real','IRPJ', '{"day":30}', true) ON CONFLICT DO NOTHING;

-- Integrations placeholders
INSERT INTO public.integrations(provider, config, enabled) VALUES ('openai','{}', false), ('ocr','{}', false), ('whatsapp','{}', false), ('email_smtp','{}', false), ('payment','{}', false) ON CONFLICT DO NOTHING;

-- Pending roles for test emails
INSERT INTO public.seed_pending_roles(email, role_codes, primary_app_role) VALUES
('empresario@teste.com', ARRAY['cliente'], 'empresario'),
('contador@teste.com', ARRAY['contador'], 'contador'),
('admin@teste.com', ARRAY['admin_support_n1','admin_onboarding'], 'admin'),
('super@teste.com', ARRAY['super_admin'], 'super_admin') ON CONFLICT (email) DO UPDATE SET role_codes = EXCLUDED.role_codes, primary_app_role = EXCLUDED.primary_app_role;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_files_owner ON public.files(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_files_company ON public.files(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_company ON public.calendar_events(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_share_id_created ON public.share_access_logs(share_id, created_at);
CREATE INDEX IF NOT EXISTS idx_file_versions ON public.file_versions(file_id, version);
