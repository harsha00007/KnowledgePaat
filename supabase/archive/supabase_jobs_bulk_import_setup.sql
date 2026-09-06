-- ==============================================================================
-- GRADZENX BULK JOB IMPORT SCHEMA & AUDIT SUPPORT
-- ==============================================================================
-- Run this script in your Supabase SQL Editor if you wish to apply the jobs bulk
-- import audit table, indexes, and full column definitions.
-- Safe and idempotent: uses IF NOT EXISTS and DROP POLICY IF EXISTS.
-- ==============================================================================

-- 1. Ensure all columns exist on public.jobs
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    location TEXT NOT NULL
);

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Software Development',
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS full_description TEXT,
ADD COLUMN IF NOT EXISTS responsibilities TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT 'Fresher',
ADD COLUMN IF NOT EXISTS salary TEXT,
ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'Remote',
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-time',
ADD COLUMN IF NOT EXISTS apply_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS minimum_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS import_batch_id UUID,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Indexes for performance and duplicate detection
CREATE INDEX IF NOT EXISTS idx_jobs_batch ON public.jobs(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_title ON public.jobs(company_name, title);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_minimum_plan ON public.jobs(minimum_plan);

-- 2. Create job_imports audit table
CREATE TABLE IF NOT EXISTS public.job_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_imports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
CREATE POLICY "Anyone can view active jobs" ON public.jobs
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage jobs" ON public.jobs;
CREATE POLICY "Admins manage jobs" ON public.jobs
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage job imports" ON public.job_imports;
CREATE POLICY "Admins manage job imports" ON public.job_imports
FOR ALL USING (public.is_admin());

-- 5. Permissions & Grants
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.jobs TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.job_imports TO postgres, anon, authenticated, service_role;
