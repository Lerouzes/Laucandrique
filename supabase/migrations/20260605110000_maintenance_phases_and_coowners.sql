-- supabase/migrations/20260605110000_maintenance_phases_and_coowners.sql

-- 1. Alter maintenance_campaigns table to add phase support
ALTER TABLE public.maintenance_campaigns ADD COLUMN IF NOT EXISTS survey_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public.maintenance_campaigns ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'scheduling' CHECK (current_phase IN ('survey', 'scheduling'));

-- 2. Translate default services to French and map to translated categories
UPDATE public.maintenance_services SET name = 'Inspection de plomberie', category = 'Plomberie' WHERE name = 'Plumbing Inspection';
UPDATE public.maintenance_services SET name = 'Inspection de conduite d''eau frigo', category = 'Plomberie' WHERE name = 'Refrigerator Water Line Inspection';
UPDATE public.maintenance_services SET name = 'Remplacement de valve', category = 'Plomberie' WHERE name = 'Valve Replacement';
UPDATE public.maintenance_services SET name = 'Inspection du chauffe-eau', category = 'Plomberie' WHERE name = 'Water Heater Inspection';
UPDATE public.maintenance_services SET name = 'Installation de détecteur de fuites', category = 'Plomberie' WHERE name = 'Leak Detector Installation';

UPDATE public.maintenance_services SET name = 'Inspection de fenêtre', category = 'Fenêtres' WHERE name = 'Window Inspection';
UPDATE public.maintenance_services SET name = 'Ajustement de fenêtre', category = 'Fenêtres' WHERE name = 'Window Adjustment';
UPDATE public.maintenance_services SET name = 'Remplacement de thermos', category = 'Fenêtres' WHERE name = 'Thermos Replacement';
UPDATE public.maintenance_services SET name = 'Inspection des scellants', category = 'Fenêtres' WHERE name = 'Seal Inspection';

UPDATE public.maintenance_services SET name = 'Inspection de porte patio', category = 'Portes patio' WHERE name = 'Sliding Door Inspection';
UPDATE public.maintenance_services SET name = 'Ajustement de porte patio', category = 'Portes patio' WHERE name = 'Sliding Door Adjustment';
UPDATE public.maintenance_services SET name = 'Réparation de porte patio', category = 'Portes patio' WHERE name = 'Sliding Door Repair';

UPDATE public.maintenance_services SET name = 'Mesure de moustiquaire', category = 'Moustiquaires' WHERE name = 'Screen Measurement';
UPDATE public.maintenance_services SET name = 'Remplacement de moustiquaire', category = 'Moustiquaires' WHERE name = 'Screen Replacement';
UPDATE public.maintenance_services SET name = 'Réparation de moustiquaire', category = 'Moustiquaires' WHERE name = 'Screen Repair';

UPDATE public.maintenance_services SET name = 'Inspection d''échangeur d''air', category = 'Ventilation' WHERE name = 'Air Exchanger Inspection';
UPDATE public.maintenance_services SET name = 'Nettoyage d''échangeur d''air', category = 'Ventilation' WHERE name = 'Air Exchanger Cleaning';
UPDATE public.maintenance_services SET name = 'Nettoyage de conduits', category = 'Ventilation' WHERE name = 'Duct Cleaning';

UPDATE public.maintenance_services SET name = 'Inspection électrique', category = 'Électricité' WHERE name = 'Electrical Inspection';
UPDATE public.maintenance_services SET name = 'Inspection de panneau électrique', category = 'Électricité' WHERE name = 'Panel Inspection';
UPDATE public.maintenance_services SET name = 'Vérification de borne de recharge VE', category = 'Électricité' WHERE name = 'EV Charger Verification';

UPDATE public.maintenance_services SET name = 'Vérification de détecteur de fumée', category = 'Sécurité' WHERE name = 'Smoke Detector Verification';
UPDATE public.maintenance_services SET name = 'Vérification de détecteur d''eau', category = 'Sécurité' WHERE name = 'Water Detector Verification';
UPDATE public.maintenance_services SET name = 'Vérification de détecteur de CO', category = 'Sécurité' WHERE name = 'CO Detector Verification';

UPDATE public.maintenance_services SET name = 'Inspection de balcon', category = 'Bâtiment' WHERE name = 'Balcony Inspection';
UPDATE public.maintenance_services SET name = 'Inspection de garde-corps', category = 'Bâtiment' WHERE name = 'Guardrail Inspection';
UPDATE public.maintenance_services SET name = 'Inspection d''infiltrations d''eau', category = 'Bâtiment' WHERE name = 'Water Infiltration Inspection';

UPDATE public.maintenance_services SET name = 'Inspection d''assurances', category = 'Administratif' WHERE name = 'Insurance Inspections';
UPDATE public.maintenance_services SET name = 'Inspection préachat', category = 'Administratif' WHERE name = 'Pre-Purchase Inspections';
UPDATE public.maintenance_services SET name = 'Inventaire d''unité', category = 'Administratif' WHERE name = 'Unit Inventories';

-- 3. Clean up category names for any custom/partially entered values
UPDATE public.maintenance_services SET category = 'Plomberie' WHERE category = 'Plumbing';
UPDATE public.maintenance_services SET category = 'Fenêtres' WHERE category = 'Windows';
UPDATE public.maintenance_services SET category = 'Portes patio' WHERE category = 'Patio Doors';
UPDATE public.maintenance_services SET category = 'Moustiquaires' WHERE category = 'Screens';
UPDATE public.maintenance_services SET category = 'Ventilation' WHERE category = 'Ventilation';
UPDATE public.maintenance_services SET category = 'Électricité' WHERE category = 'Electrical';
UPDATE public.maintenance_services SET category = 'Sécurité' WHERE category = 'Safety';
UPDATE public.maintenance_services SET category = 'Bâtiment' WHERE category = 'Building';
UPDATE public.maintenance_services SET category = 'Administratif' WHERE category = 'Administrative';
