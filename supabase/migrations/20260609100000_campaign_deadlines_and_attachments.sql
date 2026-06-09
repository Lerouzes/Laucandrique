-- Campaign Deadlines, Pre-Completed Interventions, and Campaign Attachments
ALTER TABLE public.maintenance_campaigns 
ADD COLUMN IF NOT EXISTS survey_deadline DATE,
ADD COLUMN IF NOT EXISTS scheduling_deadline DATE,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.maintenance_campaign_units
ADD COLUMN IF NOT EXISTS completed_elsewhere_date DATE,
ADD COLUMN IF NOT EXISTS completed_elsewhere_contractor TEXT;
