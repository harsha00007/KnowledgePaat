-- GradZenX Phase G4.1: Mock Interview Dashboard & Credit Management Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create mock_interviews table
CREATE TABLE IF NOT EXISTS public.mock_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL CHECK (interview_type IN ('hr', 'technical', 'managerial')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'started', 'in_progress', 'completed', 'cancelled')),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  credit_consumed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_mock_interviews_student ON public.mock_interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_interviews_status ON public.mock_interviews(status);
CREATE INDEX IF NOT EXISTS idx_mock_interviews_created ON public.mock_interviews(created_at);

-- 3. Enable Row Level Security
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Students can only view their own mock interviews
DROP POLICY IF EXISTS "Students can view own mock interviews" ON public.mock_interviews;
CREATE POLICY "Students can view own mock interviews"
ON public.mock_interviews FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Students can insert their own mock interviews
DROP POLICY IF EXISTS "Students can create own mock interviews" ON public.mock_interviews;
CREATE POLICY "Students can create own mock interviews"
ON public.mock_interviews FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Students can update their own mock interviews (for status changes)
DROP POLICY IF EXISTS "Students can update own mock interviews" ON public.mock_interviews;
CREATE POLICY "Students can update own mock interviews"
ON public.mock_interviews FOR UPDATE
TO authenticated
USING (student_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Admins have full access
DROP POLICY IF EXISTS "Admins can manage mock interviews" ON public.mock_interviews;
CREATE POLICY "Admins can manage mock interviews"
ON public.mock_interviews FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));
