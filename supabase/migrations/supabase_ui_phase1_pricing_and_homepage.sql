-- =============================================================================
-- Migration: supabase_ui_phase1_pricing_and_homepage.sql
-- Description: UI Enhancement Phase 1 Schema:
--              1. Profiles RLS infinite recursion permanent fix
--              2. Dynamic authoritative pricing and discounts (public.ebook_pricing)
--              3. Price changes on published books uncoupled from content
--              4. eBook homepage content management (public.ebook_homepage_content)
--              5. Additive backfills from existing editions without altering orders
-- Target Environment: Dedicated Staging Supabase (lzuinimbsdxnhzmjpxmr)
-- =============================================================================

-- =============================================================================
-- 0. PROFILES RLS INFINITE RECURSION PERMANENT FIX
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    auth.uid() = user_id
    OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or admins can update all" ON public.profiles;

CREATE POLICY "Users can update their own profile or admins can update all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR
    auth.uid() = user_id
    OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
  );

-- =============================================================================
-- 1. AUTHORITATIVE EBOOK PRICING & DISCOUNTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ebook_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE UNIQUE,
  
  -- Read Online commercial pricing
  online_original_price_paise INTEGER NOT NULL CHECK (online_original_price_paise >= 0),
  online_discount_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (online_discount_type IN ('none', 'percentage', 'fixed')),
  online_discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (online_discount_value >= 0),
  online_price_paise INTEGER NOT NULL CHECK (online_price_paise >= 0),

  -- Read + Download commercial pricing
  download_original_price_paise INTEGER NOT NULL CHECK (download_original_price_paise >= 0),
  download_discount_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (download_discount_type IN ('none', 'percentage', 'fixed')),
  download_discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (download_discount_value >= 0),
  download_price_paise INTEGER NOT NULL CHECK (download_price_paise >= 0),

  -- PDF Upgrade commercial pricing (independently configurable for online owners)
  upgrade_original_price_paise INTEGER NOT NULL DEFAULT 5000 CHECK (upgrade_original_price_paise >= 0),
  upgrade_discount_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (upgrade_discount_type IN ('none', 'percentage', 'fixed')),
  upgrade_discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (upgrade_discount_value >= 0),
  upgrade_price_paise INTEGER NOT NULL DEFAULT 5000 CHECK (upgrade_price_paise >= 0),

  -- Currency & optimistic concurrency control
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  pricing_version INTEGER NOT NULL DEFAULT 1,
  change_reason TEXT,
  updated_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business rules constraints
  CONSTRAINT chk_pricing_download_gte_online CHECK (download_price_paise >= online_price_paise),
  CONSTRAINT chk_pricing_online_le_original CHECK (online_price_paise <= online_original_price_paise),
  CONSTRAINT chk_pricing_download_le_original CHECK (download_price_paise <= download_original_price_paise),
  CONSTRAINT chk_pricing_upgrade_le_original CHECK (upgrade_price_paise <= upgrade_original_price_paise)
);

CREATE INDEX IF NOT EXISTS idx_ebook_pricing_edition ON public.ebook_pricing(edition_id);
CREATE INDEX IF NOT EXISTS idx_ebook_pricing_updated_at ON public.ebook_pricing(updated_at);

-- RLS for ebook_pricing
ALTER TABLE public.ebook_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view pricing for published editions" ON public.ebook_pricing;
CREATE POLICY "Public can view pricing for published editions"
  ON public.ebook_pricing FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ebook_editions ee
      JOIN public.ebooks eb ON eb.id = ee.ebook_id
      WHERE ee.id = ebook_pricing.edition_id
      AND ee.status = 'published'
      AND eb.status = 'published'
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins have full control over ebook_pricing" ON public.ebook_pricing;
CREATE POLICY "Admins have full control over ebook_pricing"
  ON public.ebook_pricing FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 2. BACKFILL PRICING FROM EXISTING EDITIONS (PRESERVING ORDERS & SNAPSHOTS)
-- =============================================================================

INSERT INTO public.ebook_pricing (
  edition_id,
  online_original_price_paise,
  online_discount_type,
  online_discount_value,
  online_price_paise,
  download_original_price_paise,
  download_discount_type,
  download_discount_value,
  download_price_paise,
  upgrade_original_price_paise,
  upgrade_discount_type,
  upgrade_discount_value,
  upgrade_price_paise,
  currency,
  pricing_version,
  change_reason
)
SELECT
  id AS edition_id,
  COALESCE(price_read_online_paise, 4900) AS online_original_price_paise,
  'none' AS online_discount_type,
  0 AS online_discount_value,
  COALESCE(price_read_online_paise, 4900) AS online_price_paise,
  COALESCE(price_read_download_paise, 9900) AS download_original_price_paise,
  'none' AS download_discount_type,
  0 AS download_discount_value,
  COALESCE(price_read_download_paise, 9900) AS download_price_paise,
  COALESCE(price_upgrade_pdf_paise, 5000) AS upgrade_original_price_paise,
  'none' AS upgrade_discount_type,
  0 AS upgrade_discount_value,
  COALESCE(price_upgrade_pdf_paise, 5000) AS upgrade_price_paise,
  COALESCE(currency, 'INR') AS currency,
  1 AS pricing_version,
  'Phase 1 Initial Pricing Backfill' AS change_reason
FROM public.ebook_editions
ON CONFLICT (edition_id) DO NOTHING;

