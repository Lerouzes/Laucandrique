-- Migration: 20260616100000_add_cotisation_columns_to_audits.sql

ALTER TABLE public.syndicate_audits ADD COLUMN IF NOT EXISTS cotisation_fonds_exploitation NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.syndicate_audits ADD COLUMN IF NOT EXISTS cotisation_fonds_prevoyance NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.syndicate_audits ADD COLUMN IF NOT EXISTS cotisation_fonds_assurance NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.syndicate_audits ADD COLUMN IF NOT EXISTS cotisation_fonds_total NUMERIC(15,2) DEFAULT 0.00;
