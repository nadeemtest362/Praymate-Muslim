-- Patch auto_complete_engaged_prayers to use per-user timezone and adjusted_day()
CREATE OR REPLACE FUNCTION public.auto_complete_engaged_prayers()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_count BIGINT;
BEGIN
  -- Auto-complete engaged prayers from the previous window per user timezone.
  -- A prayer qualifies if:
  --  - engaged = true
  --  - completed_at IS NULL
  --  - generated_at < user-local current window start (4:00 or 16:00)
  WITH candidates AS (
    SELECT p.id
    FROM public.prayers p
    JOIN public.profiles pr ON pr.id = p.user_id
    CROSS JOIN LATERAL (
      SELECT COALESCE(pr.timezone, 'America/New_York') AS tz,
             EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(pr.timezone, 'America/New_York')))::INT AS hr,
             public.adjusted_day(NOW(), COALESCE(pr.timezone, 'America/New_York')) AS day
    ) t
    WHERE p.engaged = TRUE
      AND p.completed_at IS NULL
      AND p.generated_at < (
        CASE
          WHEN t.hr < 4 THEN ((t.day::timestamp + INTERVAL '16 hours') AT TIME ZONE t.tz)
          WHEN t.hr < 16 THEN ((t.day::timestamp + INTERVAL '4 hours') AT TIME ZONE t.tz)
          ELSE ((t.day::timestamp + INTERVAL '16 hours') AT TIME ZONE t.tz)
        END
      )
  )
  UPDATE public.prayers p
  SET completed_at = NOW()
  FROM candidates c
  WHERE p.id = c.id;

  GET DIAGNOSTICS completed_count = ROW_COUNT;
  RAISE NOTICE 'Auto-completed % engaged prayers (per-user timezone)', completed_count;
  RETURN completed_count;
END;
$$;

COMMENT ON FUNCTION public.auto_complete_engaged_prayers() IS 'Auto-completes engaged prayers from the previous window using per-user timezone with adjusted_day() for 4 AM boundary.';
