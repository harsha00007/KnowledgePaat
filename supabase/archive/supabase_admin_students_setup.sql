-- CareerLaunch Phase 11: Admin Student Management Setup
-- Run this script in your Supabase SQL Editor

-- 1. Alter profiles table to add missing fields for student management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mobile_number text,
ADD COLUMN IF NOT EXISTS college_name text,
ADD COLUMN IF NOT EXISTS degree text,
ADD COLUMN IF NOT EXISTS branch text,
ADD COLUMN IF NOT EXISTS passing_year text,
ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS preferred_job_role text,
ADD COLUMN IF NOT EXISTS preferred_location text;

-- 2. Update RLS policies to allow Admins to manage profiles

-- Drop any existing admin policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;

-- Create policy for Admin UPDATE
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- Create policy for Admin DELETE
CREATE POLICY "Admins can delete all profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- Note: We do not need a SELECT policy for Admins because "Public profiles are viewable by everyone" 
-- already grants read access to all rows.

-- 3. Populate dummy data for existing dummy students if necessary
UPDATE public.profiles
SET 
  college_name = 'Dummy College of Engineering',
  degree = 'B.Tech',
  passing_year = '2024',
  preferred_job_role = 'Software Developer'
WHERE role = 'student' AND college_name IS NULL;
