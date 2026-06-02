-- 20260602000000_add_aga_fields.sql
-- Add aga_planned_date, aga_completed_date, and aga_status to clients table

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS aga_planned_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS aga_completed_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS aga_status TEXT DEFAULT 'pending';
