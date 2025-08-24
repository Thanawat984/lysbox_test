-- RBAC granular para painel de suporte
-- 1) Inserir permissões (idempotente)
INSERT INTO public.rbac_permissions (code, description)
SELECT v.code, v.description
FROM (VALUES
  ('support.view_all', 'Ver tickets/recursos de todos os usuários'),
  ('support.reset_2fa', 'Resetar 2FA do usuário'),
  ('support.force_password_reset', 'Forçar redefinição de senha'),
  ('support.logout_sessions', 'Encerrar sessões ativas do usuário'),
  ('support.lock_account', 'Bloquear login temporariamente'),
  ('support.impersonate', 'Impersonar usuário (restrito)'),
  ('support.reprocess_ocr', 'Reprocessar OCR / Reclassificar documentos')
) AS v(code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rbac_permissions p WHERE p.code = v.code
);

-- 2) Garantir papéis admin/super_admin nas tabelas RBAC (idempotente)
INSERT INTO public.rbac_roles (code, description)
SELECT x.code, x.description
FROM (VALUES
  ('admin', 'Administrador do sistema'),
  ('super_admin', 'Super Administrador')
) AS x(code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rbac_roles r WHERE r.code = x.code
);

-- 3) Atribuir todas as permissões de suporte aos papéis admin e super_admin (idempotente)
INSERT INTO public.rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.rbac_roles r
JOIN public.rbac_permissions p ON p.code IN (
  'support.view_all',
  'support.reset_2fa',
  'support.force_password_reset',
  'support.logout_sessions',
  'support.lock_account',
  'support.impersonate',
  'support.reprocess_ocr'
)
WHERE r.code IN ('admin','super_admin')
AND NOT EXISTS (
  SELECT 1 FROM public.rbac_role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 4) Função: has_permission(user, permission_code)
CREATE OR REPLACE FUNCTION public.has_permission(_user uuid, _perm_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  select coalesce(
    -- Admins sempre têm permissão
    public.has_role(_user, 'admin'::public.app_role)
    or public.has_role(_user, 'super_admin'::public.app_role)
    or exists (
      select 1
      from public.rbac_user_roles ur
      join public.rbac_role_permissions rp on rp.role_id = ur.role_id
      join public.rbac_permissions p on p.id = rp.permission_id
      where ur.user_id = _user
        and (p.code = _perm_code or p.code = 'support.*')
    )
  , false);
$$;

-- 5) Função: get_effective_permissions() -> text[] para o usuário atual
CREATE OR REPLACE FUNCTION public.get_effective_permissions()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  with base as (
    select p.code
    from public.rbac_user_roles ur
    join public.rbac_role_permissions rp on rp.role_id = ur.role_id
    join public.rbac_permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
  ),
  admin_extra as (
    select unnest(ARRAY[
      'support.view_all',
      'support.reset_2fa',
      'support.force_password_reset',
      'support.logout_sessions',
      'support.lock_account',
      'support.impersonate',
      'support.reprocess_ocr'
    ]) as code
    where public.has_role(auth.uid(), 'admin'::public.app_role)
       or public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  select array_agg(distinct code)
  from (
    select code from base
    union all
    select code from admin_extra
  ) t;
$$;