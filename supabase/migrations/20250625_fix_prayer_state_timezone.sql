-- Fix get_current_prayer_state function to use user's timezone instead of UTC
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
    current_window_available BOOLEAN;
    
    morning_prayer JSONB;
    evening_prayer JSONB;
    onboarding_prayer JSONB;
    
    onboarding_created_at TIMESTAMPTZ;
    onboarding_created_hour INTEGER;
    show_onboarding_prayer BOOLEAN := FALSE;
    
    today_start TIMESTAMPTZ;
    today_end TIMESTAMPTZ;
    user_now TIMESTAMP;
    has_morning_prayer BOOLEAN;
    has_evening_prayer BOOLEAN;
BEGIN
    -- Get user's timezone from profile, default to America/New_York if not set
    SELECT COALESCE(timezone, 'America/New_York')
    INTO user_timezone
    FROM profiles
    WHERE id = user_id_param;
    
    -- Handle case where user doesn't exist
    IF user_timezone IS NULL THEN
        user_timezone := 'America/New_York';
    END IF;
    
    -- Get current time in user's timezone (as timestamp without timezone)
    user_now := NOW() AT TIME ZONE user_timezone;
    
    -- Get current hour in user's timezone
    current_hour := EXTRACT(HOUR FROM user_now)::INTEGER;
    
    -- Determine current period based on user's local time
    IF current_hour < 12 THEN
        current_period := 'morning';
    ELSE
        current_period := 'evening';
    END IF;
    
    -- Determine prayer window availability in user's timezone
    morning_available := current_hour >= 4 AND current_hour < 12;
    evening_available := current_hour >= 17 OR current_hour < 4;
    
    -- Current window available based on period
    IF current_period = 'morning' THEN
        current_window_available := morning_available;
    ELSE
        current_window_available := evening_available;
    END IF;
    
    -- Set today's boundaries in user's timezone
    -- Get midnight today in user's timezone, then convert to UTC for database queries
    today_start := (DATE_TRUNC('day', NOW() AT TIME ZONE user_timezone) AT TIME ZONE user_timezone)::timestamptz;
    today_end := today_start + INTERVAL '1 day';
    
    -- Fetch today's prayers
    -- First, check for any morning slot prayer (including onboarding if it was saved as morning)
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
        AND slot IN ('morning', 'onboarding-initial')
        AND generated_at >= today_start
        AND generated_at < today_end
        AND (
            slot = 'morning' 
            OR (slot = 'onboarding-initial' AND EXTRACT(HOUR FROM generated_at AT TIME ZONE user_timezone) < 12)
        )
    ORDER BY generated_at DESC
    LIMIT 1;
    
    -- Check for any evening slot prayer (including onboarding if it was saved as evening)
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
        AND slot IN ('evening', 'onboarding-initial')
        AND generated_at >= today_start
        AND generated_at < today_end
        AND (
            slot = 'evening' 
            OR (slot = 'onboarding-initial' AND EXTRACT(HOUR FROM generated_at AT TIME ZONE user_timezone) >= 12)
        )
    ORDER BY generated_at DESC
    LIMIT 1;
    
    -- Check if we have regular prayers
    has_morning_prayer := morning_prayer IS NOT NULL AND (morning_prayer->>'slot') = 'morning';
    has_evening_prayer := evening_prayer IS NOT NULL AND (evening_prayer->>'slot') = 'evening';
    
    -- Fetch most recent onboarding prayer
    SELECT 
        JSONB_BUILD_OBJECT(
            'id', id,
            'content', content,
            'verse_ref', verse_ref,
            'liked', liked,
            'completed_at', completed_at,
            'generated_at', generated_at
        ),
        generated_at
    INTO onboarding_prayer, onboarding_created_at
    FROM prayers
    WHERE user_id = user_id_param
        AND slot = 'onboarding-initial'
    ORDER BY generated_at DESC
    LIMIT 1;
    
    -- Determine if onboarding prayer should be shown separately
    IF onboarding_prayer IS NOT NULL AND onboarding_created_at IS NOT NULL THEN
        -- Only show onboarding prayer if:
        -- 1. It was created today
        -- 2. We don't have regular prayers for the current period
        IF onboarding_created_at >= today_start AND onboarding_created_at < today_end THEN
            -- Get the hour when onboarding was created in user's timezone
            onboarding_created_hour := EXTRACT(HOUR FROM onboarding_created_at AT TIME ZONE user_timezone)::INTEGER;
            
            -- Show onboarding prayer only if we don't have a regular prayer for current period
            IF current_period = 'morning' AND NOT has_morning_prayer THEN
                show_onboarding_prayer := TRUE;
            ELSIF current_period = 'evening' AND NOT has_evening_prayer THEN
                show_onboarding_prayer := TRUE;
            ELSE
                show_onboarding_prayer := FALSE;
            END IF;
        ELSE
            -- Onboarding prayer is from a previous day
            show_onboarding_prayer := FALSE;
        END IF;
    END IF;
    
    -- Return the complete state with timezone info for debugging
    RETURN JSONB_BUILD_OBJECT(
        'current_period', current_period,
        'current_window_available', current_window_available,
        'show_onboarding_prayer', show_onboarding_prayer,
        'prayers', JSONB_BUILD_OBJECT(
            'morning', morning_prayer,
            'evening', evening_prayer,
            'onboarding', CASE WHEN show_onboarding_prayer THEN onboarding_prayer ELSE NULL END
        ),
        'debug', JSONB_BUILD_OBJECT(
            'current_hour', current_hour,
            'user_timezone', user_timezone,
            'user_now', user_now::text,
            'morning_available', morning_available,
            'evening_available', evening_available,
            'onboarding_created_hour', onboarding_created_hour,
            'has_morning_prayer', has_morning_prayer,
            'has_evening_prayer', has_evening_prayer,
            'today_start_utc', today_start,
            'today_end_utc', today_end
        )
    );
END;
$$;

-- Maintain existing permissions
GRANT EXECUTE ON FUNCTION get_current_prayer_state(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_current_prayer_state(UUID) IS 'Gets the current prayer state for a user, respecting their timezone for all time-based calculations';

-- Create an index to improve performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_prayers_user_slot_generated 
ON prayers(user_id, slot, generated_at DESC);