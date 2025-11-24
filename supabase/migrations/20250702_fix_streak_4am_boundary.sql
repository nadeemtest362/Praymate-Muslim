-- Fix streak calculation to use 4 AM as day boundary (matching prayer and challenge systems)
CREATE OR REPLACE FUNCTION public.update_prayer_streak()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _completed_at TIMESTAMP WITH TIME ZONE := NEW.completed_at;
    _user_id UUID := NEW.user_id;
    _user_timezone TEXT;
    _last_prayer_date TIMESTAMP WITH TIME ZONE;
    _completed_hour INTEGER;
    _last_prayer_hour INTEGER;
    _adjusted_completed_date DATE;
    _adjusted_last_prayer_date DATE;
    _adjusted_yesterday DATE;
    _stats_record public.user_stats;
BEGIN
    -- If prayer is being marked as completed
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        -- Get user's timezone
        SELECT COALESCE(timezone, 'America/New_York') INTO _user_timezone
        FROM profiles WHERE id = _user_id;
        
        -- Get or create user stats record
        SELECT * INTO _stats_record FROM public.user_stats WHERE user_id = _user_id;
        
        -- Calculate adjusted dates considering 4 AM boundary
        _completed_hour := EXTRACT(HOUR FROM _completed_at AT TIME ZONE _user_timezone);
        IF _completed_hour < 4 THEN
            _adjusted_completed_date := ((_completed_at AT TIME ZONE _user_timezone) - INTERVAL '1 day')::DATE;
        ELSE
            _adjusted_completed_date := (_completed_at AT TIME ZONE _user_timezone)::DATE;
        END IF;
        
        -- Calculate adjusted yesterday (4 AM boundary)
        _adjusted_yesterday := _adjusted_completed_date - INTERVAL '1 day';
        
        IF NOT FOUND THEN
            -- Create initial stats record if it doesn't exist
            INSERT INTO public.user_stats (
                user_id, 
                current_streak, 
                longest_streak, 
                total_prayers_completed,
                last_prayer_date,
                streak_start_date
            ) VALUES (
                _user_id, 
                1, 
                1, 
                1,
                _completed_at,
                _completed_at
            );
        ELSE
            -- Get the date of last completed prayer
            _last_prayer_date := _stats_record.last_prayer_date;
            
            -- Calculate adjusted last prayer date if exists
            IF _last_prayer_date IS NOT NULL THEN
                _last_prayer_hour := EXTRACT(HOUR FROM _last_prayer_date AT TIME ZONE _user_timezone);
                IF _last_prayer_hour < 4 THEN
                    _adjusted_last_prayer_date := ((_last_prayer_date AT TIME ZONE _user_timezone) - INTERVAL '1 day')::DATE;
                ELSE
                    _adjusted_last_prayer_date := (_last_prayer_date AT TIME ZONE _user_timezone)::DATE;
                END IF;
            END IF;
            
            -- Update streak logic
            UPDATE public.user_stats
            SET 
                total_prayers_completed = total_prayers_completed + 1,
                week_prayers_completed = CASE 
                    WHEN DATE_TRUNC('week', _completed_at) = DATE_TRUNC('week', CURRENT_DATE) 
                    THEN week_prayers_completed + 1 
                    ELSE 1 
                END,
                month_prayers_completed = CASE 
                    WHEN DATE_TRUNC('month', _completed_at) = DATE_TRUNC('month', CURRENT_DATE) 
                    THEN month_prayers_completed + 1 
                    ELSE 1 
                END,
                last_prayer_date = _completed_at,
                -- Streak logic with 4 AM boundary
                current_streak = CASE
                    -- First prayer ever (no previous streak)
                    WHEN _last_prayer_date IS NULL THEN 1
                    -- Prayer on same day (already counted in streak)
                    WHEN _adjusted_last_prayer_date = _adjusted_completed_date THEN current_streak
                    -- Prayer yesterday (continue streak)
                    WHEN _adjusted_last_prayer_date = _adjusted_yesterday THEN current_streak + 1
                    -- Prayer after a gap (reset streak)
                    ELSE 1
                END,
                -- Update streak start date if streak reset
                streak_start_date = CASE
                    WHEN _last_prayer_date IS NULL OR _adjusted_last_prayer_date < _adjusted_yesterday THEN _completed_at
                    ELSE streak_start_date
                END,
                -- Update longest streak if current streak exceeds it
                longest_streak = CASE
                    WHEN current_streak + CASE
                        WHEN _adjusted_last_prayer_date = _adjusted_completed_date THEN 0
                        WHEN _adjusted_last_prayer_date = _adjusted_yesterday THEN 1
                        ELSE 0
                    END > longest_streak THEN
                        current_streak + CASE
                            WHEN _adjusted_last_prayer_date = _adjusted_completed_date THEN 0
                            WHEN _adjusted_last_prayer_date = _adjusted_yesterday THEN 1
                            ELSE 0
                        END
                    ELSE longest_streak
                END,
                updated_at = now()
            WHERE user_id = _user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.update_prayer_streak() IS 
