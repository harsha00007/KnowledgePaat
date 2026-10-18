-- =============================================================================
-- KnowledgePaat — Staging Complete Setup Script
-- Project Reference: lzuinimbsdxnhzmjpxmr
-- Instructions: Paste this entire script into your Supabase Dashboard SQL Editor
--               and click "Run" (Ctrl + Enter).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BASE PROFILES SCHEMA & AUTH TRIGGER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text DEFAULT 'student'::text CHECK (role IN ('student', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, email, role)
  VALUES (
    new.id,
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. MASTER EBOOKS SCHEMA & TABLES
-- -----------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.ebook_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_number INTEGER NOT NULL DEFAULT 1 CHECK (edition_number >= 1),
  version_name TEXT NOT NULL DEFAULT 'First Edition',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_current_edition BOOLEAN NOT NULL DEFAULT TRUE,
  pdf_storage_path TEXT,
  pdf_file_size_bytes BIGINT CHECK (pdf_file_size_bytes IS NULL OR pdf_file_size_bytes >= 0),
  pdf_checksum TEXT,
  pdf_original_filename TEXT,
  pdf_uploaded_at TIMESTAMPTZ,
  page_count INTEGER CHECK (page_count IS NULL OR page_count >= 0),
  price_read_online_paise INTEGER NOT NULL DEFAULT 4900 CHECK (price_read_online_paise >= 0),
  price_read_download_paise INTEGER NOT NULL DEFAULT 9900 CHECK (price_read_download_paise >= 0),
  price_upgrade_pdf_paise INTEGER NOT NULL DEFAULT 5000 CHECK (price_upgrade_pdf_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_ebook_edition UNIQUE (ebook_id, edition_number)
);

CREATE TABLE IF NOT EXISTS public.ebook_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL CHECK (chapter_index >= 1),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_body TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  is_free_sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_edition_chapter_index UNIQUE (edition_id, chapter_index),
  CONSTRAINT unique_edition_chapter_slug UNIQUE (edition_id, slug)
);

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

CREATE TABLE IF NOT EXISTS public.ebook_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ebooks_status ON public.ebooks(status);
CREATE INDEX IF NOT EXISTS idx_ebooks_slug ON public.ebooks(slug);
CREATE INDEX IF NOT EXISTS idx_ebook_editions_ebook ON public.ebook_editions(ebook_id);
CREATE INDEX IF NOT EXISTS idx_ebook_editions_status ON public.ebook_editions(status);
CREATE INDEX IF NOT EXISTS idx_ebook_chapters_edition ON public.ebook_chapters(edition_id, chapter_index);
CREATE INDEX IF NOT EXISTS idx_ebook_chapters_sample ON public.ebook_chapters(edition_id, is_free_sample);
CREATE INDEX IF NOT EXISTS idx_ebook_assets_ebook ON public.ebook_assets(ebook_id);
CREATE INDEX IF NOT EXISTS idx_ebook_audit_actor ON public.ebook_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_ebook_audit_entity ON public.ebook_audit_logs(entity_type, entity_id);

-- RLS
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

DROP POLICY IF EXISTS "Public can view sample chapters" ON public.ebook_chapters;
CREATE POLICY "Public can view sample chapters"
ON public.ebook_chapters FOR SELECT
TO anon, authenticated
USING (
  is_free_sample = TRUE 
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.ebook_editions e
    WHERE e.id = ebook_chapters.edition_id AND e.status = 'published' AND is_free_sample = TRUE
  )
);

DROP POLICY IF EXISTS "Admins can manage chapters" ON public.ebook_chapters;
CREATE POLICY "Admins can manage chapters"
ON public.ebook_chapters FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

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

-- Storage policies
DROP POLICY IF EXISTS "Public read ebook-covers" ON storage.objects;
CREATE POLICY "Public read ebook-covers"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'ebook-covers');

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

