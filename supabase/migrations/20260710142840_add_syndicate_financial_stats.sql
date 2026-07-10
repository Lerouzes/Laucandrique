-- Migration: 20260710142840_add_syndicate_financial_stats.sql

-- 1. Add total_square_feet column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_square_feet NUMERIC;

-- 2. Create client_yearly_stats table
CREATE TABLE IF NOT EXISTS public.client_yearly_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    building_valuation NUMERIC DEFAULT 0,
    regular_condo_fees NUMERIC DEFAULT 0,
    prevention_fund_fees NUMERIC DEFAULT 0,
    insurance_fund_fees NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (client_id, year)
);

-- 3. Create client_special_assessments table
CREATE TABLE IF NOT EXISTS public.client_special_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    amount NUMERIC DEFAULT 0,
    fund_type TEXT NOT NULL CHECK (fund_type IN ('regular', 'prevention', 'insurance')),
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.client_yearly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_special_assessments ENABLE ROW LEVEL SECURITY;

-- 5. Create policies
DROP POLICY IF EXISTS "Allow authenticated full access on client_yearly_stats" ON public.client_yearly_stats;
CREATE POLICY "Allow authenticated full access on client_yearly_stats" ON public.client_yearly_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access on client_special_assessments" ON public.client_special_assessments;
CREATE POLICY "Allow authenticated full access on client_special_assessments" ON public.client_special_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);
