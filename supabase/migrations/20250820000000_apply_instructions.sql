-- Conteúdo de supabase/migrations/20250820000000_apply_instructions.sql

-- Enhanced User Management System for LysBox Cloud Suite
-- Migration: 20250820000000_apply_instructions.sql

-- Drop existing app_role type if exists and recreate with expanded roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM (
  'super_admin',      -- Controle total do sistema
  'admin',            -- Subordinado ao super_admin
  'support_lead',     -- Líder de suporte
  'support_agent',    -- Agente de suporte
  'content_manager',  -- Gerenciador de conteúdo
  'plan_manager',     -- Gerenciador de planos
  'user',             -- Usuário comum
  'contador',         -- Contador (multiempresa)
  'empresario'        -- Empresário (com contador próprio)
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
  IF OLD.raw_user_meta_data->>'app_role' IS DISTINCT FROM NEW.raw_user_meta_data->>'app_role' THEN
    INSERT INTO public.user_role_history (
      user_id, old_role, new_role, changed_by, reason
    ) VALUES (
      NEW.id, 
      (OLD.raw_user_meta_data->>'app_role')::public.app_role, 
      (NEW.raw_user_meta_data->>'app_role')::public.app_role, 
      auth.uid(), 
      'Role updated via trigger'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for auth.users table to log role changes
-- This assumes that the 'app_role' is stored in raw_user_meta_data
CREATE OR REPLACE TRIGGER on_auth_user_update
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data->>'app_role' IS DISTINCT FROM NEW.raw_user_meta_data->>'app_role')
  EXECUTE FUNCTION public.log_role_change();

-- Add app_role to auth.users raw_user_meta_data
ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB DEFAULT '{}'::jsonb;

-- Function to get user's app_role
CREATE OR REPLACE FUNCTION public.get_app_role(user_id UUID)
RETURNS public.app_role
LANGUAGE plpgsql
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  SELECT (raw_user_meta_data->>'app_role')::public.app_role
  INTO user_role
  FROM auth.users
  WHERE id = user_id;
  RETURN user_role;
END;
$$;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(
  user_uuid UUID,
  role_name public.app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = user_uuid
      AND (raw_user_meta_data->>'app_role')::public.app_role = role_name
  );
END;
$$;

-- Update existing users with a default 'user' role if they don't have one
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{app_role}', '"user"', true)
WHERE raw_user_meta_data->>'app_role' IS NULL;

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Policies for companies table
CREATE POLICY "Companies can be viewed by their owner"
ON public.companies
FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Companies can be inserted by authenticated users"
ON public.companies
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Companies can be updated by their owner"
ON public.companies
FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Companies can be deleted by their owner"
ON public.companies
FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- Create accountants table
CREATE TABLE IF NOT EXISTS public.accountants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_limit INT DEFAULT 10, -- 10 or 30 companies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on accountants table
ALTER TABLE public.accountants ENABLE ROW LEVEL SECURITY;

-- Policies for accountants table
CREATE POLICY "Accountants can be viewed by their user_id"
ON public.accountants
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Accountants can be inserted by authenticated users"
ON public.accountants
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Accountants can be updated by their user_id"
ON public.accountants
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Accountants can be deleted by their user_id"
ON public.accountants
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Create company_accountants table for linking companies to accountants
CREATE TABLE IF NOT EXISTS public.company_accountants (
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  accountant_id UUID REFERENCES public.accountants(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'revoked'
  invited_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, accountant_id)
);

-- Enable RLS on company_accountants table
ALTER TABLE public.company_accountants ENABLE ROW LEVEL SECURITY;

-- Policies for company_accountants table
CREATE POLICY "Company accountants can be viewed by company owner or accountant"
ON public.company_accountants
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.accountants WHERE id = accountant_id AND user_id = auth.uid())
);

CREATE POLICY "Company accountants can be inserted by company owner or super admin"
ON public.company_accountants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Company accountants can be updated by company owner, accountant or super admin"
ON public.company_accountants
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.accountants WHERE id = accountant_id AND user_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Company accountants can be deleted by company owner or super admin"
ON public.company_accountants
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- Create site_content table for CMS
CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT UNIQUE NOT NULL, -- e.g., 'landing_hero_title', 'about_us_text'
  content JSONB NOT NULL, -- { "en": "English text", "pt": "Texto em Português" }
  last_edited_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on site_content table
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Policies for site_content table
CREATE POLICY "Site content can be viewed by anyone"
ON public.site_content
FOR SELECT
USING (TRUE);

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

-- Create plans table (if not exists, based on previous analysis it exists, but for completeness)
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10, 2),
  price_annually NUMERIC(10, 2),
  features TEXT[],
  storage_limit_gb INT,
  user_limit INT,
  link_limit INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on plans table
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Policies for plans table
CREATE POLICY "Plans can be viewed by anyone"
ON public.plans
FOR SELECT
USING (TRUE);

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

