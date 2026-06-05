-- supabase/migrations/20260605130000_contractor_hub_tables.sql
-- Tables for contractor-specific service pricing and work checklists

-- Per-contractor service pricing overrides
CREATE TABLE IF NOT EXISTS public.contractor_service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.maintenance_services(id) ON DELETE CASCADE,
    price NUMERIC(10, 2),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(contractor_id, service_id)
);

-- Per-contractor work checklist
CREATE TABLE IF NOT EXISTS public.contractor_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contractor_service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_checklist ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (managers) full access
CREATE POLICY "allow_all_authenticated" ON public.contractor_service_pricing
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "allow_all_authenticated" ON public.contractor_checklist
    FOR ALL USING (auth.role() = 'authenticated');
