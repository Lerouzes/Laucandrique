-- Migration: Add website column to contractors table
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS website TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
