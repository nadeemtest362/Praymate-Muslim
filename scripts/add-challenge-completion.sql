-- Add completed_at column to track challenge completion
ALTER TABLE daily_challenge_progress 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for better query performance on completed challenges
CREATE INDEX IF NOT EXISTS idx_daily_challenge_progress_completed 
ON daily_challenge_progress(user_id, completed_at) 
WHERE completed_at IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_challenge_progress'
ORDER BY ordinal_position; 