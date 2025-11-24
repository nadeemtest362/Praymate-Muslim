-- Add missing onboarding fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS initial_motivation TEXT,
ADD COLUMN IF NOT EXISTS relationship_with_god TEXT,
ADD COLUMN IF NOT EXISTS prayer_frequency TEXT,
ADD COLUMN IF NOT EXISTS faith_tradition TEXT,
ADD COLUMN IF NOT EXISTS commitment_level TEXT,
ADD COLUMN IF NOT EXISTS streak_goal_days INTEGER,
ADD COLUMN IF NOT EXISTS prayer_times TEXT[],
ADD COLUMN IF NOT EXISTS prayer_needs TEXT[],
ADD COLUMN IF NOT EXISTS custom_prayer_need TEXT;

-- Add comments to document the fields
COMMENT ON COLUMN profiles.initial_motivation IS 'Why user came to the app: consistency, personal, closer, trying, etc.';
COMMENT ON COLUMN profiles.relationship_with_god IS 'User spiritual starting point: very_close, close, complicated, distant, rebuilding';
COMMENT ON COLUMN profiles.prayer_frequency IS 'Current prayer habits: multiple_daily, daily, few_times_week, occasionally, rarely';
COMMENT ON COLUMN profiles.faith_tradition IS 'User faith background: catholic, christian_non_catholic, other';
COMMENT ON COLUMN profiles.commitment_level IS 'How committed to prayer practice: very_committed, ready_to_start, want_to_try';
COMMENT ON COLUMN profiles.streak_goal_days IS 'User chosen goal: 7, 14, or 30 days';
COMMENT ON COLUMN profiles.prayer_times IS 'Preferred prayer times: morning, midday, evening, night';
COMMENT ON COLUMN profiles.prayer_needs IS 'Selected prayer themes from onboarding';
COMMENT ON COLUMN profiles.custom_prayer_need IS 'User-written custom prayer need';

-- Add check constraints for enum-like fields
ALTER TABLE profiles
ADD CONSTRAINT check_initial_motivation CHECK (
  initial_motivation IS NULL OR 
  initial_motivation IN ('consistency', 'personalization', 'closer', 'restart', 'intercession', 'inspiration')
),
ADD CONSTRAINT check_relationship_with_god CHECK (
  relationship_with_god IS NULL OR 
  relationship_with_god IN ('very_close', 'close', 'complicated', 'distant', 'rebuilding')
),
ADD CONSTRAINT check_prayer_frequency CHECK (
  prayer_frequency IS NULL OR 
  prayer_frequency IN ('multiple_daily', 'daily', 'few_times_week', 'occasionally', 'rarely')
),
ADD CONSTRAINT check_faith_tradition CHECK (
  faith_tradition IS NULL OR 
  faith_tradition IN ('catholic', 'christian_non_catholic', 'other')
),
ADD CONSTRAINT check_commitment_level CHECK (
  commitment_level IS NULL OR 
  commitment_level IN ('very_committed', 'ready_to_start', 'want_to_try')
),
ADD CONSTRAINT check_streak_goal_days CHECK (
  streak_goal_days IS NULL OR 
  streak_goal_days IN (7, 14, 30)
);

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_profiles_initial_motivation ON profiles(initial_motivation);
CREATE INDEX IF NOT EXISTS idx_profiles_faith_tradition ON profiles(faith_tradition);
CREATE INDEX IF NOT EXISTS idx_profiles_streak_goal_days ON profiles(streak_goal_days); 