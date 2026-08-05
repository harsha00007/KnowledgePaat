-- Execute this in your Supabase SQL Editor

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text DEFAULT 'student'::text CHECK (role IN ('student', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- 4. Create a trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, email, role)
  VALUES (
    new.id,
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'student'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
-- CareerLaunch Phase 5: Storage Setup Script
-- Run this script in your Supabase SQL Editor

-- 1. Update the profiles table to store resume metadata
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS resume_filename TEXT,
ADD COLUMN IF NOT EXISTS resume_uploaded_at TIMESTAMP WITH TIME ZONE;

-- 2. Create the Storage Bucket for Resumes (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes', 
  'resumes', 
  false, 
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- 3. Set up Row Level Security (RLS) for the Storage Bucket

-- Ensure RLS is enabled on storage.objects (usually enabled by default in Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts when re-running
DROP POLICY IF EXISTS "Allow individual insert access" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual update access" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual delete access" ON storage.objects;

-- Create Policy: Users can only upload their own resumes
CREATE POLICY "Allow individual insert access" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'resumes' AND auth.uid() = owner);

-- Create Policy: Users can only update their own resumes
CREATE POLICY "Allow individual update access" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'resumes' AND auth.uid() = owner);

-- Create Policy: Users can only read their own resumes
CREATE POLICY "Allow individual read access" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'resumes' AND auth.uid() = owner);

-- Create Policy: Users can only delete their own resumes
CREATE POLICY "Allow individual delete access" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'resumes' AND auth.uid() = owner);
-- CareerLaunch Phase 6: Jobs Module Database Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create the `jobs` table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  company_logo_url text,
  title text NOT NULL,
  location text NOT NULL,
  experience text NOT NULL,
  salary text,
  employment_type text NOT NULL,
  work_mode text NOT NULL,
  category text NOT NULL,
  required_skills text[] DEFAULT '{}'::text[],
  short_description text,
  full_description text,
  responsibilities text[] DEFAULT '{}'::text[],
  apply_url text NOT NULL,
  posted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the `saved_jobs` table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(student_id, job_id)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Jobs: Anyone can read jobs (or restrict to authenticated if you prefer)
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.jobs;
CREATE POLICY "Jobs are viewable by everyone" 
  ON public.jobs FOR SELECT 
  USING (true);

-- Saved Jobs: Students can only manage their own saved jobs
DROP POLICY IF EXISTS "Students can view their own saved jobs" ON public.saved_jobs;
CREATE POLICY "Students can view their own saved jobs" 
  ON public.saved_jobs FOR SELECT 
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can save jobs" ON public.saved_jobs;
CREATE POLICY "Students can save jobs" 
  ON public.saved_jobs FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can unsave jobs" ON public.saved_jobs;
CREATE POLICY "Students can unsave jobs" 
  ON public.saved_jobs FOR DELETE 
  TO authenticated
  USING (auth.uid() = student_id);

