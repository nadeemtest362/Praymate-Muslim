# Streak System Change: 1 Prayer/Day - CORRECTED PLAN

## Overview

Change streak from requiring BOTH prayers (perfect day) to requiring ONE prayer per day. Perfect days become a bonus achievement.

**Status:** Pre-launch, no production users

---

## Database Changes (CORRECTED)

### 1. Update `update_prayer_streak()` Function

**File:** `supabase/migrations/[timestamp]_one_prayer_streak.sql`

**Complete rewrite with proper UPSERT:**

```sql
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
    _already_completed_today BOOLEAN;
    _had_prayer_yesterday BOOLEAN;
BEGIN
    -- Idempotency: only react when completed_at changed to non-null
    IF NEW.completed_at IS NULL OR NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at THEN
        RETURN NEW;
    END IF;

    -- Get timezone
    SELECT COALESCE(timezone, 'America/New_York') INTO _tz
    FROM public.profiles WHERE id = _user_id;

    -- Compute adjusted day boundaries
    _day := public.adjusted_day(_completed_at, _tz);
    _yesterday := (_day - INTERVAL '1 day')::date;

    -- COMPUTE ONCE: Check if another prayer already completed today (dedup)
    SELECT EXISTS (
        SELECT 1 FROM public.prayers p
        WHERE p.user_id = _user_id 
          AND p.completed_at IS NOT NULL
          AND public.adjusted_day(p.generated_at, _tz) = _day
          AND p.id != NEW.id
    ) INTO _already_completed_today;
    
    -- COMPUTE ONCE: Check if yesterday had any prayer (continuity)
    SELECT EXISTS (
        SELECT 1 FROM public.prayers p
        WHERE p.user_id = _user_id 
          AND p.completed_at IS NOT NULL
          AND public.adjusted_day(p.generated_at, _tz) = _yesterday
    ) INTO _had_prayer_yesterday;

    -- UPSERT with increments computed INSIDE conflict handler (prevents race condition)
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
        1,  -- First prayer = streak of 1
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
        -- Always increment counters (inside conflict handler = safe)
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
        
        -- Streak logic (uses precomputed booleans)
        current_streak = CASE
            WHEN _already_completed_today THEN user_stats.current_streak
            WHEN _had_prayer_yesterday THEN user_stats.current_streak + 1
            ELSE 1
        END,
        
        streak_start_date = CASE
            WHEN _already_completed_today THEN user_stats.streak_start_date
            WHEN _had_prayer_yesterday THEN user_stats.streak_start_date
            ELSE _completed_at
        END,
        
        longest_streak = GREATEST(
            user_stats.longest_streak,
            CASE
                WHEN _already_completed_today THEN user_stats.current_streak
                WHEN _had_prayer_yesterday THEN user_stats.current_streak + 1
                ELSE 1
            END
        );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_prayer_streak() IS 
'Updates user_stats on prayer completion. Increments streak for ANY prayer per day (not just perfect days). 
Uses ON CONFLICT to prevent race conditions. Uses adjusted_day() for 4am boundary.';
```

**Key fixes:**
- ✅ Computes `_already_completed_today` and `_had_prayer_yesterday` ONCE
- ✅ ON CONFLICT with increments INSIDE handler (`user_stats.total_prayers_completed + 1`)
- ✅ No slot filtering - counts ALL prayers
- ✅ All day checks use `adjusted_day(p.generated_at, _tz)`

---

### 2. Update `get_effective_streak()` Function

**Rewrite to check ANY prayer (not slots):**

```sql
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

  -- Get raw current streak from user_stats
  SELECT current_streak INTO _raw 
  FROM public.user_stats WHERE user_id = p_user;
  
  IF NOT FOUND THEN
    _raw := 0;
  END IF;

  -- Check if ANY prayer completed today (no slot filter!)
  SELECT EXISTS (
    SELECT 1 FROM public.prayers p
    WHERE p.user_id = p_user 
      AND p.completed_at IS NOT NULL
      AND public.adjusted_day(p.generated_at, _tz) = _today
  ) INTO _today_any;

  -- Check if ANY prayer completed yesterday
  SELECT EXISTS (
    SELECT 1 FROM public.prayers p
    WHERE p.user_id = p_user 
      AND p.completed_at IS NOT NULL
      AND public.adjusted_day(p.generated_at, _tz) = _yesterday
  ) INTO _yday_any;

  -- Return raw streak if user had ANY prayer today or yesterday
  IF (_today_any OR _yday_any) THEN
    RETURN COALESCE(_raw, 0);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_effective_streak(uuid) IS
'Returns display streak (0 if no prayer today/yesterday). Uses ANY prayer not just morning/evening slots.';
```

**Critical fix:** No more slot-specific checks - will work with onboarding-initial prayers

---

### 3. Data Migration

```sql
-- After deploying new trigger, reset all streaks (pre-launch safe)
UPDATE user_stats SET 
    current_streak = 0,
    longest_streak = 0,
    streak_start_date = NULL,
    last_prayer_date = NULL;

-- Trigger will rebuild as users complete prayers going forward
```

---

## UI Changes

### Critical Files (Must Update):

