-- ==============================================================================
-- GRADZENX COMPLETE MASTER SUPABASE DATABASE SETUP (FAIL-SAFE & IDEMPOTENT)
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor.
-- It safely creates or updates all tables, columns, indexes, functions, triggers,
-- storage buckets, and Row Level Security (RLS) policies.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. USER PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL
);

-- Ensure all profile columns exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student',
ADD COLUMN IF NOT EXISTS preferred_role TEXT,
ADD COLUMN IF NOT EXISTS target_role TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS resume_filename TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Auth Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'student')
    )
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. SUBSCRIPTIONS TABLE (MULTI-TIER: FREE, STARTER, PRO, PREMIUM)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Drop old check constraints and support case-insensitive plans & statuses
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check 
CHECK (LOWER(plan) IN ('free', 'starter', 'pro', 'premium'));

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
CHECK (LOWER(status) IN ('active', 'expired', 'cancelled', 'past_due', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_student ON public.subscriptions(student_id, status);

-- ==============================================================================
-- 4. DIGITAL STORE, CART, ORDERS & CONTENT PURCHASES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL
);

ALTER TABLE public.store_products
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS price NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price NUMERIC,
ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'notes',
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS order_status TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid',
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'simulated',
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
    price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE
);

ALTER TABLE public.student_purchases
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure unique constraint exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_purchases_product') THEN
        ALTER TABLE public.student_purchases 
        ADD CONSTRAINT uq_student_purchases_product UNIQUE(student_id, product_id);
    END IF;
END $$;

-- ==============================================================================
-- 5. JOBS, NOTES & INTERVIEW PREPARATION TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    location TEXT NOT NULL
);

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS employment_type TEXT NOT NULL DEFAULT 'Full-time',
ADD COLUMN IF NOT EXISTS salary_range TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS requirements TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS minimum_plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS apply_url TEXT,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL
);

ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General',
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS minimum_plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL
);

ALTER TABLE public.interview_questions
ADD COLUMN IF NOT EXISTS answer TEXT,
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'technical',
ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS minimum_plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS tips TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ==============================================================================
-- 6. MOCK INTERVIEWS & ADAPTIVE AI ENGINE TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mock_interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.mock_interview_sessions
ADD COLUMN IF NOT EXISTS interview_type TEXT NOT NULL DEFAULT 'technical',
ADD COLUMN IF NOT EXISTS interview_mode TEXT NOT NULL DEFAULT 'ai',
ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'Software Engineer',
ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'Fresher',
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS current_difficulty TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS highest_difficulty_reached TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS interview_momentum TEXT DEFAULT 'stable',
ADD COLUMN IF NOT EXISTS adaptive_context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS topic_performance JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS question_strategy TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS total_questions INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS answered_questions INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_score NUMERIC,
ADD COLUMN IF NOT EXISTS communication_score NUMERIC,
ADD COLUMN IF NOT EXISTS technical_score NUMERIC,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC,
ADD COLUMN IF NOT EXISTS ai_strengths TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS ai_improvements TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS ai_recommendations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_overall_feedback TEXT,
ADD COLUMN IF NOT EXISTS feedback TEXT,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.mock_interview_session_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_number INTEGER NOT NULL
);

ALTER TABLE public.mock_interview_session_questions
ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.interview_questions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.mock_interview_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL
);

ALTER TABLE public.mock_interview_answers
ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.interview_questions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS answer_text TEXT,
ADD COLUMN IF NOT EXISTS answer_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'new_topic',
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS momentum_at_submission TEXT,
ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS transcription_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS original_transcript TEXT,
ADD COLUMN IF NOT EXISTS edited_transcript TEXT,
ADD COLUMN IF NOT EXISTS audio_storage_path TEXT,
ADD COLUMN IF NOT EXISTS overall_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_level TEXT DEFAULT 'Good',
ADD COLUMN IF NOT EXISTS relevance_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS technical_accuracy_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS communication_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS clarity_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS answer_structure_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS strengths TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS improvements TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS missing_concepts TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS better_answer TEXT,
ADD COLUMN IF NOT EXISTS interview_tip TEXT,
ADD COLUMN IF NOT EXISTS evaluation_summary TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.mock_interview_ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.mock_interview_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    message TEXT NOT NULL
);

ALTER TABLE public.mock_interview_ai_messages
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Indexes for fast mock interview querying
CREATE INDEX IF NOT EXISTS idx_sessions_student ON public.mock_interview_sessions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_momentum ON public.mock_interview_sessions(interview_momentum);
CREATE INDEX IF NOT EXISTS idx_answers_session ON public.mock_interview_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_topic ON public.mock_interview_answers(topic);
CREATE INDEX IF NOT EXISTS idx_messages_session ON public.mock_interview_ai_messages(session_id, created_at ASC);

-- ==============================================================================
-- 7. PHASE G4.3.5: AI CAREER INTELLIGENCE & IMPROVEMENT PLANS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.career_improvement_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.career_improvement_plans
ADD COLUMN IF NOT EXISTS plan_duration INTEGER NOT NULL DEFAULT 7,
ADD COLUMN IF NOT EXISTS career_readiness_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_strength NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS technical_skills_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS interview_performance_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS communication_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS consistency_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_completeness NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS confidence_level TEXT NOT NULL DEFAULT 'low',
ADD COLUMN IF NOT EXISTS target_role TEXT,
ADD COLUMN IF NOT EXISTS strengths JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS weaknesses JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skill_gaps JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_insight JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS plan_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.career_plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.career_improvement_plans(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL
);

