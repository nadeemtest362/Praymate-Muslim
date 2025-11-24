-- Drop the old streak columns from profiles table
-- These have been migrated to user_stats table

-- Drop the columns (this is safe because we've already migrated the data)
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS prayer_streak,
DROP COLUMN IF EXISTS longest_prayer_streak,
DROP COLUMN IF EXISTS total_prayers_completed,
DROP COLUMN IF EXISTS last_prayer_completed_at;

-- Note: This migration should only be run AFTER confirming that:
-- 1. The 20240201_migrate_to_user_stats.sql migration has been successfully applied
-- 2. All data has been properly migrated to user_stats table
-- 3. All application code has been updated to use user_stats instead of profiles 