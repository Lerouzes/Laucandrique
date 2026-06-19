-- 20260619122815_redesign_one_on_ones.sql
-- Database migrations for the redesigned Gustav One-on-One meeting management page

-- 1. Alter clients to add assembly deadline configuration
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS aga_deadline_days INTEGER DEFAULT 90;

-- 2. Add redesign fields to one_on_ones
ALTER TABLE public.one_on_ones 
ADD COLUMN IF NOT EXISTS checkin_portfolio_status TEXT,
ADD COLUMN IF NOT EXISTS checkin_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS checkin_went_well TEXT,
ADD COLUMN IF NOT EXISTS checkin_most_concerning TEXT,
ADD COLUMN IF NOT EXISTS checkin_slowing_down TEXT,
ADD COLUMN IF NOT EXISTS checkin_support_needed TEXT,
ADD COLUMN IF NOT EXISTS coaching_success TEXT,
ADD COLUMN IF NOT EXISTS coaching_improvement TEXT,
ADD COLUMN IF NOT EXISTS coaching_clarification TEXT,
ADD COLUMN IF NOT EXISTS coaching_promised TEXT,
ADD COLUMN IF NOT EXISTS conclusion_portfolio_status TEXT,
ADD COLUMN IF NOT EXISTS conclusion_going_well TEXT,
ADD COLUMN IF NOT EXISTS conclusion_needs_attention TEXT,
ADD COLUMN IF NOT EXISTS conclusion_decisions TEXT,
ADD COLUMN IF NOT EXISTS conclusion_priorities TEXT,
ADD COLUMN IF NOT EXISTS next_meeting_date DATE,
ADD COLUMN IF NOT EXISTS priorities JSONB DEFAULT '[]'::jsonb;

-- 3. Create client_assembly_tracking table
CREATE TABLE IF NOT EXISTS public.client_assembly_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    fiscal_year_end DATE NOT NULL,
    target_date DATE NOT NULL,
    planned_date DATE,
    completed_date DATE,
    status TEXT DEFAULT 'to_prepare' CHECK (status IN ('to_prepare', 'scheduled', 'completed')),
    next_followup_date DATE,
    notes JSONB DEFAULT '[]'::jsonb,
    date_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, fiscal_year_end)
);

-- Enable RLS and policies for client_assembly_tracking
ALTER TABLE public.client_assembly_tracking ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'client_assembly_tracking' AND policyname = 'Allow authenticated full access on client_assembly_tracking'
  ) THEN
    CREATE POLICY "Allow authenticated full access on client_assembly_tracking" 
    ON public.client_assembly_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Create one_on_one_item_notes table
CREATE TABLE IF NOT EXISTS public.one_on_one_item_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    one_on_one_id UUID REFERENCES public.one_on_ones(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('metric', 'risk', 'complaint', 'audit', 'assembly', 'commitment')),
    item_id TEXT NOT NULL,
    note_text TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and policies for one_on_one_item_notes
ALTER TABLE public.one_on_one_item_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'one_on_one_item_notes' AND policyname = 'Allow authenticated full access on one_on_one_item_notes'
  ) THEN
    CREATE POLICY "Allow authenticated full access on one_on_one_item_notes" 
    ON public.one_on_one_item_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
