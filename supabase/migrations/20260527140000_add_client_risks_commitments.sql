-- Add client_id and future_actions to manager_operational_risks
ALTER TABLE public.manager_operational_risks
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS future_actions TEXT;

-- Add client_id to one_on_one_commitments
ALTER TABLE public.one_on_one_commitments
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
