-- CareerLaunch Phase 7: Interview Preparation Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create interview_categories table
CREATE TABLE IF NOT EXISTS public.interview_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create interview_questions table
CREATE TABLE IF NOT EXISTS public.interview_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.interview_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  answer text NOT NULL,
  tips text,
  common_mistakes text,
  difficulty text NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  estimated_time text NOT NULL, -- e.g., '5 mins'
  company_tags text[] DEFAULT '{}'::text[],
  technology_tags text[] DEFAULT '{}'::text[],
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create student_question_progress table
CREATE TABLE IF NOT EXISTS public.student_question_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  completed boolean DEFAULT true,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(student_id, question_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.interview_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_question_progress ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies

-- Categories and Questions are publicly readable (or restrict to authenticated)
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.interview_categories;
CREATE POLICY "Categories are viewable by everyone" 
  ON public.interview_categories FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.interview_questions;
CREATE POLICY "Questions are viewable by everyone" 
  ON public.interview_questions FOR SELECT 
  USING (true);

-- Progress tracking: Students manage their own progress
DROP POLICY IF EXISTS "Students can view their own progress" ON public.student_question_progress;
CREATE POLICY "Students can view their own progress" 
  ON public.student_question_progress FOR SELECT 
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert their own progress" ON public.student_question_progress;
CREATE POLICY "Students can insert their own progress" 
  ON public.student_question_progress FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update their own progress" ON public.student_question_progress;
CREATE POLICY "Students can update their own progress" 
  ON public.student_question_progress FOR UPDATE 
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can delete their own progress" ON public.student_question_progress;
CREATE POLICY "Students can delete their own progress" 
  ON public.student_question_progress FOR DELETE 
  TO authenticated
  USING (auth.uid() = student_id);

-- 6. Insert Dummy Data (Seed Categories)
DO $$
DECLARE
  cat_hr uuid;
  cat_tech uuid;
  cat_apt uuid;
  cat_comp uuid;
BEGIN
  -- Insert categories and store their IDs
  INSERT INTO public.interview_categories (name, description, order_index)
  VALUES ('HR Interview', 'Common behavioral and situational questions asked by HR.', 1)
  RETURNING id INTO cat_hr;

  INSERT INTO public.interview_categories (name, description, order_index)
  VALUES ('Technical Interview', 'Core computer science and programming questions.', 2)
  RETURNING id INTO cat_tech;

  INSERT INTO public.interview_categories (name, description, order_index)
  VALUES ('Aptitude', 'Logical reasoning, quantitative, and verbal aptitude questions.', 3)
  RETURNING id INTO cat_apt;

  INSERT INTO public.interview_categories (name, description, order_index)
  VALUES ('Company-wise Questions', 'Specific questions frequently asked by top product and service companies.', 4)
  RETURNING id INTO cat_comp;

  -- Insert Questions
  
  -- HR Questions
  INSERT INTO public.interview_questions (category_id, title, answer, tips, common_mistakes, difficulty, estimated_time, company_tags, technology_tags)
  VALUES 
  (cat_hr, 'Tell me about yourself.', 'Start with your present role, go back to your past experiences, and finish with your future goals aligning with the company.', 'Keep it concise (1-2 minutes). Highlight achievements relevant to the job.', 'Reciting your entire resume or sharing overly personal information.', 'Easy', '3 mins', ARRAY['TCS', 'Infosys', 'Amazon'], ARRAY[]::text[]),
  (cat_hr, 'Why should we hire you?', 'I have the specific skills required for this role, such as X and Y. My background in Z allows me to add value immediately.', 'Connect your skills directly to the job description.', 'Giving a generic answer like "I am a hard worker".', 'Medium', '4 mins', ARRAY['Google', 'Microsoft'], ARRAY[]::text[]);

  -- Technical Questions
  INSERT INTO public.interview_questions (category_id, title, answer, tips, common_mistakes, difficulty, estimated_time, company_tags, technology_tags)
  VALUES 
  (cat_tech, 'What is the difference between let, const, and var in JavaScript?', 'var is function-scoped and hoisted. let and const are block-scoped. let allows reassignment, while const does not.', 'Always default to const. Use let only when you know the value will change.', 'Confusing hoisting behavior or scope limits.', 'Easy', '2 mins', ARRAY['Netflix', 'Meta'], ARRAY['JavaScript', 'Frontend']),
  (cat_tech, 'Explain the Virtual DOM in React.', 'The Virtual DOM is a lightweight copy of the real DOM. React uses it to diff changes (reconciliation) and efficiently update only the changed nodes in the real DOM.', 'Mention "reconciliation" and "diffing algorithm".', 'Saying the Virtual DOM is faster than the real DOM (it makes updates faster, not the DOM itself).', 'Medium', '5 mins', ARRAY['Uber', 'Airbnb'], ARRAY['React', 'Frontend']);

  -- Aptitude Questions
  INSERT INTO public.interview_questions (category_id, title, answer, tips, common_mistakes, difficulty, estimated_time, company_tags, technology_tags)
  VALUES 
  (cat_apt, 'If a train 120m long passes a telegraph pole in 6 seconds, find the speed of the train.', 'Speed = Distance / Time = 120m / 6s = 20 m/s. In km/hr = 20 * (18/5) = 72 km/hr.', 'Remember the conversion factor: m/s to km/hr is 18/5.', 'Forgetting to convert units if the answer choices are in km/hr.', 'Medium', '3 mins', ARRAY['Wipro', 'Cognizant'], ARRAY[]::text[]);

  -- Company-wise Questions
  INSERT INTO public.interview_questions (category_id, title, answer, tips, common_mistakes, difficulty, estimated_time, company_tags, technology_tags)
  VALUES 
  (cat_comp, 'Reverse a Linked List (Amazon)', 'Iterate through the list, keeping track of previous, current, and next nodes. Update current.next to point to previous, then shift all pointers one step forward.', 'Write clean code and mention the time complexity (O(N)) and space complexity (O(1)).', 'Losing the reference to the next node before updating the current node pointer.', 'Hard', '15 mins', ARRAY['Amazon', 'Microsoft'], ARRAY['Data Structures', 'Java', 'Python']);

END $$;
