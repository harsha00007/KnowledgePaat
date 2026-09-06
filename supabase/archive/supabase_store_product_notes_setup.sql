-- GradZenX Phase G4: Store Product Notes Relationship Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create store_product_notes junction table
CREATE TABLE IF NOT EXISTS public.store_product_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_product_note UNIQUE(product_id, note_id)
);

-- 2. Indexes for fast joins and lookups
CREATE INDEX IF NOT EXISTS idx_store_product_notes_product ON public.store_product_notes(product_id);
CREATE INDEX IF NOT EXISTS idx_store_product_notes_note ON public.store_product_notes(note_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.store_product_notes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Anyone can view store product notes" ON public.store_product_notes;
CREATE POLICY "Anyone can view store product notes"
ON public.store_product_notes FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Admins manage store product notes" ON public.store_product_notes;
CREATE POLICY "Admins manage store product notes"
ON public.store_product_notes FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
