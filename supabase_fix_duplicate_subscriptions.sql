-- ==============================================================================
-- GRADZENX FIX DUPLICATE SUBSCRIPTIONS & ENFORCE 1-TO-1 SUBSCRIPTION INTEGRITY
-- ==============================================================================
-- Run this script in your Supabase SQL Editor.
-- It safely:
-- 1. Creates a backup table for duplicates (zero data loss)
-- 2. Identifies and cleans existing duplicate subscriptions based on retention priority:
--    - Keeps ACTIVE paid subscriptions (Premium > Pro > Starter) over Free
--    - Keeps latest end_date / most recently updated record
-- 3. Deletes duplicate records
-- 4. Enforces UNIQUE(student_id) constraint & index on public.subscriptions
-- 5. Updates handle_new_user() trigger with ON CONFLICT (student_id) DO NOTHING
-- ==============================================================================

-- 1. CREATE BACKUP TABLE FOR DUPLICATES
CREATE TABLE IF NOT EXISTS public.subscriptions_duplicate_backup (
    backup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_subscription_id UUID NOT NULL,
    student_id UUID NOT NULL,
    plan TEXT,
    status TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. DEDUPLICATION PROCEDURE
DO $$
DECLARE
    duplicate_count INTEGER;
    cleaned_count INTEGER := 0;
    has_sub_col BOOLEAN := FALSE;
BEGIN
    -- Check how many students have duplicate subscription rows
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT student_id, COUNT(*)
        FROM public.subscriptions
        GROUP BY student_id
        HAVING COUNT(*) > 1
    ) dupes;

    RAISE NOTICE 'Found % students with duplicate subscription records.', duplicate_count;

    -- Backup duplicates before deletion
    WITH ranked_subscriptions AS (
        SELECT 
            s.id,
            s.student_id,
            s.plan,
            s.status,
            s.start_date,
            s.end_date,
            s.current_period_start,
            s.current_period_end,
            s.created_at,
            s.updated_at,
            ROW_NUMBER() OVER (
                PARTITION BY s.student_id
                ORDER BY 
                    -- Priority 1: Active status first
                    CASE WHEN LOWER(COALESCE(s.status, 'active')) = 'active' THEN 1 ELSE 2 END ASC,
                    -- Priority 2: Highest plan tier first (Premium > Pro > Starter > Free)
                    CASE LOWER(COALESCE(s.plan, 'free'))
                        WHEN 'premium' THEN 4
                        WHEN 'pro'     THEN 3
                        WHEN 'starter' THEN 2
                        ELSE 1
                    END DESC,
                    -- Priority 3: Latest end_date for paid subscriptions
                    s.end_date DESC NULLS LAST,
                    -- Priority 4: Most recently updated / created
                    s.updated_at DESC NULLS LAST,
                    s.created_at DESC NULLS LAST
            ) AS rank_num
        FROM public.subscriptions s
    )
    INSERT INTO public.subscriptions_duplicate_backup (
        original_subscription_id, student_id, plan, status, start_date, end_date,
        current_period_start, current_period_end, created_at, updated_at
    )
    SELECT id, student_id, plan, status, start_date, end_date, current_period_start, current_period_end, created_at, updated_at
    FROM ranked_subscriptions
    WHERE rank_num > 1;

    -- Optional: If mock_interview_sessions table has subscription_id column, re-link them dynamically
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'mock_interview_sessions' 
          AND column_name = 'subscription_id'
    ) INTO has_sub_col;

    IF has_sub_col THEN
        EXECUTE '
            WITH ranked_subscriptions AS (
                SELECT 
                    s.id, s.student_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY s.student_id
                        ORDER BY 
                            CASE WHEN LOWER(COALESCE(s.status, ''active'')) = ''active'' THEN 1 ELSE 2 END ASC,
                            CASE LOWER(COALESCE(s.plan, ''free''))
                                WHEN ''premium'' THEN 4
                                WHEN ''pro''     THEN 3
                                WHEN ''starter'' THEN 2
                                ELSE 1
                            END DESC,
                            s.end_date DESC NULLS LAST,
                            s.updated_at DESC NULLS LAST,
                            s.created_at DESC NULLS LAST
                    ) AS rank_num,
                    FIRST_VALUE(s.id) OVER (
                        PARTITION BY s.student_id
                        ORDER BY 
                            CASE WHEN LOWER(COALESCE(s.status, ''active'')) = ''active'' THEN 1 ELSE 2 END ASC,
                            CASE LOWER(COALESCE(s.plan, ''free''))
                                WHEN ''premium'' THEN 4
                                WHEN ''pro''     THEN 3
                                WHEN ''starter'' THEN 2
                                ELSE 1
                            END DESC,
                            s.end_date DESC NULLS LAST,
                            s.updated_at DESC NULLS LAST,
                            s.created_at DESC NULLS LAST
                    ) AS canonical_id
                FROM public.subscriptions s
            )
            UPDATE public.mock_interview_sessions mis
            SET subscription_id = rs.canonical_id
            FROM ranked_subscriptions rs
            WHERE mis.subscription_id = rs.id
              AND rs.rank_num > 1;
        ';
    END IF;

    -- Delete the duplicate rows (rank_num > 1)
    WITH ranked_subscriptions AS (
        SELECT 
            s.id,
            ROW_NUMBER() OVER (
                PARTITION BY s.student_id
                ORDER BY 
                    CASE WHEN LOWER(COALESCE(s.status, 'active')) = 'active' THEN 1 ELSE 2 END ASC,
                    CASE LOWER(COALESCE(s.plan, 'free'))
                        WHEN 'premium' THEN 4
                        WHEN 'pro'     THEN 3
                        WHEN 'starter' THEN 2
                        ELSE 1
                    END DESC,
                    s.end_date DESC NULLS LAST,
                    s.updated_at DESC NULLS LAST,
                    s.created_at DESC NULLS LAST
            ) AS rank_num
        FROM public.subscriptions s
    )
    DELETE FROM public.subscriptions
    WHERE id IN (
        SELECT id FROM ranked_subscriptions WHERE rank_num > 1
    );

    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RAISE NOTICE 'Successfully removed % duplicate subscription records.', cleaned_count;
END $$;

-- 3. ENFORCE UNIQUE(student_id) CONSTRAINT & INDEX
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS uq_subscriptions_student_id;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_student_id_key;
DROP INDEX IF EXISTS idx_subscriptions_student_unique;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT uq_subscriptions_student_id UNIQUE (student_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_student_unique 
ON public.subscriptions(student_id);

-- 4. UPDATE handle_new_user TRIGGER WITH ON CONFLICT (student_id) DO NOTHING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Default to student
    v_role := 'student';

    -- Upsert Profile
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

    -- Auto-create exactly ONE Free subscription per student
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

-- 5. RE-APPLY TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. VERIFICATION: Count duplicate subscriptions (should return 0 rows)
SELECT student_id, COUNT(*) AS subscription_count
FROM public.subscriptions
GROUP BY student_id
HAVING COUNT(*) > 1;
