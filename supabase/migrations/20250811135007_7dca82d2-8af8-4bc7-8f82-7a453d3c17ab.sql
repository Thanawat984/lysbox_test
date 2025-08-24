-- 1) Campos para Plano de Demonstração
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_duration_days integer;

-- 2) Acesso invisível do super admin a arquivos da nuvem
-- As políticas atuais de cloud_files são RESTRICTIVE; precisamos recriá-las com OR para super_admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_files' AND policyname = 'cloud_files_select_own'
  ) THEN
    EXECUTE 'DROP POLICY cloud_files_select_own ON public.cloud_files';
  END IF;
  EXECUTE $$
  CREATE POLICY cloud_files_select_own ON public.cloud_files FOR SELECT
  USING (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  $$;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_files' AND policyname = 'cloud_files_update_own'
  ) THEN
    EXECUTE 'DROP POLICY cloud_files_update_own ON public.cloud_files';
  END IF;
  EXECUTE $$
  CREATE POLICY cloud_files_update_own ON public.cloud_files FOR UPDATE
  USING (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  WITH CHECK (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  $$;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cloud_files' AND policyname = 'cloud_files_delete_own'
  ) THEN
    EXECUTE 'DROP POLICY cloud_files_delete_own ON public.cloud_files';
  END IF;
  EXECUTE $$
  CREATE POLICY cloud_files_delete_own ON public.cloud_files FOR DELETE
  USING (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
  $$;
END$$;

-- Mantemos a policy de INSERT como está (somente próprio usuário), garantindo integridade

-- 3) Policy de leitura para super_admin em storage.objects (bucket user-files)
-- Permite download/leitura sem notificar usuário (auditoria pode ser feita via app mais tarde)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'objects_read_super_admin'
  ) THEN
    EXECUTE $$
    CREATE POLICY objects_read_super_admin ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'user-files' AND public.has_role(auth.uid(), 'super_admin'::public.app_role)
    )
    $$;
  END IF;
END$$;