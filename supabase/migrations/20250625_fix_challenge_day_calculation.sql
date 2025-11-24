-- Fix get_user_challenge_info to use onboarding_completed_at for day calculation
CREATE OR REPLACE FUNCTION get_user_challenge_info(p_user_id UUID)
RETURNS TABLE(
    current_day INTEGER,
    account_created_at TIMESTAMPTZ,
    unlocked_days INTEGER[],
    completed_days INTEGER[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_user_timezone TEXT;
    v_current_day INTEGER;
    v_local_today DATE;
    v_local_start_date DATE;
    v_unlocked_from_db INTEGER[];
    v_completed_from_db INTEGER[];
BEGIN
    -- Get user's onboarding completion date (or created_at as fallback) and timezone
    SELECT COALESCE(onboarding_completed_at, created_at), COALESCE(timezone, 'America/New_York') 
    INTO v_start_date, v_user_timezone
    FROM profiles
    WHERE id = p_user_id;
    
    -- Get today's date in the user's timezone
    v_local_today := (CURRENT_TIMESTAMP AT TIME ZONE v_user_timezone)::DATE;
    
    -- Get start date in user's timezone
    v_local_start_date := (v_start_date AT TIME ZONE v_user_timezone)::DATE;
    
    -- Calculate current day based on local dates
    v_current_day := LEAST(
        (v_local_today - v_local_start_date) + 1,
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
    
    -- Always include day 1 in unlocked days (everyone gets day 1)
    IF NOT (1 = ANY(v_unlocked_from_db)) THEN
        v_unlocked_from_db := ARRAY[1] || v_unlocked_from_db;
    END IF;
    
    RETURN QUERY
    SELECT 
        v_current_day AS current_day,
        v_start_date AS account_created_at,
        v_unlocked_from_db AS unlocked_days,
        v_completed_from_db AS completed_days;
END;
$$;