-- ==============================================================================
-- KNOWLEDGEPAAT — CONTACT & SUPPORT MONITORING SYSTEM SETUP
-- Migration DDL for unified contact and support inquiries table with RLS
-- ==============================================================================

-- 1. Create Contact Inquiries Table
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Source Classification
    source_type TEXT NOT NULL CHECK (source_type IN ('external', 'student')),
    
    -- Status & Triage
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category TEXT NOT NULL DEFAULT 'Other',
    
    -- Inquiry Content
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Sender Details
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NULL,
    
    -- Authenticated Student Association (Optional, set for student inquiries)
    student_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    subscription_plan TEXT NULL,
    
    -- Human-friendly Unique Reference Code (e.g. KP-2026-000123)
    reference_code TEXT NOT NULL UNIQUE,
    
    -- Administrative Management (Internal Only, strictly hidden from students)
    admin_notes TEXT NULL,
    assigned_admin_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ NULL,
    last_contacted_at TIMESTAMPTZ NULL,

    -- Safe Soft-Delete Support
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Idempotent column additions if table already existed prior to migration
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE public.contact_inquiries ADD COLUMN IF NOT EXISTS deleted_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Performance & Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON public.contact_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_source_type ON public.contact_inquiries (source_type);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON public.contact_inquiries (status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_priority ON public.contact_inquiries (priority);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_student_id ON public.contact_inquiries (student_id);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON public.contact_inquiries (email);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_deleted_at ON public.contact_inquiries (deleted_at);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_source_created ON public.contact_inquiries (source_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status_created ON public.contact_inquiries (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_inquiries_ref_code ON public.contact_inquiries (reference_code);

-- 3. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION public.set_contact_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contact_inquiries_updated_at ON public.contact_inquiries;
CREATE TRIGGER trigger_contact_inquiries_updated_at
    BEFORE UPDATE ON public.contact_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_contact_inquiries_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- 5. Secure RLS Policies

-- A. INSERT Policy:
-- Anonymous users can submit external inquiries (student_id MUST be null).
-- Authenticated students can submit student inquiries (student_id MUST match auth.uid()).
DROP POLICY IF EXISTS "Allow insertion of contact inquiries" ON public.contact_inquiries;
CREATE POLICY "Allow insertion of contact inquiries"
    ON public.contact_inquiries
    FOR INSERT
    WITH CHECK (
        (source_type = 'external' AND student_id IS NULL)
        OR
        (source_type = 'student' AND student_id = auth.uid())
    );

-- B. SELECT Policy:
-- Authenticated students can only read their own student inquiries.
-- Administrators can view all inquiries (both external and student).
-- External anonymous users CANNOT select any inquiries.
DROP POLICY IF EXISTS "Students view own inquiries, admins view all" ON public.contact_inquiries;
CREATE POLICY "Students view own inquiries, admins view all"
    ON public.contact_inquiries
    FOR SELECT
    USING (
        (source_type = 'student' AND student_id = auth.uid())
        OR
        public.is_admin()
    );

-- C. UPDATE Policy:
-- Administrators only. Students cannot mutate inquiry state, priority, or admin notes.
DROP POLICY IF EXISTS "Admins update contact inquiries" ON public.contact_inquiries;
CREATE POLICY "Admins update contact inquiries"
    ON public.contact_inquiries
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- D. DELETE Policy:
-- Administrators only (for audit/retention safety).
DROP POLICY IF EXISTS "Admins delete contact inquiries" ON public.contact_inquiries;
CREATE POLICY "Admins delete contact inquiries"
    ON public.contact_inquiries
    FOR DELETE
    USING (public.is_admin());

-- Comments
COMMENT ON TABLE public.contact_inquiries IS 'Unified KnowledgePaat support and inquiry management storage for external visitors and registered students.';
COMMENT ON COLUMN public.contact_inquiries.reference_code IS 'Human-friendly unique reference code presented to user upon submission.';
COMMENT ON COLUMN public.contact_inquiries.admin_notes IS 'Internal administrative triage notes, strictly restricted from student visibility.';
