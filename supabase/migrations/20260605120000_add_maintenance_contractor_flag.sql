-- supabase/migrations/20260605120000_add_maintenance_contractor_flag.sql
-- Add is_maintenance column to distinguish maintenance hub contractors from operations contractors
-- Add company_name for maintenance-specific entrepreneur records

ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS is_maintenance BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS company_name TEXT;
