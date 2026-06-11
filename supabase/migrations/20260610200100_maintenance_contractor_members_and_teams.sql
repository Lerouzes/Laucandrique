-- supabase/migrations/20260610200100_maintenance_contractor_members_and_teams.sql

-- 1. Create maintenance_contractor_members table
CREATE TABLE IF NOT EXISTS public.maintenance_contractor_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'team_leader', 'employee')),
    password TEXT NOT NULL,
    team TEXT CHECK (team IN ('team_1', 'team_2')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add team column to maintenance_appointments
ALTER TABLE public.maintenance_appointments ADD COLUMN IF NOT EXISTS team TEXT CHECK (team IN ('team_1', 'team_2'));

-- 3. Enable RLS
ALTER TABLE public.maintenance_contractor_members ENABLE ROW LEVEL SECURITY;

-- 4. Policies for maintenance_contractor_members
CREATE POLICY "Allow authenticated full access on maintenance_contractor_members" 
ON public.maintenance_contractor_members 
FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select on maintenance_contractor_members" 
ON public.maintenance_contractor_members 
FOR SELECT TO public 
USING (
    contractor_id IN (
        SELECT contractor_id FROM public.maintenance_contractor_tokens
    )
);
