# Streak System Change: 1 Prayer/Day - FINAL CORRECTED PLAN

## Overview

Change streak from requiring BOTH prayers to requiring ONE prayer per day. Perfect days become bonus achievement.

**Status:** Pre-launch, no production users, can reset all data

---

## Database Changes

### 1. Update `update_prayer_streak()` - NO RACE CONDITION

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

    -- UPSERT with ALL logic INSIDE conflict handler (prevents race)
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
        
        -- DEDUP & CONTINUITY: Use locked last_prayer_date (NO RACE)
        current_streak = CASE
            -- Same adjusted day = dedup, keep current
            WHEN public.adjusted_day(user_stats.last_prayer_date, _tz) = _day 
            THEN user_stats.current_streak
            
            -- Yesterday = continue streak
            WHEN public.adjusted_day(user_stats.last_prayer_date, _tz) = _yesterday 
            THEN user_stats.current_streak + 1
            
            -- Gap or NULL = reset to 1
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
```

**WHY THIS WORKS:**
- Dedup/continuity computed INSIDE conflict handler
- Uses locked `user_stats.last_prayer_date` value
- No race condition possible - two concurrent completions will see correct locked value

---

### 2. Update `get_effective_streak()` - NO SLOT FILTERING

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
  -- Get timezone
  SELECT COALESCE(timezone,'America/New_York') INTO _tz 
  FROM public.profiles WHERE id = p_user;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  _today := public.adjusted_day(now(), _tz);
  _yesterday := (_today - interval '1 day')::date;

  -- Get raw streak
  SELECT current_streak INTO _raw 
  FROM public.user_stats WHERE user_id = p_user;
  
  IF NOT FOUND THEN
    _raw := 0;
  END IF;

  -- Check if ANY prayer today (no slot filter!)
  SELECT EXISTS (
    SELECT 1 FROM public.prayers p
    WHERE p.user_id = p_user 
      AND p.completed_at IS NOT NULL
      AND public.adjusted_day(p.generated_at, _tz) = _today
  ) INTO _today_any;

  -- Check if ANY prayer yesterday
  SELECT EXISTS (
    SELECT 1 FROM public.prayers p
    WHERE p.user_id = p_user 
      AND p.completed_at IS NOT NULL
      AND public.adjusted_day(p.generated_at, _tz) = _yesterday
  ) INTO _yday_any;

  -- Return streak if active (today or yesterday had prayer)
  IF (_today_any OR _yday_any) THEN
    RETURN COALESCE(_raw, 0);
  ELSE
    RETURN 0;
  END IF;
END;
$$;
```

---

### 3. Add helper RPC for perfect day check

```sql
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
  FROM profiles WHERE id = p_user_id;
  
  _today := public.adjusted_day(now(), _tz);
  
  -- Check for morning
  SELECT EXISTS(
    SELECT 1 FROM prayers 
    WHERE user_id = p_user_id 
      AND slot = 'morning' 
      AND completed_at IS NOT NULL 
      AND adjusted_day(generated_at, _tz) = _today
  ) INTO _has_morning;
  
  -- Check for evening
  SELECT EXISTS(
    SELECT 1 FROM prayers 
    WHERE user_id = p_user_id 
      AND slot = 'evening' 
      AND completed_at IS NOT NULL 
      AND adjusted_day(generated_at, _tz) = _today
  ) INTO _has_evening;
  
  -- Count completed today (including onboarding)
  SELECT COUNT(*) INTO _count
  FROM prayers
  WHERE user_id = p_user_id
    AND completed_at IS NOT NULL
    AND adjusted_day(generated_at, _tz) = _today;
  
  RETURN QUERY SELECT 
    (_has_morning AND _has_evening) as is_perfect,
    _count as prayer_count;
END;
$$;
```

---

### 4. Data Migration

```sql
-- Reset ALL stats for clean slate (pre-launch safe)
UPDATE user_stats SET 
    current_streak = 0,
    longest_streak = 0,
    streak_start_date = NULL,
    last_prayer_date = NULL,
    total_prayers_completed = 0,
    week_prayers_completed = 0,
    month_prayers_completed = 0;

-- Trigger will rebuild as users complete prayers
```

---

## UI Changes

### 1. Edge Function: `supabase/functions/complete-prayer/index.ts`

```typescript
// Use the new RPC to check perfect day (timezone-safe!)
const { data: perfectDayCheck } = await supabase
  .rpc('check_perfect_day_today', { p_user_id: userId });

const isPerfectDay = perfectDayCheck?.[0]?.is_perfect || false;
const prayerCount = perfectDayCheck?.[0]?.prayer_count || 0;

// Get updated streak
const { data: userStats } = await supabase
  .from('user_stats')
  .select('current_streak, total_prayers_completed')
  .eq('user_id', userId)
  .single();

const newStreak = userStats?.current_streak ?? 0;

return new Response(JSON.stringify({ 
  success: true,
  streak: newStreak,
  isPerfectDay: isPerfectDay,
  prayersToday: prayerCount,
  prayerTimeOfDay: prayerTimeOfDay
}), { 
  headers: { 'Content-Type': 'application/json' },
  status: 200 
});
```

---

### 2. Hook: `src/hooks/useHomeData.ts`