ALTER TABLE public.career_plan_tasks
ADD COLUMN IF NOT EXISTS day_number INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'technical',
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS related_skill TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS resource_id TEXT,
ADD COLUMN IF NOT EXISTS resource_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_career_plans_student ON public.career_improvement_plans(student_id, status);
CREATE INDEX IF NOT EXISTS idx_career_tasks_plan ON public.career_plan_tasks(plan_id, day_number);

-- ==============================================================================
-- 8. PHASE G4.3.6: CAREER PROGRESS DAILY SNAPSHOTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.career_progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.career_progress_snapshots
ADD COLUMN IF NOT EXISTS career_readiness_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS resume_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS interview_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS practice_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS skill_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_score NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add unique constraint if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_snapshot_date'
    ) THEN
        ALTER TABLE public.career_progress_snapshots 
        ADD CONSTRAINT uq_student_snapshot_date UNIQUE(student_id, snapshot_date);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_date 
ON public.career_progress_snapshots(student_id, snapshot_date ASC);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interview_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interview_ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_improvement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subscriptions Policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Store & Cart Policies
DROP POLICY IF EXISTS "Anyone can view active products" ON public.store_products;
CREATE POLICY "Anyone can view active products" ON public.store_products FOR SELECT USING (COALESCE(is_active, true) = true);

DROP POLICY IF EXISTS "Admins manage products" ON public.store_products;
CREATE POLICY "Admins manage products" ON public.store_products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "Users manage own cart" ON public.cart_items;
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users insert own orders" ON public.orders;
CREATE POLICY "Users insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users view own purchases" ON public.student_purchases;
CREATE POLICY "Users view own purchases" ON public.student_purchases FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users insert own purchases" ON public.student_purchases;
CREATE POLICY "Users insert own purchases" ON public.student_purchases FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Jobs, Notes, Questions
DROP POLICY IF EXISTS "Anyone can view jobs" ON public.jobs;
CREATE POLICY "Anyone can view jobs" ON public.jobs FOR SELECT USING (COALESCE(is_active, true) = true);

DROP POLICY IF EXISTS "Anyone can view notes" ON public.notes;
CREATE POLICY "Anyone can view notes" ON public.notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view questions" ON public.interview_questions;
CREATE POLICY "Anyone can view questions" ON public.interview_questions FOR SELECT USING (true);

-- Mock Interviews Policies
DROP POLICY IF EXISTS "Students view own sessions" ON public.mock_interview_sessions;
CREATE POLICY "Students view own sessions" ON public.mock_interview_sessions FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students insert own sessions" ON public.mock_interview_sessions;
CREATE POLICY "Students insert own sessions" ON public.mock_interview_sessions FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students update own sessions" ON public.mock_interview_sessions;
CREATE POLICY "Students update own sessions" ON public.mock_interview_sessions FOR UPDATE USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins view all mock sessions" ON public.mock_interview_sessions;
CREATE POLICY "Admins view all mock sessions" ON public.mock_interview_sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "Students view own answers" ON public.mock_interview_answers;
CREATE POLICY "Students view own answers" ON public.mock_interview_answers FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mock_interview_sessions s WHERE s.id = mock_interview_answers.session_id AND s.student_id = auth.uid())
);

DROP POLICY IF EXISTS "Students insert own answers" ON public.mock_interview_answers;
CREATE POLICY "Students insert own answers" ON public.mock_interview_answers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.mock_interview_sessions s WHERE s.id = mock_interview_answers.session_id AND s.student_id = auth.uid())
);

DROP POLICY IF EXISTS "Students view own messages" ON public.mock_interview_ai_messages;
CREATE POLICY "Students view own messages" ON public.mock_interview_ai_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mock_interview_sessions s WHERE s.id = mock_interview_ai_messages.session_id AND s.student_id = auth.uid())
);

DROP POLICY IF EXISTS "Students insert own messages" ON public.mock_interview_ai_messages;
CREATE POLICY "Students insert own messages" ON public.mock_interview_ai_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.mock_interview_sessions s WHERE s.id = mock_interview_ai_messages.session_id AND s.student_id = auth.uid())
);

-- Career Intelligence & Progress Policies
DROP POLICY IF EXISTS "Students view own career plans" ON public.career_improvement_plans;
CREATE POLICY "Students view own career plans" ON public.career_improvement_plans FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students manage own career plans" ON public.career_improvement_plans;
CREATE POLICY "Students manage own career plans" ON public.career_improvement_plans FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students manage own career tasks" ON public.career_plan_tasks;
CREATE POLICY "Students manage own career tasks" ON public.career_plan_tasks FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students manage own progress snapshots" ON public.career_progress_snapshots;
CREATE POLICY "Students manage own progress snapshots" ON public.career_progress_snapshots FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins view all progress snapshots" ON public.career_progress_snapshots;
CREATE POLICY "Admins view all progress snapshots" ON public.career_progress_snapshots FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ==============================================================================
-- 10. FOREIGN KEY RELATIONSHIPS FOR POSTGREST EMBEDDED JOINS
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mock_sessions_profile') THEN
        ALTER TABLE public.mock_interview_sessions 
        ADD CONSTRAINT fk_mock_sessions_profile 
        FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subscriptions_profile') THEN
        ALTER TABLE public.subscriptions 
        ADD CONSTRAINT fk_subscriptions_profile 
        FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_profile') THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT fk_orders_profile 
        FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ==============================================================================
-- 11. SUPABASE STORAGE BUCKETS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('resumes', 'resumes', false),
    ('notes_files', 'notes_files', false),
    ('product_files', 'product_files', false)
ON CONFLICT (id) DO NOTHING;

-- Resumes Storage Policies
DROP POLICY IF EXISTS "Students can upload their own resume" ON storage.objects;
CREATE POLICY "Students can upload their own resume"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Students can view their own resume" ON storage.objects;
CREATE POLICY "Students can view their own resume"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
