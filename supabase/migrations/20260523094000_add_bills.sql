-- Add 'billed' to quote_status enum type
ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'billed';

-- Create sequence for bill numbers
CREATE SEQUENCE IF NOT EXISTS bills_bill_number_seq;

-- Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  bill_number NUMERIC NOT NULL UNIQUE DEFAULT nextval('bills_bill_number_seq'),
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  subtotal DECIMAL(12,2) DEFAULT 0.00,
  admin_percentage DECIMAL(5,2) DEFAULT 0.00,
  admin_amount DECIMAL(12,2) DEFAULT 0.00,
  profit_percentage DECIMAL(5,2) DEFAULT 0.00,
  profit_amount DECIMAL(12,2) DEFAULT 0.00,
  gst_amount DECIMAL(12,2) DEFAULT 0.00,
  qst_amount DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bill_items table
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  description TEXT,
  quantity DECIMAL(10,2) DEFAULT 1.0,
  unit TEXT DEFAULT '',
  unit_cost DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bills' AND policyname = 'Allow authenticated full access on bills'
  ) THEN
    CREATE POLICY "Allow authenticated full access on bills" ON public.bills FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bill_items' AND policyname = 'Allow authenticated full access on bill_items'
  ) THEN
    CREATE POLICY "Allow authenticated full access on bill_items" ON public.bill_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END
$$;
