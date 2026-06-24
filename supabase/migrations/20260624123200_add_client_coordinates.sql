-- 20260624123200_add_client_coordinates.sql
-- Add latitude and longitude coordinates to clients for mapping and proximity analysis

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS longitude NUMERIC;
