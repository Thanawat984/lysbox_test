--

--CREATE ENUM ticket_channel

CREATE TYPE public.ticket_channel AS ENUM ('open', 'pending', 'closed');
-- modify tickets 

CREATE TABLE public.tickets ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, company_id UUID NOT NULL, subject TEXT NOT NULL, status public.ticket_status NOT NULL DEFAULT 'open', priority public.ticket_priority NOT NULL DEFAULT 'normal', support_at TIMESTAMPTZ NOT NULL, channel public.ticket_channel NOT NULL DEFAULT 'panel', created_at TIMESTAMPTZ NOT NULL DEFAULT now() );
-- modify ENUM ticket_status 

ALTER TYPE public.ticket_status ADD VALUE 'awaiting' AFTER 'pending';

ALTER TYPE public.ticket_status ADD VALUE 'resolved' AFTER 'closed';
-- modify ENUM ticket_priority 

ALTER TYPE status RENAME VALUE 'urgent' TO 'critical';
--

--CREATE ENUM ticket_type 

CREATE TYPE public.ticket_type AS ENUM ('message', 'attachment', 'status', 'internal');
-- modify TABLE buckets
--
--DELETE column: code, region, provider 

ALTER TABLE public.buckets DROP COLUMN code;

ALTER TABLE public.buckets DROP COLUMN region;

ALTER TABLE public.buckets DROP COLUMN provider;
--

--CREATE ENUM bucket_type 

CREATE TYPE public.bucket_type AS ENUM ('cloud', 'accounting', 'temporary');
-- add column 

ALTER TABLE public.buckets ADD COLUMN name text NOT NULL;

ALTER TABLE public.buckets ADD COLUMN owner_id UUID NOT NULL;

ALTER TABLE public.buckets ADD COLUMN type public.bucket_type NOT NULL DEFAULT 'cloud';

ALTER TABLE public.buckets ADD COLUMN total_size bigint NOT NULL DEFAULT 0;

ALTER TABLE public.buckets ADD COLUMN limit_size bigint NOT NULL DEFAULT 0;

ALTER TABLE public.buckets ADD COLUMN public boolean NOT NULL;

ALTER TABLE public.buckets ADD COLUMN updated_at TIMESTAMPTZ;
--

CREATE policy for buckets 
 DROP POLICY IF EXISTS "Buckets: Select"
ON public.buckets;

CREATE POLICY "Buckets: Select"
ON public.buckets AS PERMISSIVE FOR
SELECT  to public USING (true);

DROP POLICY IF EXISTS "Enable Insert for authenticated users only"
ON public.buckets;

CREATE policy "Enable Insert for authenticated users only"
ON public.buckets AS PERMISSIVE FOR
INSERT to authenticated
WITH check
( true
);

DROP POLICY IF EXISTS "super admin can update buckets"
ON public.buckets;

