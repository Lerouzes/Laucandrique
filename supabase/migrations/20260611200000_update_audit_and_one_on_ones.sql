-- 20260611200000_update_audit_and_one_on_ones.sql
-- Database adjustments for syndicate audits, workloads, and 1v1 summary field

-- 1. Add summary to one_on_ones
ALTER TABLE public.one_on_ones ADD COLUMN IF NOT EXISTS summary TEXT;

-- 2. Add current_year_active, board_meetings_fiscal_year, and board_meetings_count to syndicate_audits
ALTER TABLE public.syndicate_audits ADD COLUMN IF NOT EXISTS current_year_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.syndicate_audits ADD COLUMN IF NOT EXISTS board_meetings_fiscal_year INTEGER;
ALTER TABLE public.syndicate_audits ADD COLUMN IF NOT EXISTS board_meetings_count INTEGER;

-- 3. Add tasks_completed_count to syndicate_workload
ALTER TABLE public.syndicate_workload ADD COLUMN IF NOT EXISTS tasks_completed_count INTEGER;

-- 4. Drop check constraint on syndicate_audit_answers score
ALTER TABLE public.syndicate_audit_answers DROP CONSTRAINT IF EXISTS syndicate_audit_answers_score_check;
