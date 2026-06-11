-- Migration: 20260611100000_add_client_snapshots.sql

-- 1. Add Microsoft List and identity mapping columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ms_list_item_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS syndicate_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Create client_snapshots table
CREATE TABLE IF NOT EXISTS client_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  detected_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  modified_count INTEGER NOT NULL DEFAULT 0,
  inactive_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Review', 'Applied', 'Replaced', 'Rejected')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  replaced_at TIMESTAMPTZ,
  replaced_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  replacement_snapshot_id UUID REFERENCES client_snapshots(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  change_summary JSONB DEFAULT '{}'::jsonb,
  field_mappings JSONB DEFAULT '{}'::jsonb,
  raw_data JSONB DEFAULT '[]'::jsonb,
  processed_rows JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create client_field_history table
CREATE TABLE IF NOT EXISTS client_field_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  snapshot_id UUID REFERENCES client_snapshots(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 4. Enable RLS
ALTER TABLE client_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_field_history ENABLE ROW LEVEL SECURITY;

-- 5. Create policies
DROP POLICY IF EXISTS "Allow authenticated full access on client_snapshots" ON client_snapshots;
CREATE POLICY "Allow authenticated full access on client_snapshots" ON client_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access on client_field_history" ON client_field_history;
CREATE POLICY "Allow authenticated full access on client_field_history" ON client_field_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
