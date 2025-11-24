-- Migration: Change streak system from perfect-day-only to any-prayer-per-day
-- Summary: Streak now increments when ANY prayer completed (morning OR evening OR onboarding)
-- Perfect Day becomes a bonus achievement (both prayers same day)
-- Pre-launch safe: resets all stats data

-- ============================================================================
-- FUNCTION 1: update_prayer_streak() - Core Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_prayer_streak()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _completed_at TIMESTAMPTZ := NEW.completed_at;
    _user_id UUID := NEW.user_id;
    _tz TEXT;
    _day DATE;
    _yesterday DATE;
BEGIN
    -- Only fire on NULL → NOT NULL transition
    IF NEW.completed_at IS NULL OR NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at THEN
        RETURN NEW;
    END IF;

    -- Get user timezone
    SELECT COALESCE(timezone, 'America/New_York') INTO _tz
    FROM public.profiles WHERE id = _user_id;

    -- Compute adjusted day boundaries (4am boundary)
    _day := public.adjusted_day(_completed_at, _tz);
    _yesterday := (_day - INTERVAL '1 day')::date;

    -- UPSERT: ALL logic inside conflict handler (prevents race)
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
    )
    ON CONFLICT (user_id) DO UPDATE SET
        -- Always increment counters
        total_prayers_completed = user_stats.total_prayers_completed + 1,
        week_prayers_completed = CASE 
            WHEN DATE_TRUNC('week', _completed_at) = DATE_TRUNC('week', CURRENT_DATE) 
            THEN user_stats.week_prayers_completed + 1
            ELSE 1
        END,
        month_prayers_completed = CASE 
            WHEN DATE_TRUNC('month', _completed_at) = DATE_TRUNC('month', CURRENT_DATE) 
            THEN user_stats.month_prayers_completed + 1
            ELSE 1
        END,
        last_prayer_date = _completed_at,
        updated_at = NOW(),
        
        -- Streak: Use locked last_prayer_date (race-safe)
        current_streak = CASE
            -- Dedup: Same adjusted day
            WHEN public.adjusted_day(user_stats.last_prayer_date, _tz) = _day 
            THEN user_stats.current_streak
            
            -- Continue: Yesterday had prayer
            WHEN public.adjusted_day(user_stats.last_prayer_date, _tz) = _yesterday 
            THEN user_stats.current_streak + 1
            
            -- Reset: Gap or first prayer
            ELSE 1
        END,
        
        streak_start_date = CASE
            WHEN public.adjusted_day(user_stats.last_prayer_date, _tz) = _day 
            THEN user_stats.streak_start_date
            WHEN public.adjusted_day(user_stats.last_prayer_date, _tz) = _yesterday 
            THEN user_stats.streak_start_date
            ELSE _completed_at
        END,
        
        longest_streak = GREATEST(
            user_stats.longest_streak,
            CASE
                WHEN public.adjusted_day(user_stats.last_prayer_date, _tz) = _day 
                THEN user_stats.current_streak
                WHEN public.adjusted_day(user_stats.last_prayer_date, _tz) = _yesterday 
                THEN user_stats.current_streak + 1
                ELSE 1
            END
        );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_prayer_streak() IS 
'Increments streak on ANY prayer completion (not just perfect days). Uses ON CONFLICT for race safety.';

-- Ensure trigger exists and only fires on completed_at transition from NULL to non-NULL
DROP TRIGGER IF EXISTS update_prayer_streak_trigger ON public.prayers;
CREATE TRIGGER update_prayer_streak_trigger
AFTER UPDATE OF completed_at ON public.prayers
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.update_prayer_streak();

