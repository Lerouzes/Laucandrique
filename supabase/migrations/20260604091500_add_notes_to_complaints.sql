-- 20260604091500_add_notes_to_complaints.sql
-- Add comment/note columns to complaints table

ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS my_notes TEXT;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS manager_notes TEXT;
