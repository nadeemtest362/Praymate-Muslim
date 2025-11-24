-- Fix challenge day calculation to use 4 AM as day boundary (matching prayer state function)
CREATE OR REPLACE FUNCTION get_user_challenge_info(p_user_id UUID)
RETURNS TABLE(
    current_day INTEGER,
    account_created_at TIMESTAMPTZ,
    unlocked_days INTEGER[],
    completed_days INTEGER[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_user_timezone TEXT;
    v_current_day INTEGER;
    v_user_current_time TIMESTAMPTZ;
    v_current_hour INTEGER;
    v_adjusted_today DATE;
    v_adjusted_start_date DATE;
    v_unlocked_from_db INTEGER[];
    v_completed_from_db INTEGER[];
BEGIN
    -- Get user's onboarding completion date (or created_at as fallback) and timezone
    SELECT COALESCE(onboarding_completed_at, created_at), COALESCE(timezone, 'America/New_York') 
    INTO v_start_date, v_user_timezone
    FROM profiles
    WHERE id = p_user_id;
    
    -- Get current time in user's timezone
    v_user_current_time := NOW() AT TIME ZONE v_user_timezone;
    v_current_hour := EXTRACT(HOUR FROM v_user_current_time);
    
    -- Calculate "today" with 4 AM boundary
    -- If it's before 4 AM, we're still in yesterday
    IF v_current_hour < 4 THEN
        v_adjusted_today := (v_user_current_time - INTERVAL '1 day')::DATE;
    ELSE
        v_adjusted_today := v_user_current_time::DATE;
    END IF;
    
    -- Calculate the adjusted start date (also considering 4 AM boundary)
    -- If user started before 4 AM, that counts as the previous day
    IF EXTRACT(HOUR FROM v_start_date AT TIME ZONE v_user_timezone) < 4 THEN
        v_adjusted_start_date := ((v_start_date AT TIME ZONE v_user_timezone) - INTERVAL '1 day')::DATE;
    ELSE
        v_adjusted_start_date := (v_start_date AT TIME ZONE v_user_timezone)::DATE;
    END IF;
    
    -- Calculate current day based on adjusted dates
    v_current_day := LEAST(
        (v_adjusted_today - v_adjusted_start_date) + 1,
        30
    );
    
    -- Get unlocked and completed days from database
    SELECT 
        COALESCE(
            ARRAY_AGG(DISTINCT cp.day_number ORDER BY cp.day_number) 
            FILTER (WHERE cp.day_number IS NOT NULL),
            ARRAY[]::INTEGER[]
        ),
        COALESCE(
            ARRAY_AGG(DISTINCT cp.day_number ORDER BY cp.day_number) 
            FILTER (WHERE cp.completed_at IS NOT NULL AND cp.day_number IS NOT NULL),
            ARRAY[]::INTEGER[]
        )
    INTO v_unlocked_from_db, v_completed_from_db
    FROM daily_challenge_progress cp
    WHERE cp.user_id = p_user_id;
    
    RETURN QUERY
    SELECT 
        v_current_day AS current_day,
        v_start_date AS account_created_at,
        v_unlocked_from_db AS unlocked_days,
        v_completed_from_db AS completed_days;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION get_user_challenge_info(UUID) IS 
'Returns user challenge progress with 4 AM day boundary:
- Day changes at 4 AM, not midnight (matching prayer system)
- If current time is before 4 AM, it counts as the previous day
- If user started before 4 AM, that counts as the previous day
- This ensures challenges and prayers are in sync';

-- Also fix the upsert function to use 4 AM boundary for challenge dates
CREATE OR REPLACE FUNCTION upsert_challenge_progress(
    p_user_id UUID,
    p_day_number INTEGER,
    p_completed BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_user_timezone TEXT;
    v_challenge_date DATE;
    v_user_current_time TIMESTAMPTZ;
    v_current_hour INTEGER;
    v_adjusted_start_date DATE;
BEGIN
    -- Get user's onboarding completion date (or created_at as fallback) and timezone
    SELECT COALESCE(onboarding_completed_at, created_at), COALESCE(timezone, 'America/New_York') 
    INTO v_start_date, v_user_timezone
    FROM profiles 
    WHERE id = p_user_id;
    
    IF v_start_date IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Get current time in user's timezone
    v_user_current_time := NOW() AT TIME ZONE v_user_timezone;
    v_current_hour := EXTRACT(HOUR FROM v_user_current_time);
    
    -- Calculate the adjusted start date (considering 4 AM boundary)
    IF EXTRACT(HOUR FROM v_start_date AT TIME ZONE v_user_timezone) < 4 THEN
        v_adjusted_start_date := ((v_start_date AT TIME ZONE v_user_timezone) - INTERVAL '1 day')::DATE;
    ELSE
        v_adjusted_start_date := (v_start_date AT TIME ZONE v_user_timezone)::DATE;
    END IF;
    
    -- Calculate the actual challenge date for this day number
    v_challenge_date := v_adjusted_start_date + (p_day_number - 1);
    
    -- Upsert the challenge progress
    INSERT INTO daily_challenge_progress (
        user_id,
        challenge_date,
        day_number,
        unlocked_at,
        completed_at
    ) VALUES (
        p_user_id,
        v_challenge_date,
        p_day_number,
        NOW(),
        CASE WHEN p_completed THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, challenge_date) 
    DO UPDATE SET
        day_number = EXCLUDED.day_number,
        completed_at = CASE 
            WHEN p_completed AND daily_challenge_progress.completed_at IS NULL
            THEN NOW()
            ELSE daily_challenge_progress.completed_at
        END;
END;
$$;

-- Re-grant permissions after replacing functions
GRANT EXECUTE ON FUNCTION get_user_challenge_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_challenge_progress(UUID, INTEGER, BOOLEAN) TO authenticated; 