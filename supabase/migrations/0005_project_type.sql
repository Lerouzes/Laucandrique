-- 0005_project_type.sql

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'interior';
