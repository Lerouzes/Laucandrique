-- 0002_add_contractors.sql

CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  color TEXT NOT NULL DEFAULT '#185FAD',
  skills TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contractors' AND policyname = 'Allow authenticated full access on contractors'
  ) THEN
    CREATE POLICY "Allow authenticated full access on contractors" ON contractors FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END
$$;

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL;
