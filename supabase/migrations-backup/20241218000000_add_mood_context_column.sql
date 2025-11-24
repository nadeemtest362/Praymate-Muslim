-- Add mood_context column to profiles table
-- This column will store additional context about the user's mood during onboarding

ALTER TABLE profiles ADD COLUMN mood_context TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.mood_context IS 'Additional context provided by user about their current mood during onboarding'; 