-- -----------------------------------------------------------------------------
-- 3. ATOMIC OPS, STORED PROCEDURES & UNIQUE CONSTRAINTS
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_ebook_editions_single_current 
ON public.ebook_editions(ebook_id) 
WHERE is_current_edition = true;

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
  v_unready_chapter_count INTEGER;
  v_cover_asset_count INTEGER;
  v_caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- 1. Authorization: Verify caller is an administrator
  SELECT (role = 'admin') INTO v_caller_is_admin
  FROM public.profiles
  WHERE id = COALESCE(auth.uid(), p_actor_id);

  IF NOT COALESCE(v_caller_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Lock master book record first
  SELECT * INTO v_book FROM public.ebooks WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'eBook not found with ID %', p_book_id;
  END IF;

  -- 3. Lock target edition record
  SELECT * INTO v_edition FROM public.ebook_editions 
  WHERE id = p_edition_id AND ebook_id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Edition not found with ID % for eBook %', p_edition_id, p_book_id;
  END IF;

  -- 4. Idempotency check
  IF v_edition.status = 'published' AND v_edition.is_current_edition = TRUE AND v_book.status = 'published' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_published', true,
      'edition_id', p_edition_id,
      'book_id', p_book_id,
      'edition_number', v_edition.edition_number
    );
  END IF;

  -- 5. Strict Server-Side Prerequisite Validation:
  IF TRIM(COALESCE(v_book.title, '')) = '' OR TRIM(COALESCE(v_book.author, '')) = '' THEN
    RAISE EXCEPTION 'Publication precondition failed: eBook must have non-empty title and author.';
  END IF;

  SELECT COUNT(*) INTO v_cover_asset_count
  FROM public.ebook_assets
  WHERE ebook_id = p_book_id AND asset_kind = 'cover';

  IF (v_book.cover_image_url IS NULL OR LENGTH(TRIM(v_book.cover_image_url)) = 0) AND v_cover_asset_count = 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: Valid cover image asset or cover_image_url required.';
  END IF;

  IF v_edition.pdf_storage_path IS NULL OR LENGTH(TRIM(v_edition.pdf_storage_path)) = 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: Valid publication PDF storage path required.';
  END IF;

  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'ready'),
    COUNT(*) FILTER (WHERE status != 'ready'),
    COUNT(*) FILTER (WHERE is_free_sample = TRUE AND status = 'ready')
  INTO 
    v_chapter_count,
    v_ready_chapter_count,
    v_unready_chapter_count,
    v_sample_chapter_count
  FROM public.ebook_chapters
  WHERE edition_id = p_edition_id;

  IF v_chapter_count = 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: At least one chapter is required.';
  END IF;

  IF v_unready_chapter_count > 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: All chapters must be in ready status (% unready found).', v_unready_chapter_count;
  END IF;

  IF v_sample_chapter_count = 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: At least one ready chapter must be designated as a free sample.';
  END IF;

  IF v_edition.price_read_online_paise < 0 OR v_edition.price_read_download_paise < 0 OR v_edition.price_upgrade_pdf_paise < 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: Prices must not be negative.';
  END IF;

  -- 6. Demote all existing editions of this book from is_current_edition
  UPDATE public.ebook_editions
  SET is_current_edition = FALSE,
      updated_at = v_now
  WHERE ebook_id = p_book_id AND id != p_edition_id;

  -- 7. Promote target edition to published and current
  UPDATE public.ebook_editions
  SET status = 'published',
      is_current_edition = TRUE,
      published_at = COALESCE(v_edition.published_at, v_now),
      updated_at = v_now
  WHERE id = p_edition_id;

  -- 8. Promote master book status to published
  UPDATE public.ebooks
  SET status = 'published',
      updated_at = v_now
  WHERE id = p_book_id;

  -- 9. Insert audit log record atomically
  INSERT INTO public.ebook_audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
  VALUES (
    COALESCE(auth.uid(), p_actor_id),
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
    'published_at', v_now,
    'chapters_count', v_chapter_count
  );
