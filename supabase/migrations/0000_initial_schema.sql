-- 0000_initial_schema.sql

-- Create custom types for quote status and project status
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'approved', 'denied');
CREATE TYPE project_status AS ENUM ('unplanned', 'planned', 'in_progress', 'completed');

-- Profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  logo_url TEXT,
  default_admin_percentage DECIMAL(5,2) DEFAULT 0.00,
  default_profit_percentage DECIMAL(5,2) DEFAULT 0.00,
  gst_rate DECIMAL(5,3) DEFAULT 0.05,
  qst_rate DECIMAL(5,4) DEFAULT 0.09975,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  company_name TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  manager TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,
  status quote_status DEFAULT 'draft',
  estimated_duration_days INTEGER DEFAULT 1,
  
  -- Financials
  subtotal DECIMAL(12,2) DEFAULT 0.00,
  admin_percentage DECIMAL(5,2) DEFAULT 0.00,
  admin_amount DECIMAL(12,2) DEFAULT 0.00,
  profit_percentage DECIMAL(5,2) DEFAULT 0.00,
  profit_amount DECIMAL(12,2) DEFAULT 0.00,
  gst_amount DECIMAL(12,2) DEFAULT 0.00,
  qst_amount DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) DEFAULT 0.00,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ
);

-- Quote Items table
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1.0,
  unit TEXT DEFAULT '',
  unit_cost DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote Images table
CREATE TABLE quote_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status project_status DEFAULT 'unplanned',
  estimated_duration_days INTEGER DEFAULT 1,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setup RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create basic policies (MVP: Internal SaaS so authenticated users can view/edit everything)
CREATE POLICY "Allow authenticated full access on profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on settings" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on quotes" ON quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on quote_items" ON quote_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on quote_images" ON quote_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Initial Storage Bucket setup (Assuming user might run this or do it via UI, but here's the policy logic)
-- Note: 'storage' schema might require special setup via the Dashboard, but we document the policies anyway.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('quote-images', 'quote-images', true) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Allow public read access to quote-images" ON storage.objects FOR SELECT USING (bucket_id = 'quote-images');
-- CREATE POLICY "Allow authenticated full access to quote-images" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'quote-images') WITH CHECK (bucket_id = 'quote-images');

-- User trigger setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Default initial settings
INSERT INTO settings (company_name, default_admin_percentage, default_profit_percentage, gst_rate, qst_rate)
VALUES ('Gustav Corp', 10.00, 15.00, 0.05, 0.09975)
ON CONFLICT DO NOTHING;
