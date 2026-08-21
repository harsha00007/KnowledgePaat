-- ==============================================================================
-- GRADZENX BULK INTERVIEW QUESTION IMPORT SCHEMA & AUDIT SUPPORT
-- ==============================================================================

-- 1. Add import_batch_id column to interview_questions if not present
ALTER TABLE public.interview_questions
ADD COLUMN IF NOT EXISTS import_batch_id UUID,
ADD COLUMN IF NOT EXISTS tips TEXT,
ADD COLUMN IF NOT EXISTS common_mistakes TEXT,
ADD COLUMN IF NOT EXISTS company_tags TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS technology_tags TEXT[] DEFAULT '{}'::TEXT[],

ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS minimum_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS estimated_time TEXT DEFAULT '5 mins',
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_interview_questions_batch ON public.interview_questions(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_title ON public.interview_questions(title);

-- 2. Create interview_question_imports table for audit & history
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

-- 3. Enable RLS
ALTER TABLE public.interview_question_imports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Admins manage question imports" ON public.interview_question_imports;
CREATE POLICY "Admins manage question imports" ON public.interview_question_imports
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert interview questions" ON public.interview_questions;
CREATE POLICY "Admins insert interview questions" ON public.interview_questions
FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins update interview questions" ON public.interview_questions;
CREATE POLICY "Admins update interview questions" ON public.interview_questions
FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete interview questions" ON public.interview_questions;
CREATE POLICY "Admins delete interview questions" ON public.interview_questions
FOR DELETE USING (public.is_admin());

-- 5. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_question_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_questions TO authenticated;
