-- Lysbox RBAC and profiles setup
-- 1) Roles enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('empresario','contador','admin','super_admin');
  END IF;
END $$;

-- 2) user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3) Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4) Utility function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role = _role
  );
$$;

-- 6) RLS policies
-- user_roles: select own or admins; manage only by super_admin
DROP POLICY IF EXISTS "read own roles or admin" ON public.user_roles;
CREATE POLICY "read own roles or admin"
ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "super admin can insert roles" ON public.user_roles;
CREATE POLICY "super admin can insert roles"
ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "super admin can update roles" ON public.user_roles;
CREATE POLICY "super admin can update roles"
ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "super admin can delete roles" ON public.user_roles;
CREATE POLICY "super admin can delete roles"
ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- profiles policies: read own, admins all; insert own; update own or admins
DROP POLICY IF EXISTS "profiles read own or admin" ON public.profiles;
CREATE POLICY "profiles read own or admin"
ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "profiles insert own" ON public.profiles;
CREATE POLICY "profiles insert own"
ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles update own or admin" ON public.profiles;
CREATE POLICY "profiles update own or admin"
ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 7) Trigger to auto-create profile and assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  role_text text;
  role_value public.app_role := 'empresario';
  full_name text;
  company_name text;
BEGIN
  -- Extract optional metadata
  role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'empresario');
  full_name := NEW.raw_user_meta_data->>'full_name';
  company_name := NEW.raw_user_meta_data->>'company_name';

  -- Map text to enum safely
  IF role_text IN ('empresario','contador','admin','super_admin') THEN
    role_value := role_text::public.app_role;
  ELSE
    role_value := 'empresario'::public.app_role;
  END IF;

  -- Create profile row
  INSERT INTO public.profiles (id, full_name, company_name)
  VALUES (NEW.id, full_name, company_name)
  ON CONFLICT (id) DO NOTHING;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, role_value)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();