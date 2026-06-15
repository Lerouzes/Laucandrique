-- Migration: Add HR and Communication Stats Tables
-- Created: 2026-06-15 05:52:00

-- 1. Create departments table (without employee reference initially)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    hire_date DATE,
    departure_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add team_leader_id referencing employees to departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS team_leader_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- 4. Create client_communication_stats table
CREATE TABLE IF NOT EXISTS client_communication_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    analysis_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    period_start DATE,
    period_end DATE,
    total_emails INTEGER DEFAULT 0,
    total_phone_calls INTEGER DEFAULT 0,
    total_communications INTEGER DEFAULT 0,
    analysis_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS) on all new tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communication_stats ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'Allow authenticated full access on departments'
  ) THEN
    CREATE POLICY "Allow authenticated full access on departments" ON departments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Allow authenticated full access on employees'
  ) THEN
    CREATE POLICY "Allow authenticated full access on employees" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'client_communication_stats' AND policyname = 'Allow authenticated full access on client_communication_stats'
  ) THEN
    CREATE POLICY "Allow authenticated full access on client_communication_stats" ON client_communication_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- 7. Seed Initial Departments
INSERT INTO departments (id, name) VALUES 
('d1f11111-1111-1111-1111-111111111111', 'Direction'),
('d2f22222-2222-2222-2222-222222222222', 'Administration'),
('d3f33333-3333-3333-3333-333333333333', 'Comptabilité'),
('d4f44444-4444-4444-4444-444444444444', 'Sinistres'),
('d5f55555-5555-5555-5555-555555555555', 'Travaux Majeurs'),
('d6f66666-6666-6666-6666-666666666666', 'Assurance'),
('d7f77777-7777-7777-7777-777777777777', 'Gestion'),
('d8f88888-8888-8888-8888-888888888888', 'Conseil d''Administration')
ON CONFLICT (name) DO NOTHING;

-- 8. Set up initial parent-child department relationships
UPDATE departments SET parent_department_id = 'd1f11111-1111-1111-1111-111111111111' 
WHERE name IN ('Administration', 'Sinistres', 'Travaux Majeurs', 'Assurance', 'Gestion', 'Conseil d''Administration') AND parent_department_id IS NULL;

UPDATE departments SET parent_department_id = 'd2f22222-2222-2222-2222-222222222222' 
WHERE name = 'Comptabilité' AND parent_department_id IS NULL;

-- 9. Seed Initial Employees
INSERT INTO employees (first_name, last_name, email, department_id, is_active)
SELECT t.first_name, t.last_name, t.email, t.department_id, t.is_active 
FROM (
  VALUES
  ('Hélène', 'Vallerand', 'h.vallerand@laucandrique.com', 'd1f11111-1111-1111-1111-111111111111'::uuid, TRUE),
  ('Jean-Philippe', 'Morin', 'jp.morin@laucandrique.com', 'd1f11111-1111-1111-1111-111111111111'::uuid, TRUE),
  ('Francesca', 'Chabot', 'f.chabot@laucandrique.com', 'd1f11111-1111-1111-1111-111111111111'::uuid, TRUE),

  ('Helene', 'Pucacco', 'h.pucacco@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Mylène', 'Choinière', 'm.choiniere@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Linda', 'Bouchard', 'l.bouchard@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Administration', 'Laucandrique', 'admin@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Maggy', 'Carocha', 'm.carocha@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Suzie', 'Dextraze', 's.dextraze@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Catherine', 'Ducharme', 'c.ducharme@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Anne-Marie', 'Sauvageau', 'am.sauvageau@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Jillian', 'Wise', 'j.wise@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),

  ('Benoit', 'Morin', 'b.morin@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),
  ('Marie-Pierre', 'Martel', 'mp.martel@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),
  ('Helene', 'Satou Ndour', 'h.satoundour@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),
  ('Nouredine', 'Achouri', 'n.achouri@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),
  ('Line', 'Garand', 'l.garand@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),
  ('Danielle', 'Guidi', 'd.guidi@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),

  ('Ekampreet', 'Sudhar Singh', 'e.singh@laucandrique.com', 'd4f44444-4444-4444-4444-444444444444'::uuid, TRUE),
  ('Halle T.', 'Bellange', 'h.bellange@laucandrique.com', 'd4f44444-4444-4444-4444-444444444444'::uuid, TRUE),
  ('Nour', 'Hejazin', 'n.hejazin@laucandrique.com', 'd4f44444-4444-4444-4444-444444444444'::uuid, TRUE),
  ('Département', 'Sinistres', 'sinistres@laucandrique.com', 'd4f44444-4444-4444-4444-444444444444'::uuid, TRUE),

  ('Victor', 'Dubremetz', 'v.dubremetz@laucandrique.com', 'd5f55555-5555-5555-5555-555555555555'::uuid, TRUE),
  ('Angélique', 'Hesbois', 'a.hesbois@laucandrique.com', 'd5f55555-5555-5555-5555-555555555555'::uuid, TRUE),

  ('Marie-Camille', 'Benhamou', 'mc.benhamou@laucandrique.com', 'd6f66666-6666-6666-6666-666666666666'::uuid, TRUE),

  ('Édouard', 'Le Rouzes', 'e.lerouzes@laucandrique.com', 'd7f77777-7777-7777-7777-777777777777'::uuid, TRUE)
) AS t(first_name, last_name, email, department_id, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM employees WHERE employees.email = t.email
);

