-- GradZenX Phase G4.3.1: AI Text Mock Interview Engine Setup
-- Run this script in your Supabase SQL Editor

-- 1. Extend mock_interview_sessions table for AI interview metadata
ALTER TABLE public.mock_interview_sessions 
ADD COLUMN IF NOT EXISTS interview_mode TEXT DEFAULT 'standard' CHECK (interview_mode IN ('standard', 'ai')),
ADD COLUMN IF NOT EXISTS target_role TEXT,
ADD COLUMN IF NOT EXISTS experience_level TEXT,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS ai_session_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_overall_feedback TEXT,
ADD COLUMN IF NOT EXISTS ai_strengths JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_improvements JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_recommendations JSONB DEFAULT '[]'::jsonb;

-- 2. Extend mock_interview_answers table for granular AI evaluations
ALTER TABLE public.mock_interview_answers 
ADD COLUMN IF NOT EXISTS ai_score NUMERIC,
ADD COLUMN IF NOT EXISTS communication_score NUMERIC,
ADD COLUMN IF NOT EXISTS technical_score NUMERIC,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC,
ADD COLUMN IF NOT EXISTS relevance_score NUMERIC,
ADD COLUMN IF NOT EXISTS clarity_score NUMERIC,
ADD COLUMN IF NOT EXISTS ai_feedback TEXT,
ADD COLUMN IF NOT EXISTS follow_up_generated BOOLEAN DEFAULT FALSE;

-- 3. Create mock_interview_ai_messages table for conversational memory
CREATE TABLE IF NOT EXISTS public.mock_interview_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'interviewer', 'student')),
  message TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('introduction', 'question', 'follow_up', 'answer', 'feedback')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON public.mock_interview_ai_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON public.mock_interview_ai_messages(created_at);

-- 5. Enable Row Level Security on mock_interview_ai_messages
ALTER TABLE public.mock_interview_ai_messages ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for mock_interview_ai_messages
DROP POLICY IF EXISTS "Students can view AI messages for own sessions" ON public.mock_interview_ai_messages;
CREATE POLICY "Students can view AI messages for own sessions"
ON public.mock_interview_ai_messages FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.mock_interview_sessions s
  WHERE s.id = session_id AND (s.student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ))
));

DROP POLICY IF EXISTS "Students can insert AI messages for own sessions" ON public.mock_interview_ai_messages;
CREATE POLICY "Students can insert AI messages for own sessions"
ON public.mock_interview_ai_messages FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mock_interview_sessions s
  WHERE s.id = session_id AND s.student_id = auth.uid()
));
