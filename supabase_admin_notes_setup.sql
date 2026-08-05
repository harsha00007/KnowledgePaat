-- CareerLaunch Phase 14: Admin Notes Management Setup
-- Run this script in your Supabase SQL Editor

-- 1. Alter notes table to add missing fields for admin management
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
ADD COLUMN IF NOT EXISTS technology text;

-- Update existing notes to have Active status
UPDATE public.notes SET status = 'Active' WHERE status IS NULL;

-- 2. Update RLS policies to allow Admins to manage notes and restrict students to Active notes

-- Drop the old public read policy for tables
DROP POLICY IF EXISTS "Notes are viewable by everyone" ON public.notes;

-- Create policy for Students to view ONLY Active notes
CREATE POLICY "Students can view active notes"
  ON public.notes FOR SELECT
  USING (
    status = 'Active' 
    OR 
    (auth.uid() IS NOT NULL AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  );

-- Create policies for Admin INSERT, UPDATE, DELETE on notes
DROP POLICY IF EXISTS "Admins can insert notes" ON public.notes;
CREATE POLICY "Admins can insert notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can update notes" ON public.notes;
CREATE POLICY "Admins can update notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins can delete notes" ON public.notes;
CREATE POLICY "Admins can delete notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- 3. Update RLS for Storage Bucket (notes)
-- Drop old public read policy just in case
DROP POLICY IF EXISTS "Allow authenticated read access for notes" ON storage.objects;

-- Recreate policy for SELECT (anyone can read for now, or just authenticated)
CREATE POLICY "Allow authenticated read access for notes" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'notes');

-- Create policies for Admins to INSERT, UPDATE, DELETE objects in 'notes' bucket
DROP POLICY IF EXISTS "Admins can insert objects in notes bucket" ON storage.objects;
CREATE POLICY "Admins can insert objects in notes bucket" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (
    bucket_id = 'notes' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update objects in notes bucket" ON storage.objects;
CREATE POLICY "Admins can update objects in notes bucket" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING (
    bucket_id = 'notes' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete objects in notes bucket" ON storage.objects;
CREATE POLICY "Admins can delete objects in notes bucket" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING (
    bucket_id = 'notes' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- 4. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column_notes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notes_modtime ON public.notes;
CREATE TRIGGER update_notes_modtime
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE PROCEDURE update_modified_column_notes();
