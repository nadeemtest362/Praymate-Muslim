-- Create daily_challenge_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS daily_challenge_progress (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, challenge_date)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_challenge_progress_user_id ON daily_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_progress_date ON daily_challenge_progress(challenge_date);

-- Enable RLS
ALTER TABLE daily_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own challenge progress" ON daily_challenge_progress;
DROP POLICY IF EXISTS "Users can insert their own challenge progress" ON daily_challenge_progress;
DROP POLICY IF EXISTS "Users can update their own challenge progress" ON daily_challenge_progress;

-- RLS policies
-- Users can only see their own challenge progress
CREATE POLICY "Users can view their own challenge progress"
ON daily_challenge_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own challenge progress (via Edge Functions)
CREATE POLICY "Users can insert their own challenge progress"
ON daily_challenge_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own challenge progress
CREATE POLICY "Users can update their own challenge progress"
ON daily_challenge_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); 