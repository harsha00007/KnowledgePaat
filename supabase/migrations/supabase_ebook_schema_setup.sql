-- =============================================================================
-- KnowledgePaat — Phase 2: eBook Commerce & Content Management Schema
-- Migration File: supabase_ebook_schema_setup.sql
-- Description: Creates tables, constraints, indexes, and RLS policies for
--              Books, Editions, Chapters, Assets, and Admin Audit Logging.
-- NOTE: Uses integer minor units (paise: 4900, 9900, 5000) for monetary fields.
-- =============================================================================

-- 1. Master eBooks Table
CREATE TABLE IF NOT EXISTS public.ebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Engineering',
  reader_role TEXT DEFAULT 'Student / Professional',
  language TEXT NOT NULL DEFAULT 'en',
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Book Editions Table (Enforces Versioning, Pricing in Paise, & File Path References)
CREATE TABLE IF NOT EXISTS public.ebook_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_number INTEGER NOT NULL DEFAULT 1 CHECK (edition_number >= 1),
  version_name TEXT NOT NULL DEFAULT 'First Edition',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_current_edition BOOLEAN NOT NULL DEFAULT TRUE,
  pdf_storage_path TEXT, -- Stored strictly in private bucket 'ebook-pdfs'
  pdf_file_size_bytes BIGINT CHECK (pdf_file_size_bytes IS NULL OR pdf_file_size_bytes >= 0),
  pdf_checksum TEXT,
  pdf_original_filename TEXT,
  pdf_uploaded_at TIMESTAMPTZ,
  page_count INTEGER CHECK (page_count IS NULL OR page_count >= 0),
  -- Stored in integer minor units (paise)
  price_read_online_paise INTEGER NOT NULL DEFAULT 4900 CHECK (price_read_online_paise >= 0),
  price_read_download_paise INTEGER NOT NULL DEFAULT 9900 CHECK (price_read_download_paise >= 0),
  price_upgrade_pdf_paise INTEGER NOT NULL DEFAULT 5000 CHECK (price_upgrade_pdf_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_ebook_edition UNIQUE (ebook_id, edition_number)
);

-- 3. Website Chapters Table (Content & Free Sample Gating)
CREATE TABLE IF NOT EXISTS public.ebook_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL CHECK (chapter_index >= 1),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_body TEXT NOT NULL, -- Formatted Markdown / safe rich-text
  word_count INTEGER NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  is_free_sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_edition_chapter_index UNIQUE (edition_id, chapter_index),
  CONSTRAINT unique_edition_chapter_slug UNIQUE (edition_id, slug)
);

-- 4. eBook Asset Metadata Table (Covers, PDFs, Samples, Companion Resources)
CREATE TABLE IF NOT EXISTS public.ebook_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id UUID REFERENCES public.ebook_editions(id) ON DELETE SET NULL,
  asset_kind TEXT NOT NULL CHECK (asset_kind IN ('cover', 'sample_pdf', 'publication_pdf', 'companion_resource')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'entitled_only')),
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  verified_mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  checksum_sha256 TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Administrator Audit Log Table
CREATE TABLE IF NOT EXISTS public.ebook_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ebooks_status ON public.ebooks(status);
CREATE INDEX IF NOT EXISTS idx_ebooks_slug ON public.ebooks(slug);
CREATE INDEX IF NOT EXISTS idx_ebook_editions_ebook ON public.ebook_editions(ebook_id);
CREATE INDEX IF NOT EXISTS idx_ebook_editions_status ON public.ebook_editions(status);
CREATE INDEX IF NOT EXISTS idx_ebook_chapters_edition ON public.ebook_chapters(edition_id, chapter_index);
CREATE INDEX IF NOT EXISTS idx_ebook_chapters_sample ON public.ebook_chapters(edition_id, is_free_sample);
CREATE INDEX IF NOT EXISTS idx_ebook_assets_ebook ON public.ebook_assets(ebook_id);
CREATE INDEX IF NOT EXISTS idx_ebook_audit_actor ON public.ebook_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_ebook_audit_entity ON public.ebook_audit_logs(entity_type, entity_id);

