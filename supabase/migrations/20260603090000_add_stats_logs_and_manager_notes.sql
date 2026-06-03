-- 1. Create manager_stats_logs table for weekly ad-hoc assessments
CREATE TABLE IF NOT EXISTS public.manager_stats_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('emails_over_48h', 'late_tasks', 'bills_no_notes_over_7d')),
    value INTEGER NOT NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.manager_stats_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform all operations
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.manager_stats_logs;
CREATE POLICY "Allow all for authenticated users" ON public.manager_stats_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Add type column to complaints table to distinguish complaints from manager notes
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'complaint' CHECK (type IN ('complaint', 'note'));

-- 3. Make title nullable in complaints so internal notes don't require titles
ALTER TABLE public.complaints ALTER COLUMN title DROP NOT NULL;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
