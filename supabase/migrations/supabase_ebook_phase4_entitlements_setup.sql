-- =============================================================================
-- KnowledgePaat — Phase 4: Customer Identity, Entitlements & Digital Library
-- Migration File: supabase_ebook_phase4_entitlements_setup.sql
-- Description: Creates public.ebook_entitlements and public.ebook_reading_progress
--              tables, performance indexes, and strict Row Level Security (RLS)
--              policies for customer ownership, reading, and historical retention.
-- Target Environment: Staging Supabase (lzuinimbsdxnhzmjpxmr)
-- =============================================================================

-- 1. Customer Entitlements Table (Authoritative Digital Ownership)
CREATE TABLE IF NOT EXISTS public.ebook_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE RESTRICT,
  edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE RESTRICT,
  plan TEXT NOT NULL CHECK (plan IN ('read_online', 'read_download')),
  can_read_online BOOLEAN NOT NULL DEFAULT TRUE,
  can_download_pdf BOOLEAN NOT NULL DEFAULT FALSE,
  order_id UUID, -- Will reference public.ebook_orders(id) once created in Phase 5
  grant_type TEXT NOT NULL DEFAULT 'purchase' CHECK (grant_type IN ('purchase', 'upgrade', 'complimentary', 'admin_override')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin ID for manual/complimentary grants
  grant_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_customer_edition_access UNIQUE (customer_id, ebook_id, edition_id)
);

-- 2. Reading Progress & Bookmarks Table (Prepares for Phase 6 Reader)
CREATE TABLE IF NOT EXISTS public.ebook_reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  last_chapter_id UUID REFERENCES public.ebook_chapters(id) ON DELETE CASCADE,
  scroll_percent NUMERIC(5, 2) DEFAULT 0.0 CHECK (scroll_percent >= 0 AND scroll_percent <= 100),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_customer_reading_progress UNIQUE (customer_id, ebook_id, edition_id)
);

-- 3. Trigger to keep updated_at synchronized
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ebook_entitlements_updated_at ON public.ebook_entitlements;
CREATE TRIGGER tr_ebook_entitlements_updated_at
  BEFORE UPDATE ON public.ebook_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_ebook_reading_progress_updated_at ON public.ebook_reading_progress;
CREATE TRIGGER tr_ebook_reading_progress_updated_at
  BEFORE UPDATE ON public.ebook_reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Trigger to ensure can_read_online and can_download_pdf match plan and active state
CREATE OR REPLACE FUNCTION public.sync_ebook_entitlement_permissions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = FALSE THEN
    NEW.can_read_online := FALSE;
    NEW.can_download_pdf := FALSE;
  ELSE
    NEW.can_read_online := TRUE;
    IF NEW.plan = 'read_download' THEN
      NEW.can_download_pdf := TRUE;
    ELSE
      NEW.can_download_pdf := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_ebook_entitlement_permissions ON public.ebook_entitlements;
CREATE TRIGGER tr_sync_ebook_entitlement_permissions
  BEFORE INSERT OR UPDATE ON public.ebook_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.sync_ebook_entitlement_permissions();

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ebook_entitlements_customer ON public.ebook_entitlements(customer_id);
CREATE INDEX IF NOT EXISTS idx_ebook_entitlements_customer_active ON public.ebook_entitlements(customer_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ebook_entitlements_lookup ON public.ebook_entitlements(customer_id, ebook_id, edition_id);
CREATE INDEX IF NOT EXISTS idx_ebook_reading_progress_customer ON public.ebook_reading_progress(customer_id);
CREATE INDEX IF NOT EXISTS idx_ebook_reading_progress_lookup ON public.ebook_reading_progress(customer_id, ebook_id, edition_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.ebook_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_reading_progress ENABLE ROW LEVEL SECURITY;

-- Helper check function for administrator privileges (reused from Phase 2)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- EBOOK_ENTITLEMENTS POLICIES ---

-- Customers can ONLY select their own entitlements
DROP POLICY IF EXISTS "Customers can view own entitlements" ON public.ebook_entitlements;
CREATE POLICY "Customers can view own entitlements"
ON public.ebook_entitlements FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Administrators can view all entitlements
DROP POLICY IF EXISTS "Admins can view all entitlements" ON public.ebook_entitlements;
CREATE POLICY "Admins can view all entitlements"
ON public.ebook_entitlements FOR SELECT
TO authenticated
USING (public.is_admin());

-- Administrators can manage (insert/update/delete) entitlements
DROP POLICY IF EXISTS "Admins can manage entitlements" ON public.ebook_entitlements;
CREATE POLICY "Admins can manage entitlements"
ON public.ebook_entitlements FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- CRITICAL SECURITY INVARIANT:
-- Regular customers have ZERO insert/update/delete permissions on ebook_entitlements.
-- Payment webhooks and manual grants execute securely via service-role key.

-- --- EBOOK_READING_PROGRESS POLICIES ---

-- Customers can view and update their own reading progress
DROP POLICY IF EXISTS "Customers can view own reading progress" ON public.ebook_reading_progress;
CREATE POLICY "Customers can view own reading progress"
ON public.ebook_reading_progress FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can upsert own reading progress" ON public.ebook_reading_progress;
CREATE POLICY "Customers can upsert own reading progress"
ON public.ebook_reading_progress FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own reading progress" ON public.ebook_reading_progress;
CREATE POLICY "Customers can update own reading progress"
ON public.ebook_reading_progress FOR UPDATE
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all reading progress" ON public.ebook_reading_progress;
CREATE POLICY "Admins can view all reading progress"
ON public.ebook_reading_progress FOR SELECT
TO authenticated
USING (public.is_admin());

-- --- HISTORICAL EDITION RETENTION FOR PURCHASERS ---
-- Allow customers to view historical or withdrawn editions and ebooks if they own an entitlement

DROP POLICY IF EXISTS "Customers can view owned editions" ON public.ebook_editions;
CREATE POLICY "Customers can view owned editions"
ON public.ebook_editions FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.ebook_entitlements
    WHERE customer_id = auth.uid()
      AND edition_id = public.ebook_editions.id
  )
);

DROP POLICY IF EXISTS "Customers can view owned ebooks" ON public.ebooks;
CREATE POLICY "Customers can view owned ebooks"
ON public.ebooks FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.ebook_entitlements
    WHERE customer_id = auth.uid()
      AND ebook_id = public.ebooks.id
  )
);
