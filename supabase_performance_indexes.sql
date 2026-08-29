-- =====================================================================
-- KnowledgePaat: Production Database Performance & Indexing Migration
-- Phase 5: Targeted Composite & Full-Text Search Indexes
-- =====================================================================
-- This migration optimizes query execution across Jobs, Notes, Interview
-- Preparation, Student Progress, Subscriptions, Mock Interviews, and Profiles.
-- All statements are safe and idempotent (CREATE INDEX IF NOT EXISTS).
-- =====================================================================

-- 0. Enable pg_trgm extension for high-performance substring & fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- 1. JOBS TABLE OPTIMIZATIONS
-- =====================================================================

-- Optimizes: Student Job Browsing, Student Dashboard Recent Jobs, and Public Listings
-- Pattern: WHERE status = 'Active' ORDER BY posted_at DESC
CREATE INDEX IF NOT EXISTS idx_jobs_status_posted_at 
  ON public.jobs (status, posted_at DESC);

-- Optimizes: Category-specific filtering on student and public jobs pages
-- Pattern: WHERE category = $1 AND status = 'Active' ORDER BY posted_at DESC
CREATE INDEX IF NOT EXISTS idx_jobs_category_status_posted 
  ON public.jobs (category, status, posted_at DESC);

-- Optimizes: Work mode and experience level filter combinations
-- Pattern: WHERE work_mode = $1 / experience = $2 AND status = 'Active'
CREATE INDEX IF NOT EXISTS idx_jobs_work_mode_status 
  ON public.jobs (work_mode, status);

CREATE INDEX IF NOT EXISTS idx_jobs_experience_status 
  ON public.jobs (experience, status);

-- Optimizes: Full-text substring search across Job Title and Company Name
-- Pattern: WHERE title ILIKE '%term%' OR company_name ILIKE '%term%'
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm 
  ON public.jobs USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_company_trgm 
  ON public.jobs USING gin (company_name gin_trgm_ops);


-- =====================================================================
-- 2. STUDY NOTES TABLE OPTIMIZATIONS
-- =====================================================================

-- Optimizes: Study Notes directory default chronological sort and pagination
-- Pattern: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notes_created_at 
  ON public.notes (created_at DESC);

-- Optimizes: Category filter tabs on Study Notes browser
-- Pattern: WHERE category = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notes_category_created 
  ON public.notes (category, created_at DESC);

-- Optimizes: Access tier filtering (Free vs Premium note bundles)
-- Pattern: WHERE access_tier = $1 AND category = $2
CREATE INDEX IF NOT EXISTS idx_notes_access_tier_category 
  ON public.notes (access_tier, category);

-- Optimizes: Study Notes title search
-- Pattern: WHERE title ILIKE '%term%'
CREATE INDEX IF NOT EXISTS idx_notes_title_trgm 
  ON public.notes USING gin (title gin_trgm_ops);


-- =====================================================================
-- 3. INTERVIEW PREPARATION & QUESTIONS OPTIMIZATIONS
-- =====================================================================

-- Optimizes: Practice Question Bank and Assessment Test MCQ pool queries
-- Pattern: WHERE status = 'Active' AND question_type = ('mcq' | 'normal') ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_interview_questions_status_type_created 
  ON public.interview_questions (status, question_type, created_at DESC);

-- Optimizes: Category navigation and category join in interview preparation
-- Pattern: WHERE category_id = $1 AND question_type = $2 AND status = 'Active'
CREATE INDEX IF NOT EXISTS idx_interview_questions_category_type 
  ON public.interview_questions (category_id, question_type, status);

-- Optimizes: Adaptive Interview Engine difficulty lookups
-- Pattern: WHERE difficulty = ('Easy' | 'Medium' | 'Hard') AND status = 'Active'
CREATE INDEX IF NOT EXISTS idx_interview_questions_difficulty_status 
  ON public.interview_questions (difficulty, status);

-- Optimizes: Question title substring search
CREATE INDEX IF NOT EXISTS idx_interview_questions_title_trgm 
  ON public.interview_questions USING gin (title gin_trgm_ops);


-- =====================================================================
-- 4. STUDENT PROGRESS & ASSESSMENT HISTORY OPTIMIZATIONS
-- =====================================================================

-- Optimizes: Student question completion status resolution
-- Pattern: WHERE student_id = $1 AND completed = true
CREATE INDEX IF NOT EXISTS idx_student_question_progress_student_completed 
  ON public.student_question_progress (student_id, completed);

-- Optimizes: Timed assessment test history and analytics
-- Pattern: WHERE student_id = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_student_test_attempts_student_created 
  ON public.student_test_attempts (student_id, created_at DESC);


-- =====================================================================
-- 5. SUBSCRIPTIONS & ACCESS CONTROL OPTIMIZATIONS
-- =====================================================================

-- Optimizes: Critical subscription access resolution on every page load & API route
-- Pattern: WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1
CREATE INDEX IF NOT EXISTS idx_subscriptions_student_created 
  ON public.subscriptions (student_id, created_at DESC);

-- Optimizes: Admin dashboard active subscriber tallying and tier counts
-- Pattern: WHERE status IN ('active', 'Active')
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_plan 
  ON public.subscriptions (status, plan);


-- =====================================================================
-- 6. AI MOCK INTERVIEW SESSIONS OPTIMIZATIONS
-- =====================================================================

-- Optimizes: Student mock interview history list & billing period credit count
-- Pattern: WHERE student_id = $1 AND started_at >= $2 ORDER BY started_at DESC
CREATE INDEX IF NOT EXISTS idx_mock_sessions_student_started 
  ON public.mock_interview_sessions (student_id, started_at DESC);

-- Optimizes: Completed sessions aggregation for career readiness score
-- Pattern: WHERE student_id = $1 AND status = 'completed'
CREATE INDEX IF NOT EXISTS idx_mock_sessions_student_status 
  ON public.mock_interview_sessions (student_id, status);


-- =====================================================================
-- 7. CAREER INTELLIGENCE & ROADMAP OPTIMIZATIONS
-- =====================================================================

-- Optimizes: Career task progress queries
-- Pattern: WHERE student_id = $1 AND status = 'completed'
CREATE INDEX IF NOT EXISTS idx_career_plan_tasks_student_status 
  ON public.career_plan_tasks (student_id, status);

-- Optimizes: Active career roadmap lookup
-- Pattern: WHERE student_id = $1 AND status = 'active' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_career_plans_student_status 
  ON public.career_improvement_plans (student_id, status, created_at DESC);

-- Optimizes: Daily progress timeline snapshots
-- Pattern: WHERE student_id = $1 ORDER BY snapshot_date ASC
CREATE INDEX IF NOT EXISTS idx_career_snapshots_student_date 
  ON public.career_progress_snapshots (student_id, snapshot_date ASC);


-- =====================================================================
-- 8. BOOKMARKS & ADMIN USER PROFILES OPTIMIZATIONS
-- =====================================================================

-- Optimizes: Saved jobs lookup
CREATE INDEX IF NOT EXISTS idx_saved_jobs_student_id 
  ON public.saved_jobs (student_id);

-- Optimizes: Saved notes lookup
CREATE INDEX IF NOT EXISTS idx_saved_notes_student_id 
  ON public.saved_notes (student_id);

-- Optimizes: Admin Students list and role counts on Admin Dashboard
-- Pattern: WHERE role = 'student' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_profiles_role_created 
  ON public.profiles (role, created_at DESC);
