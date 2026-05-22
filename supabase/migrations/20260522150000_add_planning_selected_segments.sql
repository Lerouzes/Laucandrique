-- Add planning_selected_segments column to quote_items to store selected wall index array
ALTER TABLE public.quote_items 
  ADD COLUMN IF NOT EXISTS planning_selected_segments integer[];
