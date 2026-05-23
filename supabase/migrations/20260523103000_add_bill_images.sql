-- Create bill_images table
CREATE TABLE IF NOT EXISTS public.bill_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add status column to bills table
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent';

-- Enable RLS
ALTER TABLE public.bill_images ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bill_images' AND policyname = 'Allow authenticated full access on bill_images'
  ) THEN
    CREATE POLICY "Allow authenticated full access on bill_images" ON public.bill_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END
$$;
