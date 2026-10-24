-- =============================================================================
-- KnowledgePaat — Production / Live Environment Complete Database Migration
-- Target Database: csjywuflkvohytbvglxf (Production Supabase)
-- Execution Mode: Non-destructive, Idempotent (Safe to run multiple times)
-- Instructions: Run in Supabase SQL Editor on Production AFTER full backup.
-- =============================================================================

-- =============================================================================
-- SECTION 0: PRE-MIGRATION VERIFICATION & EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verify is_admin helper exists and is hardened
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- =============================================================================
-- SECTION 1: PROFILES & ROLE CONSTRAINTS (Preserves Existing Live Users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text DEFAULT 'student'::text CHECK (role IN ('student', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Safe column additions if profiles already existed in older versions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'student'::text;

-- Profiles RLS policies
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

-- =============================================================================
-- SECTION 2: PLATFORM SETTINGS (Feature Flags & Social Links)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY DEFAULT 'global',
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_feature_enabled boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by text DEFAULT 'system'
);

-- Safe non-destructive column additions (preserves existing live database data)
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS theme_feature_enabled boolean DEFAULT false;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS updated_by text DEFAULT 'system';

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view platform settings" ON public.platform_settings;
CREATE POLICY "Public can view platform settings"
  ON public.platform_settings FOR SELECT
  USING ( true );

DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- (Note: No dummy seed rows are inserted to keep live production database clean)

-- =============================================================================
-- SECTION 3: MASTER EBOOK STOREFRONT SCHEMA
-- =============================================================================

-- 3.1 eBooks Table
CREATE TABLE IF NOT EXISTS public.ebooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  author text NOT NULL,
  description text,
  category text NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- 3.2 eBook Assets Table
CREATE TABLE IF NOT EXISTS public.ebook_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  asset_kind text NOT NULL CHECK (asset_kind IN ('cover', 'pdf_edition', 'sample_pdf', 'banner')),
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.3 eBook Editions Table
CREATE TABLE IF NOT EXISTS public.ebook_editions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_number integer NOT NULL,
  version_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_current_edition boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  price_read_online_paise integer NOT NULL DEFAULT 0 CHECK (price_read_online_paise >= 0),
  price_read_download_paise integer NOT NULL DEFAULT 0 CHECK (price_read_download_paise >= 0),
  price_upgrade_pdf_paise integer NOT NULL DEFAULT 0 CHECK (price_upgrade_pdf_paise >= 0),
  currency text NOT NULL DEFAULT 'INR',
  pdf_storage_path text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(ebook_id, edition_number)
);
ALTER TABLE public.ebook_editions ADD COLUMN IF NOT EXISTS price_read_online_paise integer NOT NULL DEFAULT 0;
ALTER TABLE public.ebook_editions ADD COLUMN IF NOT EXISTS price_read_download_paise integer NOT NULL DEFAULT 0;
ALTER TABLE public.ebook_editions ADD COLUMN IF NOT EXISTS price_upgrade_pdf_paise integer NOT NULL DEFAULT 0;
ALTER TABLE public.ebook_editions ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
ALTER TABLE public.ebook_editions ADD COLUMN IF NOT EXISTS pdf_storage_path text;
ALTER TABLE public.ebook_editions ADD COLUMN IF NOT EXISTS is_current_edition boolean NOT NULL DEFAULT false;
ALTER TABLE public.ebook_editions ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

-- Enforce exactly one current edition per book
CREATE UNIQUE INDEX IF NOT EXISTS idx_ebook_editions_single_current 
  ON public.ebook_editions(ebook_id) 
  WHERE is_current_edition = true;

-- 3.4 eBook Chapters Table
CREATE TABLE IF NOT EXISTS public.ebook_chapters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  chapter_index integer NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  content_body text NOT NULL,
  word_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('draft', 'ready')),
  is_free_sample boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(edition_id, chapter_index)
);
ALTER TABLE public.ebook_chapters ADD COLUMN IF NOT EXISTS word_count integer DEFAULT 0;
ALTER TABLE public.ebook_chapters ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready';
ALTER TABLE public.ebook_chapters ADD COLUMN IF NOT EXISTS is_free_sample boolean NOT NULL DEFAULT false;

