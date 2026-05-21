-- 20260521090000_sync_quote_sequence.sql
-- Trigger to automatically advance quotes_quote_number_seq when quote_number is set manually

CREATE OR REPLACE FUNCTION public.sync_quote_number_sequence()
RETURNS TRIGGER AS $$
DECLARE
  max_num BIGINT;
BEGIN
  IF NEW.quote_number IS NOT NULL THEN
    -- Get current max quote number in database
    SELECT COALESCE(MAX(quote_number), 1) INTO max_num FROM public.quotes;
    
    -- Ensure sequence is set to the maximum of the current sequence value, the new value, or the max number
    IF NEW.quote_number > max_num THEN
      max_num := NEW.quote_number;
    END IF;

    PERFORM setval('public.quotes_quote_number_seq', max_num, true);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_quote_number_upsert
  AFTER INSERT OR UPDATE OF quote_number ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_quote_number_sequence();
