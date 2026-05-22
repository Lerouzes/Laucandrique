-- Create planning sections table
CREATE TABLE IF NOT EXISTS public.quote_planning_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create planning rooms table
CREATE TABLE IF NOT EXISTS public.quote_planning_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.quote_planning_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  height DECIMAL(10,2),
  points JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Alter quote_items to link to rooms/zones
ALTER TABLE public.quote_items 
  ADD COLUMN IF NOT EXISTS planning_room_id UUID REFERENCES public.quote_planning_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planning_measurement_source TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE public.quote_planning_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_planning_rooms ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist and create them
DROP POLICY IF EXISTS "Allow authenticated full access on quote_planning_sections" ON public.quote_planning_sections;
CREATE POLICY "Allow authenticated full access on quote_planning_sections" 
  ON public.quote_planning_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access on quote_planning_rooms" ON public.quote_planning_rooms;
CREATE POLICY "Allow authenticated full access on quote_planning_rooms" 
  ON public.quote_planning_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