-- 3.5 Homepage Featured Carousel Table
CREATE TABLE IF NOT EXISTS public.ebook_homepage_featured (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  badge text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.ebook_homepage_featured ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.ebook_homepage_featured ADD COLUMN IF NOT EXISTS badge text;
ALTER TABLE public.ebook_homepage_featured ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- =============================================================================
-- SECTION 4: CUSTOMER ENTITLEMENTS & READING EXPERIENCE
-- =============================================================================

-- 4.1 Entitlements Table (Customer Purchased Access)
CREATE TABLE IF NOT EXISTS public.ebook_entitlements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('read_online', 'read_download')),
  can_read_online boolean NOT NULL DEFAULT true,
  can_download_pdf boolean NOT NULL DEFAULT false,
  order_id text,
  grant_type text NOT NULL DEFAULT 'purchase' CHECK (grant_type IN ('purchase', 'upgrade', 'admin_override', 'comp')),
  is_active boolean NOT NULL DEFAULT true,
  revocation_reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(customer_id, ebook_id, edition_id)
);
ALTER TABLE public.ebook_entitlements ADD COLUMN IF NOT EXISTS can_read_online boolean NOT NULL DEFAULT true;
ALTER TABLE public.ebook_entitlements ADD COLUMN IF NOT EXISTS can_download_pdf boolean NOT NULL DEFAULT false;
ALTER TABLE public.ebook_entitlements ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE public.ebook_entitlements ADD COLUMN IF NOT EXISTS grant_type text NOT NULL DEFAULT 'purchase';
ALTER TABLE public.ebook_entitlements ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.ebook_entitlements ADD COLUMN IF NOT EXISTS revocation_reason text;

-- 4.2 Reading Progress Table
CREATE TABLE IF NOT EXISTS public.ebook_reading_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  current_chapter_id uuid REFERENCES public.ebook_chapters(id) ON DELETE SET NULL,
  scroll_percent numeric(5, 2) DEFAULT 0.00 CHECK (scroll_percent >= 0.00 AND scroll_percent <= 100.00),
  completed_chapters uuid[] DEFAULT '{}'::uuid[],
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, ebook_id, edition_id)
);

-- 4.3 Bookmarks Table
CREATE TABLE IF NOT EXISTS public.ebook_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.ebook_chapters(id) ON DELETE CASCADE,
  cf_note text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4.4 Download Logs Table
CREATE TABLE IF NOT EXISTS public.ebook_download_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  downloaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- SECTION 5: ORDERS, PAYMENTS, OUTBOX & SHARED CLUSTER STATE
-- =============================================================================

-- 5.1 Orders Table
CREATE TABLE IF NOT EXISTS public.ebook_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  customer_name text,
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text UNIQUE,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_refunded', 'refunded', 'failed')),
  total_amount_paise integer NOT NULL CHECK (total_amount_paise >= 0),
  refunded_amount_paise integer NOT NULL DEFAULT 0 CHECK (refunded_amount_paise >= 0),
  currency text NOT NULL DEFAULT 'INR',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.ebook_orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.ebook_orders ADD COLUMN IF NOT EXISTS razorpay_order_id text;
