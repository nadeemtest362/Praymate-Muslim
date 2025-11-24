-- Fix existing daily_challenge_progress records with null day_number values
-- This calculates the correct day_number based on the user's account creation date

UPDATE daily_challenge_progress dcp
SET day_number = (
    -- Calculate days between account creation and challenge date
    (dcp.challenge_date - (p.created_at AT TIME ZONE COALESCE(p.timezone, 'America/New_York'))::DATE) + 1
)::INTEGER
FROM profiles p
WHERE dcp.user_id = p.id
  AND dcp.day_number IS NULL;

-- Add a comment to explain why this was needed
COMMENT ON TABLE daily_challenge_progress IS 'Tracks user progress through the 30-day challenge. day_number represents which day of the challenge (1-30) this record is for.'; 