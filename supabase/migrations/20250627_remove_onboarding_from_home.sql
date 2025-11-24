-- Remove onboarding prayers from home screen entirely
-- Onboarding prayers belong ONLY to the onboarding flow, never daily use
-- This fixes users getting stuck seeing "First Prayer" forever
-- Home screen now ONLY shows morning/evening prayers

CREATE OR REPLACE FUNCTION get_current_prayer_state(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_timezone TEXT;
    current_hour INTEGER;
    current_period TEXT;
    morning_available BOOLEAN;
    evening_available BOOLEAN;
    
    morning_prayer JSONB;
    evening_prayer JSONB;
    
    -- Use 4am as day boundary
    today_start TIMESTAMPTZ;
    today_end TIMESTAMPTZ;
    user_current_time TIMESTAMPTZ;
    
    debug_info JSONB;
BEGIN
    -- Get user timezone (default to America/New_York)
    SELECT COALESCE(timezone, 'America/New_York') INTO user_timezone
    FROM profiles WHERE id = user_id_param;
    
    -- Get current time in user's timezone
    user_current_time := NOW() AT TIME ZONE user_timezone;
    current_hour := EXTRACT(HOUR FROM user_current_time);
    
    -- Calculate today's boundaries (4am to 4am)
    IF current_hour < 4 THEN
        -- Before 4am, we're still in yesterday
        today_start := (CURRENT_DATE - INTERVAL '1 day' + INTERVAL '4 hours') AT TIME ZONE user_timezone;
        today_end := (CURRENT_DATE + INTERVAL '4 hours') AT TIME ZONE user_timezone;
    ELSE
        -- After 4am, normal day
        today_start := (CURRENT_DATE + INTERVAL '4 hours') AT TIME ZONE user_timezone;
        today_end := (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '4 hours') AT TIME ZONE user_timezone;
    END IF;
    
    -- Determine current period (simple: 4am-4pm = morning, 4pm-4am = evening)
    IF current_hour >= 4 AND current_hour < 16 THEN
        current_period := 'morning';
        morning_available := TRUE;
        evening_available := FALSE;
    ELSE
        current_period := 'evening';
        morning_available := FALSE;
        evening_available := TRUE;
    END IF;
    
    -- Get morning prayer (NEVER include onboarding prayers)
    SELECT 
        JSONB_BUILD_OBJECT(
            'id', id,
            'content', content,
            'verse_ref', verse_ref,
            'liked', liked,
            'completed_at', completed_at,
            'generated_at', generated_at,
            'slot', slot
        ) INTO morning_prayer
    FROM prayers
    WHERE user_id = user_id_param
        AND slot = 'morning'  -- ONLY actual morning prayers
        AND generated_at >= today_start
        AND generated_at < today_end
    ORDER BY generated_at DESC
    LIMIT 1;
    
    -- Get evening prayer (NEVER include onboarding prayers)
    SELECT 
        JSONB_BUILD_OBJECT(
            'id', id,
            'content', content,
            'verse_ref', verse_ref,
            'liked', liked,
            'completed_at', completed_at,
            'generated_at', generated_at,
            'slot', slot
        ) INTO evening_prayer
    FROM prayers
    WHERE user_id = user_id_param
        AND slot = 'evening'  -- ONLY actual evening prayers
        AND generated_at >= today_start
        AND generated_at < today_end
    ORDER BY generated_at DESC
    LIMIT 1;
    
    -- Build debug info
    debug_info := JSONB_BUILD_OBJECT(
        'user_timezone', user_timezone,
        'current_time', user_current_time,
        'current_hour', current_hour,
        'today_start_utc', today_start,
        'today_end_utc', today_end,
        'morning_available', morning_available,
        'evening_available', evening_available,
        'has_morning_prayer', morning_prayer IS NOT NULL,
        'has_evening_prayer', evening_prayer IS NOT NULL
    );
    
    -- Return the complete state
    RETURN JSONB_BUILD_OBJECT(
        'current_period', current_period,
        'current_window_available', CASE 
            WHEN current_period = 'morning' THEN morning_available
            ELSE evening_available
        END,
        'morning_available', morning_available,
        'evening_available', evening_available,
        'next_morning_at', CASE
            WHEN NOT morning_available THEN 
                CASE WHEN current_hour < 4 THEN 
                    user_current_time::DATE + INTERVAL '4 hours'
                ELSE 
                    (user_current_time::DATE + INTERVAL '1 day' + INTERVAL '4 hours')
                END
            ELSE NULL
        END,
        'next_evening_at', CASE
            WHEN NOT evening_available THEN 
                CASE WHEN current_hour < 16 THEN 
                    user_current_time::DATE + INTERVAL '16 hours'
                ELSE 
                    (user_current_time::DATE + INTERVAL '1 day' + INTERVAL '16 hours')
                END
            ELSE NULL
        END,
        'prayers', JSONB_BUILD_OBJECT(
            'morning', morning_prayer,
            'evening', evening_prayer
        ),
        'debug', debug_info
    );
END;
$$;

-- Add comment explaining the simplified system
COMMENT ON FUNCTION get_current_prayer_state(UUID) IS 
'Returns current prayer state with simplified logic:
- ONLY returns morning and evening prayers for daily use
- Onboarding prayers are never shown (they belong to onboarding flow only)
- Morning: 4am-4pm, Evening: 4pm-4am
- Day boundary at 4am (12am-4am belongs to previous day)
- Clients should use ONLY the values returned here, no local calculations'; 