-- =============================================================================
-- STORAGE BUCKETS (Metadata configuration)
-- =============================================================================
-- Insert storage bucket configuration if missing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('ebook-covers', 'ebook-covers', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('ebook-pdfs', 'ebook-pdfs', false, 104857600, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper check function for administrator privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- EBOOKS POLICIES ---
DROP POLICY IF EXISTS "Public can view published ebooks" ON public.ebooks;
CREATE POLICY "Public can view published ebooks"
ON public.ebooks FOR SELECT
TO anon, authenticated
USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage ebooks" ON public.ebooks;
CREATE POLICY "Admins can manage ebooks"
ON public.ebooks FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- --- EBOOK EDITIONS POLICIES ---
DROP POLICY IF EXISTS "Public can view published editions" ON public.ebook_editions;
CREATE POLICY "Public can view published editions"
ON public.ebook_editions FOR SELECT
TO anon, authenticated
USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage editions" ON public.ebook_editions;
CREATE POLICY "Admins can manage editions"
ON public.ebook_editions FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- --- EBOOK CHAPTERS POLICIES ---
-- Non-admin callers can only select free sample chapters of published books
DROP POLICY IF EXISTS "Public can view sample chapters" ON public.ebook_chapters;
CREATE POLICY "Public can view sample chapters"
ON public.ebook_chapters FOR SELECT
TO anon, authenticated
USING (
  (is_free_sample = TRUE AND EXISTS (
    SELECT 1 FROM public.ebooks WHERE id = ebook_id AND status = 'published'
  ))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can manage chapters" ON public.ebook_chapters;
CREATE POLICY "Admins can manage chapters"
ON public.ebook_chapters FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- --- EBOOK ASSETS POLICIES ---
DROP POLICY IF EXISTS "Public can view public assets" ON public.ebook_assets;
CREATE POLICY "Public can view public assets"
ON public.ebook_assets FOR SELECT
TO anon, authenticated
USING (visibility = 'public' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage assets" ON public.ebook_assets;
CREATE POLICY "Admins can manage assets"
ON public.ebook_assets FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- --- AUDIT LOGS POLICIES ---
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.ebook_audit_logs;
CREATE POLICY "Only admins can view audit logs"
ON public.ebook_audit_logs FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.ebook_audit_logs;
CREATE POLICY "Admins can insert audit logs"
ON public.ebook_audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- --- STORAGE OBJECTS POLICIES ---
-- Allow public read of ebook-covers
DROP POLICY IF EXISTS "Public read ebook-covers" ON storage.objects;
CREATE POLICY "Public read ebook-covers"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ebook-covers');

-- Allow admins full access to ebook-covers and ebook-pdfs
DROP POLICY IF EXISTS "Admin manage ebook-covers" ON storage.objects;
CREATE POLICY "Admin manage ebook-covers"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'ebook-covers' AND public.is_admin())
WITH CHECK (bucket_id = 'ebook-covers' AND public.is_admin());

DROP POLICY IF EXISTS "Admin manage ebook-pdfs" ON storage.objects;
CREATE POLICY "Admin manage ebook-pdfs"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'ebook-pdfs' AND public.is_admin())
WITH CHECK (bucket_id = 'ebook-pdfs' AND public.is_admin());

-- =============================================================================
-- ATOMIC PUBLICATION FUNCTION (Handles Concurrent Safe Publication)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.publish_ebook_edition(
  p_book_id UUID,
  p_edition_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_edition RECORD;
  v_book RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_chapter_count INTEGER;
BEGIN
  -- 1. Lock the master book record to prevent concurrent publication race conditions
  SELECT * INTO v_book FROM public.ebooks WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  -- 2. Lock the target edition record
  SELECT * INTO v_edition FROM public.ebook_editions 
  WHERE id = p_edition_id AND ebook_id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Edition not found for this book';
  END IF;

  -- Idempotency check: if already current published edition, return success cleanly
  IF v_edition.status = 'published' AND v_edition.is_current_edition = TRUE AND v_book.status = 'published' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_published', true,
      'edition_id', p_edition_id,
      'book_id', p_book_id
    );
  END IF;

  -- 3. Demote all existing editions of this book from is_current_edition
  UPDATE public.ebook_editions
  SET is_current_edition = FALSE,
      updated_at = v_now
  WHERE ebook_id = p_book_id;

  -- 4. Promote target edition to published and current
  UPDATE public.ebook_editions
  SET status = 'published',
      is_current_edition = TRUE,
      published_at = COALESCE(v_edition.published_at, v_now),
      updated_at = v_now
  WHERE id = p_edition_id;

  -- 5. Promote master book status to published
  UPDATE public.ebooks
  SET status = 'published',
      updated_at = v_now
  WHERE id = p_book_id;

  -- 6. Insert audit log record atomically
  SELECT COUNT(*) INTO v_chapter_count FROM public.ebook_chapters WHERE edition_id = p_edition_id;

  INSERT INTO public.ebook_audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
  VALUES (
    p_actor_id,
    'edition_published',
    'edition',
    p_edition_id::text,
    jsonb_build_object(
      'book_id', p_book_id,
      'edition_number', v_edition.edition_number,
      'published_at', v_now,
      'chapters_count', v_chapter_count
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'book_id', p_book_id,
    'edition_id', p_edition_id,
    'edition_number', v_edition.edition_number,
    'published_at', v_now
  );
END;
$$;

-- 8. Atomic Edition Revision Creator with Row-Level Locking
CREATE OR REPLACE FUNCTION public.create_ebook_edition_revision(
  p_book_id UUID,
  p_version_name TEXT DEFAULT NULL,
  p_clone_from_edition_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_price_online INTEGER DEFAULT 4900,
  p_price_download INTEGER DEFAULT 9900,
  p_price_upgrade INTEGER DEFAULT 5000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_edition_number INTEGER;
  v_new_edition_id UUID;
  v_edition RECORD;
  v_chapters_cloned INTEGER := 0;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Row-level lock on master ebook record to serialize concurrent edition revisions
  PERFORM id FROM public.ebooks WHERE id = p_book_id FOR UPDATE;

  SELECT COALESCE(MAX(edition_number), 0) + 1 INTO v_next_edition_number
  FROM public.ebook_editions
  WHERE ebook_id = p_book_id;

  INSERT INTO public.ebook_editions (
    ebook_id,
    edition_number,
    version_name,
    status,
    is_current_edition,
    published_at,
    price_read_online_paise,
    price_read_download_paise,
    price_upgrade_pdf_paise,
    currency,
    created_at,
    updated_at
  ) VALUES (
    p_book_id,
    v_next_edition_number,
    COALESCE(p_version_name, 'Edition ' || v_next_edition_number),
    'draft',
    FALSE,
    NULL,
    p_price_online,
    p_price_download,
    p_price_upgrade,
    'INR',
    v_now,
    v_now
  )
  RETURNING * INTO v_edition;

  v_new_edition_id := v_edition.id;

  IF p_clone_from_edition_id IS NOT NULL THEN
    INSERT INTO public.ebook_chapters (
      id,
      ebook_id,
      edition_id,
      chapter_index,
      title,
      slug,
      content_body,
      word_count,
      status,
      is_free_sample,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(), -- Brand new UUID for each cloned chapter
      p_book_id,
      v_new_edition_id,
      chapter_index,
      title,
      slug,
      content_body,
      word_count,
      status,
      is_free_sample,
      v_now,
      v_now
    FROM public.ebook_chapters
    WHERE edition_id = p_clone_from_edition_id
      AND ebook_id = p_book_id
    ORDER BY chapter_index ASC;

    GET DIAGNOSTICS v_chapters_cloned = ROW_COUNT;
  END IF;

  IF p_actor_id IS NOT NULL THEN
    INSERT INTO public.ebook_audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
    VALUES (
      p_actor_id,
      'edition_created',
      'edition',
      v_new_edition_id::text,
      jsonb_build_object(
        'book_id', p_book_id,
        'edition_number', v_next_edition_number,
        'cloned_from', p_clone_from_edition_id,
        'chapters_cloned', v_chapters_cloned
      ),
      v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'edition', to_jsonb(v_edition),
    'chapters_cloned', v_chapters_cloned
  );
END;
$$;
