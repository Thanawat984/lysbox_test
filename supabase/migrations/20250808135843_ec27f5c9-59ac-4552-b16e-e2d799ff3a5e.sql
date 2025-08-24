-- Attempt to apply remaining full schema after fixing audit trigger
ALTER EXTENSION pgcrypto SET SCHEMA extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Recreate all objects idempotently (will no-op where already created); focus on creating missing ones
-- We'll create a simple marker table to verify transaction (noop)
CREATE TABLE IF NOT EXISTS public._lysbox_marker (k int primary key);

-- RBAC advanced tables (idempotent)
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

-- Companies/accountants
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
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_sub ON public.subscriptions(user_id) WHERE status IN ('trial','active');
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

-- Files and storage metadata
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

-- Shares and access logs
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

-- OCR/AI
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

-- Tax/Calendar/Alerts
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

-- Triggers
DROP TRIGGER IF EXISTS trg_companies_updated ON public.companies; CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_accountants_updated ON public.accountants; CREATE TRIGGER trg_accountants_updated BEFORE UPDATE ON public.accountants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_shares_updated ON public.shares; CREATE TRIGGER trg_shares_updated BEFORE UPDATE ON public.shares FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.subscriptions; CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_audit_subscriptions ON public.subscriptions; CREATE TRIGGER trg_audit_subscriptions BEFORE INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();
DROP TRIGGER IF EXISTS trg_audit_shares ON public.shares; CREATE TRIGGER trg_audit_shares BEFORE INSERT ON public.shares FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();
DROP TRIGGER IF EXISTS trg_audit_integrations ON public.integrations; CREATE TRIGGER trg_audit_integrations BEFORE INSERT ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();
DROP TRIGGER IF EXISTS trg_audit_role_permissions ON public.rbac_role_permissions; CREATE TRIGGER trg_audit_role_permissions BEFORE INSERT ON public.rbac_role_permissions FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Policies (subset to avoid size; critical ones)
DROP POLICY IF EXISTS r_plans ON public.plans; CREATE POLICY r_plans ON public.plans FOR SELECT USING (true);
DROP POLICY IF EXISTS w_plans ON public.plans; CREATE POLICY w_plans ON public.plans FOR ALL USING (public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (public.rbac_has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS r_subscriptions ON public.subscriptions; CREATE POLICY r_subscriptions ON public.subscriptions FOR SELECT USING (user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'admin_billing') OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_subscriptions ON public.subscriptions; CREATE POLICY w_subscriptions ON public.subscriptions FOR ALL USING (user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'admin_billing') OR public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'admin_billing') OR public.rbac_has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS r_files ON public.files; CREATE POLICY r_files ON public.files FOR SELECT USING (owner_user_id = auth.uid() OR (company_id IS NOT NULL AND public.is_linked_accountant(auth.uid(), company_id)) OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_files_owner ON public.files; CREATE POLICY w_files_owner ON public.files FOR ALL USING (owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin')) WITH CHECK (owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS r_shares ON public.shares; CREATE POLICY r_shares ON public.shares FOR SELECT USING (owner_user_id = auth.uid() OR public.rbac_has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS w_shares_owner ON public.shares; CREATE POLICY w_shares_owner ON public.shares FOR INSERT WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS u_shares_owner ON public.shares; CREATE POLICY u_shares_owner ON public.shares FOR UPDATE USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS d_shares_owner ON public.shares; CREATE POLICY d_shares_owner ON public.shares FOR DELETE USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS r_audit_logs ON public.audit_logs; CREATE POLICY r_audit_logs ON public.audit_logs FOR SELECT USING (public.rbac_has_role(auth.uid(), 'admin_sec_audit_ro') OR public.rbac_has_role(auth.uid(), 'admin_analytics_ro') OR public.rbac_has_role(auth.uid(), 'admin_incident') OR public.rbac_has_role(auth.uid(), 'super_admin'));

-- Seeds minimal (roles & perms)
INSERT INTO public.rbac_roles(code, description) VALUES ('super_admin','Super Admin'),('admin_support_n1','Admin Suporte N1'),('admin_onboarding','Admin Onboarding'),('admin_billing','Admin Billing'),('admin_ops_contabil','Admin Operações Contábeis'),('admin_sec_audit_ro','Admin Segurança/Auditoria RO'),('admin_incident','Admin Incidentes'),('admin_analytics_ro','Admin Analytics RO'),('contador','Contador'),('cliente','Cliente') ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rbac_permissions(code, description) VALUES ('logs.read','Ler logs'),('security.events.read','Ler eventos'),('share.create','Criar compartilhamentos'),('share.update','Atualizar compartilhamentos'),('accounting.link.manage','Gerenciar vínculos'),('plan.read','Ler planos'),('plan.change','Alterar planos') ON CONFLICT (code) DO NOTHING;
