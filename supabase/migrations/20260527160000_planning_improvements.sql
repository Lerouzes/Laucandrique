-- 20260527160000_planning_improvements.sql

-- Alter project_status enum to add new values
-- Note: ALTER TYPE ADD VALUE cannot be executed inside a transaction block in older postgres,
-- but since Supabase runs migrations, we can do it with DO block or direct statements.
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'deferred';
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Add planned_months and completed_months to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS planned_months TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS completed_months TEXT[] NOT NULL DEFAULT '{}';