END;
$$;

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
  v_book RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_other_published_count INTEGER;
  v_caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- 1. Authorization: Verify caller is an administrator
  SELECT (role = 'admin') INTO v_caller_is_admin
  FROM public.profiles
  WHERE id = COALESCE(auth.uid(), p_actor_id);

  IF NOT COALESCE(v_caller_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Lock master book and edition
  SELECT * INTO v_book FROM public.ebooks WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'eBook not found with ID %', p_book_id;
  END IF;

  SELECT * INTO v_edition FROM public.ebook_editions 
  WHERE id = p_edition_id AND ebook_id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Edition not found with ID % for eBook %', p_edition_id, p_book_id;
  END IF;

  -- 3. Update edition: demote from current and set status to draft/withdrawn
  UPDATE public.ebook_editions
  SET status = 'draft',
      is_current_edition = FALSE,
      updated_at = v_now
  WHERE id = p_edition_id;

  -- 4. Check if any other published editions exist for this book
  SELECT COUNT(*) INTO v_other_published_count
  FROM public.ebook_editions
  WHERE ebook_id = p_book_id AND status = 'published' AND id != p_edition_id;

  IF v_other_published_count = 0 THEN
    UPDATE public.ebooks
    SET status = 'draft',
        updated_at = v_now
    WHERE id = p_book_id;
  END IF;

  -- 5. Audit log
  INSERT INTO public.ebook_audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
  VALUES (
    COALESCE(auth.uid(), p_actor_id),
    'edition_withdrawn',
    'edition',
    p_edition_id::text,
    jsonb_build_object(
      'book_id', p_book_id,
      'edition_number', v_edition.edition_number,
      'withdrawn_at', v_now,
      'remaining_published_editions', v_other_published_count
    ),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'book_id', p_book_id,
    'edition_id', p_edition_id,
    'edition_number', v_edition.edition_number,
    'is_current_edition', false,
    'status', 'draft',
    'remaining_published_editions', v_other_published_count
  );
END;
$$;

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
SET search_path = public, auth
AS $$
DECLARE
  v_next_edition_number INTEGER;
  v_new_edition_id UUID;
  v_edition RECORD;
  v_chapters_cloned INTEGER := 0;
  v_now TIMESTAMPTZ := NOW();
  v_caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- 1. Authorization: Verify caller is an administrator
  SELECT (role = 'admin') INTO v_caller_is_admin
  FROM public.profiles
  WHERE id = COALESCE(auth.uid(), p_actor_id);

  IF NOT COALESCE(v_caller_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Forbidden: Administrator privileges required.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Row-level lock on master ebook record to serialize concurrent edition revisions
  PERFORM id FROM public.ebooks WHERE id = p_book_id FOR UPDATE;

  -- 3. Calculate next edition number safely under lock
  SELECT COALESCE(MAX(edition_number), 0) + 1 INTO v_next_edition_number
  FROM public.ebook_editions
  WHERE ebook_id = p_book_id;

  -- 4. Insert new draft edition
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

  -- 5. Clone chapters with new UUIDs and target edition_id
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
      gen_random_uuid(),
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

  -- 6. Insert audit log record
  IF COALESCE(auth.uid(), p_actor_id) IS NOT NULL THEN
    INSERT INTO public.ebook_audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
    VALUES (
      COALESCE(auth.uid(), p_actor_id),
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

-- Permissions
REVOKE ALL ON FUNCTION public.publish_ebook_edition(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_ebook_edition(UUID, UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.publish_ebook_edition(UUID, UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.withdraw_ebook_edition(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_ebook_edition(UUID, UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.withdraw_ebook_edition(UUID, UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_ebook_edition_revision(UUID, TEXT, UUID, UUID, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_ebook_edition_revision(UUID, TEXT, UUID, UUID, INTEGER, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_ebook_edition_revision(UUID, TEXT, UUID, UUID, INTEGER, INTEGER, INTEGER) TO authenticated, service_role;
