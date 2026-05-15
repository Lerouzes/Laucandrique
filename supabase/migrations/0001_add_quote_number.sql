-- 0001_add_quote_number.sql

CREATE SEQUENCE IF NOT EXISTS quotes_quote_number_seq;

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS quote_number BIGINT;

ALTER TABLE quotes
ALTER COLUMN quote_number SET DEFAULT nextval('quotes_quote_number_seq');

UPDATE quotes
SET quote_number = nextval('quotes_quote_number_seq')
WHERE quote_number IS NULL;

SELECT setval(
  'quotes_quote_number_seq',
  COALESCE((SELECT MAX(quote_number) FROM quotes), 1),
  true
);

ALTER TABLE quotes
ALTER COLUMN quote_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotes_quote_number_key'
      AND conrelid = 'quotes'::regclass
  ) THEN
    ALTER TABLE quotes
    ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);
  END IF;
END
$$;
