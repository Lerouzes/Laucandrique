-- supabase/migrations/20260605100000_create_maintenance_hub.sql
-- Database changes for Maintenance Hub module

-- 1. Create public.maintenance_services table
CREATE TABLE IF NOT EXISTS public.maintenance_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL, -- in minutes
    price DECIMAL(12,2) DEFAULT 0.00,
    photos_required BOOLEAN DEFAULT FALSE,
    report_required BOOLEAN DEFAULT FALSE,
    default_contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create public.maintenance_campaigns table
CREATE TABLE IF NOT EXISTS public.maintenance_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
    min_participation INTEGER DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT TRUE,
    pricing_type TEXT DEFAULT 'free' CHECK (pricing_type IN ('hidden', 'visible', 'free')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    availability_settings JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create public.maintenance_campaign_services join table
CREATE TABLE IF NOT EXISTS public.maintenance_campaign_services (
    campaign_id UUID REFERENCES public.maintenance_campaigns(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.maintenance_services(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (campaign_id, service_id)
);

-- 4. Create public.maintenance_residents table
CREATE TABLE IF NOT EXISTS public.maintenance_residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    door_id UUID REFERENCES public.doors(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create public.maintenance_campaign_units table
CREATE TABLE IF NOT EXISTS public.maintenance_campaign_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.maintenance_campaigns(id) ON DELETE CASCADE NOT NULL,
    door_id UUID REFERENCES public.doors(id) ON DELETE CASCADE NOT NULL,
    participation TEXT DEFAULT 'pending' CHECK (participation IN ('pending', 'interested', 'not_interested', 'completed_elsewhere', 'more_info')),
    invite_token TEXT UNIQUE NOT NULL,
    resident_notes TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (campaign_id, door_id)
);

-- 6. Create public.maintenance_appointments table
CREATE TABLE IF NOT EXISTS public.maintenance_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.maintenance_campaigns(id) ON DELETE CASCADE NOT NULL,
    door_id UUID REFERENCES public.doors(id) ON DELETE CASCADE NOT NULL,
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'absent', 'refused_access', 'follow_up')),
    rescheduled_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (campaign_id, door_id)
);

