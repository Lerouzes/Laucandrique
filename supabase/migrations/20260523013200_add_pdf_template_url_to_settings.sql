-- Add pdf_template_url column to settings to store custom PDF background templates
ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS pdf_template_url text;
