-- 0004_financial_goals_and_completion.sql

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS monthly_goal_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_goal_amount DECIMAL(12,2) DEFAULT 0.00;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
