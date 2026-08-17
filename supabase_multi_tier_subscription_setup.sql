-- GradZenX Phase G2: Multi-Tier Monthly Subscription System Setup
-- Run this script in your Supabase SQL Editor

-- 1. Relax and update CHECK constraint on public.subscriptions table
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_plan_check 
CHECK (plan IN ('free', 'starter', 'pro', 'premium', 'Free', 'Starter', 'Pro', 'Premium'));

ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('active', 'expired', 'cancelled', 'Active', 'Expired', 'Cancelled'));

-- 2. Normalize existing subscription records to lowercase
UPDATE public.subscriptions SET plan = lower(plan);
UPDATE public.subscriptions SET status = lower(status);

-- 3. Add `minimum_plan` to jobs, interview_questions, and notes (and migrate existing access_type)
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS minimum_plan text NOT NULL DEFAULT 'free';

ALTER TABLE public.interview_questions 
ADD COLUMN IF NOT EXISTS minimum_plan text NOT NULL DEFAULT 'free';

ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS minimum_plan text NOT NULL DEFAULT 'free';

-- Migrate existing access_type if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'access_type') THEN
    UPDATE public.jobs SET minimum_plan = lower(access_type) WHERE access_type IS NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interview_questions' AND column_name = 'access_type') THEN
    UPDATE public.interview_questions SET minimum_plan = lower(access_type) WHERE access_type IS NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'access_type') THEN
    UPDATE public.notes SET minimum_plan = lower(access_type) WHERE access_type IS NOT NULL;
  END IF;
END $$;

-- 4. Update new student trigger to default to 'free' / 'active'
CREATE OR REPLACE FUNCTION public.handle_new_student_subscription()
RETURNS trigger AS $$
BEGIN
  IF new.role = 'student' THEN
    INSERT INTO public.subscriptions (student_id, plan, status, start_date)
    VALUES (new.id, 'free', 'active', now());
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper function for database-level multi-tier entitlement checks
CREATE OR REPLACE FUNCTION public.has_plan_access(user_uuid uuid, required_plan text)
RETURNS boolean AS $$
DECLARE
  v_user_plan text;
  v_user_level integer := 1;
  v_req_level integer := 1;
BEGIN
  -- Determine required plan level
  CASE lower(required_plan)
    WHEN 'premium' THEN v_req_level := 4;
    WHEN 'pro' THEN v_req_level := 3;
    WHEN 'starter' THEN v_req_level := 2;
    ELSE v_req_level := 1;
  END CASE;

  -- If required is free, access is always granted
  IF v_req_level = 1 THEN
    RETURN true;
  END IF;

  -- Check user's active subscription
  SELECT lower(plan) INTO v_user_plan
  FROM public.subscriptions
  WHERE student_id = user_uuid
    AND lower(status) = 'active'
    AND (end_date IS NULL OR end_date >= now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_plan IS NULL THEN
    RETURN false;
  END IF;

  CASE v_user_plan
    WHEN 'premium' THEN v_user_level := 4;
    WHEN 'pro' THEN v_user_level := 3;
    WHEN 'starter' THEN v_user_level := 2;
    ELSE v_user_level := 1;
  END CASE;

  RETURN v_user_level >= v_req_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
