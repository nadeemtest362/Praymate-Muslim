-- Fix upsert_challenge_progress to run with elevated permissions
-- so it can read user profiles despite RLS policies

CREATE OR REPLACE FUNCTION upsert_challenge_progress(
    p_user_id UUID,
    p_day_number INTEGER,
    p_completed BOOLEAN DEFAULT FALSE
) 
RETURNS VOID 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
    
    -- Check if we found the user
    IF v_created_at IS NULL THEN
        RAISE EXCEPTION 'User profile not found for ID: %', p_user_id;
    END IF;
    
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
$$; 