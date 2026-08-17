-- GradZenX Phase G4.3.2: AI Interview Evaluation and Personalized Feedback Setup
-- Run this script in your Supabase SQL Editor

-- 1. Extend mock_interview_answers table with granular evaluation metrics
ALTER TABLE public.mock_interview_answers 
ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'pending' CHECK (evaluation_status IN ('pending', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS performance_level TEXT,
ADD COLUMN IF NOT EXISTS relevance_score NUMERIC,
ADD COLUMN IF NOT EXISTS technical_accuracy_score NUMERIC,
ADD COLUMN IF NOT EXISTS communication_score NUMERIC,
ADD COLUMN IF NOT EXISTS clarity_score NUMERIC,
ADD COLUMN IF NOT EXISTS answer_structure_score NUMERIC,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC,
ADD COLUMN IF NOT EXISTS overall_score NUMERIC,
ADD COLUMN IF NOT EXISTS strengths JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS improvements JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS missing_concepts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS better_answer TEXT,
ADD COLUMN IF NOT EXISTS interview_tip TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- 2. Extend mock_interview_sessions table for aggregate evaluation category averages
ALTER TABLE public.mock_interview_sessions
ADD COLUMN IF NOT EXISTS performance_level TEXT,
ADD COLUMN IF NOT EXISTS avg_relevance_score NUMERIC,
ADD COLUMN IF NOT EXISTS avg_technical_accuracy_score NUMERIC,
ADD COLUMN IF NOT EXISTS avg_communication_score NUMERIC,
ADD COLUMN IF NOT EXISTS avg_clarity_score NUMERIC,
ADD COLUMN IF NOT EXISTS avg_answer_structure_score NUMERIC,
ADD COLUMN IF NOT EXISTS avg_confidence_score NUMERIC,
ADD COLUMN IF NOT EXISTS missing_concepts JSONB DEFAULT '[]'::jsonb;

-- 3. Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON public.mock_interview_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_student_id ON public.mock_interview_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_answers_eval_status ON public.mock_interview_answers(evaluation_status);
