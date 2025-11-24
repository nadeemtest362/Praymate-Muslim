
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
    onboarding_prayer JSONB;
    onboarding_generated_at TIMESTAMPTZ;
    onboarding_generated_hour INTEGER;
    
    today_start TIMESTAMPTZ;
    today_end TIMESTAMPTZ;
    user_current_time TIMESTAMPTZ;
    user_current_date DATE;
    
    debug_info JSONB;
    effective_streak INT;
BEGIN
    SELECT COALESCE(timezone, 'America/New_York') INTO user_timezone
    FROM profiles WHERE id = user_id_param;
    
    user_current_time := NOW() AT TIME ZONE user_timezone;
    current_hour := EXTRACT(HOUR FROM user_current_time);
    
    user_current_date := (NOW() AT TIME ZONE user_timezone)::DATE;
    
    IF current_hour < 4 THEN
        today_start := (user_current_date - INTERVAL '1 day' + TIME '04:00:00') AT TIME ZONE user_timezone;
        today_end := (user_current_date + TIME '04:00:00') AT TIME ZONE user_timezone;
    ELSE
        today_start := (user_current_date + TIME '04:00:00') AT TIME ZONE user_timezone;
        today_end := (user_current_date + INTERVAL '1 day' + TIME '04:00:00') AT TIME ZONE user_timezone;
    END IF;
    
    IF current_hour >= 4 AND current_hour < 16 THEN
        current_period := 'morning';
        morning_available := TRUE;
        evening_available := FALSE;
    ELSE
        current_period := 'evening';
        morning_available := FALSE;
        evening_available := TRUE;
    END IF;
    
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
        AND slot = 'morning'
        AND generated_at >= today_start
        AND generated_at < today_end
    ORDER BY generated_at DESC
    LIMIT 1;
    
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
        AND slot = 'evening'
        AND generated_at >= today_start
        AND generated_at < today_end
    ORDER BY generated_at DESC
    LIMIT 1;

    SELECT 
        JSONB_BUILD_OBJECT(
            'id', id,
            'content', content,
            'verse_ref', verse_ref,
            'liked', liked,
            'completed_at', completed_at,
            'generated_at', generated_at,
            'slot', slot
        ),
        generated_at
    INTO onboarding_prayer, onboarding_generated_at
    FROM prayers
    WHERE user_id = user_id_param
        AND slot = 'onboarding-initial'
    ORDER BY generated_at DESC
    LIMIT 1;

    IF onboarding_prayer IS NOT NULL
        AND (onboarding_prayer->>'completed_at') IS NOT NULL
        AND onboarding_generated_at >= today_start
        AND onboarding_generated_at < today_end THEN
        onboarding_generated_hour := EXTRACT(HOUR FROM (onboarding_generated_at AT TIME ZONE user_timezone));

        IF onboarding_generated_hour >= 4 AND onboarding_generated_hour < 16 THEN
            IF morning_prayer IS NULL THEN
                morning_prayer := onboarding_prayer || JSONB_BUILD_OBJECT('slot', 'morning', 'promoted_from_onboarding', TRUE);
            END IF;
        ELSE
            IF evening_prayer IS NULL THEN
                evening_prayer := onboarding_prayer || JSONB_BUILD_OBJECT('slot', 'evening', 'promoted_from_onboarding', TRUE);
            END IF;
        END IF;
    END IF;
    
    -- Get effective streak (ONLY ADDITION from Sept 21)
    SELECT public.get_effective_streak(user_id_param) INTO effective_streak;
    
    debug_info := JSONB_BUILD_OBJECT(
        'user_timezone', user_timezone,
        'current_time', user_current_time,
        'current_hour', current_hour,
        'current_date', user_current_date,
        'today_start_utc', today_start,
        'today_end_utc', today_end,
        'morning_available', morning_available,
        'evening_available', evening_available,
        'has_morning_prayer', morning_prayer IS NOT NULL,
        'has_evening_prayer', evening_prayer IS NOT NULL
    );
    
    RETURN JSONB_BUILD_OBJECT(
        'server_now_epoch_ms', FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
        'user_timezone', user_timezone,
        'current_period', current_period,
        'current_window_available', CASE 
            WHEN current_period = 'morning' THEN morning_available
            ELSE evening_available
        END,
        'morning_available', morning_available,
        'evening_available', evening_available,
        'effective_streak', COALESCE(effective_streak, 0),
        'next_morning_at', CASE
            WHEN NOT morning_available THEN 
                CASE WHEN current_hour < 4 THEN 
                    user_current_date + TIME '04:00:00'
                ELSE 
                    (user_current_date + INTERVAL '1 day' + TIME '04:00:00')
                END
            ELSE NULL
        END,
        'next_evening_at', CASE
            WHEN NOT evening_available THEN 
                CASE WHEN current_hour < 16 THEN 
                    user_current_date + TIME '16:00:00'
                ELSE 
                    (user_current_date + INTERVAL '1 day' + TIME '16:00:00')
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

GRANT EXECUTE ON FUNCTION get_current_prayer_state(UUID) TO authenticated;
 