-- CareerLaunch Phase 6: Jobs Module Database Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create the `jobs` table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  company_logo_url text,
  title text NOT NULL,
  location text NOT NULL,
  experience text NOT NULL,
  salary text,
  employment_type text NOT NULL,
  work_mode text NOT NULL,
  category text NOT NULL,
  required_skills text[] DEFAULT '{}'::text[],
  short_description text,
  full_description text,
  responsibilities text[] DEFAULT '{}'::text[],
  apply_url text NOT NULL,
  posted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the `saved_jobs` table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(student_id, job_id)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Jobs: Anyone can read jobs (or restrict to authenticated if you prefer)
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.jobs;
CREATE POLICY "Jobs are viewable by everyone" 
  ON public.jobs FOR SELECT 
  USING (true);

-- Saved Jobs: Students can only manage their own saved jobs
DROP POLICY IF EXISTS "Students can view their own saved jobs" ON public.saved_jobs;
CREATE POLICY "Students can view their own saved jobs" 
  ON public.saved_jobs FOR SELECT 
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can save jobs" ON public.saved_jobs;
CREATE POLICY "Students can save jobs" 
  ON public.saved_jobs FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can unsave jobs" ON public.saved_jobs;
CREATE POLICY "Students can unsave jobs" 
  ON public.saved_jobs FOR DELETE 
  TO authenticated
  USING (auth.uid() = student_id);