-- ============================================================================
-- FUNCTION 2: get_effective_streak() - Display Logic
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_effective_streak(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _tz text;
  _today date;
  _yesterday date;
  _raw int := 0;
  _today_any boolean;
  _yday_any boolean;
BEGIN
  SELECT COALESCE(timezone,'America/New_York') INTO _tz 
  FROM public.profiles WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  _today := public.adjusted_day(now(), _tz);
  _yesterday := (_today - interval '1 day')::date;

  SELECT current_streak INTO _raw 
  FROM public.user_stats WHERE user_id = p_user;
  
  IF NOT FOUND THEN
    _raw := 0;
  END IF;

  -- Check ANY prayer today (no slot filter!)
  SELECT EXISTS (
    SELECT 1 FROM public.prayers p
    WHERE p.user_id = p_user 
      AND p.completed_at IS NOT NULL
      AND public.adjusted_day(p.generated_at, _tz) = _today
  ) INTO _today_any;

  -- Check ANY prayer yesterday
  SELECT EXISTS (
    SELECT 1 FROM public.prayers p
    WHERE p.user_id = p_user 
      AND p.completed_at IS NOT NULL
      AND public.adjusted_day(p.generated_at, _tz) = _yesterday
  ) INTO _yday_any;

  IF (_today_any OR _yday_any) THEN
    RETURN COALESCE(_raw, 0);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_effective_streak(uuid) IS
'Returns 0 if no prayer today/yesterday. Checks ANY prayer type (no slot filtering).';

-- ============================================================================
-- FUNCTION 3: check_perfect_day_today() - Perfect Day RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_perfect_day_today(p_user_id UUID)
RETURNS TABLE(is_perfect BOOLEAN, prayer_count INTEGER) 
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _tz TEXT;
  _today DATE;
  _has_morning BOOLEAN;
  _has_evening BOOLEAN;
  _count INTEGER;
BEGIN
  SELECT COALESCE(timezone, 'America/New_York') INTO _tz
  FROM public.profiles WHERE id = p_user_id;
  
  _today := public.adjusted_day(now(), _tz);
  
  -- Use LIKE to catch slot variants (morning, morning-auto, etc.)
  SELECT EXISTS(
    SELECT 1 FROM public.prayers 
    WHERE user_id = p_user_id 
      AND slot LIKE 'morning%'
      AND completed_at IS NOT NULL 
      AND public.adjusted_day(generated_at, _tz) = _today
  ) INTO _has_morning;
  
  SELECT EXISTS(
    SELECT 1 FROM public.prayers 
    WHERE user_id = p_user_id 
      AND slot LIKE 'evening%'
      AND completed_at IS NOT NULL 
      AND public.adjusted_day(generated_at, _tz) = _today
  ) INTO _has_evening;
  
  -- Count ALL completed today
  SELECT COUNT(*) INTO _count
  FROM public.prayers
  WHERE user_id = p_user_id
    AND completed_at IS NOT NULL
    AND public.adjusted_day(generated_at, _tz) = _today;
  
  RETURN QUERY SELECT 
    (_has_morning AND _has_evening) as is_perfect,
    _count as prayer_count;
END;
$$;

COMMENT ON FUNCTION public.check_perfect_day_today(uuid) IS
'Checks if today is a perfect day (both morning and evening completed). Timezone-aware.';

-- ============================================================================
-- DATA MIGRATION: Reset all stats (pre-launch safe)
-- ============================================================================
UPDATE public.user_stats SET 
    current_streak = 0,
    longest_streak = 0,
    streak_start_date = NULL,
    last_prayer_date = NULL,
    total_prayers_completed = 0,
    week_prayers_completed = 0,
    month_prayers_completed = 0,
    updated_at = NOW();

-- ============================================================================
-- TEST SCRIPT (run separately with DO block if needed)
-- ============================================================================
-- DO $$
-- DECLARE
--     test_user_id UUID := '00000000-0000-0000-0000-000000000001';
--     streak_val INTEGER;
-- BEGIN
--     -- Setup
--     DELETE FROM prayers WHERE user_id = test_user_id;
--     DELETE FROM user_stats WHERE user_id = test_user_id;
--     INSERT INTO profiles (id, timezone) VALUES (test_user_id, 'America/New_York')
--     ON CONFLICT (id) DO UPDATE SET timezone = 'America/New_York';
--     
--     RAISE NOTICE 'Test 1: First prayer creates streak';
--     INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
--     VALUES (gen_random_uuid(), test_user_id, 'morning', NOW(), NOW());
--     SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
--     ASSERT streak_val = 1, format('❌ Test 1: Expected 1, got %s', streak_val);
--     RAISE NOTICE '✅ Test 1 passed';
--     
--     RAISE NOTICE 'Test 2: Same day evening deduplicates';
--     INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
--     VALUES (gen_random_uuid(), test_user_id, 'evening', NOW(), NOW());
--     SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
--     ASSERT streak_val = 1, format('❌ Test 2: Expected 1, got %s', streak_val);
--     RAISE NOTICE '✅ Test 2 passed';
--     
--     RAISE NOTICE 'Test 3: Next day increments';
--     INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
--     VALUES (gen_random_uuid(), test_user_id, 'morning', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day');
--     SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
--     ASSERT streak_val = 2, format('❌ Test 3: Expected 2, got %s', streak_val);
--     RAISE NOTICE '✅ Test 3 passed';
--     
--     RAISE NOTICE 'Test 4: Gap resets to 1';
--     INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
--     VALUES (gen_random_uuid(), test_user_id, 'evening', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days');
--     SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
--     ASSERT streak_val = 1, format('❌ Test 4: Expected 1, got %s', streak_val);
--     RAISE NOTICE '✅ Test 4 passed';
--     
--     RAISE NOTICE 'Test 5: Onboarding-only creates streak';
--     DELETE FROM prayers WHERE user_id = test_user_id;
--     DELETE FROM user_stats WHERE user_id = test_user_id;
--     INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
--     VALUES (gen_random_uuid(), test_user_id, 'onboarding-initial', NOW(), NOW());
--     SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
--     ASSERT streak_val = 1, format('❌ Test 5: Expected 1, got %s', streak_val);
--     RAISE NOTICE '✅ Test 5 passed';
--     
--     RAISE NOTICE 'Test 6: 4am boundary (two different adjusted days)';
--     DELETE FROM prayers WHERE user_id = test_user_id;
--     DELETE FROM user_stats WHERE user_id = test_user_id;
--     INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
--     VALUES (gen_random_uuid(), test_user_id, 'morning', 
--             (CURRENT_DATE + TIME '03:50:00') AT TIME ZONE 'America/New_York',
--             (CURRENT_DATE + TIME '03:50:00') AT TIME ZONE 'America/New_York');
--     INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
--     VALUES (gen_random_uuid(), test_user_id, 'morning',
--             (CURRENT_DATE + TIME '10:00:00') AT TIME ZONE 'America/New_York', 
--             (CURRENT_DATE + TIME '10:00:00') AT TIME ZONE 'America/New_York');
--     SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
--     ASSERT streak_val = 2, format('❌ Test 6: Expected 2, got %s', streak_val);
--     RAISE NOTICE '✅ Test 6 passed';
--     
--     RAISE NOTICE 'Test 7: Same-day multi-insert simulates race';
--     DELETE FROM prayers WHERE user_id = test_user_id;
--     DELETE FROM user_stats WHERE user_id = test_user_id;
--     INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
--     VALUES 
--         (gen_random_uuid(), test_user_id, 'onboarding-initial', NOW(), NOW()),
--         (gen_random_uuid(), test_user_id, 'morning', NOW(), NOW());
--     SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
--     ASSERT streak_val = 1, format('❌ Test 7: Expected 1, got %s', streak_val);
--     RAISE NOTICE '✅ Test 7 passed';
--     
--     RAISE NOTICE '🎉 All 7 tests passed!';
-- END $$;
