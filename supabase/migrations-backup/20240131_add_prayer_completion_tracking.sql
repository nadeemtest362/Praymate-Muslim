-- Add prayer completion tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_prayer_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS prayer_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_prayer_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_prayers_completed INTEGER DEFAULT 0;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_prayer_completed_at ON profiles(last_prayer_completed_at);

-- Create index on prayers table for completion tracking
CREATE INDEX IF NOT EXISTS idx_prayers_completed_at ON prayers(user_id, completed_at) WHERE completed_at IS NOT NULL; 