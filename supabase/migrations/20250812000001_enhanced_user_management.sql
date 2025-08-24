-- Enhanced User Management System for LysBox Cloud Suite
-- Migration: 20250812000001_enhanced_user_management.sql

-- Drop existing app_role type if exists and recreate with expanded roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM (
  'super_admin',      -- Controle total do sistema
  'admin',            -- Subordinado ao super_admin
  'support_lead',     -- Líder de suporte
  'support_agent',    -- Agente de suporte
  'content_manager',  -- Gerenciador de conteúdo
  'plan_manager',     -- Gerenciador de planos
  'user'              -- Usuário comum
);

-- Create user_permissions table for granular permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  resource_id TEXT, -- Optional: specific resource (e.g., plan_id, content_key)
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional: temporary permissions
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  UNIQUE(user_id, permission_type, resource_id)
);

-- Create user_role_history table for audit trail
CREATE TABLE IF NOT EXISTS public.user_role_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  old_role public.app_role,
  new_role public.app_role,
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_activity_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'login', 'permission_grant', 'content_edit', etc.
  resource_type TEXT, -- 'user', 'plan', 'site_content', etc.
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
  user_uuid UUID,
  permission_name TEXT,
  resource_id_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admin has all permissions
  IF has_role(user_uuid, 'super_admin'::public.app_role) THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission
  RETURN EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = user_uuid
      AND permission_type = permission_name
      AND (resource_id_param IS NULL OR resource_id = resource_id_param)
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;

-- Helper function to grant permission
CREATE OR REPLACE FUNCTION public.grant_permission(
  target_user_id UUID,
  permission_name TEXT,
  granted_by_user_id UUID,
  resource_id_param TEXT DEFAULT NULL,
  expires_at_param TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super_admin or users with 'user_manage' permission can grant permissions
  IF NOT (has_role(granted_by_user_id, 'super_admin'::public.app_role) OR 
          has_permission(granted_by_user_id, 'users.manage')) THEN
    RAISE EXCEPTION 'Insufficient permissions to grant permission';
  END IF;
  
  -- Insert or update permission
  INSERT INTO public.user_permissions (
    user_id, permission_type, resource_id, granted_by, expires_at
  ) VALUES (
    target_user_id, permission_name, resource_id_param, granted_by_user_id, expires_at_param
  )
  ON CONFLICT (user_id, permission_type, resource_id)
  DO UPDATE SET
    granted_by = granted_by_user_id,
    expires_at = expires_at_param,
    is_active = TRUE,
    created_at = NOW();
  
  -- Log the action
  INSERT INTO public.user_activity_log (
    user_id, action_type, resource_type, resource_id, details
  ) VALUES (
    granted_by_user_id, 'permission_grant', 'user_permission', target_user_id::text,
    jsonb_build_object('permission', permission_name, 'target_user', target_user_id)
  );
  
  RETURN TRUE;
END;
$$;

-- Helper function to revoke permission
CREATE OR REPLACE FUNCTION public.revoke_permission(
  target_user_id UUID,
  permission_name TEXT,
  revoked_by_user_id UUID,
  resource_id_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super_admin or users with 'user_manage' permission can revoke permissions
  IF NOT (has_role(revoked_by_user_id, 'super_admin'::public.app_role) OR 
          has_permission(revoked_by_user_id, 'users.manage')) THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke permission';
  END IF;
  
  -- Deactivate permission
  UPDATE public.user_permissions
  SET is_active = FALSE
  WHERE user_id = target_user_id
    AND permission_type = permission_name
    AND (resource_id_param IS NULL OR resource_id = resource_id_param);
  
  -- Log the action
  INSERT INTO public.user_activity_log (
    user_id, action_type, resource_type, resource_id, details
  ) VALUES (
    revoked_by_user_id, 'permission_revoke', 'user_permission', target_user_id::text,
    jsonb_build_object('permission', permission_name, 'target_user', target_user_id)
  );
  
  RETURN TRUE;
END;
$$;

-- RLS Policies for user_permissions
CREATE POLICY "Super admin can view all permissions"
ON public.user_permissions
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users with user_manage can view permissions"
ON public.user_permissions
FOR SELECT TO authenticated
USING (has_permission(auth.uid(), 'users.view'));

CREATE POLICY "Super admin can manage all permissions"
ON public.user_permissions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Users with user_manage can manage permissions"
ON public.user_permissions
FOR ALL TO authenticated
USING (has_permission(auth.uid(), 'users.manage'))
WITH CHECK (has_permission(auth.uid(), 'users.manage'));

-- RLS Policies for user_role_history
CREATE POLICY "Super admin can view role history"
ON public.user_role_history
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Users can view their own role history"
ON public.user_role_history
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only super admin can insert role history"
ON public.user_role_history
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

-- RLS Policies for user_activity_log
CREATE POLICY "Super admin can view all activity logs"
ON public.user_activity_log
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Users can view their own activity"
ON public.user_activity_log
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert activity logs"
ON public.user_activity_log
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update site_content policies to use new permission system
DROP POLICY IF EXISTS site_content_update_super ON public.site_content;
DROP POLICY IF EXISTS site_content_insert_super ON public.site_content;
DROP POLICY IF EXISTS site_content_delete_super ON public.site_content;

CREATE POLICY "Super admin and content managers can update site content"
ON public.site_content
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::public.app_role) OR
  has_permission(auth.uid(), 'landing.edit')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::public.app_role) OR
  has_permission(auth.uid(), 'landing.edit')
);

CREATE POLICY "Super admin and content managers can insert site content"
ON public.site_content
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::public.app_role) OR
  has_permission(auth.uid(), 'landing.edit')
);

CREATE POLICY "Super admin can delete site content"
ON public.site_content
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role));

-- Update plans policies to use new permission system
DROP POLICY IF EXISTS plans_update_super ON public.plans;
DROP POLICY IF EXISTS plans_insert_super ON public.plans;
DROP POLICY IF EXISTS plans_delete_super ON public.plans;

CREATE POLICY "Super admin and plan managers can update plans"
ON public.plans
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::public.app_role) OR
  has_permission(auth.uid(), 'plans.edit')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::public.app_role) OR
  has_permission(auth.uid(), 'plans.edit')
);

CREATE POLICY "Super admin and plan managers can insert plans"
ON public.plans
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::public.app_role) OR
  has_permission(auth.uid(), 'plans.create')
);

CREATE POLICY "Super admin can delete plans"
ON public.plans
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_type ON public.user_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON public.user_permissions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_role_history_user_id ON public.user_role_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at);

-- Insert default permissions for existing super_admin users
-- This will be handled by the application logic

-- Create trigger to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.user_role_history (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      NEW.id, OLD.role, NEW.role, auth.uid(), 'Role updated via trigger'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Note: The trigger will be created when we have access to the user_profiles table
-- CREATE TRIGGER role_change_trigger
-- AFTER UPDATE ON public.user_profiles
-- FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