-- Create user_plans table
CREATE TABLE IF NOT EXISTS public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  payment_status TEXT, -- 'paid', 'pending', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_plans table
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Policies for user_plans table
CREATE POLICY "User plans can be viewed by their owner"
ON public.user_plans
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admin can view all user plans"
ON public.user_plans
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "User plans can be inserted by super admin"
ON public.user_plans
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "User plans can be updated by super admin"
ON public.user_plans
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "User plans can be deleted by super admin"
ON public.user_plans
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role));

-- Create files table (if not exists, based on previous analysis it exists, but for completeness)
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- For multi-company support
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on files table
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Policies for files table
CREATE POLICY "Files can be viewed by their owner or associated accountant"
ON public.files
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.company_accountants ca
    JOIN public.companies c ON ca.company_id = c.id
    JOIN public.accountants a ON ca.accountant_id = a.id
    WHERE c.id = company_id AND a.user_id = auth.uid() AND ca.status = 'approved'
  )
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Files can be inserted by their owner or associated accountant"
ON public.files
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.company_accountants ca
    JOIN public.companies c ON ca.company_id = c.id
    JOIN public.accountants a ON ca.accountant_id = a.id
    WHERE c.id = company_id AND a.user_id = auth.uid() AND ca.status = 'approved'
  )
);

CREATE POLICY "Files can be updated by their owner or associated accountant"
ON public.files
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.company_accountants ca
    JOIN public.companies c ON ca.company_id = c.id
    JOIN public.accountants a ON ca.accountant_id = a.id
    WHERE c.id = company_id AND a.user_id = auth.uid() AND ca.status = 'approved'
  )
);

CREATE POLICY "Files can be deleted by their owner or associated accountant"
ON public.files
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.company_accountants ca
    JOIN public.companies c ON ca.company_id = c.id
    JOIN public.accountants a ON ca.accountant_id = a.id
    WHERE c.id = company_id AND a.user_id = auth.uid() AND ca.status = 'approved'
  )
);

-- Create shares table
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_password TEXT, -- Optional password for share link
  expires_at TIMESTAMPTZ, -- Expiration date
  download_limit INT, -- Max number of downloads
  view_limit INT, -- Max number of views
  only_view BOOLEAN DEFAULT FALSE, -- If true, no download allowed
  watermark BOOLEAN DEFAULT FALSE, -- If true, apply watermark
  anti_print BOOLEAN DEFAULT FALSE, -- If true, prevent printing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on shares table
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Policies for shares table
CREATE POLICY "Shares can be viewed by shared_by user or super admin"
ON public.shares
FOR SELECT TO authenticated
USING (shared_by = auth.uid() OR has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Shares can be inserted by shared_by user"
ON public.shares
FOR INSERT TO authenticated
WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Shares can be updated by shared_by user or super admin"
ON public.shares
FOR UPDATE TO authenticated
USING (shared_by = auth.uid() OR has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Shares can be deleted by shared_by user or super admin"
ON public.shares
FOR DELETE TO authenticated
USING (shared_by = auth.uid() OR has_role(auth.uid(), 'super_admin'::public.app_role));

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'UPLOAD', 'DOWNLOAD', 'LINK_ISSUED', 'LIMIT_HIT', 'LOGIN', 'LOGOUT', 'PERMISSION_GRANT', 'ROLE_CHANGE'
  resource_type TEXT, -- 'file', 'share', 'user', 'plan'
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies for events table
CREATE POLICY "Events can be viewed by their user_id or super admin"
ON public.events
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Events can be inserted by authenticated users"
ON public.events
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create site_settings table for global settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  last_edited_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on site_settings table
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Policies for site_settings table
CREATE POLICY "Site settings can be viewed by anyone"
ON public.site_settings
FOR SELECT
USING (TRUE);

CREATE POLICY "Super admin can manage site settings"
ON public.site_settings
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

-- Create company_members table
CREATE TABLE IF NOT EXISTS public.company_members (
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- e.g., 'owner', 'employee'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, user_id)
);

-- Enable RLS on company_members table
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Policies for company_members table
CREATE POLICY "Company members can be viewed by company owner or super admin"
ON public.company_members
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Company members can be managed by company owner or super admin"
ON public.company_members
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND owner_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- Update profiles table to include app_role and cloud_account_type
-- Assuming a 'profiles' table exists or will be created by Supabase Auth
-- If not, this part needs adjustment based on actual user metadata storage
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS app_role public.app_role DEFAULT 'user';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cloud_account_type TEXT DEFAULT 'nuvem_lysbox';

-- Update RLS for profiles table to allow users to update their own profile and super_admin to manage all
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can manage all profiles" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Super admin can manage all profiles"
ON public.profiles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::public.app_role));