-- =============================================================================
-- 3. EBOOK HOMEPAGE CONTENT MANAGEMENT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ebook_homepage_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL UNIQUE CHECK (status IN ('draft', 'published')),
  
  -- Hero Section
  hero_eyebrow TEXT NOT NULL DEFAULT 'Engineering & System Design eBooks',
  hero_heading TEXT NOT NULL DEFAULT 'Master Modern Software Engineering',
  hero_highlighted_text TEXT NOT NULL DEFAULT 'From First Principles',
  hero_description TEXT NOT NULL DEFAULT 'Comprehensive, in-depth architectural guides written for engineers who want to build resilient distributed systems.',
  hero_artwork_url TEXT,
  hero_artwork_alt TEXT NOT NULL DEFAULT 'KnowledgePaat eBook Library',
  
  -- Hero CTA Buttons
  primary_button_label TEXT NOT NULL DEFAULT 'Explore Library',
  primary_button_url TEXT NOT NULL DEFAULT '/e-books',
  secondary_button_label TEXT NOT NULL DEFAULT 'Free Sample Chapters',
  secondary_button_url TEXT NOT NULL DEFAULT '/e-books?filter=sample',
  
  -- Catalog Configuration
  featured_book_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlighted_book_id UUID REFERENCES public.ebooks(id) ON DELETE SET NULL,
  category_order JSONB NOT NULL DEFAULT '["Engineering", "System Design", "Career Prep", "DevOps & Cloud", "Quality Assurance", "Frontend & Mobile"]'::jsonb,
  
  -- Promotional Banner & Section Visibility
  promotional_banner JSONB NOT NULL DEFAULT '{"is_active": false, "text": "", "link": ""}'::jsonb,
  section_visibility JSONB NOT NULL DEFAULT '{"hero": true, "featured": true, "categories": true, "banner": false, "testimonials": true}'::jsonb,
  testimonials JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Concurrency & Auditing
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_ebook_homepage_status ON public.ebook_homepage_content(status);

-- RLS for ebook_homepage_content
ALTER TABLE public.ebook_homepage_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published homepage content" ON public.ebook_homepage_content;
CREATE POLICY "Public can view published homepage content"
  ON public.ebook_homepage_content FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published' OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins have full control over homepage content" ON public.ebook_homepage_content;
CREATE POLICY "Admins have full control over homepage content"
  ON public.ebook_homepage_content FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Seed initial draft and published configurations if not existing
INSERT INTO public.ebook_homepage_content (
  status,
  hero_eyebrow,
  hero_heading,
  hero_highlighted_text,
  hero_description,
  hero_artwork_alt,
  primary_button_label,
  primary_button_url,
  secondary_button_label,
  secondary_button_url,
  featured_book_ids,
  category_order,
  promotional_banner,
  section_visibility,
  testimonials,
  version,
  published_at
)
VALUES (
  'published',
  'Engineering & System Design eBooks',
  'Master Modern Software Engineering',
  'From First Principles',
  'Comprehensive, in-depth architectural guides written for engineers who want to build resilient distributed systems.',
  'KnowledgePaat eBook Library',
  'Explore Library',
  '/e-books',
  'Free Sample Chapters',
  '/e-books?filter=sample',
  '[]'::jsonb,
  '["Engineering", "System Design", "Career Prep", "DevOps & Cloud", "Quality Assurance", "Frontend & Mobile"]'::jsonb,
  '{"is_active": false, "text": "", "link": ""}'::jsonb,
  '{"hero": true, "featured": true, "categories": true, "banner": false, "testimonials": true}'::jsonb,
  '[
    {"name": "Aravind K.", "role": "Senior Backend Architect", "quote": "The microservices architecture guide was a masterclass in distributed consensus and real-world failure patterns.", "rating": 5},
    {"name": "Sneha R.", "role": "Full-Stack Engineer", "quote": "The inline code samples and architectural diagrams saved our team weeks of trial and error.", "rating": 5}
  ]'::jsonb,
  1,
  NOW()
)
ON CONFLICT (status) DO NOTHING;

INSERT INTO public.ebook_homepage_content (
  status,
  hero_eyebrow,
  hero_heading,
  hero_highlighted_text,
  hero_description,
  hero_artwork_alt,
  primary_button_label,
  primary_button_url,
  secondary_button_label,
  secondary_button_url,
  featured_book_ids,
  category_order,
  promotional_banner,
  section_visibility,
  testimonials,
  version
)
VALUES (
  'draft',
  'Engineering & System Design eBooks',
  'Master Modern Software Engineering',
  'From First Principles',
  'Comprehensive, in-depth architectural guides written for engineers who want to build resilient distributed systems.',
  'KnowledgePaat eBook Library',
  'Explore Library',
  '/e-books',
  'Free Sample Chapters',
  '/e-books?filter=sample',
  '[]'::jsonb,
  '["Engineering", "System Design", "Career Prep", "DevOps & Cloud", "Quality Assurance", "Frontend & Mobile"]'::jsonb,
  '{"is_active": false, "text": "", "link": ""}'::jsonb,
  '{"hero": true, "featured": true, "categories": true, "banner": false, "testimonials": true}'::jsonb,
  '[
    {"name": "Aravind K.", "role": "Senior Backend Architect", "quote": "The microservices architecture guide was a masterclass in distributed consensus and real-world failure patterns.", "rating": 5},
    {"name": "Sneha R.", "role": "Full-Stack Engineer", "quote": "The inline code samples and architectural diagrams saved our team weeks of trial and error.", "rating": 5}
  ]'::jsonb,
  1
)
ON CONFLICT (status) DO NOTHING;
