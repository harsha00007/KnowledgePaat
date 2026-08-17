-- GradZenX Phase G1: Free vs Premium Access Control Setup
-- Run this script in your Supabase SQL Editor

-- 1. Add `access_type` to public.jobs if not exists
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'Free' CHECK (access_type IN ('Free', 'Premium'));

-- 2. Add `access_type` to public.interview_questions if not exists
ALTER TABLE public.interview_questions 
ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'Free' CHECK (access_type IN ('Free', 'Premium'));

-- 3. Add `access_type` to public.notes if not exists
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'Free' CHECK (access_type IN ('Free', 'Premium'));

-- 4. Ensure all existing records default safely to 'Free'
UPDATE public.jobs SET access_type = 'Free' WHERE access_type IS NULL;
UPDATE public.interview_questions SET access_type = 'Free' WHERE access_type IS NULL;
UPDATE public.notes SET access_type = 'Free' WHERE access_type IS NULL;

-- 5. Helper function to check if a user currently has active Premium access
CREATE OR REPLACE FUNCTION public.has_active_premium_access(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.subscriptions
  WHERE student_id = user_uuid
    AND plan = 'Premium'
    AND status = 'Active'
    AND (end_date IS NULL OR end_date >= now());
    
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
