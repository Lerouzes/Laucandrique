-- Drop the trigger that depends on the column type first
DROP TRIGGER IF EXISTS on_quote_number_upsert ON public.quotes;

-- Alter quotes.quote_number column type to NUMERIC
ALTER TABLE public.quotes ALTER COLUMN quote_number TYPE NUMERIC;

-- Update the sync_quote_number_sequence function to use NUMERIC
CREATE OR REPLACE FUNCTION public.sync_quote_number_sequence()
RETURNS TRIGGER AS $$
DECLARE
  max_num NUMERIC;
BEGIN
  IF NEW.quote_number IS NOT NULL THEN
    -- Get current max quote number in database
    SELECT COALESCE(MAX(quote_number), 1) INTO max_num FROM public.quotes;
    
    -- Ensure sequence is set to the maximum of the current sequence value, the new value, or the max number
    IF NEW.quote_number > max_num THEN
      max_num := NEW.quote_number;
    END IF;

    -- Truncate to bigint when setting sequence value
    PERFORM setval('public.quotes_quote_number_seq', floor(max_num)::bigint, true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger on the altered column
CREATE TRIGGER on_quote_number_upsert
  AFTER INSERT OR UPDATE OF quote_number ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_quote_number_sequence();
