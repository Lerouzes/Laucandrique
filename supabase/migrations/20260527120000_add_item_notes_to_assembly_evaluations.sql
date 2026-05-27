-- Add item_notes column to assembly_evaluations table
ALTER TABLE assembly_evaluations ADD COLUMN IF NOT EXISTS item_notes JSONB DEFAULT '{}'::jsonb;
