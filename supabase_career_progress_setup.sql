-- GradZenX Phase G4.3.6: AI Career Progress & Growth Dashboard Setup
-- Run this script in your Supabase SQL Editor

-- 1. Career Progress Daily Snapshots Table
CREATE TABLE IF NOT EXISTS public.career_progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    career_readiness_score NUMERIC NOT NULL DEFAULT 0,
    profile_score NUMERIC NOT NULL DEFAULT 0,
    resume_score NUMERIC NOT NULL DEFAULT 0,
    interview_score NUMERIC NOT NULL DEFAULT 0,
    practice_score NUMERIC NOT NULL DEFAULT 0,
    skill_score NUMERIC NOT NULL DEFAULT 0,
    engagement_score NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_student_snapshot_date UNIQUE(student_id, snapshot_date)
);

-- 2. Indexes for Fast Timeline Queries
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_date 
ON public.career_progress_snapshots(student_id, snapshot_date ASC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.career_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Students can view own progress snapshots" ON public.career_progress_snapshots;
CREATE POLICY "Students can view own progress snapshots"
ON public.career_progress_snapshots FOR SELECT
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own progress snapshots" ON public.career_progress_snapshots;
CREATE POLICY "Students can insert own progress snapshots"
ON public.career_progress_snapshots FOR INSERT
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own progress snapshots" ON public.career_progress_snapshots;
CREATE POLICY "Students can update own progress snapshots"
ON public.career_progress_snapshots FOR UPDATE
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins can view all progress snapshots" ON public.career_progress_snapshots;
CREATE POLICY "Admins can view all progress snapshots"
ON public.career_progress_snapshots FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
