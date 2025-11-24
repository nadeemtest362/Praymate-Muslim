-- Fix the current day calculation in the function
CREATE OR REPLACE FUNCTION get_user_challenge_info(p_user_id UUID)
RETURNS TABLE (
    current_day INTEGER,
    account_created_at TIMESTAMPTZ,
    unlocked_days INTEGER[],
    completed_days INTEGER[]
) AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
    v_current_day INTEGER;
BEGIN
    -- Get user's account creation date
    SELECT created_at INTO v_created_at
    FROM profiles
    WHERE id = p_user_id;
    
    -- Calculate current day using proper date difference
    -- Cast both to DATE to ignore time component
    v_current_day := LEAST(
        (CURRENT_DATE - v_created_at::DATE) + 1,
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