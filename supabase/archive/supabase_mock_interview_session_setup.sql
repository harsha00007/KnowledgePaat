-- GradZenX Phase G4.2: Actual Mock Interview Session Engine Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create mock_interview_sessions table
CREATE TABLE IF NOT EXISTS public.mock_interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('hr', 'technical', 'managerial')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  subscription_plan TEXT NOT NULL DEFAULT 'starter',
  total_questions INTEGER NOT NULL DEFAULT 10,
  answered_questions INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_score NUMERIC,
  communication_score NUMERIC,
  technical_score NUMERIC,
  confidence_score NUMERIC,
  strengths JSONB DEFAULT '[]'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create mock_interview_session_questions table (Snapshot of questions for fixed session integrity)
CREATE TABLE IF NOT EXISTS public.mock_interview_session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
  question_id UUID,
  question_text TEXT NOT NULL,
  question_category TEXT,
  question_order INTEGER NOT NULL,
  helper_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create mock_interview_answers table
CREATE TABLE IF NOT EXISTS public.mock_interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
  session_question_id UUID NOT NULL REFERENCES public.mock_interview_session_questions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_length INTEGER NOT NULL DEFAULT 0,
  question_score NUMERIC,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_session_question_answer UNIQUE (session_question_id)
);

-- 4. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_mock_sessions_student ON public.mock_interview_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_sessions_status ON public.mock_interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mock_sessions_started ON public.mock_interview_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_session_questions_session ON public.mock_interview_session_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_answers_session ON public.mock_interview_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_answers_student ON public.mock_interview_answers(student_id);

-- 5. Enable Row Level Security
ALTER TABLE public.mock_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interview_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interview_answers ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for mock_interview_sessions
DROP POLICY IF EXISTS "Students can view own mock sessions" ON public.mock_interview_sessions;
CREATE POLICY "Students can view own mock sessions"
ON public.mock_interview_sessions FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

DROP POLICY IF EXISTS "Students can insert own mock sessions" ON public.mock_interview_sessions;
CREATE POLICY "Students can insert own mock sessions"
ON public.mock_interview_sessions FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own in-progress mock sessions" ON public.mock_interview_sessions;
CREATE POLICY "Students can update own in-progress mock sessions"
ON public.mock_interview_sessions FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- 7. RLS Policies for mock_interview_session_questions
DROP POLICY IF EXISTS "Students can view questions for own sessions" ON public.mock_interview_session_questions;
CREATE POLICY "Students can view questions for own sessions"
ON public.mock_interview_session_questions FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.mock_interview_sessions s
  WHERE s.id = session_id AND (s.student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ))
));

DROP POLICY IF EXISTS "Students can insert questions for own sessions" ON public.mock_interview_session_questions;
CREATE POLICY "Students can insert questions for own sessions"
ON public.mock_interview_session_questions FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mock_interview_sessions s
  WHERE s.id = session_id AND s.student_id = auth.uid()
));

-- 8. RLS Policies for mock_interview_answers
DROP POLICY IF EXISTS "Students can view own answers" ON public.mock_interview_answers;
CREATE POLICY "Students can view own answers"
ON public.mock_interview_answers FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

DROP POLICY IF EXISTS "Students can insert own answers" ON public.mock_interview_answers;
CREATE POLICY "Students can insert own answers"
ON public.mock_interview_answers FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own answers while session in-progress" ON public.mock_interview_answers;
CREATE POLICY "Students can update own answers while session in-progress"
ON public.mock_interview_answers FOR UPDATE
TO authenticated
USING (student_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.mock_interview_sessions s
  WHERE s.id = session_id AND s.status = 'in_progress'
))
WITH CHECK (student_id = auth.uid());
