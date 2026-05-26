-- 1. Add coaching/support notes and performance score to one_on_ones
ALTER TABLE public.one_on_ones 
ADD COLUMN IF NOT EXISTS workload_notes TEXT,
ADD COLUMN IF NOT EXISTS prioritization_notes TEXT,
ADD COLUMN IF NOT EXISTS stress_notes TEXT,
ADD COLUMN IF NOT EXISTS organization_notes TEXT,
ADD COLUMN IF NOT EXISTS support_needed TEXT,
ADD COLUMN IF NOT EXISTS training_needed TEXT,
ADD COLUMN IF NOT EXISTS meeting_score INTEGER;

-- 2. Add commitment tracking fields to one_on_one_commitments
ALTER TABLE public.one_on_one_commitments
ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT 'Manager',
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS due_next_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Open',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add notes and review status to one_on_one_complaints for consistency
ALTER TABLE public.one_on_one_complaints
ADD COLUMN IF NOT EXISTS my_notes TEXT,
ADD COLUMN IF NOT EXISTS manager_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT FALSE;

-- 4. Create manager_operational_risks table
CREATE TABLE IF NOT EXISTS public.manager_operational_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID REFERENCES public.managers(id) ON DELETE CASCADE NOT NULL,
    one_on_one_id UUID REFERENCES public.one_on_ones(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('active', 'resolved')) DEFAULT 'active',
    resolution_notes TEXT,
    resolved_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on manager_operational_risks
ALTER TABLE public.manager_operational_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on manager_operational_risks"
ON public.manager_operational_risks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Create one_on_one_task_email_audits table
CREATE TABLE IF NOT EXISTS public.one_on_one_task_email_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    one_on_one_id UUID REFERENCES public.one_on_ones(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('task', 'email')) NOT NULL,
    title TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    has_followup_date BOOLEAN DEFAULT FALSE,
    has_good_description BOOLEAN DEFAULT FALSE,
    has_actions BOOLEAN DEFAULT FALSE,
    has_category_selected BOOLEAN DEFAULT FALSE,
    task_created_date DATE,
    complexity TEXT CHECK (complexity IN ('low', 'medium', 'high')),
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on one_on_one_task_email_audits
ALTER TABLE public.one_on_one_task_email_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on one_on_one_task_email_audits"
ON public.one_on_one_task_email_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Create review helper tables for syndicate audits and assembly evaluations
CREATE TABLE IF NOT EXISTS public.one_on_one_syndicate_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    one_on_one_id UUID REFERENCES public.one_on_ones(id) ON DELETE CASCADE NOT NULL,
    audit_id UUID REFERENCES public.syndicate_audits(id) ON DELETE CASCADE NOT NULL,
    my_notes TEXT,
    manager_notes TEXT,
    reviewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.one_on_one_syndicate_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on one_on_one_syndicate_audits"
ON public.one_on_one_syndicate_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.one_on_one_assemblies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    one_on_one_id UUID REFERENCES public.one_on_ones(id) ON DELETE CASCADE NOT NULL,
    assembly_evaluation_id UUID REFERENCES public.assembly_evaluations(id) ON DELETE CASCADE NOT NULL,
    my_notes TEXT,
    manager_notes TEXT,
    reviewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.one_on_one_assemblies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on one_on_one_assemblies"
ON public.one_on_one_assemblies FOR ALL TO authenticated USING (true) WITH CHECK (true);
