-- Migration: Add new employees and departments
-- Created: 2026-06-15 19:41:30

-- 1. Seed Technique and Chargé d’opération departments
INSERT INTO departments (id, name, parent_department_id) VALUES 
('d9f99999-9999-9999-9999-999999999999', 'Technique', 'd1f11111-1111-1111-1111-111111111111'::uuid),
('dafaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chargé d’opération', 'd1f11111-1111-1111-1111-111111111111'::uuid)
ON CONFLICT (name) DO NOTHING;

-- 2. Seed/Onboard the specified employees
INSERT INTO employees (first_name, last_name, email, department_id, is_active)
SELECT t.first_name, t.last_name, t.email, t.department_id, t.is_active 
FROM (
  VALUES
  -- Accounting (Comptabilité)
  ('Paul', 'Gauthier', 'p.gauthier@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),
  ('Violeta', 'Bente', 'v.bente@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),
  ('Compte Payable', 'Laucandrique', 'payable@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),
  ('Comptabilité', 'Laucandrique', 'comptabilite@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),
  ('Madeleine', 'Cormier', 'm.cormier@laucandrique.com', 'd3f33333-3333-3333-3333-333333333333'::uuid, TRUE),

  -- Administration
  ('Reception', 'Laucandrique', 'reception@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Tania', 'Senécal', 't.senecal@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Réception', 'Suzanne Sylvestre', 's.sylvestre@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('Carine', 'Leroux', 'c.leroux@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),
  ('L''équipe Laucandrique', 'Tremblant', 'tremblant@laucandrique.com', 'd2f22222-2222-2222-2222-222222222222'::uuid, TRUE),

  -- Sinistres
  ('Sinistre', 'Laucandrique', 'sinistre.l@laucandrique.com', 'd4f44444-4444-4444-4444-444444444444'::uuid, TRUE),
  ('Victoria', 'Ponomarenko', 'v.ponomarenko@laucandrique.com', 'd4f44444-4444-4444-4444-444444444444'::uuid, TRUE),
  ('Alaa-Eddine', 'Lemrabete', 'ae.lemrabete@laucandrique.com', 'd4f44444-4444-4444-4444-444444444444'::uuid, TRUE),

  -- Chargé d’opération
  ('Stéphane', 'Genest', 's.genest@laucandrique.com', 'dafaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, TRUE),
  ('Carlos', 'Villegas', 'c.villegas@laucandrique.com', 'dafaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, TRUE),
  ('Kelly', 'Frost', 'k.frost@laucandrique.com', 'dafaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, TRUE),
  ('operations', 'Laucandrique', 'operations.l@laucandrique.com', 'dafaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, TRUE),
  ('Genest', 'Stéphane', 'g.stephane@laucandrique.com', 'dafaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, TRUE),

  -- Technique
  ('Angelique', 'Hesbois', 'a.hesbois.tech@laucandrique.com', 'd9f99999-9999-9999-9999-999999999999'::uuid, TRUE),

  -- Direction
  ('Nicole', 'Rousseau', 'n.rousseau@laucandrique.com', 'd1f11111-1111-1111-1111-111111111111'::uuid, TRUE),
  ('Marc', 'Boyer', 'm.boyer@laucandrique.com', 'd1f11111-1111-1111-1111-111111111111'::uuid, TRUE)
) AS t(first_name, last_name, email, department_id, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM employees 
  WHERE employees.email = t.email 
     OR (employees.first_name = t.first_name AND employees.last_name = t.last_name)
);

-- 3. Update existing Angélique Hesbois's department to Technique if she exists
UPDATE employees 
SET department_id = 'd9f99999-9999-9999-9999-999999999999'::uuid 
WHERE (first_name = 'Angélique' OR first_name = 'Angelique') AND last_name = 'Hesbois';