**1. `supabase/functions/complete-prayer/index.ts`**
```typescript
// After marking prayer complete, check if today is now perfect
const { data: todaysPrayers } = await supabase
  .from('prayers')
  .select('slot, completed_at')
  .eq('user_id', userId)
  .not('completed_at', 'is', null)
  .gte('generated_at', todayStart)
  .lt('generated_at', todayEnd);

const hasMorning = todaysPrayers?.some(p => p.slot === 'morning') || false;
const hasEvening = todaysPrayers?.some(p => p.slot === 'evening') || false;
const isPerfectDay = hasMorning && hasEvening;

return new Response(JSON.stringify({
  success: true,
  streak: newStreak,
  isPerfectDay,
  completedToday: todaysPrayers?.length || 0
}));
```

**2. `src/hooks/useHomeData.ts`**
```typescript
// Centralize both booleans here (single source of truth)
const todayHasPrayer = morningCompleted || eveningCompleted;
const isPerfectDayToday = morningCompleted && eveningCompleted;

return {
  ...existingData,
  todayHasPrayer,
  isPerfectDayToday,
};
```

**3. `src/components/home/StreakSummaryModal.tsx`**
```typescript
// Line 651: Update to use new hook values
const { todayHasPrayer, isPerfectDayToday } = useHomeData(userId);

// Lines 654-656: Update day display logic
const endDay = todayHasPrayer ? addDays(todayTz, 1) : todayTz;

// Lines 677-680: Update fill logic
if (todayHasPrayer) {
    fill = fill + 1;
}

// Lines 720-725: Update helper text
{completedToday === 2
    ? "Perfect Day! You completed both prayers."
    : completedToday === 1
        ? "Great! Complete your other prayer for a Perfect Day."
        : currentStreak > 0
            ? "Complete a prayer today to keep your streak going"
            : "Complete a prayer to start your streak"}
```

**4. `src/components/home/PrayerJourney.tsx`**
```typescript
// Lines 105-111: Update streak text
{currentStreak === 0 ? (
    <>Complete a prayer today to start your prayer goal</>
) : (
    <>You've prayed for <Text ...>{currentStreak}</Text> days straight...</>
)}

// Lines 277-353: Keep Perfect Day Banner, just update trigger
{isPerfectDayToday && (
    <TouchableOpacity ...>
        <Text ...>PERFECT DAY! 🙏</Text>
    </TouchableOpacity>
)}
```

**5. `app/(app)/(tabs)/home/index.tsx`**
```typescript
// Lines 570-596: Update Blessed Day modal trigger
if (isPerfectDayToday && !blessedDayShownToday.current) {
  setShowBlessedDayModal(true);
  trackHomeEvent("perfect_day_achieved");
}
```

### No Changes Needed:
- ✅ WeeklyCalendar - semicircles already show single prayers
- ✅ StreakBadge - just displays number
- ✅ JourneyCard - just displays number

---

## Testing Plan

### Database Test SQL

```sql
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
    streak_val INTEGER;
BEGIN
    -- Setup
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    INSERT INTO profiles (id, timezone) VALUES (test_user_id, 'America/New_York')
    ON CONFLICT (id) DO UPDATE SET timezone = 'America/New_York';
    
    -- Test 1: First prayer creates streak of 1
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, 'Test 1 failed';
    
    -- Test 2: Same day evening should NOT increment
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, 'Test 2 failed (dedup)';
    
    -- Test 3: Next day increments
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day');
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 2, 'Test 3 failed';
    
    -- Test 4: Gap resets
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days');
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, 'Test 4 failed (gap)';
    
    -- Test 5: Onboarding-only creates streak
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'onboarding-initial', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, 'Test 5 failed (onboarding)';
    
    -- Test 6: 4am boundary
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning', 
            (CURRENT_DATE + TIME '03:50:00') AT TIME ZONE 'America/New_York',
            (CURRENT_DATE + TIME '03:50:00') AT TIME ZONE 'America/New_York');
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning',
            (CURRENT_DATE + TIME '10:00:00') AT TIME ZONE 'America/New_York', 
            (CURRENT_DATE + TIME '10:00:00') AT TIME ZONE 'America/New_York');
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 2, 'Test 6 failed (4am boundary)';
    
    -- Test 7: Race condition simulation
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES 
        (gen_random_uuid(), test_user_id, 'onboarding-initial', NOW(), NOW()),
        (gen_random_uuid(), test_user_id, 'morning', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, 'Test 7 failed (race)';
    
    RAISE NOTICE 'All 7 tests passed!';
END $$;
```

---

## Timeline

**Phase 1 - Database Core:** 4-6 hours
- Write corrected migration with proper UPSERT
- Rewrite get_effective_streak
- Write and run test SQL
- Deploy + reset user_stats

**Phase 2 - UI Components:** 4-6 hours
- Update complete-prayer edge function
- Update useHomeData
- Update StreakSummaryModal, PrayerJourney
- Update home index modal trigger

**Phase 3 - Analytics:** 2-3 hours
- Add perfect_day_achieved event
- Update dashboard (optional)

**Phase 4 - QA:** 4-6 hours
- Run all 7 SQL tests
- Manual app testing
- Verify analytics

**Total:** 14-21 hours (2-3 days)

---

## Implementation Checklist

Before merging:

- [ ] Trigger has `WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)` guard
- [ ] UPSERT computes increments INSIDE conflict handler
- [ ] All day checks use `adjusted_day(p.generated_at, _tz)`
- [ ] `get_effective_streak()` has NO slot filtering
- [ ] Tested all 7 edge cases
- [ ] Data migration script ready
- [ ] Rollback migration prepared

---

## Rollback Plan

```sql
-- Restore old functions from backup
-- Reset user_stats
TRUNCATE user_stats;
```

**Risk:** Pre-launch, no real users - worst case is dev data reset
