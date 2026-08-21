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

-- Ensure ALL profile columns exist (including legacy user_id and all Admin Students fields)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_role TEXT,
ADD COLUMN IF NOT EXISTS target_role TEXT,
ADD COLUMN IF NOT EXISTS college_name TEXT,
ADD COLUMN IF NOT EXISTS degree TEXT,
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS passing_year TEXT,
ADD COLUMN IF NOT EXISTS preferred_location TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS resume_filename TEXT,
ADD COLUMN IF NOT EXISTS resume_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill user_id where it is NULL (legacy rows where user_id = id)
UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;

-- Add role check constraint if not already present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin'));
    END IF;
END $$;

-- ==============================================================================
-- HANDLE NEW USER TRIGGER (Safe, Idempotent, Isolated)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Always default to 'student' — never trust client-supplied 'admin' role
    v_role := 'student';

    INSERT INTO public.profiles (id, user_id, email, full_name, role, is_active)
    VALUES (
        new.id,
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        v_role,
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET
        user_id   = EXCLUDED.user_id,
        email     = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        is_active = COALESCE(profiles.is_active, true);

    -- Auto-create exactly ONE Free tier subscription (safe — uses ON CONFLICT (student_id) DO NOTHING)
    BEGIN
        INSERT INTO public.subscriptions (student_id, plan, status)
        VALUES (new.id, 'free', 'active')
        ON CONFLICT (student_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not create subscription for new user %: %', new.id, SQLERRM;
    END;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql;

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

-- Enforce ONE subscription per student
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_subscriptions_student_id') THEN
        ALTER TABLE public.subscriptions
        ADD CONSTRAINT uq_subscriptions_student_id UNIQUE (student_id);
    END IF;
END $$;

-- Drop old check constraints and support case-insensitive plans & statuses
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check 
CHECK (LOWER(plan) IN ('free', 'starter', 'pro', 'premium'));

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
CHECK (LOWER(status) IN ('active', 'expired', 'cancelled', 'past_due', 'inactive'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_student_unique ON public.subscriptions(student_id);

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
ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Software Development',
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS full_description TEXT,
ADD COLUMN IF NOT EXISTS responsibilities TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT 'Fresher',
ADD COLUMN IF NOT EXISTS salary TEXT,
ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'Remote',
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-time',
ADD COLUMN IF NOT EXISTS apply_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS minimum_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'Free',
ADD COLUMN IF NOT EXISTS import_batch_id UUID,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS public.job_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage job imports" ON public.job_imports;
CREATE POLICY "Admins manage job imports" ON public.job_imports FOR ALL USING (public.is_admin());

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

-- ==============================================================================
-- 5. JOBS, NOTES & INTERVIEW PREPARATION TABLES
-- ==============================================================================
-- NOTE: interview_questions full schema is defined in Section 14 below.
-- The complete table definition (with category_id, title, answer, difficulty, etc.)
-- is authoritative. The ADD COLUMN IF NOT EXISTS below ensures backward compatibility
-- for databases where a legacy minimal table already existed.
ALTER TABLE public.interview_questions
ADD COLUMN IF NOT EXISTS answer TEXT,
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'technical',
ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS minimum_plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS tips TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


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

-- Platform Settings (Admin Controlled Theme & System Flags)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    theme_feature_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS theme_feature_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

INSERT INTO public.platform_settings (id, theme_feature_enabled)
VALUES ('global', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: checks admin role WITHOUT triggering RLS (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- Profiles Policies — SECURE, no infinite recursion
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Students see only their own profile; admins see all (using SECURITY DEFINER fn — no recursion)
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

-- Users can insert only their own profile row
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Students update own profile only; role must stay 'student'
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = 'student');

-- Admins can do everything on profiles (uses SECURITY DEFINER fn — no recursion)
CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (public.is_admin());

-- Subscriptions Policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL USING (public.is_admin());


-- Store & Cart Policies
DROP POLICY IF EXISTS "Anyone can view active products" ON public.store_products;
CREATE POLICY "Anyone can view active products" ON public.store_products FOR SELECT USING (COALESCE(is_active, true) = true);

DROP POLICY IF EXISTS "Admins manage products" ON public.store_products;
CREATE POLICY "Admins manage products" ON public.store_products FOR ALL USING (public.is_admin());


DROP POLICY IF EXISTS "Users manage own cart" ON public.cart_items;
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = student_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own orders" ON public.orders;
CREATE POLICY "Users insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.student_id = auth.uid()) OR public.is_admin()
);

DROP POLICY IF EXISTS "Users insert own order items" ON public.order_items;
CREATE POLICY "Users insert own order items" ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.student_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins manage order items" ON public.order_items;
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users view own purchases" ON public.student_purchases;
CREATE POLICY "Users view own purchases" ON public.student_purchases FOR SELECT USING (auth.uid() = student_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own purchases" ON public.student_purchases;
CREATE POLICY "Users insert own purchases" ON public.student_purchases FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users update own purchases" ON public.student_purchases;
CREATE POLICY "Users update own purchases" ON public.student_purchases FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins manage purchases" ON public.student_purchases;
CREATE POLICY "Admins manage purchases" ON public.student_purchases FOR ALL USING (public.is_admin());

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
CREATE POLICY "Admins view all mock sessions" ON public.mock_interview_sessions FOR ALL USING (public.is_admin());


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
CREATE POLICY "Admins view all progress snapshots" ON public.career_progress_snapshots FOR SELECT USING (public.is_admin());


-- Platform Settings Policies
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Admins can update platform settings" ON public.platform_settings FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert platform settings" ON public.platform_settings;
CREATE POLICY "Admins can insert platform settings" ON public.platform_settings FOR INSERT WITH CHECK (public.is_admin());

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

-- Resume Storage Policies (all 4 operations — CRUD)
DROP POLICY IF EXISTS "Students can upload their own resume" ON storage.objects;
CREATE POLICY "Students can upload their own resume"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Students can view their own resume" ON storage.objects;
CREATE POLICY "Students can view their own resume"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Students can update their own resume" ON storage.objects;
CREATE POLICY "Students can update their own resume"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Students can delete their own resume" ON storage.objects;
CREATE POLICY "Students can delete their own resume"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ==============================================================================
-- 12. PERMISSIONS & GRANTS
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- 13. REPAIR: BACKFILL PROFILES FOR EXISTING AUTH USERS WITHOUT PROFILES
-- Safe to run multiple times — uses ON CONFLICT DO NOTHING
-- ==============================================================================
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.id = au.id
        WHERE p.id IS NULL
    LOOP
        INSERT INTO public.profiles (id, user_id, email, full_name, role, is_active)
        VALUES (
            u.id,
            u.id,
            u.email,
            COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
            'student',
            true
        )
        ON CONFLICT (id) DO NOTHING;

        -- Also ensure a free subscription record exists
        INSERT INTO public.subscriptions (student_id, plan, status)
        VALUES (u.id, 'free', 'active')
        ON CONFLICT (student_id) DO NOTHING;

        RAISE NOTICE 'Backfilled profile for user: %', u.email;
    END LOOP;
END $$;

-- ==============================================================================
-- 14. INTERVIEW PREPARATION & BULK IMPORT AUDIT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.interview_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.interview_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    answer TEXT NOT NULL,
    tips TEXT,
    common_mistakes TEXT,
    difficulty TEXT NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    estimated_time TEXT NOT NULL DEFAULT '5 mins',
    company_tags TEXT[] DEFAULT '{}'::TEXT[],
    technology_tags TEXT[] DEFAULT '{}'::TEXT[],
    tags TEXT[] DEFAULT '{}'::TEXT[],
    status TEXT NOT NULL DEFAULT 'Active',
    minimum_plan TEXT NOT NULL DEFAULT 'free',
    access_type TEXT NOT NULL DEFAULT 'Free',
    import_batch_id UUID,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_questions_category ON public.interview_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_batch ON public.interview_questions(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_title ON public.interview_questions(title);

CREATE TABLE IF NOT EXISTS public.student_question_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.interview_question_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_question_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_question_imports ENABLE ROW LEVEL SECURITY;

-- Read policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.interview_categories;
CREATE POLICY "Categories are viewable by everyone" ON public.interview_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.interview_questions;
CREATE POLICY "Questions are viewable by everyone" ON public.interview_questions FOR SELECT USING (true);

-- Admin mutation policies
DROP POLICY IF EXISTS "Admins manage categories" ON public.interview_categories;
CREATE POLICY "Admins manage categories" ON public.interview_categories FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage questions" ON public.interview_questions;
CREATE POLICY "Admins manage questions" ON public.interview_questions FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage imports" ON public.interview_question_imports;
CREATE POLICY "Admins manage imports" ON public.interview_question_imports FOR ALL USING (public.is_admin());

-- Student progress policies
DROP POLICY IF EXISTS "Students manage their own progress" ON public.student_question_progress;
CREATE POLICY "Students manage their own progress" ON public.student_question_progress
FOR ALL TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