-- Ensure 'profiles' table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Initial data for plans (example plans)
INSERT INTO public.plans (name, description, price_monthly, price_annually, features, storage_limit_gb, user_limit, link_limit, is_active)
VALUES
  ('Lysbox Puro 100GB', 'Ideal para usuários individuais de nuvem.', 19.90, 199.00, ARRAY['Upload e organização', 'Compartilhamento avançado', 'Segurança base'], 100, 1, 50, TRUE),
  ('Lysbox Puro 200GB', 'Para usuários com mais demanda de armazenamento.', 29.90, 299.00, ARRAY['Upload e organização', 'Compartilhamento avançado', 'Segurança base', 'Suporte prioritário'], 200, 1, 100, TRUE),
  ('Contador 10 Empresas', 'Painel multiempresa para contadores com até 10 clientes.', 99.90, 999.00, ARRAY['Visão multiempresa', 'Ações rápidas por empresa', 'Cofre Fiscal e alertas', '250GB de armazenamento'], 250, 10, 500, TRUE),
  ('Contador 30 Empresas', 'Painel multiempresa para contadores com até 30 clientes.', 199.90, 1999.00, ARRAY['Visão multiempresa', 'Ações rápidas por empresa', 'Cofre Fiscal e alertas', '500GB de armazenamento', 'Suporte premium'], 500, 30, 1500, TRUE),
  ('Empresarial', 'Solução completa para empresas com contador próprio.', 49.90, 499.00, ARRAY['Vinculação Cliente↔Contador', 'Permissões e limites por plano', '200GB de armazenamento', '1 contador'], 200, 5, 200, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Initial data for site_content (example CMS entries)
INSERT INTO public.site_content (content_key, content, last_edited_by)
VALUES
  ('landing_hero_title', '{"pt": "Sua Nuvem de Documentos Inteligente"}', NULL),
  ('landing_hero_subtitle', '{"pt": "Gestão, Compartilhamento e Segurança para sua Empresa"}', NULL),
  ('about_us_text', '{"pt": "Somos a Lysbox, sua parceira em gestão documental na nuvem." }', NULL)
ON CONFLICT (content_key) DO NOTHING;

-- Initial data for site_settings (example global settings)
INSERT INTO public.site_settings (setting_key, setting_value, last_edited_by)
VALUES
  ('default_company_limit_accountant', '{"value": 10}', NULL),
  ('default_storage_limit_user', '{"value": 100}', NULL)
ON CONFLICT (setting_key) DO NOTHING;

-- Initial data for accountants (example accountant user)
-- INSERT INTO public.accountants (user_id, company_limit)
-- VALUES ('<UUID_DO_USUARIO_CONTADOR>', 10)
-- ON CONFLICT (user_id) DO NOTHING;

-- Initial data for companies (example company)
-- INSERT INTO public.companies (name, owner_id)
-- VALUES ('Minha Empresa Teste', '<UUID_DO_USUARIO_EMPRESARIO>')
-- ON CONFLICT (name) DO NOTHING;

-- Initial data for company_accountants (example linking)
-- INSERT INTO public.company_accountants (company_id, accountant_id, invited_by, status)
-- VALUES ('<UUID_DA_EMPRESA>', '<UUID_DO_CONTADOR>', '<UUID_DO_SUPER_ADMIN>', 'approved')
-- ON CONFLICT (company_id, accountant_id) DO NOTHING;

-- Initial data for user_permissions (example super admin permissions)
-- INSERT INTO public.user_permissions (user_id, permission_type, granted_by, is_active)
-- VALUES ('<UUID_DO_SUPER_ADMIN>', 'users.manage', '<UUID_DO_SUPER_ADMIN>', TRUE)
-- ON CONFLICT (user_id, permission_type) DO NOTHING;

-- Initial data for user_plans (example user plan)
-- INSERT INTO public.user_plans (user_id, plan_id, is_active, payment_status)
-- VALUES ('<UUID_DO_USUARIO>', '<UUID_DO_PLANO>', TRUE, 'paid')
-- ON CONFLICT (user_id, plan_id) DO NOTHING;

-- Initial data for files (example file)
-- INSERT INTO public.files (user_id, company_id, file_name, file_path, file_size, mime_type)
-- VALUES ('<UUID_DO_USUARIO>', '<UUID_DA_EMPRESA>', 'documento.pdf', 'path/to/documento.pdf', 1024, 'application/pdf')
-- ON CONFLICT (user_id, file_name) DO NOTHING;

-- Initial data for shares (example share)
-- INSERT INTO public.shares (file_id, shared_by, share_password, expires_at, download_limit, only_view)
-- VALUES ('<UUID_DO_ARQUIVO>', '<UUID_DO_USUARIO>', 'senha123', NOW() + INTERVAL '7 days', 10, TRUE)
-- ON CONFLICT (file_id, shared_by) DO NOTHING;

-- Initial data for events (example event)
-- INSERT INTO public.events (user_id, event_type, resource_type, resource_id, details)
-- VALUES ('<UUID_DO_USUARIO>', 'LOGIN', 'user', '<UUID_DO_USUARIO>', '{"ip": "192.168.1.1"}')
-- ON CONFLICT (user_id, event_type) DO NOTHING;

-- Initial data for user_activity_log (example activity)
-- INSERT INTO public.user_activity_log (user_id, action_type, resource_type, resource_id, details, ip_address, user_agent)
-- VALUES ('<UUID_DO_USUARIO>', 'content_edit', 'site_content', 'landing_hero_title', '{"old_value": "Old Title", "new_value": "New Title"}', '192.168.1.1', 'Mozilla/5.0')
-- ON CONFLICT (user_id, action_type) DO NOTHING;


