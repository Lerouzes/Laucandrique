-- 20260531090742_add_quote_origin.sql

-- 1. Add quote_origin column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_origin TEXT;

-- 2. Update existing quotes to have 'operations_report' as their default origin
UPDATE quotes SET quote_origin = 'operations_report' WHERE quote_origin IS NULL;

-- 3. Add a CHECK constraint to ensure only valid options are inserted
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quote_origin;
ALTER TABLE quotes ADD CONSTRAINT chk_quote_origin CHECK (quote_origin IN ('operations_report', 'additional_manager_request'));

-- 4. Make it NOT NULL for all newly created quotes
ALTER TABLE quotes ALTER COLUMN quote_origin SET NOT NULL;
