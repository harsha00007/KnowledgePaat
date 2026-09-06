-- Add optional item_reference_id column to store_products table
-- Run this in your Supabase SQL Editor if you want direct foreign reference linking
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS item_reference_id TEXT;
