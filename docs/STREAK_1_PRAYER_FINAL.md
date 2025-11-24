# Streak System: Change to 1 Prayer/Day

## Summary

**Current:** Streak increments ONLY when both morning AND evening prayers completed (perfect day)  
**New:** Streak increments when ANY prayer completed (morning OR evening OR onboarding)  
**Bonus:** Perfect Day achievement when both prayers completed same day

**Status:** Pre-launch, no users, can reset all data

---

## Database Migration

Create: `supabase/migrations/[timestamp]_one_prayer_per_day_streak.sql`

### Function 1: `update_prayer_streak()` - Core Trigger

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
```

### Function 2: `get_effective_streak()` - Display Logic

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
```

### Function 3: `check_perfect_day_today()` - Perfect Day RPC

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
```

### Data Migration

```sql
-- Reset all stats (pre-launch safe)
UPDATE public.user_stats SET 
    current_streak = 0,
    longest_streak = 0,
    streak_start_date = NULL,
    last_prayer_date = NULL,
    total_prayers_completed = 0,
    week_prayers_completed = 0,
    month_prayers_completed = 0;
```

---

## Code Changes

### 1. Edge Function: `supabase/functions/complete-prayer/index.ts`

**Add after marking prayer complete:**

```typescript
try {
  // Check if today is now a perfect day
  const { data: perfectDayCheck, error: rpcError } = await supabase
    .rpc('check_perfect_day_today', { p_user_id: userId });

  if (rpcError) {
    console.error('[complete-prayer] Perfect day check failed:', rpcError);
  }

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
    isPerfectDay,
    prayersToday: prayerCount,
    prayerTimeOfDay
  }), { 
    headers: { 'Content-Type': 'application/json' },
    status: 200 
  });
} catch (error) {
  console.error('[complete-prayer] Error fetching streak/perfect day:', error);
  // Don't block completion - return safe defaults
  return new Response(JSON.stringify({ 
    success: true,
    streak: 0,
    isPerfectDay: false,
    prayersToday: 0,
    prayerTimeOfDay
  }), { 
    headers: { 'Content-Type': 'application/json' },
    status: 200 
  });
}
```

---

### 2. Hook: `src/hooks/useHomeData.ts`

**Add after line 496 (right after uiEveningCompleted):**

```typescript
const todayHasPrayer = uiMorningCompleted || uiEveningCompleted;
const isPerfectDayToday = uiMorningCompleted && uiEveningCompleted;
```

**Then add to return object (after line 511):**

```typescript
// In the existing return statement, add these two lines:
todayHasPrayer,         // NEW - add this line
isPerfectDayToday,      // NEW - add this line
```

**That's it.** Don't change anything else in the return object.

---

### 3. Component: `src/components/home/StreakSummaryModal.tsx`

**Update interface:**

```typescript
interface StreakSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  currentStreak: number;
  prayers: Prayer[];
  morningCompleted: boolean;
  eveningCompleted: boolean;
  todayHasPrayer: boolean;        // NEW
  isPerfectDayToday: boolean;     // NEW
}
```

**Update logic (lines 651-725):**

```typescript
// Use props instead of computing
const { todayHasPrayer, isPerfectDayToday } = props;

// Line 656: Update day display
const endDay = todayHasPrayer ? addDays(todayTz, 1) : todayTz;

// Line 678: Update fill logic
if (todayHasPrayer) {
    fill = fill + 1;
}

// Lines 720-725: Update helper text
{isPerfectDayToday
    ? "Perfect Day! You completed both prayers. Come back tomorrow."
    : todayHasPrayer
        ? "Great! Complete your other prayer for a Perfect Day."
        : currentStreak > 0
            ? "Complete a prayer today to keep your streak going"
            : "Complete a prayer to start your streak"}
```

---

### 4. Component: `src/components/home/PrayerJourney.tsx`

**Add prop:**

```typescript
interface PrayerJourneyProps {
  // ... existing props
  isPerfectDayToday: boolean;  // NEW
}
```

**Update copy (line 105):**

```typescript
{currentStreak === 0 ? (
    <>Complete a prayer today to start your goal</>
) : (
    <>You've prayed for <Text style={{...}}>{currentStreak}</Text> days straight...</>
)}
```

**Update Perfect Day Banner (line 315):**

```typescript
{isPerfectDayToday && (
    <View style={styles.perfectDayBanner}>
        <Text>PERFECT DAY! 🙏</Text>
    </View>
)}
```

---

### 5. Screen: `app/(app)/(tabs)/home/index.tsx`

**Get values from hook and pass as props:**

```typescript
const homeData = useHomeData(user?.id || null);
const { todayHasPrayer, isPerfectDayToday, currentStreak, morningCompleted, eveningCompleted } = homeData;

// Pass to StreakSummaryModal
<StreakSummaryModal
  visible={showStreakSummary}
  onClose={handleCloseStreakSummary}
  currentStreak={currentStreak}
  prayers={allPrayers}
  morningCompleted={morningCompleted}
  eveningCompleted={eveningCompleted}
  todayHasPrayer={todayHasPrayer}           // NEW
  isPerfectDayToday={isPerfectDayToday}     // NEW
