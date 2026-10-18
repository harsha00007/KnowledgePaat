-- =============================================================================
-- Migration: fix_profiles_rls_infinite_recursion.sql
-- Description: Fixes infinite recursion (Postgres error 42P17) in public.profiles
--              by replacing direct subquery on profiles with public.is_admin().
-- Target Environment: Staging Supabase (lzuinimbsdxnhzmjpxmr)
-- =============================================================================

-- Ensure is_admin() function exists and has SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Fix SELECT policy on public.profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    auth.uid() = user_id
    OR
    public.is_admin()
  );

-- 2. Fix UPDATE policy on public.profiles
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or admins can update all" ON public.profiles;

CREATE POLICY "Users can update their own profile or admins can update all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR
    auth.uid() = user_id
    OR
    public.is_admin()
  );

-- 3. Fix DELETE policy on public.profiles
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );
