-- Modify streak calculation to only count "perfect days" (both morning and evening prayers completed)
-- This is a breaking change that will reset all existing streaks to use the new perfect day logic

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
    _has_morning_prayer BOOLEAN;
    _has_evening_prayer BOOLEAN;
    _is_perfect_day BOOLEAN;
BEGIN
    -- If prayer is being marked as completed
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        -- Get user's timezone
        SELECT COALESCE(timezone, 'America/New_York') INTO _user_timezone
        FROM profiles WHERE id = _user_id;
        
        -- Calculate adjusted dates considering 4 AM boundary
        _completed_hour := EXTRACT(HOUR FROM _completed_at AT TIME ZONE _user_timezone);
        IF _completed_hour < 4 THEN
            _adjusted_completed_date := ((_completed_at AT TIME ZONE _user_timezone) - INTERVAL '1 day')::DATE;
        ELSE
            _adjusted_completed_date := (_completed_at AT TIME ZONE _user_timezone)::DATE;
        END IF;
        
        -- Check if this day now has both morning and evening prayers (perfect day)
        SELECT 
            EXISTS(
                SELECT 1 FROM prayers p1 
                WHERE p1.user_id = _user_id 
                AND p1.completed_at IS NOT NULL
                AND (p1.slot LIKE '%morning%' OR p1.slot LIKE '%am%')
                AND CASE 
                    WHEN EXTRACT(HOUR FROM p1.completed_at AT TIME ZONE _user_timezone) < 4 
                    THEN ((p1.completed_at AT TIME ZONE _user_timezone) - INTERVAL '1 day')::DATE
                    ELSE (p1.completed_at AT TIME ZONE _user_timezone)::DATE
                END = _adjusted_completed_date
            ) INTO _has_morning_prayer;
            
        SELECT 
            EXISTS(
                SELECT 1 FROM prayers p2 
                WHERE p2.user_id = _user_id 
                AND p2.completed_at IS NOT NULL
                AND (p2.slot LIKE '%evening%' OR p2.slot LIKE '%pm%')
                AND CASE 
                    WHEN EXTRACT(HOUR FROM p2.completed_at AT TIME ZONE _user_timezone) < 4 
                    THEN ((p2.completed_at AT TIME ZONE _user_timezone) - INTERVAL '1 day')::DATE
                    ELSE (p2.completed_at AT TIME ZONE _user_timezone)::DATE
                END = _adjusted_completed_date
            ) INTO _has_evening_prayer;
        
        _is_perfect_day := _has_morning_prayer AND _has_evening_prayer;
        
        -- Only update streak if this creates a perfect day
        IF _is_perfect_day THEN
            -- Get or create user stats record
            SELECT * INTO _stats_record FROM public.user_stats WHERE user_id = _user_id;
            
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
                
                -- Update streak logic for perfect days only
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
                    -- Streak logic with 4 AM boundary - only for perfect days
                    current_streak = CASE
                        -- First perfect day ever
                        WHEN _last_prayer_date IS NULL THEN 1
                        -- Perfect day on same day (shouldn't happen with our perfect day logic, but keeping for safety)
                        WHEN _adjusted_last_prayer_date = _adjusted_completed_date THEN current_streak
                        -- Perfect day yesterday (continue streak)
                        WHEN _adjusted_last_prayer_date = _adjusted_yesterday THEN current_streak + 1
                        -- Perfect day after a gap (reset streak)
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
        ELSE
            -- Not a perfect day yet, still update prayer counts but not streak
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
                updated_at = now()
            WHERE user_id = _user_id;
            
            -- If no stats record exists, create one without streak
            IF NOT FOUND THEN
                INSERT INTO public.user_stats (
                    user_id, 
                    current_streak, 
                    longest_streak, 
                    total_prayers_completed,
                    last_prayer_date,
                    streak_start_date
                ) VALUES (
                    _user_id, 
                    0, 
                    0, 
                    1,
                    NULL,
                    NULL
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the perfect day logic
COMMENT ON FUNCTION public.update_prayer_streak() IS 
'Updates user prayer streak based on "perfect days" only:
- Perfect day = both morning AND evening prayers completed on the same day
- Day changes at 4 AM, not midnight (matching prayer and challenge systems)
- Prayers completed before 4 AM count as the previous day
- Streaks only increment when a perfect day is achieved
- This encourages users to complete both daily prayer sessions';

-- Reset all existing streaks to use perfect day logic
-- This is a clean slate approach as requested
UPDATE public.user_stats 
SET 
    current_streak = 0,
    longest_streak = 0,
    streak_start_date = NULL,
    last_prayer_date = NULL,
    updated_at = NOW();

-- Recalculate streaks based on perfect days
DO $$
DECLARE
    user_record RECORD;
    perfect_day_record RECORD;
    user_tz TEXT;
    new_streak INTEGER;
    max_streak INTEGER;
    prev_date DATE;
    last_perfect_date DATE;
    streak_start DATE;
BEGIN
    -- For each user
    FOR user_record IN 
        SELECT DISTINCT user_id FROM prayers WHERE completed_at IS NOT NULL
    LOOP
        -- Get user timezone
        SELECT COALESCE(timezone, 'America/New_York') INTO user_tz
        FROM profiles WHERE id = user_record.user_id;
        
        new_streak := 0;
        max_streak := 0;
        prev_date := NULL;
        last_perfect_date := NULL;
        streak_start := NULL;
        
        -- Find all perfect days for this user (days with both morning and evening prayers)
        FOR perfect_day_record IN 
            WITH prayer_days AS (
                SELECT DISTINCT
                    CASE 
                        WHEN EXTRACT(HOUR FROM completed_at AT TIME ZONE user_tz) < 4 
                        THEN ((completed_at AT TIME ZONE user_tz) - INTERVAL '1 day')::DATE
                        ELSE (completed_at AT TIME ZONE user_tz)::DATE
                    END as prayer_date,
                    bool_or(slot LIKE '%morning%' OR slot LIKE '%am%') as has_morning,
                    bool_or(slot LIKE '%evening%' OR slot LIKE '%pm%') as has_evening,
                    max(completed_at) as latest_prayer_on_date
                FROM prayers 
                WHERE user_id = user_record.user_id 
                  AND completed_at IS NOT NULL
                GROUP BY 1
            )
            SELECT prayer_date, latest_prayer_on_date
            FROM prayer_days 
            WHERE has_morning = true AND has_evening = true
            ORDER BY prayer_date DESC
        LOOP
            -- First perfect day (most recent)
            IF prev_date IS NULL THEN
                new_streak := 1;
                prev_date := perfect_day_record.prayer_date;
                last_perfect_date := perfect_day_record.prayer_date;
                streak_start := perfect_day_record.prayer_date;
            -- Check if this continues the streak going backwards
            ELSIF perfect_day_record.prayer_date = prev_date - INTERVAL '1 day' THEN
                -- Previous day, increment streak
                new_streak := new_streak + 1;
                prev_date := perfect_day_record.prayer_date;
                streak_start := perfect_day_record.prayer_date;
            ELSE
                -- Gap found, check if this was our longest streak
                max_streak := GREATEST(max_streak, new_streak);
                -- Start new potential streak
                new_streak := 1;
                prev_date := perfect_day_record.prayer_date;
                streak_start := perfect_day_record.prayer_date;
            END IF;
        END LOOP;
        
        -- Final check for longest streak
        max_streak := GREATEST(max_streak, new_streak);
        
        -- Update user stats with perfect day streak
        UPDATE public.user_stats 
        SET 
            current_streak = new_streak,
            longest_streak = max_streak,
            streak_start_date = CASE WHEN new_streak > 0 THEN (SELECT latest_prayer_on_date FROM (
                WITH prayer_days AS (
                    SELECT DISTINCT
                        CASE 
                            WHEN EXTRACT(HOUR FROM completed_at AT TIME ZONE user_tz) < 4 
                            THEN ((completed_at AT TIME ZONE user_tz) - INTERVAL '1 day')::DATE
                            ELSE (completed_at AT TIME ZONE user_tz)::DATE
                        END as prayer_date,
                        bool_or(slot LIKE '%morning%' OR slot LIKE '%am%') as has_morning,
                        bool_or(slot LIKE '%evening%' OR slot LIKE '%pm%') as has_evening,
                        max(completed_at) as latest_prayer_on_date
                    FROM prayers 
                    WHERE user_id = user_record.user_id 
                      AND completed_at IS NOT NULL
                    GROUP BY 1
                )
                SELECT latest_prayer_on_date
                FROM prayer_days 
                WHERE has_morning = true AND has_evening = true 
                  AND prayer_date = streak_start
                LIMIT 1
            ) sub) ELSE NULL END,
            last_prayer_date = CASE WHEN new_streak > 0 THEN (SELECT latest_prayer_on_date FROM (
                WITH prayer_days AS (
                    SELECT DISTINCT
                        CASE 
                            WHEN EXTRACT(HOUR FROM completed_at AT TIME ZONE user_tz) < 4 
                            THEN ((completed_at AT TIME ZONE user_tz) - INTERVAL '1 day')::DATE
                            ELSE (completed_at AT TIME ZONE user_tz)::DATE
                        END as prayer_date,
                        bool_or(slot LIKE '%morning%' OR slot LIKE '%am%') as has_morning,
                        bool_or(slot LIKE '%evening%' OR slot LIKE '%pm%') as has_evening,
                        max(completed_at) as latest_prayer_on_date
                    FROM prayers 
                    WHERE user_id = user_record.user_id 
                      AND completed_at IS NOT NULL
                    GROUP BY 1
                )
                SELECT latest_prayer_on_date
                FROM prayer_days 
                WHERE has_morning = true AND has_evening = true 
                  AND prayer_date = last_perfect_date
                LIMIT 1
            ) sub) ELSE NULL END,
            updated_at = NOW()
        WHERE user_id = user_record.user_id;
        
        RAISE NOTICE 'Updated user % perfect day streak to % (longest: %)', user_record.user_id, new_streak, max_streak;
    END LOOP;
END $$;
