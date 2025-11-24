-- Fix timezone issues by using the user's timezone or a default
CREATE OR REPLACE FUNCTION get_user_challenge_info(p_user_id UUID)
RETURNS TABLE (
    current_day INTEGER,
    account_created_at TIMESTAMPTZ,
    unlocked_days INTEGER[],
    completed_days INTEGER[]
) AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
    v_user_timezone TEXT;
    v_current_day INTEGER;
    v_local_today DATE;
    v_local_created_date DATE;
BEGIN
    -- Get user's account creation date and timezone
    SELECT created_at, COALESCE(timezone, 'America/New_York') 
    INTO v_created_at, v_user_timezone
    FROM profiles
    WHERE id = p_user_id;
    
    -- Get today's date in the user's timezone
    v_local_today := (CURRENT_TIMESTAMP AT TIME ZONE v_user_timezone)::DATE;
    
    -- Get creation date in user's timezone
    v_local_created_date := (v_created_at AT TIME ZONE v_user_timezone)::DATE;
    
    -- Calculate current day based on local dates
    v_current_day := LEAST(
        (v_local_today - v_local_created_date) + 1,
        30
    );
    
    RETURN QUERY
    SELECT 
        v_current_day AS current_day,
        v_created_at AS account_created_at,
        COALESCE(
            ARRAY_AGG(DISTINCT cp.day_number ORDER BY cp.day_number) 
            FILTER (WHERE cp.day_number IS NOT NULL),
            ARRAY[]::INTEGER[]
        ) AS unlocked_days,
        COALESCE(
            ARRAY_AGG(DISTINCT cp.day_number ORDER BY cp.day_number) 
            FILTER (WHERE cp.completed_at IS NOT NULL AND cp.day_number IS NOT NULL),
            ARRAY[]::INTEGER[]
        ) AS completed_days
    FROM daily_challenge_progress cp
    WHERE cp.user_id = p_user_id
    GROUP BY v_current_day, v_created_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- Also fix the upsert function to use local timezone
CREATE OR REPLACE FUNCTION upsert_challenge_progress(
    p_user_id UUID,
    p_day_number INTEGER,
    p_completed BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
    v_user_timezone TEXT;
    v_challenge_date DATE;
    v_local_created_date DATE;
BEGIN
    -- Get user's account creation date and timezone
    SELECT created_at, COALESCE(timezone, 'America/New_York')
    INTO v_created_at, v_user_timezone
    FROM profiles
    WHERE id = p_user_id;
    
    -- Get creation date in user's timezone
    v_local_created_date := (v_created_at AT TIME ZONE v_user_timezone)::DATE;
    
    -- Calculate the actual date for this day number
    v_challenge_date := v_local_created_date + (p_day_number - 1);
    
    -- Insert or update the progress
    INSERT INTO daily_challenge_progress (
        user_id, 
        challenge_date, 
        day_number,
        completed_at
    ) VALUES (
        p_user_id,
        v_challenge_date,
        p_day_number,
        CASE WHEN p_completed THEN CURRENT_TIMESTAMP ELSE NULL END
    )
    ON CONFLICT (user_id, challenge_date) 
    DO UPDATE SET
        day_number = EXCLUDED.day_number,
        completed_at = CASE 
            WHEN p_completed AND daily_challenge_progress.completed_at IS NULL 
            THEN CURRENT_TIMESTAMP 
            ELSE daily_challenge_progress.completed_at 
        END;
END;
$$ LANGUAGE plpgsql; 