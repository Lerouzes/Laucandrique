-- Create audit_question_configs table
CREATE TABLE IF NOT EXISTS public.audit_question_configs (
    key TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.audit_question_configs ENABLE ROW LEVEL SECURITY;

-- Policy to allow full access to authenticated users on audit_question_configs
CREATE POLICY "Allow authenticated full access on audit_question_configs" 
ON public.audit_question_configs 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create one_on_one_complaints table
CREATE TABLE IF NOT EXISTS public.one_on_one_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    one_on_one_id UUID REFERENCES public.one_on_ones(id) ON DELETE CASCADE NOT NULL,
    complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
    discussion_notes TEXT,
    resolution_plan TEXT,
    resolved_in_meeting BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.one_on_one_complaints ENABLE ROW LEVEL SECURITY;

-- Policy to allow full access to authenticated users on one_on_one_complaints
CREATE POLICY "Allow authenticated full access on one_on_one_complaints" 
ON public.one_on_one_complaints 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
