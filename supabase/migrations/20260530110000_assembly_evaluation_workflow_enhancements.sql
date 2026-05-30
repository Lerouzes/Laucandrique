-- 20260530110000_assembly_evaluation_workflow_enhancements.sql
-- Add assembly_type column, create assembly_question_configs, and insert default configs

-- 1. Add assembly_type and status to assembly_evaluations if not exists
ALTER TABLE public.assembly_evaluations ADD COLUMN IF NOT EXISTS assembly_type TEXT DEFAULT 'annual';

-- Make sure technical_prep_complete is nullable (already is in initial schema, but let's be sure)
ALTER TABLE public.assembly_evaluations ALTER COLUMN technical_prep_complete DROP NOT NULL;

-- 2. Create assembly_question_configs table
CREATE TABLE IF NOT EXISTS public.assembly_question_configs (
    key TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

-- Enable RLS on assembly_question_configs
ALTER TABLE public.assembly_question_configs ENABLE ROW LEVEL SECURITY;

-- Policy to allow full access to authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'assembly_question_configs' 
          AND policyname = 'Allow authenticated full access on assembly_question_configs'
    ) THEN
        CREATE POLICY "Allow authenticated full access on assembly_question_configs" 
        ON public.assembly_question_configs 
        FOR ALL TO authenticated 
        USING (true) 
        WITH CHECK (true);
    END IF;
END
$$;

-- 3. Populate default tooltips for the 14 assembly evaluation criteria
INSERT INTO public.assembly_question_configs (key, description) VALUES
  ('agenda_sent_on_time', 'Vérifier que les convocations et l''ordre du jour ont été transmis aux copropriétaires dans les délais légaux (ex. 10 à 15 jours avant la séance).'),
  ('quorum_respected', 'Vérifier que les feuilles de présence sont complétées et que les conditions de quorum sont formellement validées avant d''ouvrir la séance.'),
  ('voting_controlled', 'Contrôler la validité des procurations et s''assurer que la saisie et le calcul des voix (tantièmes) sont gérés avec rigueur durant les votes.'),
  ('duration_reasonable', 'S''assurer que le déroulement de l''assemblée respecte le temps imparti et évite les débats improductifs.'),
  ('manager_controlled_room', 'Évaluer l''autorité naturelle de l''animateur, sa capacité à maintenir le calme et à distribuer équitablement la parole.'),
  ('discussions_on_track', 'S''assurer que les interventions restent concentrées sur les points de l''ordre du jour sans s''égarer dans des cas particuliers.'),
  ('conflict_handled_professionally', 'Observer la diplomatie et le professionnalisme de l''animateur face aux tensions, critiques ou comportements agressifs.'),
  ('answers_clear_confident', 'S''assurer que les réponses fournies par le gestionnaire sont claires, appuyées sur les faits et juridiquement ou techniquement justes.'),
  ('board_confidence_level', 'Mesurer la relation de confiance et le soutien manifesté par les membres du CA envers le travail du gestionnaire.'),
  ('financial_statement_quality', 'Évaluer la clarté des explications du budget et des états financiers présentés aux copropriétaires.'),
  ('pv_drafted_quickly', 'Rédiger et valider le projet de procès-verbal de l''assemblée dans un délai optimal (ex. 5 à 10 jours après la séance).'),
  ('templates_respected', 'S''assurer de l''utilisation rigoureuse des modèles officiels et de la charte graphique de Laucandrique.'),
  ('resolutions_clear', 'Valider que la formulation et le libellé des résolutions votées sont précis, sans ambiguïté juridique.'),
  ('followup_tasks_created', 'Vérifier que toutes les décisions nécessitant des actions (travaux, courriers, etc.) ont fait l''objet de tâches de suivi créées dans le système.')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
