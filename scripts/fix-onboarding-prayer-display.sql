-- Fix onboarding prayer display logic
-- This function properly handles onboarding prayers by including them in the appropriate time slot

CREATE OR REPLACE FUNCTION get_current_prayer_state(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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
BEGIN
    -- Get current server time hour
    current_hour := EXTRACT(HOUR FROM NOW());
    
    -- Determine current period
    IF current_hour < 12 THEN
        current_period := 'morning';
    ELSE
        current_period := 'evening';
    END IF;
    
    -- Determine prayer window availability
    morning_available := current_hour >= 4 AND current_hour < 12;
    evening_available := current_hour >= 17 OR current_hour < 4;
    
    -- Current window available based on period
    IF current_period = 'morning' THEN
        current_window_available := morning_available;
    ELSE
        current_window_available := evening_available;
    END IF;
    
    -- Set today's boundaries
    today_start := DATE_TRUNC('day', NOW());
    today_end := today_start + INTERVAL '1 day' - INTERVAL '1 second';
    
    -- Fetch morning prayer for today (including onboarding prayers created during morning)
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
        AND (slot = 'morning' OR (slot = 'onboarding-initial' AND EXTRACT(HOUR FROM generated_at) >= 4 AND EXTRACT(HOUR FROM generated_at) < 12))
        AND generated_at >= today_start
        AND generated_at <= today_end
    ORDER BY generated_at DESC
    LIMIT 1;
    
    -- Fetch evening prayer for today (including onboarding prayers created during evening)
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
        AND (slot = 'evening' OR (slot = 'onboarding-initial' AND (EXTRACT(HOUR FROM generated_at) >= 17 OR EXTRACT(HOUR FROM generated_at) < 4)))
        AND generated_at >= today_start
        AND generated_at <= today_end
    ORDER BY generated_at DESC
    LIMIT 1;
    
    -- Get the most recent onboarding prayer
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
    INTO onboarding_prayer, onboarding_created_at
    FROM prayers
    WHERE user_id = user_id_param
        AND slot = 'onboarding-initial'
    ORDER BY generated_at DESC
    LIMIT 1;
    
    -- Determine if we should show onboarding prayer (only if no regular prayer exists for current period)
    IF onboarding_prayer IS NOT NULL AND onboarding_created_at >= today_start THEN
        -- Check if we should show it based on what prayers we have
        IF current_period = 'morning' AND morning_prayer IS NULL THEN
            show_onboarding_prayer := TRUE;
        ELSIF current_period = 'evening' AND evening_prayer IS NULL THEN
            show_onboarding_prayer := TRUE;
        END IF;
    END IF;
    
    -- Return the complete state
    RETURN JSONB_BUILD_OBJECT(
        'current_period', current_period,
        'current_window_available', current_window_available,
        'show_onboarding_prayer', show_onboarding_prayer,
        'prayers', JSONB_BUILD_OBJECT(
            'morning', morning_prayer,
            'evening', evening_prayer,
            'onboarding', onboarding_prayer
        ),
        'debug', JSONB_BUILD_OBJECT(
            'current_hour', current_hour,
            'morning_available', morning_available,
            'evening_available', evening_available,
            'onboarding_created_hour', CASE WHEN onboarding_created_at IS NOT NULL THEN EXTRACT(HOUR FROM onboarding_created_at) ELSE NULL END,
            'has_morning_prayer', morning_prayer IS NOT NULL,
            'has_evening_prayer', evening_prayer IS NOT NULL
        )
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_prayer_state(UUID) TO authenticated;