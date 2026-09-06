-- ==============================================================================
-- GRADZENX ADMIN-CONTROLLED INTERVIEW PREPARATION & TEST SYSTEM
-- ==============================================================================
-- Run this script in your Supabase SQL Editor.
-- Safe and idempotent: uses IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, and DROP POLICY IF EXISTS.
-- ==============================================================================

-- 1. Extend interview_categories table
ALTER TABLE public.interview_categories
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'BookOpen',
ADD COLUMN IF NOT EXISTS minimum_plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Extend interview_questions table
ALTER TABLE public.interview_questions
ADD COLUMN IF NOT EXISTS explanation TEXT,
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS correct_option_index INTEGER,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. Create interview_prep_settings table (Global Platform Settings)
CREATE TABLE IF NOT EXISTS public.interview_prep_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    practice_mode_enabled BOOLEAN NOT NULL DEFAULT true,
    timed_test_mode_enabled BOOLEAN NOT NULL DEFAULT true,
    ai_adaptive_mode_enabled BOOLEAN NOT NULL DEFAULT true,
    practice_minimum_plan TEXT NOT NULL DEFAULT 'free',
    timed_test_minimum_plan TEXT NOT NULL DEFAULT 'free',
    ai_adaptive_minimum_plan TEXT NOT NULL DEFAULT 'premium',
    allowed_question_counts INTEGER[] DEFAULT '{10, 20, 30, 40, 50}'::INTEGER[],
    allowed_time_limits INTEGER[] DEFAULT '{30, 45, 60, 90, 120}'::INTEGER[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings row if not present
INSERT INTO public.interview_prep_settings (
    id,
    practice_mode_enabled,
    timed_test_mode_enabled,
    ai_adaptive_mode_enabled,
    practice_minimum_plan,
    timed_test_minimum_plan,
    ai_adaptive_minimum_plan,
    allowed_question_counts,
    allowed_time_limits
)
VALUES (
    'global',
    true,
    true,
    true,
    'free',
    'free',
    'premium',
    '{10, 20, 30, 40, 50}',
    '{30, 45, 60, 90, 120}'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Create interview_test_configs table (Admin-Created Tests)
CREATE TABLE IF NOT EXISTS public.interview_test_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.interview_categories(id) ON DELETE SET NULL,
    mode TEXT NOT NULL DEFAULT 'timed_test', -- 'practice', 'timed_test', 'ai_adaptive'
    difficulty TEXT NOT NULL DEFAULT 'Medium', -- 'Easy', 'Medium', 'Hard', 'Mixed', 'Adaptive'
    question_count INTEGER NOT NULL DEFAULT 10,
    time_per_question INTEGER NOT NULL DEFAULT 60, -- in seconds
    minimum_plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'premium'
    is_recommended BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive'
    allowed_question_counts INTEGER[] DEFAULT '{10, 20}'::INTEGER[],
    allowed_time_limits INTEGER[] DEFAULT '{45, 60, 90}'::INTEGER[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_test_configs_cat ON public.interview_test_configs(category_id);
CREATE INDEX IF NOT EXISTS idx_interview_test_configs_status ON public.interview_test_configs(status);
CREATE INDEX IF NOT EXISTS idx_interview_test_configs_rec ON public.interview_test_configs(is_recommended);

-- 5. Create student_test_attempts table (Test Analytics & Student Scorecards)
CREATE TABLE IF NOT EXISTS public.student_test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_config_id UUID REFERENCES public.interview_test_configs(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.interview_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'timed_test',
    difficulty TEXT NOT NULL DEFAULT 'Medium',
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    score_percentage NUMERIC NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'in_progress', 'abandoned'
    answers_payload JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_test_attempts_student ON public.student_test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_test_attempts_test ON public.student_test_attempts(test_config_id);
CREATE INDEX IF NOT EXISTS idx_student_test_attempts_created ON public.student_test_attempts(created_at);

-- 6. Enable RLS
ALTER TABLE public.interview_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_prep_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_test_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_attempts ENABLE ROW LEVEL SECURITY;

-- 7. Policies for interview_prep_settings
DROP POLICY IF EXISTS "Anyone can view prep settings" ON public.interview_prep_settings;
CREATE POLICY "Anyone can view prep settings" ON public.interview_prep_settings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage prep settings" ON public.interview_prep_settings;
CREATE POLICY "Admins manage prep settings" ON public.interview_prep_settings
FOR ALL USING (public.is_admin());

-- 8. Policies for interview_test_configs
DROP POLICY IF EXISTS "Anyone can view active test configs" ON public.interview_test_configs;
CREATE POLICY "Anyone can view active test configs" ON public.interview_test_configs
FOR SELECT USING (COALESCE(status, 'Active') = 'Active' OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage test configs" ON public.interview_test_configs;
CREATE POLICY "Admins manage test configs" ON public.interview_test_configs
FOR ALL USING (public.is_admin());

-- 9. Policies for student_test_attempts
DROP POLICY IF EXISTS "Students view own test attempts" ON public.student_test_attempts;
CREATE POLICY "Students view own test attempts" ON public.student_test_attempts
FOR SELECT USING (auth.uid() = student_id OR public.is_admin());

DROP POLICY IF EXISTS "Students insert own test attempts" ON public.student_test_attempts;
CREATE POLICY "Students insert own test attempts" ON public.student_test_attempts
FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins manage test attempts" ON public.student_test_attempts;
CREATE POLICY "Admins manage test attempts" ON public.student_test_attempts
FOR ALL USING (public.is_admin());

-- 10. Permissions & Grants
GRANT ALL ON TABLE public.interview_categories TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.interview_questions TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.interview_prep_settings TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.interview_test_configs TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.student_test_attempts TO authenticated, service_role, anon;
