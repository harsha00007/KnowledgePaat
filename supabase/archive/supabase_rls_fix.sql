-- CareerLaunch MVP: Critical RLS Security Fix for Profiles
-- Run this script in your Supabase SQL Editor

-- 1. Drop the insecure public profiles policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- 2. Create the secure SELECT policy for Profiles
-- Students can only view their own profile (auth.uid() = user_id)
-- Admins can view all profiles
CREATE POLICY "Users can view their own profile or admins can view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 3. Verify the UPDATE policy (already secure, but reinforcing just in case)
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile or admins can update all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Verify the DELETE policy (typically handled by auth.users cascade, but adding for completeness)
DROP POLICY IF EXISTS "Users can delete own profile." ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==========================================
-- SQL VERIFICATION QUERIES (For DB Admin Testing)
-- ==========================================
/*
-- 1. Test: Student A reading their own profile (Should Return 1 Row)
SELECT * FROM public.profiles WHERE user_id = auth.uid();

-- 2. Test: Student A trying to read Student B's profile (Should Return 0 Rows due to RLS)
-- (Assuming 'student_b_uuid' is the ID of another student)
SELECT * FROM public.profiles WHERE user_id = 'student_b_uuid';

-- 3. Test: Student A trying to update Student B's profile (Should Fail/Return 0 Rows affected)
UPDATE public.profiles SET full_name = 'Hacked' WHERE user_id = 'student_b_uuid';

-- 4. Test: Student A trying to delete Student B's profile (Should Fail)
DELETE FROM public.profiles WHERE user_id = 'student_b_uuid';

-- 5. Test: Admin reading all profiles (Should Return All Rows)
-- (Run this while authenticated as an Admin)
SELECT * FROM public.profiles;
*/
