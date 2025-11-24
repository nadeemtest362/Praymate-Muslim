-- Rewrite get_current_prayer_state to production windows using adjusted_day() and client contract
CREATE OR REPLACE FUNCTION public.get_current_prayer_state(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_timezone TEXT;
    current_hour INTEGER;
    current_period TEXT;
    morning_available BOOLEAN;
    evening_available BOOLEAN;

    today_date DATE;

    morning_prayer JSONB;
    evening_prayer JSONB;

    user_current_time TIMESTAMPTZ;
BEGIN
    -- Resolve user's timezone
    SELECT COALESCE(timezone, 'America/New_York') INTO user_timezone
    FROM profiles WHERE id = user_id_param;

    -- Current local time and hour
    user_current_time := NOW() AT TIME ZONE user_timezone;
    current_hour := EXTRACT(HOUR FROM user_current_time)::INT;

    -- Determine period and availability (4am/4pm windows)
    IF current_hour >= 4 AND current_hour < 16 THEN
        current_period := 'morning';
        morning_available := TRUE;
        evening_available := FALSE;
    ELSE
        current_period := 'evening';
        morning_available := FALSE;
        evening_available := TRUE;
    END IF;

    -- Compute "today" as adjusted day in user's timezone
    today_date := public.adjusted_day(NOW(), user_timezone);

    -- Latest morning prayer for today
    SELECT JSONB_BUILD_OBJECT(
        'id', id,
        'content', content,
        'verse_ref', verse_ref,
        'liked', liked,
        'completed_at', completed_at,
        'generated_at', generated_at,
        'slot', slot
    ) INTO morning_prayer
    FROM public.prayers
    WHERE user_id = user_id_param
      AND slot = 'morning'
      AND public.adjusted_day(generated_at, user_timezone) = today_date
    ORDER BY generated_at DESC
    LIMIT 1;

    -- Latest evening prayer for today
    SELECT JSONB_BUILD_OBJECT(
        'id', id,
        'content', content,
        'verse_ref', verse_ref,
        'liked', liked,
        'completed_at', completed_at,
        'generated_at', generated_at,
        'slot', slot
    ) INTO evening_prayer
    FROM public.prayers
    WHERE user_id = user_id_param
      AND slot = 'evening'
      AND public.adjusted_day(generated_at, user_timezone) = today_date
    ORDER BY generated_at DESC
    LIMIT 1;

    -- Return contract expected by client
    RETURN JSONB_BUILD_OBJECT(
        'current_period', current_period,
        'current_window_available', CASE WHEN current_period = 'morning' THEN morning_available ELSE evening_available END,
        'morning_available', morning_available,
        'evening_available', evening_available,
        'prayers', JSONB_BUILD_OBJECT(
            'morning', COALESCE(morning_prayer, NULL),
            'evening', COALESCE(evening_prayer, NULL)
        ),
        'debug', JSONB_BUILD_OBJECT(
            'user_timezone', user_timezone,
            'current_hour', current_hour,
            'today_date', today_date
        )
    );
END;
$$;

COMMENT ON FUNCTION public.get_current_prayer_state(UUID) IS 'Returns current prayer state using 4am/4pm windows and adjusted_day() parity. Response matches client contract: { current_period, current_window_available, morning_available, evening_available, prayers: { morning, evening }, debug }.';
