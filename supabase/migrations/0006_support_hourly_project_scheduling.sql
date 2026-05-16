-- Support sub-day quote/project durations and hour-precision scheduling
ALTER TABLE quotes
  ALTER COLUMN estimated_duration_days TYPE DECIMAL(10,4)
  USING estimated_duration_days::DECIMAL(10,4);

ALTER TABLE projects
  ALTER COLUMN estimated_duration_days TYPE DECIMAL(10,4)
  USING estimated_duration_days::DECIMAL(10,4),
  ALTER COLUMN start_date TYPE TIMESTAMPTZ
  USING CASE
    WHEN start_date IS NULL THEN NULL
    ELSE start_date::timestamptz
  END,
  ALTER COLUMN end_date TYPE TIMESTAMPTZ
  USING CASE
    WHEN end_date IS NULL THEN NULL
    ELSE end_date::timestamptz
  END;