```typescript
// Add derived values to the hook (single source of truth)
const derivedData = useMemo(() => {
  const todayHasPrayer = morningCompleted || eveningCompleted;
  const isPerfectDayToday = morningCompleted && eveningCompleted;
  
  return {
    ...existingData,
    todayHasPrayer,
    isPerfectDayToday,
  };
}, [morningCompleted, eveningCompleted, existingData]);

return derivedData;
```

---

### 3. Component: `src/components/home/StreakSummaryModal.tsx`

```typescript
// RECEIVES todayHasPrayer and isPerfectDayToday as PROPS from parent
// Don't call useHomeData here - causes duplicate fetching

interface StreakSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  currentStreak: number;
  prayers: Prayer[];
  morningCompleted: boolean;
  eveningCompleted: boolean;
  todayHasPrayer: boolean;        // NEW PROP
  isPerfectDayToday: boolean;     // NEW PROP
}

// Inside component:
const endDay = todayHasPrayer ? addDays(todayTz, 1) : todayTz;

if (todayHasPrayer) {
    fill = fill + 1;
}

// Update helper text:
{isPerfectDayToday
    ? "Perfect Day! You completed both prayers."
    : todayHasPrayer
        ? "Great! Complete your other prayer for a Perfect Day."
        : currentStreak > 0
            ? "Complete a prayer today to keep your streak going"
            : "Complete a prayer to start your streak"}
```

---

### 4. Component: `src/components/home/PrayerJourney.tsx`

```typescript
// Update copy (receives isPerfectDayToday from parent)
{currentStreak === 0 ? (
    <>Complete a prayer today to start your prayer goal</>
) : (
    <>You've prayed for <Text ...>{currentStreak}</Text> days straight...</>
)}

// Keep Perfect Day Banner (trigger on isPerfectDayToday prop)
{isPerfectDayToday && (
    <TouchableOpacity ...>
        <Text>PERFECT DAY! 🙏</Text>
    </TouchableOpacity>
)}
```

---

### 5. Screen: `app/(app)/(tabs)/home/index.tsx`

```typescript
// Get derived values from useHomeData
const { todayHasPrayer, isPerfectDayToday } = useHomeData(userId);

// Pass to components as props
<StreakSummaryModal
  {...existingProps}
  todayHasPrayer={todayHasPrayer}
  isPerfectDayToday={isPerfectDayToday}
/>

<PrayerJourney
  {...existingProps}
  isPerfectDayToday={isPerfectDayToday}
/>

// Update modal trigger
if (isPerfectDayToday && !blessedDayShownToday.current) {
  setShowBlessedDayModal(true);
  trackHomeEvent("perfect_day_achieved");
}
```

---

## Testing Plan

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
    
    -- Test 1: First prayer = streak 1
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('Test 1 failed: got %s', streak_val);
    
    -- Test 2: Same day evening = still 1 (dedup)
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('Test 2 failed: got %s', streak_val);
    
    -- Test 3: Next day = 2
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day');
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 2, format('Test 3 failed: got %s', streak_val);
    
    -- Test 4: Gap = reset to 1
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days');
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('Test 4 failed: got %s', streak_val);
    
    -- Test 5: Onboarding-only = streak 1
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'onboarding-initial', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('Test 5 failed: got %s', streak_val);
    
    -- Test 6: 4am boundary (3:50am + 10am = 2 different days)
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
    ASSERT streak_val = 2, format('Test 6 failed: got %s', streak_val);
    
    -- Test 7: Concurrent inserts (race simulation)
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES 
        (gen_random_uuid(), test_user_id, 'onboarding-initial', NOW(), NOW()),
        (gen_random_uuid(), test_user_id, 'morning', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('Test 7 failed: got %s', streak_val);
    
    RAISE NOTICE '✅ All 7 tests passed!';
END $$;
```

---

## Implementation Checklist

- [ ] Deploy new `update_prayer_streak()` function
- [ ] Deploy new `get_effective_streak()` function
- [ ] Deploy new `check_perfect_day_today()` RPC
- [ ] Run data migration (reset all stats)
- [ ] Update edge function with RPC call
- [ ] Update useHomeData with derived values
- [ ] Update StreakSummaryModal props
- [ ] Update PrayerJourney
- [ ] Update home index screen
- [ ] Run all 7 SQL tests
- [ ] Manual QA: single prayer increments streak
- [ ] Manual QA: both prayers same day = dedup
- [ ] Manual QA: perfect day triggers celebration
- [ ] Verify get_effective_streak works with onboarding-only

---

## Timeline

**Phase 1 - Database:** 4-6 hours
**Phase 2 - UI:** 4-6 hours  
**Phase 3 - Testing:** 4-6 hours

**Total:** 12-18 hours (1.5-2 days)

---

## Files Changed Summary

**Database (3):**
1. New migration with 3 functions
2. Data migration script

**Backend (1):**
3. `supabase/functions/complete-prayer/index.ts`

**Frontend (3):**
4. `src/hooks/useHomeData.ts`
5. `src/components/home/StreakSummaryModal.tsx`
6. `src/components/home/PrayerJourney.tsx`
7. `app/(app)/(tabs)/home/index.tsx`

**Total:** 7 files
