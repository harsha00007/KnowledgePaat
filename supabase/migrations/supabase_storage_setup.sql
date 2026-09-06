-- CareerLaunch Phase 5: Storage Setup Script
-- Run this script in your Supabase SQL Editor

-- 1. Update the profiles table to store resume metadata
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS resume_filename TEXT,
ADD COLUMN IF NOT EXISTS resume_uploaded_at TIMESTAMP WITH TIME ZONE;

-- 2. Create the Storage Bucket for Resumes (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes', 
  'resumes', 
  false, 
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET 
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- 3. Set up Row Level Security (RLS) for the Storage Bucket

-- Ensure RLS is enabled on storage.objects (usually enabled by default in Supabase)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts when re-running
DROP POLICY IF EXISTS "Allow individual insert access" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual update access" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual delete access" ON storage.objects;

-- Create Policy: Users can only upload their own resumes
CREATE POLICY "Allow individual insert access" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'resumes' AND auth.uid() = owner);

-- Create Policy: Users can only update their own resumes
CREATE POLICY "Allow individual update access" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'resumes' AND auth.uid() = owner);

-- Create Policy: Users can only read their own resumes
CREATE POLICY "Allow individual read access" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'resumes' AND auth.uid() = owner);

-- Create Policy: Users can only delete their own resumes
CREATE POLICY "Allow individual delete access" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'resumes' AND auth.uid() = owner);