-- 5. Insert Dummy Data (Seed)
INSERT INTO public.jobs (company_name, title, location, experience, salary, employment_type, work_mode, category, required_skills, short_description, full_description, responsibilities, apply_url)
VALUES
(
  'TechNova Solutions', 
  'Frontend Developer Intern', 
  'Bangalore, India', 
  '0-1 Years', 
  '₹20,000/month', 
  'Internship', 
  'Hybrid',
  'Software Development',
  ARRAY['React', 'JavaScript', 'HTML', 'CSS'], 
  'Join our fast-growing startup to build scalable frontend applications using React and Next.js.',
  'We are looking for an enthusiastic Frontend Developer Intern to join our dynamic team. You will work closely with our designers and senior engineers to build modern web interfaces.',
  ARRAY['Develop responsive web pages', 'Collaborate with design team', 'Write clean and maintainable code', 'Participate in code reviews'],
  'https://example.com/apply/1'
),
(
  'Global Finance Inc.', 
  'Junior Data Analyst', 
  'Mumbai, India', 
  '0-2 Years', 
  '₹6,00,000/year', 
  'Full-time', 
  'Remote',
  'Data Science',
  ARRAY['Python', 'SQL', 'Excel', 'Tableau'], 
  'Analyze financial data and generate reports to help our stakeholders make informed business decisions.',
  'As a Junior Data Analyst, you will be responsible for extracting data from our databases, cleaning it, and building dashboards to visualize key metrics.',
  ARRAY['Extract and clean data using SQL', 'Build Tableau dashboards', 'Present findings to stakeholders', 'Maintain data quality standards'],
  'https://example.com/apply/2'
),
(
  'Creative Studios', 
  'UI/UX Designer', 
  'Pune, India', 
  '1-3 Years', 
  '₹8,00,000/year', 
  'Full-time', 
  'On-site',
  'Design',
  ARRAY['Figma', 'Adobe XD', 'Prototyping', 'User Research'], 
  'Design intuitive and beautiful user experiences for our suite of mobile and web applications.',
  'We are seeking a creative UI/UX Designer who is passionate about building user-centric products. You will own the design process from wireframes to high-fidelity prototypes.',
  ARRAY['Conduct user research and interviews', 'Create wireframes and prototypes in Figma', 'Collaborate with developers for handoff', 'Iterate designs based on feedback'],
  'https://example.com/apply/3'
),
(
  'CloudServe Systems', 
  'Software Development Engineer 1', 
  'Hyderabad, India', 
  '0-2 Years', 
  '₹12,00,000/year', 
  'Full-time', 
  'Hybrid',
  'Software Development',
  ARRAY['Java', 'Spring Boot', 'AWS', 'Microservices'], 
  'Build and maintain scalable backend microservices for our enterprise cloud platform.',
  'CloudServe Systems is looking for a talented SDE-1 to help build the next generation of our cloud platform. You will write high-quality backend code in Java.',
  ARRAY['Design and implement microservices', 'Write unit and integration tests', 'Deploy services to AWS', 'Participate in agile sprint planning'],
  'https://example.com/apply/4'
),
(
  'Innovate AI', 
  'Machine Learning Intern', 
  'Remote', 
  '0-1 Years', 
  '₹25,000/month', 
  'Internship', 
  'Remote',
  'AI / ML',
  ARRAY['Python', 'TensorFlow', 'PyTorch', 'NLP'], 
  'Work with cutting-edge LLMs and natural language processing models to solve real-world problems.',
  'Join Innovate AI as a Machine Learning Intern and work directly with our research scientists to train and deploy advanced AI models.',
  ARRAY['Collect and preprocess text datasets', 'Fine-tune large language models', 'Evaluate model performance', 'Read and implement research papers'],
  'https://example.com/apply/5'
);
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
-- CareerLaunch Phase 8: Notes Module Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create the Storage Bucket for Notes (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notes', 
  'notes', 
  false, 
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- 2. Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  file_url text NOT NULL, -- The path within the 'notes' storage bucket
  file_size text NOT NULL, -- E.g. '2.4 MB'
  tags text[] DEFAULT '{}'::text[],
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create saved_notes table
CREATE TABLE IF NOT EXISTS public.saved_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(student_id, note_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_notes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for Tables

-- Notes are publicly readable (or restrict to authenticated if preferred)
DROP POLICY IF EXISTS "Notes are viewable by everyone" ON public.notes;
CREATE POLICY "Notes are viewable by everyone" 
  ON public.notes FOR SELECT 
  USING (true);

-- Saved Notes: Students manage their own saved notes
DROP POLICY IF EXISTS "Students can view their own saved notes" ON public.saved_notes;
CREATE POLICY "Students can view their own saved notes" 
  ON public.saved_notes FOR SELECT 
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert their own saved notes" ON public.saved_notes;
CREATE POLICY "Students can insert their own saved notes" 
  ON public.saved_notes FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can delete their own saved notes" ON public.saved_notes;
CREATE POLICY "Students can delete their own saved notes" 
  ON public.saved_notes FOR DELETE 
  TO authenticated
  USING (auth.uid() = student_id);

-- 6. Create RLS Policies for Storage
-- Allow authenticated users to read PDFs from the 'notes' bucket
DROP POLICY IF EXISTS "Allow authenticated read access for notes" ON storage.objects;
CREATE POLICY "Allow authenticated read access for notes" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'notes');

-- 7. Insert Dummy Data (Seed Notes)
-- Note: file_url points to a dummy path. If you want real previews to work, 
-- you'll need to upload actual PDF files to those paths in the Supabase Storage UI.
INSERT INTO public.notes (title, category, description, file_url, file_size, tags)
VALUES
(
  'Quantitative Aptitude Mastery', 
  'Aptitude', 
  'A comprehensive guide covering percentages, ratios, time/speed/distance, and logical reasoning shortcuts to ace your screening tests.', 
  'dummy_aptitude.pdf', 
  '4.2 MB', 
  ARRAY['Math', 'Reasoning', 'Speed']
),
(
  'Data Structures & Algorithms Cheat Sheet', 
  'Programming', 
  'A quick reference guide for common Data Structures (Arrays, Trees, Graphs) and popular algorithms with Big-O complexities.', 
  'dummy_dsa.pdf', 
  '1.8 MB', 
  ARRAY['DSA', 'Java', 'Python', 'C++']
),
(
  'Mastering the HR Interview', 
  'HR Interview', 
  'Detailed answers and strategies for tackling behavioral questions, situational judgments, and salary negotiations.', 
  'dummy_hr.pdf', 
  '2.1 MB', 
  ARRAY['Behavioral', 'Communication']
),
(
  'React.js Interview Guide', 
  'Technical Interview', 
  'Deep dive into React concepts like Hooks, Virtual DOM, Context API, and state management for technical rounds.', 
  'dummy_react.pdf', 
  '3.5 MB', 
  ARRAY['React', 'JavaScript', 'Frontend']
),
(
  'ATS-Friendly Resume Templates', 
  'Resume Tips', 
  'Learn how to structure your resume to pass through Applicant Tracking Systems (ATS) with strong action verbs and metrics.', 
  'dummy_resume.pdf', 
  '5.0 MB', 
  ARRAY['ATS', 'Formatting', 'Templates']
),
(
  'Tech Industry Career Map', 
  'Career Guidance', 
  'An overview of various career paths in tech (Frontend, Backend, DevOps, Data Science) and how to navigate them as a fresher.', 
  'dummy_career.pdf', 
  '2.9 MB', 
  ARRAY['Roadmap', 'Jobs']
);
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
-- CareerLaunch Phase 11: Admin Student Management Setup
-- Run this script in your Supabase SQL Editor

-- 1. Alter profiles table to add missing fields for student management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mobile_number text,
ADD COLUMN IF NOT EXISTS college_name text,
ADD COLUMN IF NOT EXISTS degree text,
ADD COLUMN IF NOT EXISTS branch text,
ADD COLUMN IF NOT EXISTS passing_year text,
ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS preferred_job_role text,
ADD COLUMN IF NOT EXISTS preferred_location text;

-- 2. Update RLS policies to allow Admins to manage profiles

-- Drop any existing admin policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;

-- Create policy for Admin UPDATE
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- Create policy for Admin DELETE
CREATE POLICY "Admins can delete all profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- Note: We do not need a SELECT policy for Admins because "Public profiles are viewable by everyone" 
-- already grants read access to all rows.

-- 3. Populate dummy data for existing dummy students if necessary
UPDATE public.profiles
SET 
  college_name = 'Dummy College of Engineering',
  degree = 'B.Tech',
  passing_year = '2024',
  preferred_job_role = 'Software Developer'
WHERE role = 'student' AND college_name IS NULL;
-- CareerLaunch Phase 12: Admin Job Management Setup
-- Run this script in your Supabase SQL Editor

-- 1. Alter jobs table to add missing fields for admin management
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
ADD COLUMN IF NOT EXISTS application_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Update existing jobs to have Active status
UPDATE public.jobs SET status = 'Active' WHERE status IS NULL;

-- 2. Update RLS policies to allow Admins to manage jobs and restrict students to Active jobs

-- Drop the old public read policy
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.jobs;

-- Create policy for Students to view ONLY Active jobs
CREATE POLICY "Students can view active jobs"
  ON public.jobs FOR SELECT
  USING (
    status = 'Active' 
    OR 
    (auth.uid() IS NOT NULL AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  );

-- Create policy for Admins to view ALL jobs (handled above, but we can be explicit if needed)
-- The above policy handles both: if Active, anyone sees it. If not active, only admin sees it.

-- Create policies for Admin INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Admins can insert jobs" ON public.jobs;
CREATE POLICY "Admins can insert jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
CREATE POLICY "Admins can update jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
CREATE POLICY "Admins can delete jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- 3. Trigger for updated_at (Optional but good practice)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_jobs_modtime ON public.jobs;
CREATE TRIGGER update_jobs_modtime
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
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
-- CareerLaunch Phase 14: Admin Notes Management Setup
-- Run this script in your Supabase SQL Editor

-- 1. Alter notes table to add missing fields for admin management
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
ADD COLUMN IF NOT EXISTS technology text;

-- Update existing notes to have Active status
UPDATE public.notes SET status = 'Active' WHERE status IS NULL;

-- 2. Update RLS policies to allow Admins to manage notes and restrict students to Active notes

-- Drop the old public read policy for tables
DROP POLICY IF EXISTS "Notes are viewable by everyone" ON public.notes;

-- Create policy for Students to view ONLY Active notes
CREATE POLICY "Students can view active notes"
  ON public.notes FOR SELECT
  USING (
    status = 'Active' 
    OR 
    (auth.uid() IS NOT NULL AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  );

-- Create policies for Admin INSERT, UPDATE, DELETE on notes
DROP POLICY IF EXISTS "Admins can insert notes" ON public.notes;
CREATE POLICY "Admins can insert notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can update notes" ON public.notes;
CREATE POLICY "Admins can update notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can delete notes" ON public.notes;
CREATE POLICY "Admins can delete notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- 3. Update RLS for Storage Bucket (notes)
-- Drop old public read policy just in case
DROP POLICY IF EXISTS "Allow authenticated read access for notes" ON storage.objects;

-- Recreate policy for SELECT (anyone can read for now, or just authenticated)
CREATE POLICY "Allow authenticated read access for notes" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'notes');

-- Create policies for Admins to INSERT, UPDATE, DELETE objects in 'notes' bucket
DROP POLICY IF EXISTS "Admins can insert objects in notes bucket" ON storage.objects;
CREATE POLICY "Admins can insert objects in notes bucket" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (
    bucket_id = 'notes' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update objects in notes bucket" ON storage.objects;
CREATE POLICY "Admins can update objects in notes bucket" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING (
    bucket_id = 'notes' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete objects in notes bucket" ON storage.objects;
CREATE POLICY "Admins can delete objects in notes bucket" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING (
    bucket_id = 'notes' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column_notes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notes_modtime ON public.notes;
CREATE TRIGGER update_notes_modtime
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE PROCEDURE update_modified_column_notes();
-- CareerLaunch Phase 15: Admin Subscription Management Setup
-- Run this script in your Supabase SQL Editor

-- 1. Alter subscriptions table to add updated_at
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 2. Update RLS policies to allow Admins to manage subscriptions

-- Create policies for Admin SELECT, UPDATE, DELETE on subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can delete subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can delete subscriptions"
  ON public.subscriptions FOR DELETE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_subscriptions_modtime ON public.subscriptions;
CREATE TRIGGER update_subscriptions_modtime
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE PROCEDURE update_modified_column_subscriptions();
-- CareerLaunch MVP: Critical RLS Security Fix for Profiles
-- Run this script in your Supabase SQL Editor

-- 1. Drop the insecure public profiles policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

-- 2. Create the secure SELECT policy for Profiles
-- Students can only view their own profile (auth.uid() = user_id)
-- Admins can view all profiles
CREATE POLICY "Users can view their own profile or admins can view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 3. Verify the UPDATE policy (already secure, but reinforcing just in case)
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile or admins can update all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Verify the DELETE policy (typically handled by auth.users cascade, but adding for completeness)
DROP POLICY IF EXISTS "Users can delete own profile." ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ==========================================
-- SQL VERIFICATION QUERIES (For DB Admin Testing)
-- ==========================================
/*
-- 1. Test: Student A reading their own profile (Should Return 1 Row)
SELECT * FROM public.profiles WHERE user_id = auth.uid();

-- 2. Test: Student A trying to read Student B's profile (Should Return 0 Rows due to RLS)
-- (Assuming 'student_b_uuid' is the ID of another student)
SELECT * FROM public.profiles WHERE user_id = 'student_b_uuid';

-- 3. Test: Student A trying to update Student B's profile (Should Fail/Return 0 Rows affected)
UPDATE public.profiles SET full_name = 'Hacked' WHERE user_id = 'student_b_uuid';

-- 4. Test: Student A trying to delete Student B's profile (Should Fail)
DELETE FROM public.profiles WHERE user_id = 'student_b_uuid';

-- 5. Test: Admin reading all profiles (Should Return All Rows)
-- (Run this while authenticated as an Admin)
SELECT * FROM public.profiles;
*/
