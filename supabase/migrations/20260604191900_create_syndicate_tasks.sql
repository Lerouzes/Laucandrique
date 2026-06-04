-- 20260604191900_create_syndicate_tasks.sql
-- Database changes for Syndicate Audits and Tasks tracking

-- 1. Add manager_assigned_at tracking to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS manager_assigned_at TIMESTAMPTZ;

-- Initialize manager_assigned_at for existing clients
UPDATE public.clients SET manager_assigned_at = COALESCE(created_at, NOW()) WHERE manager_assigned_at IS NULL;

-- Create function and trigger to automatically record manager assignment change
CREATE OR REPLACE FUNCTION public.track_client_manager_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.manager_id IS DISTINCT FROM NEW.manager_id) OR (OLD.manager_assigned_at IS NULL) THEN
        NEW.manager_assigned_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_client_manager_change ON public.clients;
CREATE TRIGGER trg_track_client_manager_change
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.track_client_manager_change();

-- 2. Add detailed workload columns to syndicate_workload
ALTER TABLE public.syndicate_workload ADD COLUMN IF NOT EXISTS syndicate_comms_count INTEGER;
ALTER TABLE public.syndicate_workload ADD COLUMN IF NOT EXISTS manager_comms_count INTEGER;
ALTER TABLE public.syndicate_workload ADD COLUMN IF NOT EXISTS board_meetings_count INTEGER;

-- 3. Create syndicate_tasks table
CREATE TABLE IF NOT EXISTS public.syndicate_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT, -- e.g. 'Gouvernance', 'Financier', 'Opérations', 'Entretien'
    status TEXT CHECK (status IN ('open', 'completed', 'late')) DEFAULT 'late',
    created_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.syndicate_tasks ENABLE ROW LEVEL SECURITY;

-- Policy for full authenticated access
CREATE POLICY "Allow authenticated full access on syndicate_tasks" 
ON public.syndicate_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
