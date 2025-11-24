-- Add timezone column to profiles table
ALTER TABLE profiles
ADD COLUMN timezone TEXT DEFAULT 'America/New_York';

-- Add comment for documentation
COMMENT ON COLUMN profiles.timezone IS 'User timezone in IANA format (e.g., America/New_York)'; 