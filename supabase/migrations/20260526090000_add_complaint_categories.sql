-- Create complaint_categories table
CREATE TABLE IF NOT EXISTS public.complaint_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;

-- Policy to allow full access to authenticated users
CREATE POLICY "Allow authenticated full access on complaint_categories" 
ON public.complaint_categories 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Add category_id foreign key column to complaints table if not exists
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.complaint_categories(id) ON DELETE SET NULL;
