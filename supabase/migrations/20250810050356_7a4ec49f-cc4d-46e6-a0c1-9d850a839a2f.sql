-- Retry with unique enum names to avoid conflicts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acc_transaction_type') THEN
    CREATE TYPE public.acc_transaction_type AS ENUM ('receita','despesa');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acc_payment_status') THEN
    CREATE TYPE public.acc_payment_status AS ENUM ('pago','pendente','cancelado');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.accounting_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  date DATE NOT NULL,
  type public.acc_transaction_type NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status public.acc_payment_status NOT NULL DEFAULT 'pendente',
  category TEXT,
  description TEXT,
  file_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_acc_tx_updated ON public.accounting_transactions;
CREATE TRIGGER trg_acc_tx_updated
BEFORE UPDATE ON public.accounting_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_acc_tx_company ON public.accounting_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_acc_tx_date ON public.accounting_transactions(date);
CREATE INDEX IF NOT EXISTS idx_acc_tx_type ON public.accounting_transactions(type);
CREATE INDEX IF NOT EXISTS idx_acc_tx_status ON public.accounting_transactions(status);

ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounting_transactions' AND policyname='acc_tx_select_policy'
  ) THEN
    CREATE POLICY acc_tx_select_policy ON public.accounting_transactions
    FOR SELECT USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = accounting_transactions.company_id AND c.owner_user_id = auth.uid())
      OR is_linked_accountant(auth.uid(), company_id)
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounting_transactions' AND policyname='acc_tx_insert_policy'
  ) THEN
    CREATE POLICY acc_tx_insert_policy ON public.accounting_transactions
    FOR INSERT WITH CHECK (
      user_id = auth.uid()
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
        OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = accounting_transactions.company_id AND c.owner_user_id = auth.uid())
        OR is_linked_accountant(auth.uid(), company_id)
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounting_transactions' AND policyname='acc_tx_update_policy'
  ) THEN
    CREATE POLICY acc_tx_update_policy ON public.accounting_transactions
    FOR UPDATE USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = accounting_transactions.company_id AND c.owner_user_id = auth.uid())
      OR is_linked_accountant(auth.uid(), company_id)
    ) WITH CHECK (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = accounting_transactions.company_id AND c.owner_user_id = auth.uid())
      OR is_linked_accountant(auth.uid(), company_id)
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='accounting_transactions' AND policyname='acc_tx_delete_policy'
  ) THEN
    CREATE POLICY acc_tx_delete_policy ON public.accounting_transactions
    FOR DELETE USING (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = accounting_transactions.company_id AND c.owner_user_id = auth.uid())
      OR is_linked_accountant(auth.uid(), company_id)
    );
  END IF;
END $$;

CREATE OR REPLACE VIEW public.vw_monthly_financial_summary AS
SELECT
  company_id,
  date_trunc('month', date)::date AS month,
  SUM(CASE WHEN type = 'receita' THEN amount_cents ELSE 0 END) AS receitas_cents,
  SUM(CASE WHEN type = 'despesa' THEN amount_cents ELSE 0 END) AS despesas_cents
FROM public.accounting_transactions
GROUP BY company_id, date_trunc('month', date);

-- share_files and shares extras as before
CREATE TABLE IF NOT EXISTS public.share_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL,
  file_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.share_files ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='share_files' AND policyname='share_files_select_owner'
  ) THEN
    CREATE POLICY share_files_select_owner ON public.share_files
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.shares s WHERE s.id = share_files.share_id AND s.owner_user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='share_files' AND policyname='share_files_insert_owner'
  ) THEN
    CREATE POLICY share_files_insert_owner ON public.share_files
    FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.shares s WHERE s.id = share_files.share_id AND s.owner_user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='share_files' AND policyname='share_files_delete_owner'
  ) THEN
    CREATE POLICY share_files_delete_owner ON public.share_files
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.shares s WHERE s.id = share_files.share_id AND s.owner_user_id = auth.uid())
    );
  END IF;
END $$;

ALTER TABLE public.shares
  ADD COLUMN IF NOT EXISTS password_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS watermark BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anti_print BOOLEAN NOT NULL DEFAULT false;