ALTER TABLE public.ebook_orders ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
ALTER TABLE public.ebook_orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.ebook_orders ADD COLUMN IF NOT EXISTS total_amount_paise integer NOT NULL DEFAULT 0;
ALTER TABLE public.ebook_orders ADD COLUMN IF NOT EXISTS refunded_amount_paise integer NOT NULL DEFAULT 0;
ALTER TABLE public.ebook_orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
ALTER TABLE public.ebook_orders ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 5.2 Order Items Table
CREATE TABLE IF NOT EXISTS public.ebook_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.ebook_orders(id) ON DELETE CASCADE,
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('read_online', 'read_download', 'upgrade_download')),
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5.3 Durable Receipt Outbox Table
CREATE TABLE IF NOT EXISTS public.ebook_receipt_outbox (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id text NOT NULL UNIQUE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_error text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.ebook_receipt_outbox ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE public.ebook_receipt_outbox ADD COLUMN IF NOT EXISTS amount_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.ebook_receipt_outbox ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
ALTER TABLE public.ebook_receipt_outbox ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.ebook_receipt_outbox ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.ebook_receipt_outbox ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.ebook_receipt_outbox ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE public.ebook_receipt_outbox ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;

-- 5.4 Shared Cluster Webhook & Invalidation Epochs Table
CREATE TABLE IF NOT EXISTS public.ebook_webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  gateway text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  processed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.ebook_webhook_events ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.ebook_webhook_events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.ebook_webhook_events ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;
ALTER TABLE public.ebook_webhook_events ADD COLUMN IF NOT EXISTS error_message text;

-- =============================================================================
-- SECTION 6: REFUNDS & AUDIT LOGS
-- =============================================================================

-- 6.1 Refunds Table
CREATE TABLE IF NOT EXISTS public.ebook_refunds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.ebook_orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  currency text NOT NULL DEFAULT 'INR',
  reason text NOT NULL,
  refund_type text NOT NULL CHECK (refund_type IN ('full', 'partial')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  gateway text NOT NULL DEFAULT 'razorpay',
  gateway_payment_id text,
  gateway_refund_id text UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  access_action text NOT NULL DEFAULT 'revoke' CHECK (access_action IN ('revoke', 'downgrade', 'keep')),
  allocated_items jsonb DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at timestamp with time zone
);
ALTER TABLE public.ebook_refunds ADD COLUMN IF NOT EXISTS allocated_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.ebook_refunds ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.ebook_refunds ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;

-- 6.2 Audit Logs Table
CREATE TABLE IF NOT EXISTS public.ebook_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.ebook_audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- =============================================================================
-- SECTION 7: ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_homepage_featured ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_receipt_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7.1 eBooks: Public can view published books; Admins can manage all
DROP POLICY IF EXISTS "Public can view published ebooks" ON public.ebooks;
CREATE POLICY "Public can view published ebooks" ON public.ebooks
  FOR SELECT USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage ebooks" ON public.ebooks;
CREATE POLICY "Admins can manage ebooks" ON public.ebooks
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7.2 Editions: Public can view published editions; Admins can manage all
DROP POLICY IF EXISTS "Public can view published editions" ON public.ebook_editions;
CREATE POLICY "Public can view published editions" ON public.ebook_editions
  FOR SELECT USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage editions" ON public.ebook_editions;
CREATE POLICY "Admins can manage editions" ON public.ebook_editions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7.3 Chapters: Free samples viewable by everyone; Protected chapters require admin or entitlement
DROP POLICY IF EXISTS "Public can view free sample chapters" ON public.ebook_chapters;
CREATE POLICY "Public can view free sample chapters" ON public.ebook_chapters
  FOR SELECT USING (is_free_sample = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage chapters" ON public.ebook_chapters;
CREATE POLICY "Admins can manage chapters" ON public.ebook_chapters
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7.4 Assets: Public can view public assets; Admins manage all
DROP POLICY IF EXISTS "Public can view public assets" ON public.ebook_assets;
CREATE POLICY "Public can view public assets" ON public.ebook_assets
  FOR SELECT USING (visibility = 'public' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage assets" ON public.ebook_assets;
CREATE POLICY "Admins can manage assets" ON public.ebook_assets
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7.5 Homepage Featured: Public can view active; Admins manage all
DROP POLICY IF EXISTS "Public can view active homepage featured" ON public.ebook_homepage_featured;
CREATE POLICY "Public can view active homepage featured" ON public.ebook_homepage_featured
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage homepage featured" ON public.ebook_homepage_featured;
CREATE POLICY "Admins can manage homepage featured" ON public.ebook_homepage_featured
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7.6 Entitlements: Customers can view their own; Admins manage all
DROP POLICY IF EXISTS "Customers can view their own entitlements" ON public.ebook_entitlements;
CREATE POLICY "Customers can view their own entitlements" ON public.ebook_entitlements
  FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage entitlements" ON public.ebook_entitlements;
CREATE POLICY "Admins can manage entitlements" ON public.ebook_entitlements
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7.7 Reading Progress & Bookmarks: Customers manage their own
DROP POLICY IF EXISTS "Users manage own reading progress" ON public.ebook_reading_progress;
CREATE POLICY "Users manage own reading progress" ON public.ebook_reading_progress
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.ebook_bookmarks;
CREATE POLICY "Users manage own bookmarks" ON public.ebook_bookmarks
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7.8 Orders: Customers view own orders; Admins manage all
DROP POLICY IF EXISTS "Customers view own orders" ON public.ebook_orders;
CREATE POLICY "Customers view own orders" ON public.ebook_orders
  FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage orders" ON public.ebook_orders;
CREATE POLICY "Admins manage orders" ON public.ebook_orders
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Customers view own order items" ON public.ebook_order_items;
CREATE POLICY "Customers view own order items" ON public.ebook_order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ebook_orders o WHERE o.id = ebook_order_items.order_id AND (o.customer_id = auth.uid() OR public.is_admin()))
  );

-- 7.9 Outbox, Webhook Events & Audit Logs: Strictly service role and admins
DROP POLICY IF EXISTS "Admins and service manage outbox" ON public.ebook_receipt_outbox;
CREATE POLICY "Admins and service manage outbox" ON public.ebook_receipt_outbox
  FOR ALL USING (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins and service manage webhooks" ON public.ebook_webhook_events;
CREATE POLICY "Admins and service manage webhooks" ON public.ebook_webhook_events
  FOR ALL USING (public.is_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins view audit logs" ON public.ebook_audit_logs;
CREATE POLICY "Admins view audit logs" ON public.ebook_audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert audit logs" ON public.ebook_audit_logs;
CREATE POLICY "Admins insert audit logs" ON public.ebook_audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- =============================================================================
-- SECTION 8: ATOMIC STORED PROCEDURES (Concurrency & Financial Safeguards)
-- =============================================================================

-- 8.1 Publish eBook Edition (Atomic validation, current edition promotion)
CREATE OR REPLACE FUNCTION public.publish_ebook_edition(
  p_book_id UUID,
  p_edition_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_edition RECORD;
  v_book RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_chapter_count INTEGER;
  v_ready_chapter_count INTEGER;
  v_sample_chapter_count INTEGER;
  v_caller_is_admin BOOLEAN := FALSE;
BEGIN
  SELECT (role = 'admin') INTO v_caller_is_admin
  FROM public.profiles
  WHERE id = COALESCE(auth.uid(), p_actor_id);

  IF NOT COALESCE(v_caller_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_book FROM public.ebooks WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'eBook not found with ID %', p_book_id;
  END IF;

  SELECT * INTO v_edition FROM public.ebook_editions 
  WHERE id = p_edition_id AND ebook_id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Edition not found with ID % for eBook %', p_edition_id, p_book_id;
  END IF;

  IF v_edition.status = 'published' AND v_edition.is_current_edition = TRUE AND v_book.status = 'published' THEN
    RETURN jsonb_build_object('success', true, 'already_published', true, 'edition_id', p_edition_id, 'book_id', p_book_id);
  END IF;

  IF TRIM(COALESCE(v_book.title, '')) = '' OR TRIM(COALESCE(v_book.author, '')) = '' THEN
    RAISE EXCEPTION 'Publication precondition failed: eBook must have non-empty title and author.';
  END IF;

  IF v_edition.pdf_storage_path IS NULL OR LENGTH(TRIM(v_edition.pdf_storage_path)) = 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: Valid publication PDF storage path required.';
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'ready'), COUNT(*) FILTER (WHERE is_free_sample = TRUE AND status = 'ready')
  INTO v_chapter_count, v_ready_chapter_count, v_sample_chapter_count
  FROM public.ebook_chapters
  WHERE edition_id = p_edition_id;

  IF v_chapter_count = 0 OR v_ready_chapter_count != v_chapter_count THEN
    RAISE EXCEPTION 'Publication precondition failed: All chapters must be in ready status.';
  END IF;

  IF v_sample_chapter_count = 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: At least one ready chapter must be designated as free sample.';
  END IF;

  UPDATE public.ebook_editions
  SET is_current_edition = FALSE, updated_at = v_now
  WHERE ebook_id = p_book_id AND is_current_edition = TRUE AND id != p_edition_id;

  UPDATE public.ebook_editions
  SET status = 'published', is_current_edition = TRUE, published_at = COALESCE(published_at, v_now), updated_at = v_now
  WHERE id = p_edition_id;

  UPDATE public.ebooks
  SET status = 'published', updated_at = v_now
  WHERE id = p_book_id;

  INSERT INTO public.ebook_audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
  VALUES (
    COALESCE(auth.uid(), p_actor_id),
    'edition_published',
    'edition',
    p_edition_id::text,
    jsonb_build_object('book_id', p_book_id, 'edition_number', v_edition.edition_number, 'published_at', v_now),
    v_now
  );

  RETURN jsonb_build_object('success', true, 'book_id', p_book_id, 'edition_id', p_edition_id, 'edition_number', v_edition.edition_number, 'published_at', v_now);
END;
$$;

-- 8.2 Withdraw eBook Edition (Atomic demotion and safety check)
CREATE OR REPLACE FUNCTION public.withdraw_ebook_edition(
  p_book_id UUID,
  p_edition_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_edition RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_other_published_count INTEGER;
  v_caller_is_admin BOOLEAN := FALSE;
BEGIN
  SELECT (role = 'admin') INTO v_caller_is_admin
  FROM public.profiles
  WHERE id = COALESCE(auth.uid(), p_actor_id);

  IF NOT COALESCE(v_caller_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_edition FROM public.ebook_editions 
  WHERE id = p_edition_id AND ebook_id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Edition not found with ID % for eBook %', p_edition_id, p_book_id;
  END IF;

  UPDATE public.ebook_editions
  SET status = 'draft', is_current_edition = FALSE, updated_at = v_now
  WHERE id = p_edition_id;

  SELECT COUNT(*) INTO v_other_published_count
  FROM public.ebook_editions
  WHERE ebook_id = p_book_id AND status = 'published' AND id != p_edition_id;

  IF v_other_published_count = 0 THEN
    UPDATE public.ebooks SET status = 'draft', updated_at = v_now WHERE id = p_book_id;
  END IF;

  INSERT INTO public.ebook_audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
  VALUES (
    COALESCE(auth.uid(), p_actor_id),
    'edition_withdrawn',
    'edition',
    p_edition_id::text,
    jsonb_build_object('book_id', p_book_id, 'edition_number', v_edition.edition_number, 'withdrawn_at', v_now),
    v_now
  );

  RETURN jsonb_build_object('success', true, 'book_id', p_book_id, 'edition_id', p_edition_id, 'status', 'draft');
END;
$$;

-- 8.3 Finalize eBook Order Payment (Atomically activates entitlement & enqueues outbox receipt)
CREATE OR REPLACE FUNCTION public.finalize_ebook_order_payment(
  p_order_id TEXT,
  p_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_existing_ent RECORD;
  v_items_processed INTEGER := 0;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_order FROM public.ebook_orders WHERE order_number = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    SELECT * INTO v_order FROM public.ebook_orders WHERE id::text = p_order_id FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with identifier %', p_order_id;
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', v_order.id);
  END IF;

  UPDATE public.ebook_orders
  SET payment_status = 'paid', razorpay_payment_id = COALESCE(p_payment_id, razorpay_payment_id), updated_at = v_now
  WHERE id = v_order.id;

  FOR v_item IN
    SELECT * FROM public.ebook_order_items WHERE order_id = v_order.id
  LOOP
    SELECT * INTO v_existing_ent
    FROM public.ebook_entitlements
    WHERE customer_id = v_order.customer_id AND ebook_id = v_item.ebook_id AND edition_id = v_item.edition_id;

    IF NOT FOUND THEN
      INSERT INTO public.ebook_entitlements (
        customer_id, ebook_id, edition_id, plan, can_read_online, can_download_pdf, order_id, grant_type, is_active
      ) VALUES (
        v_order.customer_id, v_item.ebook_id, v_item.edition_id, v_item.plan, true, (v_item.plan = 'read_download'), v_order.order_number, 'purchase', true
      );
    ELSE
      IF v_existing_ent.plan = 'read_online' AND v_item.plan = 'read_download' THEN
        UPDATE public.ebook_entitlements
        SET plan = 'read_download', can_download_pdf = true, is_active = true, updated_at = v_now
        WHERE id = v_existing_ent.id;
      ELSE
        UPDATE public.ebook_entitlements SET is_active = true, updated_at = v_now WHERE id = v_existing_ent.id;
      END IF;
    END IF;
    v_items_processed := v_items_processed + 1;
  END LOOP;

  -- Durable Receipt Enqueue
  INSERT INTO public.ebook_receipt_outbox (
    order_id, customer_id, recipient_email, recipient_name, amount_cents, currency, status, payload
  ) VALUES (
    v_order.order_number,
    v_order.customer_id,
    COALESCE(v_order.customer_email, 'customer@knowledgepaat.test'),
    v_order.customer_name,
    v_order.total_amount_paise,
    v_order.currency,
    'pending',
    jsonb_build_object(
      'order_id', v_order.order_number,
      'payment_id', p_payment_id,
      'total_amount_paise', v_order.total_amount_paise,
      'currency', v_order.currency,
      'items_count', v_items_processed
    )
  )
  ON CONFLICT (order_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'items_count', v_items_processed);
END;
$$;

-- Revoke public permissions, grant to service role and authenticated
REVOKE ALL ON FUNCTION public.publish_ebook_edition(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_ebook_edition(UUID, UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.withdraw_ebook_edition(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.withdraw_ebook_edition(UUID, UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.finalize_ebook_order_payment(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_ebook_order_payment(TEXT, TEXT) TO service_role;

-- =============================================================================
-- SECTION 9: PERFORMANCE INDEXES (High-Throughput Read & Search Optimization)
-- =============================================================================

-- eBooks & Storefront
CREATE INDEX IF NOT EXISTS idx_ebooks_status_created ON public.ebooks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ebooks_category_status ON public.ebooks(category, status);
CREATE INDEX IF NOT EXISTS idx_ebooks_title_trgm ON public.ebooks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ebooks_author_trgm ON public.ebooks USING gin (author gin_trgm_ops);

-- Editions & Chapters
CREATE INDEX IF NOT EXISTS idx_ebook_editions_lookup ON public.ebook_editions(ebook_id, status, is_current_edition);
CREATE INDEX IF NOT EXISTS idx_ebook_chapters_reader ON public.ebook_chapters(edition_id, chapter_index ASC);
CREATE INDEX IF NOT EXISTS idx_ebook_chapters_sample ON public.ebook_chapters(edition_id, is_free_sample);

-- Entitlements & Orders
CREATE INDEX IF NOT EXISTS idx_ebook_entitlements_lookup ON public.ebook_entitlements(customer_id, ebook_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ebook_orders_customer ON public.ebook_orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ebook_orders_status ON public.ebook_orders(payment_status, created_at DESC);

-- Outbox & Rate Limiting
CREATE INDEX IF NOT EXISTS idx_ebook_receipt_outbox_sweep ON public.ebook_receipt_outbox(status, retry_count, updated_at);
CREATE INDEX IF NOT EXISTS idx_ebook_webhook_events_lookup ON public.ebook_webhook_events(gateway, event_type, status, created_at DESC);

-- =============================================================================
-- SECTION 10: SUPABASE STORAGE BUCKETS (Private PDFs & Public Covers)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('ebook-covers', 'ebook-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ebook-pdfs', 'ebook-pdfs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Public can view covers" ON storage.objects;
CREATE POLICY "Public can view covers" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'ebook-covers');

DROP POLICY IF EXISTS "Admins manage ebook-covers" ON storage.objects;
CREATE POLICY "Admins manage ebook-covers" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ebook-covers' AND public.is_admin())
  WITH CHECK (bucket_id = 'ebook-covers' AND public.is_admin());

DROP POLICY IF EXISTS "Admins manage ebook-pdfs" ON storage.objects;
CREATE POLICY "Admins manage ebook-pdfs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'ebook-pdfs' AND public.is_admin())
  WITH CHECK (bucket_id = 'ebook-pdfs' AND public.is_admin());

-- =============================================================================
-- SECTION 11: POST-MIGRATION HEALTH-CHECK VERIFICATION
-- =============================================================================

DO $$
DECLARE
  v_table_count INTEGER;
  v_fn_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN (
      'ebooks', 'ebook_assets', 'ebook_editions', 'ebook_chapters',
      'ebook_homepage_featured', 'ebook_entitlements', 'ebook_reading_progress',
      'ebook_bookmarks', 'ebook_download_logs', 'ebook_orders',
      'ebook_order_items', 'ebook_receipt_outbox', 'ebook_webhook_events',
      'ebook_refunds', 'ebook_audit_logs', 'platform_settings'
    );

  SELECT COUNT(*) INTO v_fn_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('is_admin', 'publish_ebook_edition', 'withdraw_ebook_edition', 'finalize_ebook_order_payment');

  RAISE NOTICE '=========================================================';
  RAISE NOTICE 'POST-MIGRATION HEALTH CHECK:';
  RAISE NOTICE '  - Verified Tables Created/Present: % of 16', v_table_count;
  RAISE NOTICE '  - Verified Stored Procedures Present: % of 4', v_fn_count;
  RAISE NOTICE '=========================================================';

  IF v_table_count < 16 OR v_fn_count < 4 THEN
    RAISE EXCEPTION 'MIGRATION INCOMPLETE: Expected 16 tables and 4 core procedures.';
  END IF;
END $$;
