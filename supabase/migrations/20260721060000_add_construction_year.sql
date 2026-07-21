-- Migration: 20260721060000_add_construction_year.sql

-- Add construction_year column to clients table if it does not exist
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS construction_year INTEGER;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
