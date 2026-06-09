-- Add internal notes column to maintenance campaigns
ALTER TABLE public.maintenance_campaigns 
ADD COLUMN IF NOT EXISTS notes TEXT;
