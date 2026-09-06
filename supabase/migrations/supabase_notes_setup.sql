-- CareerLaunch Phase 8: Notes Module Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create the Storage Bucket for Notes (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notes', 
  'notes', 
  false, 
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- 2. Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  file_url text NOT NULL, -- The path within the 'notes' storage bucket
  file_size text NOT NULL, -- E.g. '2.4 MB'
  tags text[] DEFAULT '{}'::text[],
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create saved_notes table
CREATE TABLE IF NOT EXISTS public.saved_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(student_id, note_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for Tables

-- Notes are publicly readable (or restrict to authenticated if preferred)
DROP POLICY IF EXISTS "Notes are viewable by everyone" ON public.notes;
CREATE POLICY "Notes are viewable by everyone" 
  ON public.notes FOR SELECT 
  USING (true);

-- Saved Notes: Students manage their own saved notes
DROP POLICY IF EXISTS "Students can view their own saved notes" ON public.saved_notes;
CREATE POLICY "Students can view their own saved notes" 
  ON public.saved_notes FOR SELECT 
  TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert their own saved notes" ON public.saved_notes;
CREATE POLICY "Students can insert their own saved notes" 
  ON public.saved_notes FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can delete their own saved notes" ON public.saved_notes;
CREATE POLICY "Students can delete their own saved notes" 
  ON public.saved_notes FOR DELETE 
  TO authenticated
  USING (auth.uid() = student_id);

-- 6. Create RLS Policies for Storage
-- Allow authenticated users to read PDFs from the 'notes' bucket
DROP POLICY IF EXISTS "Allow authenticated read access for notes" ON storage.objects;
CREATE POLICY "Allow authenticated read access for notes" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'notes');
