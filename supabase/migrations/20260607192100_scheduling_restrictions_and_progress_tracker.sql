-- Make campaign dates nullable for Phase 1 Surveys
ALTER TABLE public.maintenance_campaigns ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.maintenance_campaigns ALTER COLUMN end_date DROP NOT NULL;

-- Add scheduling/rescheduling restrictions columns to campaigns
ALTER TABLE public.maintenance_campaigns ADD COLUMN IF NOT EXISTS allow_reschedule BOOLEAN DEFAULT TRUE;
ALTER TABLE public.maintenance_campaigns ADD COLUMN IF NOT EXISTS reschedule_cutoff_hours INTEGER DEFAULT 24;
ALTER TABLE public.maintenance_campaigns ADD COLUMN IF NOT EXISTS response_deadline_date TIMESTAMP WITH TIME ZONE;

-- Create contractor progress tracking table
CREATE TABLE IF NOT EXISTS public.maintenance_contractor_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.maintenance_campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('not_started', 'started', 'finished')) DEFAULT 'not_started',
    started_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(campaign_id, date)
);

-- RLS for contractor progress
ALTER TABLE public.maintenance_contractor_progress ENABLE ROW LEVEL SECURITY;

-- Policies for contractor progress
CREATE POLICY "Allow authenticated read for contractor progress"
    ON public.maintenance_contractor_progress FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow anonymous read for contractor progress (resident portal)"
    ON public.maintenance_contractor_progress FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow all actions for authenticated users (managers / contractors)"
    ON public.maintenance_contractor_progress FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
