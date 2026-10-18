-- =============================================================================
-- KnowledgePaat — Phase 2: Atomic eBook Operations & Concurrency Control
-- Migration File: supabase_ebook_atomic_ops.sql
-- Description: Adds atomic stored procedures for publication, withdrawal, and
--              revision creation, plus partial unique constraint for current editions.
-- =============================================================================

-- 1. Partial Unique Index to Enforce Exactly One (or Zero) Current Edition Per eBook
CREATE UNIQUE INDEX IF NOT EXISTS idx_ebook_editions_single_current 
ON public.ebook_editions(ebook_id) 
WHERE is_current_edition = true;

-- 2. Atomic Publication Function with Prerequisite Validation & Row Locking
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

  -- 2. Lock master book record first (prevents deadlock and serializes concurrent operations)
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

  -- 4. Idempotency: if already current published edition, return cleanly
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
  -- 5a. Title & Author
  IF TRIM(COALESCE(v_book.title, '')) = '' OR TRIM(COALESCE(v_book.author, '')) = '' THEN
    RAISE EXCEPTION 'Publication precondition failed: eBook must have non-empty title and author.';
  END IF;

  -- 5b. Cover Image
  SELECT COUNT(*) INTO v_cover_asset_count
  FROM public.ebook_assets
  WHERE ebook_id = p_book_id AND asset_kind = 'cover';

  IF (v_book.cover_image_url IS NULL OR LENGTH(TRIM(v_book.cover_image_url)) = 0) AND v_cover_asset_count = 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: Valid cover image asset or cover_image_url required.';
  END IF;

  -- 5c. Validated PDF in Storage
  IF v_edition.pdf_storage_path IS NULL OR LENGTH(TRIM(v_edition.pdf_storage_path)) = 0 THEN
    RAISE EXCEPTION 'Publication precondition failed: Valid publication PDF storage path required.';
  END IF;

  -- 5d. Chapter checks
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

  -- 5e. Server-side prices
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

-- 3. Atomic Withdrawal Function with Row Locking
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
  -- Note: published_at is strictly preserved so historical immutability is maintained!
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

-- 4. Atomic Revision Creation Function with Master Book Row-Level Locking
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

  -- 4. Insert new draft edition (strictly published_at = null, is_current_edition = false)
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

-- 5. Configure Permissions & Access Controls on Atomic RPCs
REVOKE ALL ON FUNCTION public.publish_ebook_edition(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_ebook_edition(UUID, UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.publish_ebook_edition(UUID, UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.withdraw_ebook_edition(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_ebook_edition(UUID, UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.withdraw_ebook_edition(UUID, UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_ebook_edition_revision(UUID, TEXT, UUID, UUID, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_ebook_edition_revision(UUID, TEXT, UUID, UUID, INTEGER, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_ebook_edition_revision(UUID, TEXT, UUID, UUID, INTEGER, INTEGER, INTEGER) TO authenticated, service_role;
