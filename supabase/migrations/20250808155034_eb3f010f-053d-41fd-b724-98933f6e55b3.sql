-- IVA Module Migration
-- 1) Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'iva_operation_type') THEN
    CREATE TYPE public.iva_operation_type AS ENUM ('compra','venda');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'iva_credit_debit') THEN
    CREATE TYPE public.iva_credit_debit AS ENUM ('credito','debito');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'iva_source') THEN
    CREATE TYPE public.iva_source AS ENUM ('manual','ocr');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'iva_sector') THEN
    CREATE TYPE public.iva_sector AS ENUM ('geral','saude','educacao','transporte_coletivo','cesta_basica');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'iva_special_regime') THEN
    CREATE TYPE public.iva_special_regime AS ENUM ('padrao','combustiveis','financeiros','planos_saude','agropecuaria');
  END IF;
END $$;

-- 2) Parameters table (managed by super_admin)
CREATE TABLE IF NOT EXISTS public.iva_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cbs_rate numeric(6,4) NOT NULL,
  ibs_rate numeric(6,4) NOT NULL,
  sector public.iva_sector NOT NULL DEFAULT 'geral',
  regime public.iva_special_regime NOT NULL DEFAULT 'padrao',
  active_from date NOT NULL DEFAULT (now()::date),
  active_to date NULL,
  description text NULL,
  enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.iva_parameters ENABLE ROW LEVEL SECURITY;

-- RLS: anyone authenticated can read; only super_admin can write
DROP POLICY IF EXISTS "iva_parameters_select_all_auth" ON public.iva_parameters;
CREATE POLICY "iva_parameters_select_all_auth"
ON public.iva_parameters
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "iva_parameters_write_super" ON public.iva_parameters;
CREATE POLICY "iva_parameters_write_super"
ON public.iva_parameters
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- 3) Operations table
CREATE TABLE IF NOT EXISTS public.iva_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  op_date date NOT NULL,
  op_type public.iva_operation_type NOT NULL,
  party_name text,
  party_cnpj text,
  amount_without_tax numeric(14,2) NOT NULL,
  cbs_rate numeric(6,4) NOT NULL,
  ibs_rate numeric(6,4) NOT NULL,
  iva_total numeric(14,2) NOT NULL,
  credit_debit public.iva_credit_debit NOT NULL,
  source public.iva_source NOT NULL DEFAULT 'manual',
  file_id uuid NULL,
  notes text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_iva_ops_company_date ON public.iva_operations (company_id, op_date);
CREATE INDEX IF NOT EXISTS idx_iva_ops_file ON public.iva_operations (file_id);

-- RLS
ALTER TABLE public.iva_operations ENABLE ROW LEVEL SECURITY;

-- helper expression: owner or linked accountant or admin/super
DROP POLICY IF EXISTS "iva_ops_select_policy" ON public.iva_operations;
CREATE POLICY "iva_ops_select_policy"
ON public.iva_operations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_user_id = auth.uid()) OR
  public.is_linked_accountant(auth.uid(), company_id)
);

DROP POLICY IF EXISTS "iva_ops_insert_policy" ON public.iva_operations;
CREATE POLICY "iva_ops_insert_policy"
ON public.iva_operations
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) AND (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_user_id = auth.uid()) OR
    public.is_linked_accountant(auth.uid(), company_id)
  )
);

DROP POLICY IF EXISTS "iva_ops_update_policy" ON public.iva_operations;
CREATE POLICY "iva_ops_update_policy"
ON public.iva_operations
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_user_id = auth.uid()) OR
  public.is_linked_accountant(auth.uid(), company_id)
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_user_id = auth.uid()) OR
  public.is_linked_accountant(auth.uid(), company_id)
);

DROP POLICY IF EXISTS "iva_ops_delete_policy" ON public.iva_operations;
CREATE POLICY "iva_ops_delete_policy"
ON public.iva_operations
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR
  EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_user_id = auth.uid()) OR
  public.is_linked_accountant(auth.uid(), company_id)
);

-- 4) Triggers for updated_at and audit
DROP TRIGGER IF EXISTS update_iva_parameters_updated_at ON public.iva_parameters;
CREATE TRIGGER update_iva_parameters_updated_at
BEFORE UPDATE ON public.iva_parameters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS audit_iva_parameters ON public.iva_parameters;
CREATE TRIGGER audit_iva_parameters
AFTER INSERT OR UPDATE OR DELETE ON public.iva_parameters
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();

DROP TRIGGER IF EXISTS update_iva_ops_updated_at ON public.iva_operations;
CREATE TRIGGER update_iva_ops_updated_at
BEFORE UPDATE ON public.iva_operations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS audit_iva_operations ON public.iva_operations;
CREATE TRIGGER audit_iva_operations
AFTER INSERT OR UPDATE OR DELETE ON public.iva_operations
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_row();
