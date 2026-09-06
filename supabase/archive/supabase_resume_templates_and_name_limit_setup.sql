-- ============================================================================
-- KnowledgePaat: Resume Templates & Profile Name Change Limit Setup
-- Description: Non-breaking migration adding name_change_count and resume_templates table
-- ============================================================================

-- 1. Add name_change_count to profiles table if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name_change_count INTEGER NOT NULL DEFAULT 0;

-- 2. Create resume_templates table
CREATE TABLE IF NOT EXISTS public.resume_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  minimum_plan TEXT DEFAULT 'starter',
  price NUMERIC DEFAULT 49.00,
  is_free BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS
ALTER TABLE public.resume_templates ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
DROP POLICY IF EXISTS "Resume templates are viewable by everyone" ON public.resume_templates;
CREATE POLICY "Resume templates are viewable by everyone"
  ON public.resume_templates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins have full access to resume templates" ON public.resume_templates;
CREATE POLICY "Admins have full access to resume templates"
  ON public.resume_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