/>

// Pass to PrayerJourney
<PrayerJourney
  currentStreak={currentStreak}
  streakGoalDays={profile?.streak_goal_days}
  morningCompleted={morningCompleted}
  eveningCompleted={eveningCompleted}
  isPerfectDayToday={isPerfectDayToday}     // NEW
  // ... other props
/>

// Update Blessed Day modal trigger
if (isPerfectDayToday && !blessedDayShownToday.current) {
  setShowBlessedDayModal(true);
  trackHomeEvent("perfect_day_achieved");  // Update analytics event name
  blessedDayShownToday.current = true;
}
```

---

## Test SQL Script

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
    
    RAISE NOTICE 'Test 1: First prayer creates streak';
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('❌ Test 1: Expected 1, got %s', streak_val);
    RAISE NOTICE '✅ Test 1 passed';
    
    RAISE NOTICE 'Test 2: Same day evening deduplicates';
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('❌ Test 2: Expected 1, got %s', streak_val);
    RAISE NOTICE '✅ Test 2 passed';
    
    RAISE NOTICE 'Test 3: Next day increments';
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day');
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 2, format('❌ Test 3: Expected 2, got %s', streak_val);
    RAISE NOTICE '✅ Test 3 passed';
    
    RAISE NOTICE 'Test 4: Gap resets to 1';
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days');
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('❌ Test 4: Expected 1, got %s', streak_val);
    RAISE NOTICE '✅ Test 4 passed';
    
    RAISE NOTICE 'Test 5: Onboarding-only creates streak';
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'onboarding-initial', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('❌ Test 5: Expected 1, got %s', streak_val);
    RAISE NOTICE '✅ Test 5 passed';
    
    RAISE NOTICE 'Test 6: 4am boundary (two different adjusted days)';
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
    ASSERT streak_val = 2, format('❌ Test 6: Expected 2, got %s', streak_val);
    RAISE NOTICE '✅ Test 6 passed';
    
    RAISE NOTICE 'Test 7: Same-day multi-insert simulates race';
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES 
        (gen_random_uuid(), test_user_id, 'onboarding-initial', NOW(), NOW()),
        (gen_random_uuid(), test_user_id, 'morning', NOW(), NOW());
    SELECT current_streak INTO streak_val FROM user_stats WHERE user_id = test_user_id;
    ASSERT streak_val = 1, format('❌ Test 7: Expected 1, got %s', streak_val);
    RAISE NOTICE '✅ Test 7 passed';
    
    RAISE NOTICE '🎉 All 7 tests passed!';
END $$;

-- Note: True concurrent testing requires separate transactions
-- Run two psql sessions simultaneously for real race testing
```

---

## Implementation Checklist

**Database:**
- [ ] Deploy `update_prayer_streak()` with ON CONFLICT logic
- [ ] Deploy `get_effective_streak()` with no slot filtering
- [ ] Deploy `check_perfect_day_today()` RPC
- [ ] Verify trigger still has `WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)`
- [ ] Run data migration reset script
- [ ] Run test SQL script - all 7 tests pass

**Backend:**
- [ ] Update `complete-prayer/index.ts` with RPC call + try/catch
- [ ] Verify analytics event renamed to `perfect_day_achieved`

**Frontend:**
- [ ] Update `useHomeData.ts` - add `todayHasPrayer` and `isPerfectDayToday` to return
- [ ] Update `StreakSummaryModal.tsx` - add new props, update copy
- [ ] Update `PrayerJourney.tsx` - add new prop, update copy
- [ ] Update `home/index.tsx` - pass props to children, update modal trigger

**QA:**
- [ ] Test: Single morning prayer → streak = 1
- [ ] Test: Both prayers same day → streak stays 1 (dedup)
- [ ] Test: Next day single prayer → streak = 2
- [ ] Test: Skip day → streak resets to 1
- [ ] Test: Onboarding-only prayer → streak = 1 and `get_effective_streak` returns it
- [ ] Test: Perfect day triggers celebration modal
- [ ] Test: WeeklyCalendar shows semicircles for single prayers correctly
- [ ] Test: Analytics `perfect_day_achieved` fires when both completed

---

## Files Changed

**Database:** 1 migration file (3 functions + data reset)

**Backend:** 1 file
- `supabase/functions/complete-prayer/index.ts`

**Frontend:** 4 files
- `src/hooks/useHomeData.ts`
- `src/components/home/StreakSummaryModal.tsx`
- `src/components/home/PrayerJourney.tsx`
- `app/(app)/(tabs)/home/index.tsx`

**Total:** 6 files

---

## Timeline

- Database: 4-6 hours
- Code: 4-6 hours
- Testing: 4-6 hours

**Total: 12-18 hours (1.5-2 days)**

---

## Rollback

```sql
-- Restore old functions (keep backups in migration comments)
-- Reset data
TRUNCATE user_stats;
```

**Risk:** Pre-launch - worst case is dev data reset
