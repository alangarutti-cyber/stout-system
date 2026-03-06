
-- 2025-10-31_add_users_and_profiles.sql

-- 1) Optional: create a safe text enum for user roles (adjust as needed)
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('owner','admin','manager','employee','viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Profiles table linked 1:1 with auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'viewer',
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Keep email synced on sign-in
CREATE OR REPLACE FUNCTION public.handle_profile_email()
RETURNS trigger AS $$
BEGIN
  NEW.email := coalesce(NEW.email, auth.jwt() ->> 'email');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_profiles_email ON public.profiles;
CREATE TRIGGER t_profiles_email
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_email();

-- 3) Companies (if not exists) and a many-to-many table for access
CREATE TABLE IF NOT EXISTS public.companies (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_users (
  company_id bigint NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'viewer',
  PRIMARY KEY (company_id, user_id)
);

-- 4) RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Profiles:
-- - user can see and edit only their own profile
DROP POLICY IF EXISTS "Profiles are viewable by self" ON public.profiles;
CREATE POLICY "Profiles are viewable by self"
ON public.profiles
FOR SELECT
USING ( auth.uid() = id );

DROP POLICY IF EXISTS "Profiles are updatable by self" ON public.profiles;
CREATE POLICY "Profiles are updatable by self"
ON public.profiles
FOR UPDATE
USING ( auth.uid() = id );

-- Allow owners/admins (by membership) to read profiles across the company (optional)
DROP POLICY IF EXISTS "Profiles readable by company admins" ON public.profiles;
CREATE POLICY "Profiles readable by company admins"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
  )
);

-- company_users:
-- - user can see rows where they are the user
DROP POLICY IF EXISTS "company_users readable by member" ON public.company_users;
CREATE POLICY "company_users readable by member"
ON public.company_users
FOR SELECT
USING ( auth.uid() = user_id );

-- - admins can manage membership for their companies
DROP POLICY IF EXISTS "company_users manageable by admins" ON public.company_users;
CREATE POLICY "company_users manageable by admins"
ON public.company_users
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = company_users.company_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
  )
);
CREATE POLICY "company_users updatable by admins"
ON public.company_users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = company_users.company_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
  )
);
CREATE POLICY "company_users deletable by admins"
ON public.company_users
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = company_users.company_id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
  )
);

-- companies:
-- - any authenticated user can read companies they belong to
DROP POLICY IF EXISTS "companies readable by members" ON public.companies;
CREATE POLICY "companies readable by members"
ON public.companies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = companies.id
      AND cu.user_id = auth.uid()
  )
);

-- - admins can manage their companies
DROP POLICY IF EXISTS "companies manageable by admins" ON public.companies;
CREATE POLICY "companies manageable by admins"
ON public.companies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = companies.id
      AND cu.user_id = auth.uid()
      AND cu.role IN ('owner','admin')
  )
);

-- 5) Automatic profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'viewer')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) Helper view (optional): my_companies
CREATE OR REPLACE VIEW public.my_companies AS
SELECT c.*
FROM public.companies c
JOIN public.company_users cu ON cu.company_id = c.id
WHERE cu.user_id = auth.uid();

-- 7) Grants (Supabase defaults usually ok)
REVOKE ALL ON public.profiles FROM public;
REVOKE ALL ON public.company_users FROM public;
REVOKE ALL ON public.companies FROM public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_users TO authenticated;
GRANT SELECT ON public.companies TO authenticated;
