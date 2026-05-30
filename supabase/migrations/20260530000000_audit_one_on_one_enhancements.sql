-- 20260530000000_audit_one_on_one_enhancements.sql

-- 1. Add conducted_by column to one_on_ones referencing profiles
ALTER TABLE one_on_ones ADD COLUMN IF NOT EXISTS conducted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Create syndicate_workload table to track client-specific workload
CREATE TABLE IF NOT EXISTS syndicate_workload (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER CHECK (month BETWEEN 1 AND 12), -- NULL for yearly total
  tasks_count INTEGER,
  comms_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create unique index to prevent duplicate workload entries per client, year, and month
CREATE UNIQUE INDEX IF NOT EXISTS syndicate_workload_client_year_month_idx 
ON syndicate_workload (client_id, year, (COALESCE(month, 0)));

-- 4. Enable Row Level Security (RLS) on syndicate_workload
ALTER TABLE syndicate_workload ENABLE ROW LEVEL SECURITY;

-- 5. Create policy for full authenticated access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'syndicate_workload' AND policyname = 'Allow authenticated full access on syndicate_workload'
  ) THEN
    CREATE POLICY "Allow authenticated full access on syndicate_workload" ON syndicate_workload FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END
$$;
