-- GradZenX Phase G4.3.4: AI Adaptive Interview Intelligence Setup
-- Run this script in your Supabase SQL Editor

-- 1. Extend mock_interview_sessions with adaptive intelligence tracking
ALTER TABLE public.mock_interview_sessions 
ADD COLUMN IF NOT EXISTS current_difficulty TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS highest_difficulty_reached TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS interview_momentum TEXT DEFAULT 'stable' CHECK (interview_momentum IN ('struggling', 'stable', 'performing_well', 'excellent')),
ADD COLUMN IF NOT EXISTS adaptive_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS topic_performance JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS question_strategy TEXT;

-- 2. Extend mock_interview_answers with topic and adaptive decision metadata
ALTER TABLE public.mock_interview_answers 
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'new_topic',
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS momentum_at_submission TEXT;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_momentum ON public.mock_interview_sessions(interview_momentum);
CREATE INDEX IF NOT EXISTS idx_answers_topic ON public.mock_interview_answers(topic);
