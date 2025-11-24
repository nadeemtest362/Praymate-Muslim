-- Fix challenge day mismatch for users who started before 4 AM
-- This migration creates missing Day 1 records for users whose challenges
-- should have started on the previous calendar day due to 4 AM boundary logic

-- First, identify affected users who have Day 2 but no Day 1
WITH affected_users AS (
  SELECT DISTINCT 
    dcp.user_id,
    p.created_at,
    p.onboarding_completed_at,
    p.timezone,
    -- Calculate what their Day 1 date should be with 4 AM boundary
    CASE 
      WHEN EXTRACT(HOUR FROM COALESCE(p.onboarding_completed_at, p.created_at) AT TIME ZONE COALESCE(p.timezone, 'America/New_York')) < 4 
      THEN (COALESCE(p.onboarding_completed_at, p.created_at) AT TIME ZONE COALESCE(p.timezone, 'America/New_York'))::DATE - 1
      ELSE (COALESCE(p.onboarding_completed_at, p.created_at) AT TIME ZONE COALESCE(p.timezone, 'America/New_York'))::DATE
    END as day1_date
  FROM daily_challenge_progress dcp
  JOIN profiles p ON p.id = dcp.user_id
  WHERE dcp.day_number = 2
    AND NOT EXISTS (
      SELECT 1 
      FROM daily_challenge_progress dcp2 
      WHERE dcp2.user_id = dcp.user_id 
        AND dcp2.day_number = 1
    )
)
-- Insert the missing Day 1 records
INSERT INTO daily_challenge_progress (
  user_id,
  challenge_date,
  day_number,
  unlocked_at,
  completed_at,
  created_at
)
SELECT 
  user_id,
  day1_date,
  1,
  -- Use the same unlock time as their Day 2 (they unlocked both when completing prayer)
  (SELECT MIN(unlocked_at) FROM daily_challenge_progress WHERE user_id = au.user_id),
  -- Mark as completed if they have completed Day 2 (they must have completed Day 1)
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM daily_challenge_progress 
      WHERE user_id = au.user_id 
        AND day_number = 2 
        AND completed_at IS NOT NULL
    ) THEN (SELECT MIN(unlocked_at) FROM daily_challenge_progress WHERE user_id = au.user_id)
    ELSE NULL
  END,
  NOW()
FROM affected_users au; 