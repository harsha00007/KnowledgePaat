-- GradZenX Phase G4.3.5: AI Career Intelligence & Personalized Improvement Plan Setup
-- Run this script in your Supabase SQL Editor

-- 1. Career Improvement Plans Table
CREATE TABLE IF NOT EXISTS public.career_improvement_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_duration INTEGER NOT NULL DEFAULT 7, -- 7, 14, or 30 days
    career_readiness_score NUMERIC NOT NULL DEFAULT 0,
    profile_strength NUMERIC NOT NULL DEFAULT 0,
    technical_skills_score NUMERIC NOT NULL DEFAULT 0,
    interview_performance_score NUMERIC NOT NULL DEFAULT 0,
    communication_score NUMERIC NOT NULL DEFAULT 0,
    consistency_score NUMERIC NOT NULL DEFAULT 0,
    data_completeness NUMERIC NOT NULL DEFAULT 0,
    confidence_level TEXT NOT NULL DEFAULT 'low' CHECK (confidence_level IN ('low', 'moderate', 'high')),
    target_role TEXT,
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    skill_gaps JSONB DEFAULT '[]'::jsonb,
    ai_insight JSONB DEFAULT '{}'::jsonb,
    plan_data JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Career Plan Tasks Table
CREATE TABLE IF NOT EXISTS public.career_plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.career_improvement_plans(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'technical' CHECK (category IN ('technical', 'interview', 'communication', 'resume', 'profile', 'job_preparation', 'aptitude', 'hr_preparation')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    estimated_minutes INTEGER NOT NULL DEFAULT 30,
    related_skill TEXT,
    reason TEXT,
    resource_id TEXT,
    resource_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for Fast Lookups
CREATE INDEX IF NOT EXISTS idx_career_plans_student ON public.career_improvement_plans(student_id, status);
CREATE INDEX IF NOT EXISTS idx_career_tasks_plan ON public.career_plan_tasks(plan_id, day_number);
CREATE INDEX IF NOT EXISTS idx_career_tasks_student ON public.career_plan_tasks(student_id, status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.career_improvement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for career_improvement_plans
DROP POLICY IF EXISTS "Students can view own career plans" ON public.career_improvement_plans;
CREATE POLICY "Students can view own career plans"
ON public.career_improvement_plans FOR SELECT
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own career plans" ON public.career_improvement_plans;
CREATE POLICY "Students can insert own career plans"
ON public.career_improvement_plans FOR INSERT
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own career plans" ON public.career_improvement_plans;
CREATE POLICY "Students can update own career plans"
ON public.career_improvement_plans FOR UPDATE
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins can view all career plans" ON public.career_improvement_plans;
CREATE POLICY "Admins can view all career plans"
ON public.career_improvement_plans FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- 6. RLS Policies for career_plan_tasks
DROP POLICY IF EXISTS "Students can view own career tasks" ON public.career_plan_tasks;
CREATE POLICY "Students can view own career tasks"
ON public.career_plan_tasks FOR SELECT
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own career tasks" ON public.career_plan_tasks;
CREATE POLICY "Students can insert own career tasks"
ON public.career_plan_tasks FOR INSERT
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own career tasks" ON public.career_plan_tasks;
CREATE POLICY "Students can update own career tasks"
ON public.career_plan_tasks FOR UPDATE
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins can view all career tasks" ON public.career_plan_tasks;
CREATE POLICY "Admins can view all career tasks"
ON public.career_plan_tasks FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