'Updates user prayer streak with 4 AM day boundary:
- Day changes at 4 AM, not midnight (matching prayer and challenge systems)
- Prayers completed before 4 AM count as the previous day
- This ensures streaks, challenges, and prayers are all in sync';

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS update_prayer_streak_trigger ON public.prayers;
CREATE TRIGGER update_prayer_streak_trigger
AFTER UPDATE OF completed_at ON public.prayers
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.update_prayer_streak();

-- Recalculate existing streaks to use the new 4 AM boundary logic
-- This ensures all users have accurate streak counts after the function update
DO $$
DECLARE
    user_record RECORD;
    prayer_record RECORD;
    user_tz TEXT;
    adjusted_date DATE;
    prev_adjusted_date DATE;
    current_hour INTEGER;
    new_streak INTEGER;
    streak_broken BOOLEAN;
BEGIN
    -- For each user with a current streak
    FOR user_record IN 
        SELECT us.user_id, us.current_streak, us.streak_start_date
        FROM user_stats us
        WHERE us.current_streak > 0
    LOOP
        -- Get user timezone
        SELECT COALESCE(timezone, 'America/New_York') INTO user_tz
        FROM profiles WHERE id = user_record.user_id;
        
        -- Get all prayers ordered by date descending to find current streak
        new_streak := 0;
        prev_adjusted_date := NULL;
        streak_broken := FALSE;
        
        -- Check prayers from most recent backwards
        FOR prayer_record IN 
            SELECT completed_at 
            FROM prayers 
            WHERE user_id = user_record.user_id 
              AND completed_at IS NOT NULL
            ORDER BY completed_at DESC
        LOOP
            -- Calculate adjusted date for this prayer
            current_hour := EXTRACT(HOUR FROM prayer_record.completed_at AT TIME ZONE user_tz);
            IF current_hour < 4 THEN
                adjusted_date := ((prayer_record.completed_at AT TIME ZONE user_tz) - INTERVAL '1 day')::DATE;
            ELSE
                adjusted_date := (prayer_record.completed_at AT TIME ZONE user_tz)::DATE;
            END IF;
            
            -- First prayer (most recent)
            IF prev_adjusted_date IS NULL THEN
                new_streak := 1;
                prev_adjusted_date := adjusted_date;
            -- Check if this continues the streak going backwards
            ELSIF adjusted_date = prev_adjusted_date THEN
                -- Same day, don't increment
                NULL;
            ELSIF adjusted_date = prev_adjusted_date - INTERVAL '1 day' THEN
                -- Previous day, increment streak
                new_streak := new_streak + 1;
                prev_adjusted_date := adjusted_date;
            ELSE
                -- Gap found, streak ends here
                EXIT;
            END IF;
        END LOOP;
        
        -- Update the user's current streak only if it changed
        IF new_streak != user_record.current_streak THEN
            UPDATE public.user_stats 
            SET current_streak = new_streak,
                longest_streak = GREATEST(longest_streak, new_streak),
                updated_at = NOW()
            WHERE user_id = user_record.user_id;
            
            RAISE NOTICE 'Updated user % streak from % to %', user_record.user_id, user_record.current_streak, new_streak;
        END IF;
    END LOOP;
END $$; 