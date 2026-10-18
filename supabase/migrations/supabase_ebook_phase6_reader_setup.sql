-- =============================================================================
-- KnowledgePaat — Phase 6: Protected Reader, Progress, Bookmarks & Preferences
-- Migration File: supabase_ebook_phase6_reader_setup.sql
-- Description: Creates public.ebook_bookmarks and public.ebook_reading_preferences
--              tables, RLS policies, performance indexes, and updates
--              chapter access policies for entitled readers.
-- Target Environment: Staging Supabase (lzuinimbsdxnhzmjpxmr)
-- =============================================================================

-- 1. Bookmarks Table
CREATE TABLE IF NOT EXISTS public.ebook_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES public.ebook_editions(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.ebook_chapters(id) ON DELETE CASCADE,
  scroll_percent NUMERIC(5, 2) DEFAULT 0.0 CHECK (scroll_percent >= 0 AND scroll_percent <= 100),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_customer_chapter_bookmark UNIQUE (customer_id, edition_id, chapter_id)
);

-- 2. Reading Preferences Table
CREATE TABLE IF NOT EXISTS public.ebook_reading_preferences (
  customer_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'sepia', 'dark')),
  font_size TEXT NOT NULL DEFAULT 'normal' CHECK (font_size IN ('small', 'normal', 'large', 'xl')),
  font_family TEXT NOT NULL DEFAULT 'sans' CHECK (font_family IN ('sans', 'serif', 'mono')),
  line_width TEXT NOT NULL DEFAULT 'medium' CHECK (line_width IN ('narrow', 'medium', 'wide')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ebook_bookmarks_customer ON public.ebook_bookmarks(customer_id);
CREATE INDEX IF NOT EXISTS idx_ebook_bookmarks_lookup ON public.ebook_bookmarks(customer_id, edition_id);
CREATE INDEX IF NOT EXISTS idx_ebook_bookmarks_chapter ON public.ebook_bookmarks(customer_id, chapter_id);

-- 4. Enable Row Level Security
ALTER TABLE public.ebook_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_reading_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Bookmarks RLS Policies
DROP POLICY IF EXISTS "Customers can view own bookmarks" ON public.ebook_bookmarks;
CREATE POLICY "Customers can view own bookmarks"
ON public.ebook_bookmarks FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can insert own bookmarks" ON public.ebook_bookmarks;
CREATE POLICY "Customers can insert own bookmarks"
ON public.ebook_bookmarks FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can delete own bookmarks" ON public.ebook_bookmarks;
CREATE POLICY "Customers can delete own bookmarks"
ON public.ebook_bookmarks FOR DELETE
TO authenticated
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all bookmarks" ON public.ebook_bookmarks;
CREATE POLICY "Admins can view all bookmarks"
ON public.ebook_bookmarks FOR SELECT
TO authenticated
USING (public.is_admin());

-- 6. Reading Preferences RLS Policies
DROP POLICY IF EXISTS "Customers can view own reading preferences" ON public.ebook_reading_preferences;
CREATE POLICY "Customers can view own reading preferences"
ON public.ebook_reading_preferences FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can upsert own reading preferences" ON public.ebook_reading_preferences;
CREATE POLICY "Customers can upsert own reading preferences"
ON public.ebook_reading_preferences FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own reading preferences" ON public.ebook_reading_preferences;
CREATE POLICY "Customers can update own reading preferences"
ON public.ebook_reading_preferences FOR UPDATE
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- 7. Chapter Select Policy for Entitled Customers
DROP POLICY IF EXISTS "Customers can view owned edition chapters" ON public.ebook_chapters;
CREATE POLICY "Customers can view owned edition chapters"
ON public.ebook_chapters FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (is_free_sample = TRUE AND EXISTS (
    SELECT 1 FROM public.ebooks WHERE id = ebook_id AND status = 'published'
  ))
  OR EXISTS (
    SELECT 1 FROM public.ebook_entitlements
    WHERE customer_id = auth.uid()
      AND edition_id = public.ebook_chapters.edition_id
      AND is_active = TRUE
      AND can_read_online = TRUE
  )
);
