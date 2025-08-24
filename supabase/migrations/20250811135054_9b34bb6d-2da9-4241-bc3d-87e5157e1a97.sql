-- 1) Campos para Plano de Demonstração
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_duration_days integer;

-- 2) Recriar policies de cloud_files para permitir super_admin
DROP POLICY IF EXISTS cloud_files_select_own ON public.cloud_files;
CREATE POLICY cloud_files_select_own ON public.cloud_files FOR SELECT
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

DROP POLICY IF EXISTS cloud_files_update_own ON public.cloud_files;
CREATE POLICY cloud_files_update_own ON public.cloud_files FOR UPDATE
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
)
WITH CHECK (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

DROP POLICY IF EXISTS cloud_files_delete_own ON public.cloud_files;
CREATE POLICY cloud_files_delete_own ON public.cloud_files FOR DELETE
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- Mantemos INSERT como está

-- 3) Policy de leitura em storage.objects para super_admin
DROP POLICY IF EXISTS objects_read_super_admin ON storage.objects;
CREATE POLICY objects_read_super_admin ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'user-files' AND public.has_role(auth.uid(), 'super_admin'::public.app_role)
);