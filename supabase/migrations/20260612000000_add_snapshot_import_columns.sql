-- Migration: 20260612000000_add_snapshot_import_columns.sql

-- Add new columns to the clients table to support custom snapshot imports
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS amount_of_meetings INTEGER;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS team TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS package_pricing NUMERIC(12,2);
