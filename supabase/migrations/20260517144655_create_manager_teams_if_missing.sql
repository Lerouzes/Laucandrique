CREATE TABLE IF NOT EXISTS public.manager_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.manager_teams ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'manager_teams'
      AND policyname = 'Allow authenticated full access on manager_teams'
  ) THEN
    CREATE POLICY "Allow authenticated full access on manager_teams"
    ON public.manager_teams FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.managers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.managers ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.manager_teams(id) ON DELETE SET NULL;