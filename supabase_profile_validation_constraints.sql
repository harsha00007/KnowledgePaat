-- ============================================================================
-- KnowledgePaat: Safe Profile Columns & Validation Constraints Migration
-- Description: Handles text/integer types safely and enforces validation bounds
-- ============================================================================

-- 1. Safely add all Student Profile columns if they don't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS dob TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS college_name TEXT,
  ADD COLUMN IF NOT EXISTS degree TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS passing_year TEXT,
  ADD COLUMN IF NOT EXISTS cgpa TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_role TEXT,
  ADD COLUMN IF NOT EXISTS preferred_location TEXT,
  ADD COLUMN IF NOT EXISTS expected_salary TEXT,
  ADD COLUMN IF NOT EXISTS work_mode TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Safely add validation check constraints (supports both TEXT and NUMERIC/INTEGER column types)
DO $$
BEGIN
  -- Drop older constraints if they exist to allow clean creation
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cgpa_range_check;
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_passing_year_range_check;

  -- Constraint for CGPA (between 0 and 100)
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_cgpa_range_check
    CHECK (
      cgpa IS NULL 
      OR cgpa = '' 
      OR (
        cgpa::text ~ '^[0-9]+(\.[0-9]+)?$' 
        AND (cgpa::text)::numeric >= 0 
        AND (cgpa::text)::numeric <= 100
      )
    );

  -- Constraint for Passing Year (between 1950 and 2100)
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_passing_year_range_check
    CHECK (
      passing_year IS NULL 
      OR passing_year = '' 
      OR (
        passing_year::text ~ '^[0-9]+$' 
        AND (passing_year::text)::integer >= 1950 
        AND (passing_year::text)::integer <= 2100
      )
    );
END $$;
