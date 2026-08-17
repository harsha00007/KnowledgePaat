-- GradZenX Phase G4.3.3: Voice-Based AI Mock Interview Setup
-- Run this script in your Supabase SQL Editor

-- 1. Extend mock_interview_answers table with voice transcription metadata
ALTER TABLE public.mock_interview_answers 
ADD COLUMN IF NOT EXISTS answer_type TEXT DEFAULT 'text' CHECK (answer_type IN ('text', 'voice')),
ADD COLUMN IF NOT EXISTS audio_duration_seconds NUMERIC,
ADD COLUMN IF NOT EXISTS transcription_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS original_transcript TEXT,
ADD COLUMN IF NOT EXISTS edited_transcript TEXT,
ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;

-- 2. Performance Index for answer type auditing
CREATE INDEX IF NOT EXISTS idx_answers_answer_type ON public.mock_interview_answers(answer_type);