-- 7. Create public.maintenance_reports table
CREATE TABLE IF NOT EXISTS public.maintenance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.maintenance_appointments(id) ON DELETE CASCADE NOT NULL UNIQUE,
    door_id UUID REFERENCES public.doors(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID REFERENCES public.maintenance_campaigns(id) ON DELETE CASCADE NOT NULL,
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
    notes TEXT,
    observations TEXT,
    recommendations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create public.maintenance_photos table
CREATE TABLE IF NOT EXISTS public.maintenance_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.maintenance_reports(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.maintenance_appointments(id) ON DELETE CASCADE NOT NULL,
    door_id UUID REFERENCES public.doors(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID REFERENCES public.maintenance_campaigns(id) ON DELETE CASCADE NOT NULL,
    photo_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create public.maintenance_contractor_tokens table
CREATE TABLE IF NOT EXISTS public.maintenance_contractor_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.maintenance_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_campaign_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_campaign_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_contractor_tokens ENABLE ROW LEVEL SECURITY;

-- 11. Create Security Policies
-- Managers / Authenticated Users: Full Access
CREATE POLICY "Allow authenticated full access on maintenance_services" ON public.maintenance_services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on maintenance_campaigns" ON public.maintenance_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on maintenance_campaign_services" ON public.maintenance_campaign_services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on maintenance_residents" ON public.maintenance_residents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on maintenance_campaign_units" ON public.maintenance_campaign_units FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on maintenance_appointments" ON public.maintenance_appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on maintenance_reports" ON public.maintenance_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on maintenance_photos" ON public.maintenance_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on maintenance_contractor_tokens" ON public.maintenance_contractor_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public / Residents Access (invite tokens & appointments)
CREATE POLICY "Allow public select/update on maintenance_campaigns" ON public.maintenance_campaigns FOR SELECT TO public USING (true);
CREATE POLICY "Allow public select/update on maintenance_campaign_services" ON public.maintenance_campaign_services FOR SELECT TO public USING (true);
CREATE POLICY "Allow public select/update on maintenance_services" ON public.maintenance_services FOR SELECT TO public USING (true);
CREATE POLICY "Allow public access on maintenance_campaign_units" ON public.maintenance_campaign_units FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on maintenance_appointments" ON public.maintenance_appointments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on maintenance_residents" ON public.maintenance_residents FOR ALL TO public USING (true) WITH CHECK (true);

-- Public / Contractors Access (tokens, appointments, reports, photos)
CREATE POLICY "Allow public access on maintenance_contractor_tokens" ON public.maintenance_contractor_tokens FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on maintenance_reports" ON public.maintenance_reports FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access on maintenance_photos" ON public.maintenance_photos FOR ALL TO public USING (true) WITH CHECK (true);

-- 12. Prepopulate public.maintenance_services table with default library
INSERT INTO public.maintenance_services (name, description, duration, price, category, photos_required, report_required) VALUES
    ('Plumbing Inspection', 'Inspection générale du système de plomberie de l''unité.', 20, 45.00, 'Plumbing', true, true),
    ('Refrigerator Water Line Inspection', 'Inspection de la conduite d''alimentation en eau du réfrigérateur.', 15, 25.00, 'Plumbing', true, false),
    ('Valve Replacement', 'Remplacement des valves d''arrêt principales de l''unité.', 45, 120.00, 'Plumbing', true, true),
    ('Water Heater Inspection', 'Inspection et vérification de la conformité du chauffe-eau.', 20, 35.00, 'Plumbing', true, true),
    ('Leak Detector Installation', 'Installation de détecteurs de fuite d''eau intelligents.', 30, 85.00, 'Plumbing', true, true),
    
    ('Window Inspection', 'Inspection des fenêtres, des thermos et de l''étanchéité.', 25, 40.00, 'Windows', true, true),
    ('Window Adjustment', 'Ajustement et lubrification des mécanismes d''ouverture.', 20, 30.00, 'Windows', false, true),
    ('Thermos Replacement', 'Remplacement d''un vitrage thermos embué.', 60, 250.00, 'Windows', true, true),
    ('Seal Inspection', 'Inspection des scellants intérieurs et extérieurs.', 15, 20.00, 'Windows', true, false),
    
    ('Sliding Door Inspection', 'Inspection de la porte patio et des mécanismes de roulement.', 20, 35.00, 'Patio Doors', true, true),
    ('Sliding Door Adjustment', 'Ajustement des roulettes et alignement de la porte patio.', 25, 45.00, 'Patio Doors', false, true),
    ('Sliding Door Repair', 'Réparation majeure du cadre ou remplacement des roulettes.', 50, 110.00, 'Patio Doors', true, true),
    
    ('Screen Measurement', 'Prise de mesure pour moustiquaire de fenêtre ou porte patio.', 15, 15.00, 'Screens', false, false),
    ('Screen Replacement', 'Remplacement de la moustiquaire par une neuve.', 20, 45.00, 'Screens', true, true),
    ('Screen Repair', 'Réparation mineure de la maille du moustiquaire.', 15, 25.00, 'Screens', true, false),
    
    ('Air Exchanger Inspection', 'Vérification du bon fonctionnement de l''échangeur d''air.', 20, 35.00, 'Ventilation', true, true),
    ('Air Exchanger Cleaning', 'Nettoyage des filtres et conduits internes de l''échangeur d''air.', 30, 75.00, 'Ventilation', true, true),
    ('Duct Cleaning', 'Nettoyage complet des conduits de ventilation de l''unité.', 90, 180.00, 'Ventilation', true, true),
    
    ('Electrical Inspection', 'Inspection de conformité de l''installation électrique générale.', 30, 60.00, 'Electrical', true, true),
    ('Panel Inspection', 'Vérification et resserrage des connexions du panneau électrique.', 20, 45.00, 'Electrical', true, true),
    ('EV Charger Verification', 'Vérification de la borne de recharge pour véhicule électrique.', 25, 50.00, 'Electrical', true, true),
    
    ('Smoke Detector Verification', 'Test et changement de pile du détecteur de fumée.', 10, 15.00, 'Safety', true, true),
    ('Water Detector Verification', 'Test de bon fonctionnement des détecteurs de fuites.', 10, 15.00, 'Safety', false, true),
    ('CO Detector Verification', 'Test et vérification du détecteur de monoxyde de carbone.', 10, 15.00, 'Safety', true, true),
    
    ('Balcony Inspection', 'Inspection structurelle et de sécurité du balcon de l''unité.', 20, 30.00, 'Building', true, true),
    ('Guardrail Inspection', 'Inspection de la solidité et hauteur des garde-corps.', 15, 25.00, 'Building', true, true),
    ('Water Infiltration Inspection', 'Recherche de signes d''infiltration d''eau ou d''humidité.', 30, 80.00, 'Building', true, true),
    
    ('Insurance Inspections', 'Inspection requise par l''assureur du syndicat dans les unités.', 30, 50.00, 'Administrative', true, true),
    ('Pre-Purchase Inspections', 'Inspection préachat d''une unité privative.', 90, 250.00, 'Administrative', true, true),
    ('Unit Inventories', 'Inventaire complet des équipements et finitions de l''unité.', 60, 120.00, 'Administrative', true, true)
ON CONFLICT DO NOTHING;
