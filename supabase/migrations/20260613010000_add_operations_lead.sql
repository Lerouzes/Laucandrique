-- Migration: 20260613010000_add_operations_lead.sql

-- Add operations_lead column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS operations_lead TEXT;

-- Add active column to managers table
ALTER TABLE public.managers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