CREATE POLICY "super admin can update buckets"
ON public.buckets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK
(public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "super admin can delete buckets"
ON public.buckets;

CREATE POLICY "super admin can delete buckets"
ON public.buckets FOR
DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
-- add column to files 

CREATE type public.share_permission AS enum ('read', 'upload', 'download');

-- ALTER TABLE public.files ADD COLUMN plan_id uuid not null, add column share_permission public.share_permission not null default 'read' , add column downloads_limit bigint not null default 0, add column link_expire_at timestamp, add column anti_print boolean not null default false, add column watermark public.watermark_mode not null default 'off'
--

CREATE policy for files 
 DROP POLICY IF EXISTS "files: Select"
ON public.files;

CREATE POLICY "files: Select"
ON public.files AS PERMISSIVE FOR
SELECT  to public USING (true);

DROP POLICY IF EXISTS "Enable Insert for authenticated users only"
ON public.files;

CREATE policy "Enable Insert for authenticated users only"
ON public.files AS PERMISSIVE FOR
INSERT to authenticated
WITH check
( true
);

DROP POLICY IF EXISTS "super admin can update files"
ON public.files;

CREATE POLICY "super admin can update files"
ON public.files FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK
(public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "super admin can delete files"
ON public.files;

CREATE POLICY "super admin can delete files"
ON public.files FOR
DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

ALTER TYPE public.approval_status RENAME VALUE 'pending' TO 'pendente';

ALTER TYPE public.approval_status RENAME VALUE 'approved' TO 'aprovado';

ALTER TYPE public.approval_status RENAME VALUE 'rejected' TO 'rejeitado';
-- bucket_type: nuvem, contabilidade, temporário 

ALTER TYPE public.bucket_type RENAME VALUE 'cloud' TO 'nuvem';

ALTER TYPE public.bucket_type RENAME VALUE 'accounting' TO 'contabilidade';

ALTER TYPE public.bucket_type RENAME VALUE 'temporary' TO 'temporário';
-- invoice_status: aberto, pago, anulado, reembolsado 
-- share_permission read, upload, download -> ler, carregar, baixar 

ALTER TYPE public.share_permission RENAME VALUE 'read' TO 'ler';

ALTER TYPE public.share_permission RENAME VALUE 'upload' TO 'carregar';

ALTER TYPE public.share_permission RENAME VALUE 'download' TO 'baixar';
-- share_status: active, revoked, expired -> ativo, revogado, expirado 

ALTER TYPE public.share_status RENAME VALUE 'active' TO 'ativo';

ALTER TYPE public.share_status RENAME VALUE 'revoked' TO 'revogado';

ALTER TYPE public.share_status RENAME VALUE 'expired' TO 'expirado';
-- ticket_channel: panel, email, whatsapp, manual -> painel, email, whatsapp, manual 

ALTER TYPE public.ticket_channel RENAME VALUE 'panel' TO 'painel';
-- ticket_priority: low, normal, high, critical -> baixa, normal, alta, crítica 

ALTER TYPE public.ticket_priority RENAME VALUE 'low' TO 'baixa';

ALTER TYPE public.ticket_priority RENAME VALUE 'high' TO 'alta';

ALTER TYPE public.ticket_priority RENAME VALUE 'critical' TO 'crítica';
-- ticket_status: open, pending, closed, awaiting, resolved -> aberto, pendente, fechado, aguardando, resolvido 

ALTER TYPE public.ticket_status RENAME VALUE 'open' TO 'aberto';

ALTER TYPE public.ticket_status RENAME VALUE 'pending' TO 'pendente';

ALTER TYPE public.ticket_status RENAME VALUE 'closed' TO 'fechado';

ALTER TYPE public.ticket_status RENAME VALUE 'awaiting' TO 'aguardando';

ALTER TYPE public.ticket_status RENAME VALUE 'resolved' TO 'resolvido';
-- ticket_type: message, attachment, status, internal -> mensagem, anexo, status, interno 

ALTER TYPE public.ticket_type RENAME VALUE 'message' TO 'mensagem';

ALTER TYPE public.ticket_type RENAME VALUE 'attachment' TO 'anexo';

ALTER TYPE public.ticket_type RENAME VALUE 'internal' TO 'interno';

ALTER TYPE public.subscription_status RENAME VALUE 'past_due' TO 'expirada';

CREATE TABLE public.user_plan ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid not null, plan_id uuid not null, plan_name text not null, storage_gb bigint not null, features jsonb NOT NULL DEFAULT '{}'::jsonb, expires_at timestamp not null, created_at timestamptz DEFAULT now() );

CREATE function public.get_users_with_profiles() returns TABLE ( user_id uuid, email text, full_name text, role text ) AS $$
SELECT  u.id
       ,u.email
       ,p.full_name
       ,r.role
FROM auth.users u
JOIN public.profiles p
ON p.id = u.id
JOIN public.user_roles r
ON r.user_id = u.id; $$ language sql stable;

ALTER TABLE user_plan enable row level security;
--

CREATE 

CREATE view public.users_with_profiles AS
SELECT  u.id AS user_id
       ,u.email
       ,p.full_name
       ,r.role
FROM auth.users u
JOIN public.profiles p
ON p.id = u.id
JOIN public.user_roles r
ON r.user_id = u.id
-- update 

CREATE OR REPLACE VIEW public.users_with_profiles AS
SELECT  u.id AS user_id
       ,u.email
       ,p.full_name
       ,r.role
       ,n.plan_name
FROM auth.users u
JOIN public.profiles p
ON p.id = u.id
JOIN public.user_roles r
ON r.user_id = u.id
LEFT JOIN public.user_plan n
ON n.user_id = u.id

ALTER view users_with_profiles enable row level security;
----- not use 

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER

SET search_path = '' AS $$ DECLARE role_text text; role_value public.app_role := 'empresario'; full_name text; company_name text; BEGIN
-- Extract optional metadata 
 role_text := COALESCE(NEW.raw_user_meta_data->  > 'role', 'empresario'); full_name := NEW.raw_user_meta_data->  > 'full_name'; company_name := NEW.raw_user_meta_data->  > 'company_name';
-- Map text to enum safely 
 IF role_text IN ('empresario', 'contador', 'admin', 'super_admin') THEN role_value := role_text::public.app_role; ELSE role_value := 'empresario'::public.app_role; END IF;
-- Branch depending
ON company_name 
 IF company_name IS NULL OR company_name = '' THEN
--

CREATE profile row 
INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, full_name)
ON CONFLICT (id) DO NOTHING; ELSE
--

