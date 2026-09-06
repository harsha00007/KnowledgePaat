-- ==============================================================================
-- GRADZENX PLATFORM SETTINGS & THEME SUPPORT (ADMIN-CONTROLLED)
-- ==============================================================================

-- 1. Create platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    theme_feature_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure theme_feature_enabled column exists if table was pre-existing
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS theme_feature_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Seed default row (default: FALSE = Light Theme strictly enforced)
INSERT INTO public.platform_settings (id, theme_feature_enabled)
VALUES ('global', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Anyone (anon, student, admin) can read global platform settings (needed for client rendering)
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings
FOR SELECT USING (true);

-- ONLY Admin can update platform settings
DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Admins can update platform settings" ON public.platform_settings
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ONLY Admin can insert platform settings
DROP POLICY IF EXISTS "Admins can insert platform settings" ON public.platform_settings;
CREATE POLICY "Admins can insert platform settings" ON public.platform_settings
FOR INSERT
WITH CHECK (public.is_admin());

-- 5. Permissions & Grants
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO authenticated;
