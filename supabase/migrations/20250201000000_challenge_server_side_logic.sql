-- Add day_number to daily_challenge_progress for easier queries
ALTER TABLE daily_challenge_progress 
ADD COLUMN IF NOT EXISTS day_number INTEGER;

-- Function to calculate challenge day info for a user
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
    
    -- Calculate current day (normalized to start of day)
    v_current_day := LEAST(
        EXTRACT(DAY FROM (DATE_TRUNC('day', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - DATE_TRUNC('day', v_created_at)))::INTEGER + 1,
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

-- Function to unlock/complete a challenge day
CREATE OR REPLACE FUNCTION upsert_challenge_progress(
    p_user_id UUID,
    p_day_number INTEGER,
    p_completed BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
    v_challenge_date DATE;
BEGIN
    -- Get user's account creation date
    SELECT created_at INTO v_created_at
    FROM profiles
    WHERE id = p_user_id;
    
    -- Calculate the actual date for this day number
    v_challenge_date := DATE_TRUNC('day', v_created_at)::DATE + (p_day_number - 1);
    
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

-- Backfill day_number for existing records
UPDATE daily_challenge_progress cp
SET day_number = (
    SELECT EXTRACT(DAY FROM (cp.challenge_date - DATE_TRUNC('day', p.created_at)))::INTEGER + 1
    FROM profiles p
    WHERE p.id = cp.user_id
)
WHERE day_number IS NULL;

-- Create index on day_number
CREATE INDEX IF NOT EXISTS idx_daily_challenge_progress_day_number 
ON daily_challenge_progress(user_id, day_number);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_challenge_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_challenge_progress(UUID, INTEGER, BOOLEAN) TO authenticated; 