CREATE company row 
INSERT INTO public.companies (owner_id, razao_social) VALUES (NEW.id, company_name)
ON CONFLICT (owner_id) DO NOTHING; END IF;
-- Assign role 
INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, role_value)
ON CONFLICT (user_id, role) DO NOTHING; RETURN NEW; END; $$;

ALTER TABLE public.user_plan ADD COLUMN status boolean NOT NULL default true;

ALTER TABLE public.subscriptions ADD COLUMN storage_gb bigint
;

-- Ensure RLS is
ON (it already is) 

ALTER TABLE public.subscriptions enable row level security;
-- Users can
INSERT their own subscriptions 

CREATE policy "subscriptions_insert_own"
ON public.subscriptions for
INSERT to authenticated
WITH check
(user_id = auth.uid()
);
-- Users can read their own subscriptions 

CREATE policy "subscriptions_select_own"
ON public.subscriptions for
SELECT  to authenticated USING (user_id = auth.uid());
-- (Optional) Users can update their own subscriptions 

CREATE policy "subscriptions_update_own"
ON public.subscriptions for update to authenticated USING (user_id = auth.uid())
WITH check
(user_id = auth.uid()
);
-- (Optional, safer) default user_id so clients can omit it 

ALTER TABLE public.subscriptions

ALTER column user_id

SET default auth.uid();

ALTER TABLE public.accountants ADD COLUMN account_name text NOT NULL;

create policy "Enable insert for users based on user_id"
on "public"."accountants"
as PERMISSIVE
for INSERT
to public
with check (
  (select auth.uid()) = user_id
);

CREATE type public.company_status AS enum ('OK', 'PENDENTE', 'CRITICO', 'SEM_ENVIO');
ALTER TABLE public.conpanies ADD COLUMN status public.company_status NOT NULL DEFAULT 'OK';

-- Allow authenticated users to insert their own companies
create policy companies_insert_own
on public.companies
for insert
to authenticated
with check (owner_user_id = auth.uid());

-- Allow authenticated users to read their own companies
create policy companies_select_own
on public.companies
for select
to authenticated
using (owner_user_id = auth.uid());

-- (Optional) default owner_user_id so client insert can omit it
alter table public.companies
  alter column owner_user_id set default auth.uid();

  -- Allow accountant to manage their own links
create policy link_insert_own
on public.client_accountant_link
for insert to authenticated
with check (accountant_id in (select id from public.accountants where user_id = auth.uid()));

create policy link_select_own
on public.client_accountant_link
for select to authenticated
using (accountant_id in (select id from public.accountants where user_id = auth.uid()));

create policy link_delete_own
on public.client_accountant_link
for delete to authenticated
using (accountant_id in (select id from public.accountants where user_id = auth.uid()));

create policy link_update_own
on public.client_accountant_link
for update to authenticated
using (accountant_id in (select id from public.accountants where user_id = auth.uid()))
with check (accountant_id in (select id from public.accountants where user_id = auth.uid()));

create policy companies_select_all
on public.companies
for select
to authenticated
using (true);

-- or restrict to contador role (if you use RBAC)
create policy companies_select_for_contador
on public.companies
for select
to authenticated
using (public.rbac_has_role(auth.uid(), 'contador'));

create policy link_select_all
on public.client_accountant_link
for select
to authenticated
using (true);

create or replace function public.unregistered_companies()
returns setof public.companies
language sql
security definer
set search_path = public
as $$
  select c.*
  from public.companies c
  left join public.client_accountant_link l on l.company_id = c.id
  where l.company_id is null
$$;

revoke all on function public.unregistered_companies() from public;
grant execute on function public.unregistered_companies() to authenticated;

create policy "accountants_select_linked_to_my_companies"
on public.accountants
for select
to authenticated
using (
  exists (
    select 1
    from public.client_accountant_link cal
    join public.companies c on c.id = cal.company_id
    where cal.accountant_id = accountants.id
      and c.owner_user_id = auth.uid()
  )
);

-- remove the recursive policy
drop policy if exists accountants_select_linked_to_my_companies on public.accountants;

