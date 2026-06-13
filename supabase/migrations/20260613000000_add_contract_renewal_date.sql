-- Migration: 20260613000000_add_contract_renewal_date.sql

-- Add renewal_date column to clients and contracts tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS renewal_date DATE;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS renewal_date DATE;
