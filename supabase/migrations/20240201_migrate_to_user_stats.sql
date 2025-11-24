-- Migrate existing streak data from profiles to user_stats table
-- This ensures all users have a user_stats record with their current streak data

-- First, create user_stats records for users who don't have them
INSERT INTO public.user_stats (
    user_id,
    current_streak,
    longest_streak,
    total_prayers_completed,
    last_prayer_date,
    streak_start_date,
    created_at,
    updated_at
)
SELECT 
    p.id as user_id,
    COALESCE(p.prayer_streak, 0) as current_streak,
    COALESCE(p.longest_prayer_streak, 0) as longest_streak,
    COALESCE(p.total_prayers_completed, 0) as total_prayers_completed,
    p.last_prayer_completed_at as last_prayer_date,
    CASE 
        WHEN p.prayer_streak > 0 AND p.last_prayer_completed_at IS NOT NULL 
        THEN p.last_prayer_completed_at - (p.prayer_streak - 1) * INTERVAL '1 day'
        ELSE p.last_prayer_completed_at
    END as streak_start_date,
    COALESCE(p.created_at, NOW()) as created_at,
    NOW() as updated_at
FROM public.profiles p
LEFT JOIN public.user_stats us ON p.id = us.user_id
WHERE us.user_id IS NULL;

-- Update existing user_stats records where profiles has more recent data
UPDATE public.user_stats us
SET 
    current_streak = GREATEST(us.current_streak, COALESCE(p.prayer_streak, 0)),
    longest_streak = GREATEST(us.longest_streak, COALESCE(p.longest_prayer_streak, 0)),
    total_prayers_completed = GREATEST(us.total_prayers_completed, COALESCE(p.total_prayers_completed, 0)),
    last_prayer_date = CASE 
        WHEN p.last_prayer_completed_at > us.last_prayer_date OR us.last_prayer_date IS NULL 
        THEN p.last_prayer_completed_at 
        ELSE us.last_prayer_date 
    END,
    updated_at = NOW()
FROM public.profiles p
WHERE us.user_id = p.id
AND (
    p.prayer_streak > us.current_streak OR
    p.longest_prayer_streak > us.longest_streak OR
    p.total_prayers_completed > us.total_prayers_completed OR
    (p.last_prayer_completed_at > us.last_prayer_date OR us.last_prayer_date IS NULL)
);

-- Create a function to ensure user_stats exists when profile is created
CREATE OR REPLACE FUNCTION public.create_user_stats_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_stats (user_id, current_streak, longest_streak, total_prayers_completed)
    VALUES (NEW.id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create user_stats when profile is created
DROP TRIGGER IF EXISTS create_user_stats_trigger ON public.profiles;
CREATE TRIGGER create_user_stats_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_stats_on_profile_insert(); 