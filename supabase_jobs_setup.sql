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
