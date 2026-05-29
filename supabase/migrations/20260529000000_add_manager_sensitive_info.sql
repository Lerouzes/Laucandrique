-- Migration: Add manager sensitive info fields (salary, direction_notes)
-- Date: 2026-05-29

ALTER TABLE public.managers ADD COLUMN IF NOT EXISTS salary NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.managers ADD COLUMN IF NOT EXISTS direction_notes TEXT;
