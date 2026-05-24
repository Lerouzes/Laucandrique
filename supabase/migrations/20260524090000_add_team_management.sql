-- 20260524090000_add_team_management.sql

-- 1. Create missing shared entities
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  door_number TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO packages (name) VALUES 
  ('Bronze'), 
  ('Argent'), 
  ('Argent+'), 
  ('Or'), 
  ('Platinum')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  package_name TEXT REFERENCES packages(name) ON UPDATE CASCADE,
  monthly_fee DECIMAL(12,2) DEFAULT 0.00,
  start_date DATE,
  end_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modify clients (Syndicates/Clients) to support Team Management status
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS departure_date DATE;

-- 2. Create Complaints system
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  received_date DATE DEFAULT CURRENT_DATE,
  resolved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create One-on-One system
CREATE TABLE IF NOT EXISTS one_on_ones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES managers(id) ON DELETE CASCADE NOT NULL,
  meeting_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  
  -- Snapshot metrics
  emails_over_48h INTEGER DEFAULT 0,
  late_tasks INTEGER DEFAULT 0,
  calls_total INTEGER DEFAULT 0,
  calls_answered INTEGER DEFAULT 0,
  bills_no_notes_over_7d INTEGER DEFAULT 0,
  op_reports_closed INTEGER DEFAULT 0,
  agenda_templates_used INTEGER DEFAULT 0,
  assemblies_on_time INTEGER DEFAULT 0,
  syndicates_lost INTEGER DEFAULT 0,
  package_changes INTEGER DEFAULT 0,
  
  -- Discussion fields
  current_issues TEXT,
  main_objectives TEXT,
  recent_wins TEXT,
  difficult_situations TEXT,
  
  -- Next Priorities
  priority_1 TEXT,
  priority_2 TEXT,
  priority_3 TEXT,
  
  -- Support Required
  training_requested TEXT,
  escalation_needed TEXT,
  operational_blockers TEXT,
  conflict_resolution TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS one_on_one_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  one_on_one_id UUID REFERENCES one_on_ones(id) ON DELETE CASCADE NOT NULL,
  commitment_text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  why_not TEXT,
  failure_reason TEXT CHECK (failure_reason IN (
    'Lack of organization', 
    'Lack of training', 
    'Work overload', 
    'Waiting on board', 
    'Waiting on supplier', 
    'Avoidance', 
    'Prioritization issue', 
    'Process/system issue', 
    'External issue'
  )),
  carried_forward BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Calls & Workload Manual Inputs
CREATE TABLE IF NOT EXISTS manager_monthly_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES managers(id) ON DELETE CASCADE NOT NULL,
  year_month VARCHAR(7) NOT NULL,
  total_calls INTEGER NOT NULL,
  answered_calls INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (manager_id, year_month)
);

CREATE TABLE IF NOT EXISTS manager_monthly_workload (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES managers(id) ON DELETE CASCADE NOT NULL,
  year_month VARCHAR(7) NOT NULL,
  communications_received INTEGER NOT NULL,
  open_tasks INTEGER NOT NULL,
  closed_tasks INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (manager_id, year_month)
);

-- 5. Audits system
CREATE TABLE IF NOT EXISTS syndicate_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  audited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  audit_date DATE DEFAULT CURRENT_DATE,
  health_score DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syndicate_audit_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES syndicate_audits(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('governance', 'financial', 'operations')),
  question_key TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 0 AND 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (audit_id, question_key)
);

-- 6. Assembly Evaluation system
CREATE TABLE IF NOT EXISTS assembly_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  manager_id UUID REFERENCES managers(id) ON DELETE CASCADE NOT NULL,
  evaluator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assembly_date DATE NOT NULL,
  status TEXT DEFAULT 'completed',
  
  -- Operational
  agenda_sent_on_time INTEGER CHECK (agenda_sent_on_time BETWEEN 0 AND 5),
  quorum_respected INTEGER CHECK (quorum_respected BETWEEN 0 AND 5),
  voting_controlled INTEGER CHECK (voting_controlled BETWEEN 0 AND 5),
  duration_reasonable INTEGER CHECK (duration_reasonable BETWEEN 0 AND 5),
  technical_prep_complete INTEGER CHECK (technical_prep_complete BETWEEN 0 AND 5),
  
  -- Leadership
  manager_controlled_room INTEGER CHECK (manager_controlled_room BETWEEN 0 AND 5),
  discussions_on_track INTEGER CHECK (discussions_on_track BETWEEN 0 AND 5),
  conflict_handled_professionally INTEGER CHECK (conflict_handled_professionally BETWEEN 0 AND 5),
  answers_clear_confident INTEGER CHECK (answers_clear_confident BETWEEN 0 AND 5),
  board_confidence_level INTEGER CHECK (board_confidence_level BETWEEN 0 AND 5),
  financial_statement_quality INTEGER CHECK (financial_statement_quality BETWEEN 0 AND 5),
  
  -- Documentation
  pv_drafted_quickly INTEGER CHECK (pv_drafted_quickly BETWEEN 0 AND 5),
  templates_respected INTEGER CHECK (templates_respected BETWEEN 0 AND 5),
  resolutions_clear INTEGER CHECK (resolutions_clear BETWEEN 0 AND 5),
  followup_tasks_created INTEGER CHECK (followup_tasks_created BETWEEN 0 AND 5),
  
  notes TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Lost Syndicates Analysis system
CREATE TABLE IF NOT EXISTS lost_syndicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
  departure_date DATE NOT NULL,
  reason_category TEXT NOT NULL,
  reason_details TEXT,
  preventable BOOLEAN DEFAULT TRUE,
  root_cause TEXT,
  board_relationship_score INTEGER CHECK (board_relationship_score BETWEEN 0 AND 5),
  operational_score_before INTEGER CHECK (operational_score_before BETWEEN 0 AND 100),
  financial_issues BOOLEAN DEFAULT FALSE,
  major_unresolved_issue TEXT,
  competitor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Package Change log system
CREATE TABLE IF NOT EXISTS package_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  old_package TEXT,
  new_package TEXT NOT NULL,
  change_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all new tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE doors ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_on_ones ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_on_one_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_monthly_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_monthly_workload ENABLE ROW LEVEL SECURITY;
ALTER TABLE syndicate_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE syndicate_audit_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_syndicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_change_logs ENABLE ROW LEVEL SECURITY;

-- Allow full access to authenticated users on all new tables
CREATE POLICY "Allow authenticated full access on suppliers" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on buildings" ON buildings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on doors" ON doors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on packages" ON packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on contracts" ON contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on complaints" ON complaints FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on one_on_ones" ON one_on_ones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on one_on_one_commitments" ON one_on_one_commitments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on manager_monthly_calls" ON manager_monthly_calls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on manager_monthly_workload" ON manager_monthly_workload FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on syndicate_audits" ON syndicate_audits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on syndicate_audit_answers" ON syndicate_audit_answers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on assembly_evaluations" ON assembly_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on lost_syndicates" ON lost_syndicates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on package_change_logs" ON package_change_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Update trigger function to default role to 'Operations' and promote specific email to 'Master'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT := 'Operations';
BEGIN
  IF new.email = 'elerouzeslaucandrique@gmail.com' THEN
    assigned_role := 'Master';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email), new.email, assigned_role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update existing profile in case it was created without the trigger active
UPDATE public.profiles SET role = 'Master' WHERE email = 'elerouzeslaucandrique@gmail.com';

