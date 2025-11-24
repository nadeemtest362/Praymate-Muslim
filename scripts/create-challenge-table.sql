-- Create daily_challenge_progress table
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

-- RLS policies
-- Users can only see their own challenge progress
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_challenge_progress' 
        AND policyname = 'Users can view their own challenge progress'
    ) THEN
        CREATE POLICY "Users can view their own challenge progress"
        ON daily_challenge_progress
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Users can insert their own challenge progress (via Edge Functions)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_challenge_progress' 
        AND policyname = 'Users can insert their own challenge progress'
    ) THEN
        CREATE POLICY "Users can insert their own challenge progress"
        ON daily_challenge_progress
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Users can update their own challenge progress
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_challenge_progress' 
        AND policyname = 'Users can update their own challenge progress'
    ) THEN
        CREATE POLICY "Users can update their own challenge progress"
        ON daily_challenge_progress
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Test that table was created
SELECT COUNT(*) FROM daily_challenge_progress; 