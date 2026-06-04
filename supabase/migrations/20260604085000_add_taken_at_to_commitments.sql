-- 20260604085000_add_taken_at_to_commitments.sql
-- Add taken_at column to one_on_one_commitments and make client_id nullable in complaints

ALTER TABLE public.one_on_one_commitments ADD COLUMN IF NOT EXISTS taken_at DATE;

-- Update existing commitments to have taken_at equal to their one_on_one meeting date
UPDATE public.one_on_one_commitments c
SET taken_at = m.meeting_date
FROM public.one_on_ones m
WHERE c.one_on_one_id = m.id AND c.taken_at IS NULL;

-- Make client_id nullable in complaints table to support team-wide/general manager notes
ALTER TABLE public.complaints ALTER COLUMN client_id DROP NOT NULL;
