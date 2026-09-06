-- CareerLaunch Phase 12: Admin Job Management Setup
-- Run this script in your Supabase SQL Editor

-- 1. Alter jobs table to add missing fields for admin management
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
ADD COLUMN IF NOT EXISTS application_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Update existing jobs to have Active status
UPDATE public.jobs SET status = 'Active' WHERE status IS NULL;

-- 2. Update RLS policies to allow Admins to manage jobs and restrict students to Active jobs

-- Drop the old public read policy
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.jobs;

-- Create policy for Students to view ONLY Active jobs
CREATE POLICY "Students can view active jobs"
  ON public.jobs FOR SELECT
  USING (
    status = 'Active' 
    OR 
    (auth.uid() IS NOT NULL AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  );

-- Create policy for Admins to view ALL jobs (handled above, but we can be explicit if needed)
-- The above policy handles both: if Active, anyone sees it. If not active, only admin sees it.

-- Create policies for Admin INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Admins can insert jobs" ON public.jobs;
CREATE POLICY "Admins can insert jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
CREATE POLICY "Admins can update jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
CREATE POLICY "Admins can delete jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- 3. Trigger for updated_at (Optional but good practice)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_jobs_modtime ON public.jobs;
CREATE TRIGGER update_jobs_modtime
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
