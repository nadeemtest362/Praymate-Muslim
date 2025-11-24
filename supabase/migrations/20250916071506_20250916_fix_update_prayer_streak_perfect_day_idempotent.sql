-- Patch update_prayer_streak: idempotency, no reset on non-perfect, row lock, adjusted_day()
CREATE OR REPLACE FUNCTION public.update_prayer_streak()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _completed_at TIMESTAMPTZ := NEW.completed_at;
    _user_id UUID := NEW.user_id;
    _tz TEXT;

    _day DATE;            -- adjusted day of this completion
    _yesterday DATE;      -- previous adjusted day

    _has_morning BOOLEAN;
    _has_evening BOOLEAN;
    _is_perfect BOOLEAN;

    _stats public.user_stats;
BEGIN
    -- Idempotency: only react when completed_at actually changed to non-null
    IF NEW.completed_at IS NULL OR NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at THEN
        RETURN NEW;
    END IF;

    -- Resolve timezone (default)
    SELECT COALESCE(timezone, 'America/New_York') INTO _tz
    FROM public.profiles WHERE id = _user_id;

    -- Compute adjusted day boundaries based on completion time
    _day := public.adjusted_day(_completed_at, _tz);
    _yesterday := (_day - INTERVAL '1 day')::date;

    -- Determine if this adjusted day is a perfect day (both morning & evening completed)
    SELECT EXISTS (
        SELECT 1 FROM public.prayers p
        WHERE p.user_id = _user_id
          AND p.slot = 'morning'
          AND p.completed_at IS NOT NULL
          AND public.adjusted_day(p.generated_at, _tz) = _day
    ) INTO _has_morning;

    SELECT EXISTS (
        SELECT 1 FROM public.prayers p
        WHERE p.user_id = _user_id
          AND p.slot = 'evening'
          AND p.completed_at IS NOT NULL
          AND public.adjusted_day(p.generated_at, _tz) = _day
    ) INTO _has_evening;

    _is_perfect := COALESCE(_has_morning, false) AND COALESCE(_has_evening, false);

    -- Lock stats row for this user to avoid race conditions
    SELECT * INTO _stats FROM public.user_stats WHERE user_id = _user_id FOR UPDATE;

    IF _is_perfect THEN
        -- Perfect day: update streak continuity and counters
        IF NOT FOUND THEN
            INSERT INTO public.user_stats (
                user_id,
                current_streak,
                longest_streak,
                total_prayers_completed,
                week_prayers_completed,
                month_prayers_completed,
                last_prayer_date,
                streak_start_date,
                created_at,
                updated_at
            ) VALUES (
                _user_id,
                1,
                1,
                1,
                1,
                1,
                _completed_at,
                _completed_at,
                NOW(),
                NOW()
            );
        ELSE
            UPDATE public.user_stats us
            SET
                total_prayers_completed = us.total_prayers_completed + 1,
                week_prayers_completed = CASE 
                    WHEN DATE_TRUNC('week', _completed_at) = DATE_TRUNC('week', CURRENT_DATE) THEN us.week_prayers_completed + 1
                    ELSE 1
                END,
                month_prayers_completed = CASE 
                    WHEN DATE_TRUNC('month', _completed_at) = DATE_TRUNC('month', CURRENT_DATE) THEN us.month_prayers_completed + 1
                    ELSE 1
                END,
                last_prayer_date = _completed_at,
                current_streak = CASE
                    -- Continue streak if prior perfect day was yesterday; else reset to 1
                    WHEN EXISTS (
                        SELECT 1 FROM public.prayers pm, public.prayers pe
                        WHERE pm.user_id = _user_id AND pm.slot = 'morning' AND pm.completed_at IS NOT NULL
                          AND public.adjusted_day(pm.generated_at, _tz) = _yesterday
                        AND pe.user_id = _user_id AND pe.slot = 'evening' AND pe.completed_at IS NOT NULL
                          AND public.adjusted_day(pe.generated_at, _tz) = _yesterday
                        LIMIT 1
                    ) THEN us.current_streak + 1
                    ELSE 1
                END,
                streak_start_date = CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM public.prayers pm, public.prayers pe
                        WHERE pm.user_id = _user_id AND pm.slot = 'morning' AND pm.completed_at IS NOT NULL
                          AND public.adjusted_day(pm.generated_at, _tz) = _yesterday
                        AND pe.user_id = _user_id AND pe.slot = 'evening' AND pe.completed_at IS NOT NULL
                          AND public.adjusted_day(pe.generated_at, _tz) = _yesterday
                        LIMIT 1
                    ) THEN _completed_at
                    ELSE us.streak_start_date
                END,
                longest_streak = GREATEST(us.longest_streak,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM public.prayers pm, public.prayers pe
                            WHERE pm.user_id = _user_id AND pm.slot = 'morning' AND pm.completed_at IS NOT NULL
                              AND public.adjusted_day(pm.generated_at, _tz) = _yesterday
                            AND pe.user_id = _user_id AND pe.slot = 'evening' AND pe.completed_at IS NOT NULL
                              AND public.adjusted_day(pe.generated_at, _tz) = _yesterday
                            LIMIT 1
                        ) THEN us.current_streak + 1
                        ELSE 1
                    END
                ),
                updated_at = NOW()
            WHERE us.user_id = _user_id;
        END IF;
    ELSE
        -- Not a perfect day: update counts and last_prayer_date only; do NOT reset streak
        IF NOT FOUND THEN
            INSERT INTO public.user_stats (
                user_id,
                current_streak,
                longest_streak,
                total_prayers_completed,
                week_prayers_completed,
                month_prayers_completed,
                last_prayer_date,
                streak_start_date,
                created_at,
                updated_at
            ) VALUES (
                _user_id,
                0,
                0,
                1,
                1,
                1,
                _completed_at,
                NULL,
                NOW(),
                NOW()
            );
        ELSE
            UPDATE public.user_stats us
            SET
                total_prayers_completed = us.total_prayers_completed + 1,
                week_prayers_completed = CASE 
                    WHEN DATE_TRUNC('week', _completed_at) = DATE_TRUNC('week', CURRENT_DATE) THEN us.week_prayers_completed + 1
                    ELSE 1
                END,
                month_prayers_completed = CASE 
                    WHEN DATE_TRUNC('month', _completed_at) = DATE_TRUNC('month', CURRENT_DATE) THEN us.month_prayers_completed + 1
                    ELSE 1
                END,
                last_prayer_date = _completed_at,
                updated_at = NOW()
            WHERE us.user_id = _user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_prayer_streak() IS 'Updates user_stats for prayer completion. Only increments streak on perfect days (both morning and evening completed for the adjusted day). Idempotent and uses SELECT ... FOR UPDATE to avoid races. Uses adjusted_day() for DST-safe day logic.';

-- Ensure trigger exists and only fires on completed_at transition from NULL to non-NULL
DROP TRIGGER IF EXISTS update_prayer_streak_trigger ON public.prayers;
CREATE TRIGGER update_prayer_streak_trigger
AFTER UPDATE OF completed_at ON public.prayers
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.update_prayer_streak();
