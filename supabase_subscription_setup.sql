-- CareerLaunch Phase 9: Subscription Module Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('Free', 'Premium')),
  status text NOT NULL CHECK (status IN ('Active', 'Expired', 'Cancelled')),
  start_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Subscriptions: Students can only view their own subscriptions
DROP POLICY IF EXISTS "Students can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Students can view their own subscriptions" 
  ON public.subscriptions FOR SELECT 
  TO authenticated
  USING (auth.uid() = student_id);

-- Normally, insert/update would be handled securely by a backend API responding to webhooks.
-- For the MVP, we will allow students to insert/update their own for testing purposes.
DROP POLICY IF EXISTS "Students can insert their own subscriptions" ON public.subscriptions;
CREATE POLICY "Students can insert their own subscriptions" 
  ON public.subscriptions FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update their own subscriptions" ON public.subscriptions;
CREATE POLICY "Students can update their own subscriptions" 
  ON public.subscriptions FOR UPDATE 
  TO authenticated
  USING (auth.uid() = student_id);

-- 4. Create a trigger to automatically give new students a 'Free' subscription
CREATE OR REPLACE FUNCTION public.handle_new_student_subscription()
RETURNS trigger AS $$
BEGIN
  -- We check if they are a student role first
  IF new.role = 'student' THEN
    INSERT INTO public.subscriptions (student_id, plan, status, start_date)
    VALUES (new.id, 'Free', 'Active', now());
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;

-- Create trigger that fires after a profile is inserted
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_student_subscription();

-- 5. Helper function to seed existing users who don't have a subscription
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE role = 'student' AND id NOT IN (SELECT student_id FROM public.subscriptions)
  LOOP
    INSERT INTO public.subscriptions (student_id, plan, status, start_date)
    VALUES (rec.id, 'Free', 'Active', now());
  END LOOP;
END $$;
