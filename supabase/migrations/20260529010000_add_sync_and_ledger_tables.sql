-- Create sync_approval_queue table
CREATE TABLE IF NOT EXISTS public.sync_approval_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    external_m365_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    approval_status TEXT NOT NULL CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
    requested_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sync_approval_queue ENABLE ROW LEVEL SECURITY;

-- Policy to allow full access to authenticated users
CREATE POLICY "Allow authenticated full access on sync_approval_queue" 
ON public.sync_approval_queue 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create data_history_ledger table
CREATE TABLE IF NOT EXISTS public.data_history_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    processed_by TEXT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.data_history_ledger ENABLE ROW LEVEL SECURITY;

-- Policy to allow full access to authenticated users
CREATE POLICY "Allow authenticated full access on data_history_ledger" 
ON public.data_history_ledger 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
