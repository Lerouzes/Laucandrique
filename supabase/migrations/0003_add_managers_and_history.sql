-- 0003_add_managers_and_history.sql

CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'managers' AND policyname = 'Allow authenticated full access on managers'
  ) THEN
    CREATE POLICY "Allow authenticated full access on managers" ON managers FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END
$$;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES managers(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES managers(id) ON DELETE SET NULL;

UPDATE quotes q
SET manager_id = c.manager_id
FROM clients c
WHERE q.client_id = c.id AND q.manager_id IS NULL;
