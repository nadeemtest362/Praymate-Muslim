-- Shared helper for 4 AM day boundary in a given timezone
CREATE OR REPLACE FUNCTION public.adjusted_day(ts timestamptz, tz text)
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (date_trunc('day', (ts AT TIME ZONE COALESCE(tz, 'America/New_York')) - interval '4 hours'))::date
$$;

COMMENT ON FUNCTION public.adjusted_day(timestamptz, text) IS 'Returns the local date for a timestamp using a 4 AM day boundary in the provided timezone (DST-safe via shift then truncate).';
