-- ==============================================================================
-- GRADZENX AUDIT FIXES MIGRATION
-- Version: 2026-08-21
-- Safe to run on existing production databases.
-- Idempotent: uses IF NOT EXISTS, ON CONFLICT DO NOTHING, DROP POLICY IF EXISTS.
-- ==============================================================================
-- Fixes:
--   Issue 1: Resume storage DELETE + UPDATE RLS policies
--   Issue 3: interview_questions — add missing columns for fresh-DB compatibility
--            + resume_uploaded_at column on profiles
--   Issue 5: Standardize admin RLS checks to public.is_admin()
-- ==============================================================================

-- ==============================================================================
-- ISSUE 1 — RESUME STORAGE: ADD DELETE + UPDATE RLS POLICIES
-- Storage path format: {user_id}/resume_<timestamp>.<ext>
-- (storage.foldername(name))[1] returns the first path segment = user_id
-- ==============================================================================

-- DELETE policy: student can only delete files in their own folder
DROP POLICY IF EXISTS "Students can delete their own resume" ON storage.objects;
CREATE POLICY "Students can delete their own resume"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE policy: student can only update/overwrite files in their own folder
DROP POLICY IF EXISTS "Students can update their own resume" ON storage.objects;
CREATE POLICY "Students can update their own resume"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Also ensure existing INSERT + SELECT policies are in place (idempotent)
DROP POLICY IF EXISTS "Students can upload their own resume" ON storage.objects;
CREATE POLICY "Students can upload their own resume"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Students can view their own resume" ON storage.objects;
CREATE POLICY "Students can view their own resume"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ==============================================================================
-- ISSUE 3 — PROFILES: ADD resume_uploaded_at COLUMN (used by frontend, missing from schema)
-- ==============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_uploaded_at TIMESTAMPTZ;

-- ==============================================================================
-- ISSUE 3 — INTERVIEW_QUESTIONS: ENSURE COMPLETE SCHEMA EXISTS
-- The Section 5 legacy stub (id + question only) may have run before Section 14
-- on fresh databases. This migration ensures all required columns exist regardless.
-- Does NOT drop or alter existing data.
-- ==============================================================================

-- Ensure interview_categories exists (Section 14 dependency)
CREATE TABLE IF NOT EXISTS public.interview_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add all Section 14 columns to interview_questions if missing
-- This handles the case where Section 5 stub ran first and Section 14 was skipped
ALTER TABLE public.interview_questions
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.interview_categories(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS answer TEXT,
ADD COLUMN IF NOT EXISTS tips TEXT,
ADD COLUMN IF NOT EXISTS common_mistakes TEXT,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium',
ADD COLUMN IF NOT EXISTS estimated_time TEXT DEFAULT '5 mins',
ADD COLUMN IF NOT EXISTS company_tags TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS technology_tags TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS minimum_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS import_batch_id UUID,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add difficulty CHECK constraint safely (skip if already exists or data would violate it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'interview_questions_difficulty_check'
        AND conrelid = 'public.interview_questions'::regclass
    ) THEN
        -- Only add if existing data won't violate it
        IF NOT EXISTS (
            SELECT 1 FROM public.interview_questions
            WHERE difficulty IS NOT NULL
            AND difficulty NOT IN ('Easy', 'Medium', 'Hard')
        ) THEN
            ALTER TABLE public.interview_questions
            ADD CONSTRAINT interview_questions_difficulty_check
            CHECK (difficulty IN ('Easy', 'Medium', 'Hard'));
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not add difficulty check constraint: %', SQLERRM;
END $$;

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_interview_questions_category ON public.interview_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_batch ON public.interview_questions(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_title ON public.interview_questions(title);
CREATE INDEX IF NOT EXISTS idx_interview_questions_status ON public.interview_questions(status);

-- Enable RLS on new tables if not already enabled
ALTER TABLE public.interview_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

-- Ensure interview_question_imports exists (bulk import audit table)
CREATE TABLE IF NOT EXISTS public.interview_question_imports (
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

ALTER TABLE public.interview_question_imports ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- ISSUE 3 — INTERVIEW_QUESTIONS RLS (idempotent)
-- ==============================================================================

-- Categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.interview_categories;
CREATE POLICY "Categories are viewable by everyone"
ON public.interview_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage categories" ON public.interview_categories;
CREATE POLICY "Admins manage categories"
ON public.interview_categories FOR ALL USING (public.is_admin());

-- Questions
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.interview_questions;
CREATE POLICY "Questions are viewable by everyone"
ON public.interview_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage questions" ON public.interview_questions;
CREATE POLICY "Admins manage questions"
ON public.interview_questions FOR ALL USING (public.is_admin());

-- Imports
DROP POLICY IF EXISTS "Admins manage imports" ON public.interview_question_imports;
CREATE POLICY "Admins manage imports"
ON public.interview_question_imports FOR ALL USING (public.is_admin());

-- ==============================================================================
-- ISSUE 5 — STANDARDIZE ADMIN RLS CHECKS TO public.is_admin()
-- Replaces raw EXISTS subqueries on profiles with the SECURITY DEFINER helper.
-- Affected tables: subscriptions, store_products, mock_interview_sessions,
--                  career_progress_snapshots, orders, order_items, notes, jobs
-- ==============================================================================

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage subscriptions"
ON public.subscriptions FOR ALL
USING (public.is_admin());

-- STORE PRODUCTS
DROP POLICY IF EXISTS "Admins manage products" ON public.store_products;
CREATE POLICY "Admins manage products"
ON public.store_products FOR ALL
USING (public.is_admin());

-- MOCK INTERVIEW SESSIONS
DROP POLICY IF EXISTS "Admins view all mock sessions" ON public.mock_interview_sessions;
CREATE POLICY "Admins view all mock sessions"
ON public.mock_interview_sessions FOR ALL
USING (public.is_admin());

-- CAREER PROGRESS SNAPSHOTS
DROP POLICY IF EXISTS "Admins view all progress snapshots" ON public.career_progress_snapshots;
CREATE POLICY "Admins view all progress snapshots"
ON public.career_progress_snapshots FOR SELECT
USING (public.is_admin());

-- ORDERS (admin view)
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders"
ON public.orders FOR ALL
USING (public.is_admin());

-- ORDER ITEMS (admin view)
DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;
CREATE POLICY "Admins manage order items"
ON public.order_items FOR ALL
USING (public.is_admin());

-- NOTES (admin manage — existing SELECT policy for students is preserved)
DROP POLICY IF EXISTS "Admins manage notes" ON public.notes;
CREATE POLICY "Admins manage notes"
ON public.notes FOR ALL
USING (public.is_admin());

-- JOBS (admin manage — existing SELECT policy for all is preserved)
DROP POLICY IF EXISTS "Admins manage jobs" ON public.jobs;
CREATE POLICY "Admins manage jobs"
ON public.jobs FOR ALL
USING (public.is_admin());

-- STUDENT PURCHASES (admin view)
DROP POLICY IF EXISTS "Admins manage purchases" ON public.student_purchases;
CREATE POLICY "Admins manage purchases"
ON public.student_purchases FOR ALL
USING (public.is_admin());

-- ==============================================================================
-- VERIFICATION QUERIES (run manually to confirm)
-- ==============================================================================
-- Check resume storage policies:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%resume%';
--
-- Check interview_questions columns:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'interview_questions' ORDER BY column_name;
--
-- Check RLS policies use is_admin():
-- SELECT tablename, policyname, qual FROM pg_policies WHERE qual LIKE '%is_admin%' ORDER BY tablename;
-- ==============================================================================
