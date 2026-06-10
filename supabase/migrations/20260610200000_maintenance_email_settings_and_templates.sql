-- Create public.maintenance_email_templates table
CREATE TABLE IF NOT EXISTS public.maintenance_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create public.maintenance_email_settings table
CREATE TABLE IF NOT EXISTS public.maintenance_email_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    resend_api_key TEXT,
    sender_email TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    mapping JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.maintenance_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_email_settings ENABLE ROW LEVEL SECURITY;

-- Security Policies
CREATE POLICY "Allow authenticated full access on maintenance_email_templates" ON public.maintenance_email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access on maintenance_email_settings" ON public.maintenance_email_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow public select on templates/settings if needed for server queries, though server actions bypass RLS. Let's keep it authenticated only.

-- Insert Default Templates
INSERT INTO public.maintenance_email_templates (id, name, subject, html_content) VALUES
('b1111111-1111-1111-1111-111111111111', 
 'Lancement de campagne', 
 'Nouvelle campagne de maintenance lancée : {{campaign_name}}', 
 '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ''Inter'', Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #d4d4d8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111218; border: 1px solid #27272a; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; }
    .logo-accent { color: #f59e0b; }
    .content { font-size: 14px; line-height: 1.6; color: #a1a1aa; }
    .btn-container { margin-top: 24px; margin-bottom: 24px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #000000 !important; font-weight: bold; text-decoration: none; border-radius: 8px; }
    .footer { border-top: 1px solid #27272a; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #52525b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">Gustav<span class="logo-accent">.</span></span>
    </div>
    <div class="content">
      <p>Bonjour {{resident_name}},</p>
      <p>Une nouvelle campagne de maintenance, <strong>{{campaign_name}}</strong>, a été lancée pour votre unité <strong>{{unit_number}}</strong>.</p>
      <p>Veuillez cliquer sur le bouton ci-dessous pour confirmer votre participation et saisir vos coordonnées de contact :</p>
      <div class="btn-container">
        <a class="btn" href="{{invite_link}}">Accéder à mon espace résident</a>
      </div>
      <p>Si vous refusez la participation ou si vous avez déjà effectué ces travaux vous-même, vous pourrez également l''indiquer via ce lien.</p>
    </div>
    <div class="footer">
      Gestion Laucandrique &middot; Espace Planification Maintenance &middot; Ne pas répondre à cet e-mail.
    </div>
  </div>
</body>
</html>'),

('b2222222-2222-2222-2222-222222222222', 
 'Rappel participation requis', 
 'Rappel : Votre réponse est requise pour la campagne {{campaign_name}}', 
 '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ''Inter'', Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #d4d4d8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111218; border: 1px solid #27272a; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; }
    .logo-accent { color: #f59e0b; }
    .content { font-size: 14px; line-height: 1.6; color: #a1a1aa; }
    .btn-container { margin-top: 24px; margin-bottom: 24px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #000000 !important; font-weight: bold; text-decoration: none; border-radius: 8px; }
    .footer { border-top: 1px solid #27272a; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #52525b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">Gustav<span class="logo-accent">.</span></span>
    </div>
    <div class="content">
      <p>Bonjour {{resident_name}},</p>
      <p>Nous n''avons pas encore reçu votre réponse concernant votre participation à la campagne de maintenance <strong>{{campaign_name}}</strong> pour votre unité <strong>{{unit_number}}</strong>.</p>
      <p>La date limite de réponse est le <strong>{{deadline}}</strong>.</p>
      <p>Veuillez soumettre vos préférences dès maintenant en cliquant ci-dessous :</p>
      <div class="btn-container">
        <a class="btn" href="{{invite_link}}">Soumettre ma réponse</a>
      </div>
    </div>
    <div class="footer">
      Gestion Laucandrique &middot; Espace Planification Maintenance &middot; Ne pas répondre à cet e-mail.
    </div>
  </div>
</body>
</html>'),

('b3333333-3333-3333-3333-333333333333', 
 'Invitation planification', 
 'Planification ouverte : Sélectionnez votre rendez-vous pour {{campaign_name}}', 
 '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ''Inter'', Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #d4d4d8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111218; border: 1px solid #27272a; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; }
    .logo-accent { color: #f59e0b; }
    .content { font-size: 14px; line-height: 1.6; color: #a1a1aa; }
    .btn-container { margin-top: 24px; margin-bottom: 24px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #000000 !important; font-weight: bold; text-decoration: none; border-radius: 8px; }
    .footer { border-top: 1px solid #27272a; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #52525b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">Gustav<span class="logo-accent">.</span></span>
    </div>
    <div class="content">
      <p>Bonjour {{resident_name}},</p>
      <p>La campagne de maintenance <strong>{{campaign_name}}</strong> pour votre unité <strong>{{unit_number}}</strong> est passée à la phase de planification.</p>
      <p>Vous pouvez dès maintenant réserver votre plage horaire de passage pour l''intervention. La date limite pour planifier est le <strong>{{deadline}}</strong>.</p>
      <div class="btn-container">
        <a class="btn" href="{{invite_link}}">Choisir mon rendez-vous</a>
      </div>
    </div>
    <div class="footer">
      Gestion Laucandrique &middot; Espace Planification Maintenance &middot; Ne pas répondre à cet e-mail.
    </div>
  </div>
</body>
</html>'),

('b4444444-4444-4444-4444-444444444444', 
 'Rappel rendez-vous requis', 
 'Rappel : Sélectionnez votre rendez-vous pour {{campaign_name}}', 
 '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ''Inter'', Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #d4d4d8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111218; border: 1px solid #27272a; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; }
    .logo-accent { color: #f59e0b; }
    .content { font-size: 14px; line-height: 1.6; color: #a1a1aa; }
    .btn-container { margin-top: 24px; margin-bottom: 24px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #000000 !important; font-weight: bold; text-decoration: none; border-radius: 8px; }
    .footer { border-top: 1px solid #27272a; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #52525b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">Gustav<span class="logo-accent">.</span></span>
    </div>
    <div class="content">
      <p>Bonjour {{resident_name}},</p>
      <p>Ceci est un rappel pour planifier votre rendez-vous de maintenance pour la campagne <strong>{{campaign_name}}</strong> (Unité <strong>{{unit_number}}</strong>).</p>
      <p>La date limite de réservation est fixée au <strong>{{deadline}}</strong>.</p>
      <p>Veuillez choisir votre date et plage horaire dès aujourd''hui :</p>
      <div class="btn-container">
        <a class="btn" href="{{invite_link}}">Planifier mon rendez-vous</a>
      </div>
    </div>
    <div class="footer">
      Gestion Laucandrique &middot; Espace Planification Maintenance &middot; Ne pas répondre à cet e-mail.
    </div>
  </div>
</body>
</html>'),

('b5555555-5555-5555-5555-555555555555', 
 'Rappel de rendez-vous à venir', 
 'Rappel de rendez-vous : Intervention à venir le {{appointment_date}}', 
 '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ''Inter'', Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #d4d4d8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111218; border: 1px solid #27272a; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; }
    .logo-accent { color: #f59e0b; }
    .content { font-size: 14px; line-height: 1.6; color: #a1a1aa; }
    .btn-container { margin-top: 24px; margin-bottom: 24px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #000000 !important; font-weight: bold; text-decoration: none; border-radius: 8px; }
    .footer { border-top: 1px solid #27272a; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #52525b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">Gustav<span class="logo-accent">.</span></span>
    </div>
    <div class="content">
      <p>Bonjour {{resident_name}},</p>
      <p>Nous vous rappelons qu''un rendez-vous est prévu pour votre unité <strong>{{unit_number}}</strong> dans le cadre de la campagne de maintenance <strong>{{campaign_name}}</strong>.</p>
      <p><strong>Détails de l''intervention :</strong></p>
      <ul>
        <li><strong>Date & Heure :</strong> {{appointment_date}} de {{start_time}} à {{end_time}}</li>
        <li><strong>Services inclus :</strong> {{services_list}}</li>
        <li><strong>Entrepreneur assigné :</strong> {{contractor_name}}</li>
        <li><strong>Tarification :</strong> {{pricing}}</li>
      </ul>
      {{#notes}}
      <p><strong>Note ou consigne pour l''accès :</strong> {{notes}}</p>
      {{/notes}}
      <p>Veuillez vous assurer d''être présent ou de libérer l''accès comme convenu. Si vous avez des questions, vous pouvez consulter votre portail résident :</p>
      <div class="btn-container">
        <a class="btn" href="{{invite_link}}">Accéder à mon espace résident</a>
      </div>
    </div>
    <div class="footer">
      Gestion Laucandrique &middot; Espace Planification Maintenance &middot; Ne pas répondre à cet e-mail.
    </div>
  </div>
</body>
</html>'),

('b6666666-6666-6666-6666-666666666666', 
 'Confirmation de rendez-vous', 
 'Confirmation de rendez-vous : {{campaign_name}}', 
 '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ''Inter'', Helvetica, Arial, sans-serif; background-color: #0c0d12; color: #d4d4d8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #111218; border: 1px solid #27272a; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: bold; color: #ffffff; }
    .logo-accent { color: #f59e0b; }
    .content { font-size: 14px; line-height: 1.6; color: #a1a1aa; }
    .btn-container { margin-top: 24px; margin-bottom: 24px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #000000 !important; font-weight: bold; text-decoration: none; border-radius: 8px; }
    .footer { border-top: 1px solid #27272a; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #52525b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">Gustav<span class="logo-accent">.</span></span>
    </div>
    <div class="content">
      <p>Bonjour {{resident_name}},</p>
      <p>Votre rendez-vous pour la campagne de maintenance <strong>{{campaign_name}}</strong> (Unité <strong>{{unit_number}}</strong>) a été planifié avec succès.</p>
      <p><strong>Détails du rendez-vous :</strong></p>
      <ul>
        <li><strong>Date :</strong> {{appointment_date}}</li>
        <li><strong>Heure :</strong> de {{start_time}} à {{end_time}}</li>
      </ul>
      <p>Si vous devez modifier ou annuler ce rendez-vous, vous pouvez le faire en accédant à votre espace résident :</p>
      <div class="btn-container">
        <a class="btn" href="{{invite_link}}">Gérer mon rendez-vous</a>
      </div>
    </div>
    <div class="footer">
      Gestion Laucandrique &middot; Espace Planification Maintenance &middot; Ne pas répondre à cet e-mail.
    </div>
  </div>
</body>
</html>')
ON CONFLICT (id) DO UPDATE SET html_content = EXCLUDED.html_content, subject = EXCLUDED.subject;

-- Insert Settings Row
INSERT INTO public.maintenance_email_settings (id, resend_api_key, sender_email, is_enabled, mapping) VALUES
('00000000-0000-0000-0000-000000000000', 
 '', 
 'notifications@laucandrique.com', 
 TRUE, 
 '{
  "new_campaign": "b1111111-1111-1111-1111-111111111111",
  "participation_reminder": "b2222222-2222-2222-2222-222222222222",
  "scheduling_invite": "b3333333-3333-3333-3333-333333333333",
  "scheduling_reminder": "b4444444-4444-4444-4444-444444444444",
  "service_incoming": "b5555555-5555-5555-5555-555555555555",
  "booking_confirmation": "b6666666-6666-6666-6666-666666666666"
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