-- safe policy: no self-select on accountants
create policy accountants_select_linked_to_my_companies
on public.accountants
for select
to authenticated
using (
  exists (
    select 1
    from public.client_accountant_link cal
    join public.companies c on c.id = cal.company_id
    where cal.accountant_id = accountants.id
      and c.owner_user_id = auth.uid()
  )
);

create or replace function public.get_linked_accountants_for_owner()
returns table (
  link_id uuid,
  created_at timestamptz,
  company_id uuid,
  accountant_id uuid,
  crc text,
  crc_status text,
  account_name text
)
language sql
security definer
set search_path = public
as $$
  select
    l.id as link_id,
    l.created_at,
    l.company_id,
    l.accountant_id,
    a.crc,
    a.crc_status,
    a.account_name
  from public.client_accountant_link l
  join public.companies c on c.id = l.company_id
  join public.accountants a on a.id = l.accountant_id
  where c.owner_user_id = auth.uid()
    and l.is_primary = false
  order by l.created_at desc;
$$;

revoke all on function public.get_linked_accountants_for_owner() from public;
grant execute on function public.get_linked_accountants_for_owner() to authenticated;

-- Remove old recursive policies if any
drop policy if exists w_links_owner_admin on public.client_accountant_link;

-- Allow company owner (or super_admin) to update (approve)
create policy cal_update_owner_or_admin
on public.client_accountant_link
for update
to authenticated
using (
  exists (
    select 1 from public.companies c
    where c.id = company_id and c.owner_user_id = auth.uid()
  )
  or public.rbac_has_role(auth.uid(), 'super_admin')
)
with check (
  exists (
    select 1 from public.companies c
    where c.id = company_id and c.owner_user_id = auth.uid()
  )
  or public.rbac_has_role(auth.uid(), 'super_admin')
);

-- DAS (Simples Nacional)
INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'simples',
  'DAS',
  '{"due_day": 20, "frequency": "monthly"}'
);

-- DCTF (Declaração de Débitos e Créditos Tributários Federais)
INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'lucro_presumido',
  'DCTF',
  '{"due_day": 15, "frequency": "monthly"}'
);

INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'lucro_real',
  'DCTF',
  '{"due_day": 15, "frequency": "monthly"}'
);

-- FGTS (Fundo de Garantia do Tempo de Serviço)
INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'simples',
  'FGTS',
  '{"due_day": 7, "frequency": "monthly"}'
);

INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'lucro_presumido',
  'FGTS',
  '{"due_day": 7, "frequency": "monthly"}'
);

-- IRPJ (Imposto de Renda Pessoa Jurídica) – quarterly for lucro presumido
INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'lucro_presumido',
  'IRPJ',
  '{"due_day": "last_day", "frequency": "quarterly"}'
);

-- IRPJ (Lucro Real – can be monthly via estimativa or quarterly)
INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'lucro_real',
  'IRPJ',
  '{"due_day": "last_day", "frequency": "monthly_or_quarterly"}'
);

-- Folha (Payroll obligations: INSS, IRRF etc.)
INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'simples',
  'FOLHA',
  '{"due_day": 7, "frequency": "monthly", "notes": "INSS sobre folha"}'
);

INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'lucro_presumido',
  'FOLHA',
  '{"due_day": 7, "frequency": "monthly"}'
);

INSERT INTO public.tax_obligations (regime, tipo, regra_vencimento)
VALUES (
  'lucro_real',
  'FOLHA',
  '{"due_day": 7, "frequency": "monthly"}'
);

ALTER TABLE public.calendar_events ADD COLUMN accountant_id uuid NOT NULL;
ALTER TABLE public.calendar_events ADD COLUMN channel alert_channel NOT NULL default painel;
ALTER TABLE public.calendar_events ADD COLUMN template_code text NOT NULL;

alter policy "Enable read access for all users"
on "public"."tax_obligations"
to public
using (
  true
);

ALTER TABLE public.calendar_events DROP COLUMN referencia;
ALTER TABLE public.calendar_events ADD COLUMN referencia jsonb NOT NULL;

create policy "Enable insert for authenticated users only"
on "public"."calendar_events"
as PERMISSIVE
for INSERT
to authenticated
with check (
  true
);

create policy "Policy with table joins"
on "public"."calendar_events"
as PERMISSIVE
for UPDATE
to public
using (
  accountant_id = auth.uid()
  or company_id = auth.uid()
)
with check
(
  accountant_id = auth.uid()
  or company_id = auth.uid()
)

create policy "Enable delete for users based on user_id"
on "public"."calendar_events"
as PERMISSIVE
for DELETE
to public
using (
  accountant_id = auth.uid()
  or company_id = auth.uid()
);