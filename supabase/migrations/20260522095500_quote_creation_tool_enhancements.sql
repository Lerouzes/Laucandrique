-- Alter settings table to add work_types_options column
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS work_types_options TEXT[] NOT NULL DEFAULT '{"Peinture", "Plâtre", "Maçonnerie", "Menuiserie", "Électricité", "Plomberie"}'::TEXT[];

-- Alter quotes table to add work_types and hide_duration columns
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS work_types TEXT[] NOT NULL DEFAULT '{}'::TEXT[];
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS hide_duration BOOLEAN NOT NULL DEFAULT FALSE;

-- Alter quote_items table to add title and image_urls columns
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[];
ALTER TABLE public.quote_items ALTER COLUMN description DROP NOT NULL;
