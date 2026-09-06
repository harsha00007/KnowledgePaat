-- CareerLaunch Phase 13: Admin Interview Questions Setup
-- Run this script in your Supabase SQL Editor

-- 1. Alter interview_questions table to add missing fields for admin management
ALTER TABLE public.interview_questions
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Update existing questions to have Active status
UPDATE public.interview_questions SET status = 'Active' WHERE status IS NULL;

-- 2. Update RLS policies to allow Admins to manage questions and restrict students to Active questions

-- Drop the old public read policy
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.interview_questions;

-- Create policy for Students to view ONLY Active questions
CREATE POLICY "Students can view active questions"
  ON public.interview_questions FOR SELECT
  USING (
    status = 'Active' 
    OR 
    (auth.uid() IS NOT NULL AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  );

-- Create policies for Admin INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Admins can insert questions" ON public.interview_questions;
CREATE POLICY "Admins can insert questions"
  ON public.interview_questions FOR INSERT
  TO authenticated
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can update questions" ON public.interview_questions;
CREATE POLICY "Admins can update questions"
  ON public.interview_questions FOR UPDATE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can delete questions" ON public.interview_questions;
CREATE POLICY "Admins can delete questions"
  ON public.interview_questions FOR DELETE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_questions_modtime ON public.interview_questions;
CREATE TRIGGER update_questions_modtime
BEFORE UPDATE ON public.interview_questions
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
