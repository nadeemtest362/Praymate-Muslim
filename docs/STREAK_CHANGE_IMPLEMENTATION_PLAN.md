# Streak System Change: 1 Prayer/Day Implementation Plan

## Overview

**Goal:** Change streak calculation from requiring both morning AND evening prayers to requiring just ONE prayer per day, while maintaining "Perfect Day" as a bonus achievement.

**Current System:**
- Streak increments ONLY when user completes both morning AND evening prayers on same day
- Users see green circle + 🙏 on calendar for "perfect days"
- UI messaging emphasizes "complete both prayers"

**New System:**
- Streak increments when user completes ANY prayer (morning OR evening) on a day
- Perfect Day bonus achievement when BOTH prayers completed (visual distinction remains)
- Lower barrier for streak maintenance, higher engagement

**Status:** Pre-launch, no production users, no backwards compatibility concerns

---

## Database Changes

### 1. Update `update_prayer_streak()` Function

**File:** New migration: `supabase/migrations/[timestamp]_one_prayer_streak.sql`

**Changes Required:**

#### A. Keep Perfect-Day Detection, Add “Any Prayer” Flag
- Keep `_is_perfect` exactly as-is so we can continue to surface Perfect Day analytics/celebrations.
- Add a new `_has_any_prayer` boolean that looks for **any** completed prayer on the adjusted day (no slot filter):
  ```sql
  _has_any_prayer BOOLEAN;
  ...
  SELECT EXISTS (
      SELECT 1
      FROM public.prayers p
      WHERE p.user_id = _user_id
        AND p.completed_at IS NOT NULL
        AND public.adjusted_day(p.generated_at, _tz) = _day
  ) INTO _has_any_prayer;
  ```
- Reuse `_has_morning` and `_has_evening` for `_is_perfect := COALESCE(_has_morning, false) AND COALESCE(_has_evening, false);`
  so the Perfect Day bonus keeps functioning.

#### B. Add Deduplication Check + Unify Logic
**Key Insight:** Once `_has_any_prayer` is true we should run the same streak logic regardless of slot. We still need to dedupe the second completion that hits the trigger on the same adjusted day.

- Calculate the following booleans **once** right after `_day`/`_yesterday`:
  ```sql
  _already_completed_today BOOLEAN;
  _had_prayer_yesterday BOOLEAN;

  SELECT EXISTS (
      SELECT 1 FROM public.prayers p
      WHERE p.user_id = _user_id
        AND p.completed_at IS NOT NULL
        AND public.adjusted_day(p.generated_at, _tz) = _day
        AND p.id != NEW.id
  ) INTO _already_completed_today;

  SELECT EXISTS (
      SELECT 1 FROM public.prayers p
      WHERE p.user_id = _user_id
        AND p.completed_at IS NOT NULL
        AND public.adjusted_day(p.generated_at, _tz) = _yesterday
  ) INTO _had_prayer_yesterday;
  ```
- Keep the existing `SELECT ... FOR UPDATE` to lock the stats row when it exists.
- Replace the IF `_is_perfect` / ELSE block with a single path that:
  * Always increments the prayer counters.
  * Uses the precomputed booleans to decide whether to keep the streak value (`_already_completed_today`), increment (`_had_prayer_yesterday`), or reset (default to `1`).
  * Keeps `streak_start_date` and `longest_streak` in sync using those same booleans.
- Compute the new values before issuing `INSERT`/`UPDATE`:
  ```sql
  IF FOUND THEN
      _current := _stats.current_streak;
      _longest := _stats.longest_streak;
      _streak_start := _stats.streak_start_date;
  ELSE
      _current := 0;
      _longest := 0;
      _streak_start := NULL;
  END IF;

  IF _already_completed_today THEN
      _new_streak := _current;
      _new_streak_start := COALESCE(_streak_start, _completed_at);
  ELSIF _had_prayer_yesterday THEN
      _new_streak := _current + 1;
      _new_streak_start := COALESCE(_streak_start, _completed_at);
  ELSE
      _new_streak := 1;
      _new_streak_start := _completed_at;
  END IF;

  _new_longest := GREATEST(_longest, CASE
      WHEN _already_completed_today THEN _current
      ELSE _new_streak
  END);
  ```
- Declare `_current`, `_longest`, `_new_streak`, `_new_streak_start`, `_new_longest` (and any additional helper values) up top with explicit types so they can be reused in both the insert and update paths.
- Handle the “first prayer” race by inserting with `ON CONFLICT (user_id) DO UPDATE` **after** computing the new values. Because the values are already in PL/pgSQL variables, the conflict clause can reuse them directly:
  ```sql
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, total_prayers_completed,
                                 week_prayers_completed, month_prayers_completed, last_prayer_date,
                                 streak_start_date, created_at, updated_at)
  VALUES (_user_id, _new_streak, _new_longest, 1, 1, 1, _completed_at, _completed_at, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak,
        longest_streak = GREATEST(user_stats.longest_streak, EXCLUDED.current_streak),
        total_prayers_completed = user_stats.total_prayers_completed + 1,
        week_prayers_completed = CASE ... END,
        month_prayers_completed = CASE ... END,
        last_prayer_date = _completed_at,
        streak_start_date = EXCLUDED.streak_start_date,
        updated_at = NOW();
  ```
  (Pseudo-code above—calculate `_new_streak`, `_new_longest`, `_new_streak_start` in variables before the insert so both the insert and conflict path use identical values.)
- The DO UPDATE clause should keep the existing week/month counter expressions (compare `DATE_TRUNC` against `_completed_at`) so behaviour matches today—just move them into this single clause instead of duplicating per branch.

**CRITICAL FIXES REQUIRED:**
1. **Use UPSERT for the initial row but keep row-level locking:** perform the `SELECT ... FOR UPDATE`, compute new values, then execute `INSERT ... ON CONFLICT` using the precomputed numbers so double completions don’t raise unique violations.
2. **Trigger MUST only fire on NULL→NOT NULL transition:** Already in place via `WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)` - verify it stays
3. **No slot filtering:** Don't filter by `slot IN ('morning', 'evening')` - we want ALL completed prayers including `onboarding-initial`
4. **Dedup uses `_already_completed_today` (derived from `p.id != NEW.id`)** to exclude the prayer we're currently completing from the existence check
5. **Compute `_has_any_prayer`, `_already_completed_today`, and `_had_prayer_yesterday` once at the top** and reuse them throughout the function (avoid repeating EXISTS queries)
6. **ALL day checks use `adjusted_day(p.generated_at, _tz)`:** Never mix with CURRENT_DATE or raw timestamps

#### C. Keep `_is_perfect` for analytics
We still need `_is_perfect` in the function so downstream analytics/celebrations can distinguish the Perfect Day bonus. Leave the variable in place (or persist its value in new columns if we decide to track perfect days separately).

#### D. Draft migration SQL
```sql
-- 20251102_one_prayer_streak.sql (draft)
BEGIN;

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

    _has_morning BOOLEAN;
    _has_evening BOOLEAN;
    _is_perfect BOOLEAN;
    _has_any_prayer BOOLEAN;
    _already_completed_today BOOLEAN;
    _had_prayer_yesterday BOOLEAN;

    _stats public.user_stats%ROWTYPE;
    _current INTEGER;
    _longest INTEGER;
    _streak_start TIMESTAMPTZ;
    _new_streak INTEGER;
    _new_longest INTEGER;
    _new_streak_start TIMESTAMPTZ;
    _week_count INTEGER;
    _month_count INTEGER;
    _total INTEGER;
BEGIN
    -- Idempotency: only react when completed_at actually changed to non-null
    IF NEW.completed_at IS NULL OR NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(timezone, 'America/New_York')
    INTO _tz
    FROM public.profiles
    WHERE id = _user_id;

    IF _tz IS NULL THEN
        _tz := 'America/New_York';
    END IF;

    _day := public.adjusted_day(_completed_at, _tz);
    _yesterday := (_day - INTERVAL '1 day')::date;

    SELECT EXISTS (
        SELECT 1 FROM public.prayers p
        WHERE p.user_id = _user_id
          AND p.slot = 'morning'
          AND p.completed_at IS NOT NULL
          AND public.adjusted_day(p.generated_at, _tz) = _day
    ),
    EXISTS (
        SELECT 1 FROM public.prayers p
        WHERE p.user_id = _user_id
          AND p.slot = 'evening'
          AND p.completed_at IS NOT NULL
          AND public.adjusted_day(p.generated_at, _tz) = _day
    )
    INTO _has_morning, _has_evening;

    _is_perfect := COALESCE(_has_morning, false) AND COALESCE(_has_evening, false);

    SELECT EXISTS (
        SELECT 1 FROM public.prayers p
        WHERE p.user_id = _user_id
          AND p.completed_at IS NOT NULL
          AND public.adjusted_day(p.generated_at, _tz) = _day
    )
    INTO _has_any_prayer;

    IF NOT _has_any_prayer THEN
        -- Defensive no-op; should not occur because NEW.completed_at is non-null
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.prayers p
        WHERE p.user_id = _user_id
          AND p.completed_at IS NOT NULL
          AND public.adjusted_day(p.generated_at, _tz) = _day
          AND p.id <> NEW.id
    )
    INTO _already_completed_today;

    SELECT EXISTS (
        SELECT 1 FROM public.prayers p
        WHERE p.user_id = _user_id
          AND p.completed_at IS NOT NULL
          AND public.adjusted_day(p.generated_at, _tz) = _yesterday
    )
    INTO _had_prayer_yesterday;

    SELECT *
    INTO _stats
    FROM public.user_stats
    WHERE user_id = _user_id
    FOR UPDATE;

    IF FOUND THEN
        _current := _stats.current_streak;
        _longest := _stats.longest_streak;
        _streak_start := _stats.streak_start_date;
        _week_count := CASE
            WHEN DATE_TRUNC('week', _completed_at) = DATE_TRUNC('week', CURRENT_DATE) THEN _stats.week_prayers_completed + 1
            ELSE 1
        END;
        _month_count := CASE
            WHEN DATE_TRUNC('month', _completed_at) = DATE_TRUNC('month', CURRENT_DATE) THEN _stats.month_prayers_completed + 1
            ELSE 1
        END;
        _total := _stats.total_prayers_completed + 1;
    ELSE
        _current := 0;
        _longest := 0;
        _streak_start := NULL;
        _week_count := 1;
        _month_count := 1;
        _total := 1;
    END IF;

    IF _already_completed_today THEN
        _new_streak := _current;
        _new_streak_start := COALESCE(_streak_start, _completed_at);
    ELSIF _had_prayer_yesterday THEN
        _new_streak := _current + 1;
        _new_streak_start := COALESCE(_streak_start, _completed_at);
    ELSE
        _new_streak := 1;
        _new_streak_start := _completed_at;
    END IF;

    IF _already_completed_today THEN
        _new_longest := GREATEST(_longest, _current);
    ELSE
        _new_longest := GREATEST(_longest, _new_streak);
    END IF;

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
    )
    VALUES (
        _user_id,
        _new_streak,
        _new_longest,
        _total,
        _week_count,
        _month_count,
        _completed_at,
        _new_streak_start,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        total_prayers_completed = EXCLUDED.total_prayers_completed,
        week_prayers_completed = EXCLUDED.week_prayers_completed,
        month_prayers_completed = EXCLUDED.month_prayers_completed,
        last_prayer_date = EXCLUDED.last_prayer_date,
        streak_start_date = EXCLUDED.streak_start_date,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_prayer_streak() IS
'Updates user_stats for prayer completion. Increments streak when at least one prayer is completed per adjusted day, dedupes subsequent completions, preserves perfect-day analytics.';

DROP TRIGGER IF EXISTS update_prayer_streak_trigger ON public.prayers;
CREATE TRIGGER update_prayer_streak_trigger
AFTER UPDATE OF completed_at ON public.prayers
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.update_prayer_streak();

CREATE OR REPLACE FUNCTION public.get_effective_streak(p_user UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _tz TEXT;
  _today DATE;
  _yesterday DATE;
  _raw INT := 0;
  _today_any BOOLEAN;
  _yday_any BOOLEAN;
BEGIN
  SELECT COALESCE(timezone, 'America/New_York')
  INTO _tz
  FROM public.profiles
  WHERE id = p_user;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  _today := public.adjusted_day(NOW(), _tz);
  _yesterday := (_today - INTERVAL '1 day')::date;

  SELECT current_streak
  INTO _raw
  FROM public.user_stats
  WHERE user_id = p_user;

  IF NOT FOUND THEN
    _raw := 0;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.prayers p
    WHERE p.user_id = p_user
      AND p.completed_at IS NOT NULL
      AND public.adjusted_day(p.generated_at, _tz) = _today
  )
  INTO _today_any;

  SELECT EXISTS (
    SELECT 1 FROM public.prayers p
    WHERE p.user_id = p_user
      AND p.completed_at IS NOT NULL
      AND public.adjusted_day(p.generated_at, _tz) = _yesterday
  )
  INTO _yday_any;

  IF _today_any OR _yday_any THEN
    RETURN COALESCE(_raw, 0);
  END IF;

  RETURN 0;
END;
$$;

COMMIT;
```

---

### 2. Update `get_effective_streak()` Function

**File:** Same migration file

**CRITICAL:** Current function checks specific slots (morning/evening) which will MISS onboarding-initial prayers!

**BEFORE (lines 51-57):**
```sql
IF (_today_morning AND _today_evening) OR (_yday_morning AND _yday_evening) THEN
    RETURN COALESCE(_raw, 0);
ELSE
    RETURN 0;
END IF;
```

**AFTER (completely rewrite to not depend on slots):**
```sql
DECLARE
  _tz text;
  _today date;
  _yesterday date;
  _raw int := 0;
  _today_any boolean;
  _yday_any boolean;
BEGIN
  SELECT COALESCE(timezone,'America/New_York') INTO _tz FROM public.profiles WHERE id = p_user;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  _today := public.adjusted_day(now(), _tz);
  _yesterday := (_today - interval '1 day')::date;

  -- Get raw current streak from user_stats
  SELECT current_streak INTO _raw FROM public.user_stats WHERE user_id = p_user;
  IF NOT FOUND THEN
    _raw := 0;
  END IF;

  -- Check if ANY prayer completed today or yesterday (no slot filter!)
  SELECT EXISTS (
    SELECT 1 FROM public.prayers p
    WHERE p.user_id = p_user 
      AND p.completed_at IS NOT NULL
      AND public.adjusted_day(p.generated_at, _tz) = _today
  ) INTO _today_any;

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
```

**KEY CHANGE:** No more slot-specific booleans - checks for ANY completed prayer using adjusted_day

---

## UI/Messaging Changes

### 3. Update StreakSummaryModal

**File:** `src/components/home/StreakSummaryModal.tsx`

**Changes:**

#### Line 651: Update "perfect day" logic
```typescript
// BEFORE
const todayPerfect = !!(morningCompleted && eveningCompleted);

// AFTER
const todayHasPrayer = !!(morningCompleted || eveningCompleted);
const todayIsPerfect = !!(morningCompleted && eveningCompleted);
```

#### Lines 654-656: Update day display logic
```typescript
// BEFORE
// If today is perfect: show streak days + today + tomorrow (incomplete)
// If today is not perfect: show streak days + today (incomplete)
const endDay = todayPerfect ? addDays(todayTz, 1) : todayTz;

// AFTER
// If today has any prayer: show streak days + today + tomorrow (incomplete)
// If today has no prayers: show streak days + today (incomplete)
const endDay = todayHasPrayer ? addDays(todayTz, 1) : todayTz;
```

#### Lines 677-680: Update fill logic
```typescript
// BEFORE
// Add today if it's perfect
if (todayPerfect) {
    fill = fill + 1;
}

// AFTER
// Add today if it has any prayer
if (todayHasPrayer) {
    fill = fill + 1;
}
```

#### Lines 720-725: Update helper text
```typescript
// BEFORE
{completedToday === 2
    ? "Great job, you're moving closer to God every day. Come back tomorrow to keep your streak going."
    : currentStreak > 0
        ? "Complete both of today's prayers to keep your streak going"
        : "Complete both daily prayers to start your streak."}

// AFTER
{completedToday === 2
    ? "Perfect Day! You completed both prayers. Come back tomorrow to keep your streak going."
    : completedToday === 1
        ? "Great! Complete your evening prayer for a Perfect Day, or continue your streak tomorrow."
        : currentStreak > 0
            ? "Complete at least one prayer today to keep your streak going"
            : "Complete a morning or evening prayer to start your streak"}
```

#### Line 760: Update counter display
```typescript
// BEFORE
<Text style={styles.todayCount}>{completedToday}/2</Text>

// AFTER (optional - can keep showing /2 for "perfect day" progress)
<Text style={styles.todayCount}>{completedToday}/2 {completedToday === 2 && '✨'}</Text>
```

---

### 4. Update PrayerJourney Component

**File:** `src/components/home/PrayerJourney.tsx`

**Changes:**

#### Lines 105-111: Update streak text
```typescript
// BEFORE
{currentStreak === 0 ? (
    <>Complete today's prayers to get started on your new prayer goal</>
) : (
    <>You've completed <Text style={{ color: '#FFD700', fontFamily: 'SNPro-Black' }}>{currentStreak}</Text> {currentStreak === 1 ? 'day' : 'days'} {streakGoalDays && streakGoalDays > 0 ? (<>
        of your <Text style={{ color: '#FFD700', fontFamily: 'SNPro-Black' }}>{streakGoalDays}</Text> day prayer goal so far
    </>) : 'of your prayer goal'}</>
)}

// AFTER
{currentStreak === 0 ? (
    <>Complete a prayer today to start your prayer goal</>
) : (
    <>You've prayed for <Text style={{ color: '#FFD700', fontFamily: 'SNPro-Black' }}>{currentStreak}</Text> {currentStreak === 1 ? 'day' : 'days'} straight{streakGoalDays && streakGoalDays > 0 ? (<>
        {' '}— <Text style={{ color: '#FFD700', fontFamily: 'SNPro-Black' }}>{streakGoalDays}</Text> day goal
    </>) : ''}</>
)}
```

---

### 5. Complete File Audit (60 Files Affected)

Based on comprehensive codebase analysis, here are ALL files that need changes:

#### **🔴 CRITICAL - Database & Core (10 files)**
1. `supabase/migrations/20250916071506_20250916_fix_update_prayer_streak_perfect_day_idempotent.sql` - Core trigger (covered in Step 1)
2. `supabase/migrations/20250112_perfect_day_streaks.sql` - Historical (superseded)
3. `supabase/migrations/20250702_fix_streak_4am_boundary.sql` - Historical (superseded)
4. `supabase/functions/complete-prayer/index.ts` - **ADD**: Return `isPerfectDay` (and `alreadyCompletedToday`) booleans derived from the same `_has_any_prayer/_is_perfect` calculations to avoid extra queries
5. `docs/streak-system-reliability-plan.md` - **UPDATE**: Complete rewrite for new system
6. `current_trigger_analysis.sql` - **UPDATE**: Analysis reflects new logic

#### **🟠 HIGH PRIORITY - UI Components (12 files)**
7. `src/components/home/StreakSummaryModal.tsx` - ✅ Covered in Step 4
8. `src/components/home/PrayerJourney.tsx` - ✅ Covered in Step 4
9. `src/components/home/BlessedDayModal.tsx` - **UPDATE**: Rename to PerfectDayBonusModal, update copy
10. `src/components/home/StreakStartPopup.tsx` - **UPDATE**: "Day 1!" triggers on ANY prayer
11. `src/components/progress/WeeklyCalendar.tsx` - **UPDATE**: Add streak indicator (not just perfect day)
12. `src/features/profile/StreakBadge.tsx` - No change (displays number only)
13. `src/features/profile/JourneyCard.tsx` - No change (displays number only)
14. `src/components/home/DailyBread.tsx` - No change (passes through)
15. `app/(app)/(tabs)/home/index.tsx` - **UPDATE**: Celebration modal trigger logic
16. `src/hooks/useHomeData.ts` - **ADD**: `isPerfectDayToday` derived value
17. `src/stores/homeStore.ts` - **UPDATE**: Popup display logic
18. `app/(app)/prayer-display.tsx` - **ADD**: Perfect day achievement notification

#### **🟡 MEDIUM - Help & Support (2 files)**
19. `src/components/shared/RenewalBottomSheet.tsx` - **UPDATE**: "Resume streak" copy (if needed)
20. `app/(app)/help.tsx` - **MAYBE ADD**: FAQ if users ask (probably unnecessary)

#### **🟢 Analytics & Tracking (3 files)**
27. `src/lib/analytics.ts` - **ADD**: `perfect_day_achieved` event using the server-returned flags
28. `src/features/onboarding/services/onboarding/analytics-enhanced.ts` - **ADD**: Perfect day events
29. `docs/product/personal_prayers_PRD.md` - **UPDATE**: PRD reflects new logic


#### **🟣 Prayer Generation (3 files)**
39. `supabase/functions/generate-prayer/index.ts` - **UPDATE**: Context mentions perfect day bonus
40. `services/prayer-api-service/src/app.service.spec.ts` - **UPDATE**: Test expectations
41. `.cursor/rules/openai-responses-stateful.mdc` - **UPDATE**: AI context rules

#### **⚪ Documentation - SKIP (already out of date)**
Documentation updates skipped - will update organically as needed

---

### 6. Additional Database Considerations

**Consider adding columns to `user_stats`:**
```sql
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS perfect_days_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_perfect_day_date TIMESTAMPTZ;
```

**Purpose:** Track perfect day achievements separately from streak

---

## Testing Plan

### 6. Database Function Testing

**Create test SQL script:** `test_one_prayer_streaks.sql`

```sql
-- Setup test user
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Clean slate
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    
    -- Ensure user exists
    INSERT INTO profiles (id, timezone) 
    VALUES (test_user_id, 'America/New_York')
    ON CONFLICT (id) DO UPDATE SET timezone = 'America/New_York';
    
    -- Test 1: First morning prayer creates streak of 1
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning', NOW(), NOW());
    
    ASSERT (SELECT current_streak FROM user_stats WHERE user_id = test_user_id) = 1, 
        'Test 1 failed: First prayer should create streak of 1';
    
    -- Test 2: Evening prayer same day should NOT increment (deduplication)
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW(), NOW());
    
    ASSERT (SELECT current_streak FROM user_stats WHERE user_id = test_user_id) = 1, 
        'Test 2 failed: Second prayer same day should not increment streak';
    
    -- Test 3: Morning prayer next day should increment to 2
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'morning', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day');
    
    ASSERT (SELECT current_streak FROM user_stats WHERE user_id = test_user_id) = 2, 
        'Test 3 failed: Prayer next day should increment streak to 2';
    
    -- Test 4: Skip a day, then pray - should reset to 1
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days');
    
    ASSERT (SELECT current_streak FROM user_stats WHERE user_id = test_user_id) = 1, 
        'Test 4 failed: Gap in days should reset streak to 1';
    
    -- Test 5: Evening-only streak
    DELETE FROM prayers WHERE user_id = test_user_id;
    DELETE FROM user_stats WHERE user_id = test_user_id;
    
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW(), NOW());
    
    ASSERT (SELECT current_streak FROM user_stats WHERE user_id = test_user_id) = 1, 
        'Test 5 failed: Evening-only prayer should create streak';
    
    INSERT INTO prayers (id, user_id, slot, generated_at, completed_at)
    VALUES (gen_random_uuid(), test_user_id, 'evening', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day');
    
    ASSERT (SELECT current_streak FROM user_stats WHERE user_id = test_user_id) = 2, 
        'Test 6 failed: Consecutive evening prayers should build streak';
    
    RAISE NOTICE 'All tests passed!';
END $$;
```

### 7. Manual App Testing Checklist

**Test in development environment:**

- [ ] Complete morning prayer → verify streak increments to 1
- [ ] Complete evening prayer same day → verify streak stays at 1 (no double count)
- [ ] Next day, complete only morning → verify streak increments to 2
- [ ] Next day, complete only evening → verify streak increments to 3
- [ ] Skip a day, then pray → verify streak resets to 1
- [ ] Check StreakSummaryModal shows correct messaging
- [ ] Check WeeklyCalendar shows semicircles for single prayers
- [ ] Complete both prayers same day → verify "Perfect Day" celebration
- [ ] Test across 4 AM boundary (complete prayer at 3:50 AM)
- [ ] Test `get_effective_streak()` returns 0 if no prayer today/yesterday
- [ ] Verify longest_streak updates correctly
- [ ] Call `complete-prayer` after each scenario and confirm the response returns `{ streak, isPerfectDay }` matching UI state

**UI/UX checks:**
- [ ] No messaging says "must complete both"
- [ ] Perfect Day still celebrated appropriately
- [ ] Onboarding flow explains new system
- [ ] Analytics still fire correctly

---

## Rollout Strategy

### 8. Pre-Launch Deployment (Current Status)

**Advantages:**
- No user data to migrate
- Can reset all test data
- Iterate freely

**Steps:**
1. Run migration on development database
2. Execute test SQL script to verify logic
3. Manual QA testing (checklist above)
4. Deploy to staging
5. Final QA on staging with TestFlight build
6. Deploy to production before public launch

### 9. Data Cleanup

**Before migration:**
```sql
-- Optional: Reset all existing test/dev streaks to start fresh
UPDATE user_stats SET 
    current_streak = 0,
    longest_streak = 0,
    streak_start_date = NULL,
    last_prayer_date = NULL;
```

---

## Analytics Considerations

### 10. Track Perfect Days Separately

**Recommended:** Add separate analytics event for "Perfect Day" achievement

**Location:** `src/lib/analytics.ts` or `supabase/functions/complete-prayer/index.ts`

```typescript
// Use the server-supplied flag so we don't recompute on the client
if (result?.isPerfectDay) {
    analytics.track('perfect_day_achieved', {
        streak_count: result.streak,
        user_id: userId,
    });
}
```

This preserves visibility into user behavior even though "perfect days" no longer gate streaks.

---

## Risk Assessment

### Low Risk
✅ No production users to impact  
✅ Client code reads from database (auto-updates)  
✅ Deduplication logic is straightforward  
✅ Visual distinction already exists in UI

### Medium Risk
⚠️ Timezone edge cases around 4 AM boundary (mitigated by existing `adjusted_day()` function)  
⚠️ Race conditions if user completes prayers very quickly (mitigated by `FOR UPDATE` lock)

### High Risk
❌ None identified

---

## Timeline Estimate (Revised Based on Full Audit)

**Phase 1 - Database Core (CRITICAL PATH):** 4-6 hours
- Write migration with unified logic + deduplication
- Add perfect_days_count column
- Write comprehensive test SQL
- Manual DB testing with edge cases
- Update `complete-prayer` edge function

**Phase 2 - Critical UI Components:** 6-8 hours
- StreakSummaryModal (covered)
- PrayerJourney (covered)  
- BlessedDayModal → PerfectDayBonusModal rename + rewrite
- StreakStartPopup update
- WeeklyCalendar add streak indicators
- Home screen modal trigger logic
- Prayer display perfect day notification
- useHomeData add isPerfectDayToday

**Phase 3 - Analytics & Tracking:** 2-3 hours
- Add perfect day event tracking
- Refresh any internal dashboards (optional)

**Phase 4 - Prayer Generation Context (Optional):** 1-2 hours
- Update generation context to mention perfect day bonus

**Phase 5 - QA/Testing:** 4-6 hours
- Run comprehensive test SQL script
- Test all 9 critical edge cases
- Manual app testing across all flows
- Verify analytics firing
- Regression testing

**Total:** ~17-25 hours (2-3 days of focused work)

---

## Success Criteria

✅ User can maintain streak with 1 prayer/day  
✅ Second prayer same day doesn't double-count  
✅ Streak breaks if day is skipped  
✅ "Perfect Day" still celebrated for both prayers  
✅ WeeklyCalendar shows correct visual states  
✅ All messaging matches actual behavior  
✅ No console errors or database errors  
✅ Analytics track both streaks and perfect days

---

## Critical Edge Cases to Test

### Core Deduplication:
1. **Both prayers same adjusted day:**
   - Morning at 8am → streak = 1
   - Evening at 8pm (same adjusted day) → streak STAYS 1 (dedup works)

2. **🚨 FIRST DAY RACE CONDITION:**
   - New user, no user_stats row
   - Two prayers complete simultaneously (onboarding + morning)
   - Must NOT crash with unique violation
   - Streak = 1 (not 2)
   - **FIX:** ON CONFLICT upsert

### Onboarding:
3. **🚨 Onboarding-initial prayer ONLY:**
   - Complete ONLY onboarding prayer today
   - `get_effective_streak()` must return the streak (not 0!)
   - **BUG:** Current slot-based checks will fail
   - **FIX:** Remove slot filtering

4. **Onboarding + regular same day:**
   - Onboarding prayer → streak = 1
   - Morning prayer same day → streak STAYS 1 (dedup works)

### Streak Continuity:
5. **Single prayer per day maintains streak:**
   - Day 1: morning only → streak = 1
   - Day 2: evening only → streak = 2
   - Day 3: morning only → streak = 3

6. **Gap breaks streak:**
   - Day 1: prayer → streak = 1
   - Day 2: NO prayer
   - Day 3: prayer → streak = 1 (reset)

### 4am Boundary:
7. **Prayer before 4am counts for previous day:**
   - Prayer at 3:50am Tuesday
   - Should count as Monday's adjusted day
   - Verify adjusted_day() handles this

8. **Normal day progression:**
   - Monday morning 10am → streak = 1
   - Tuesday morning 10am → streak = 2 (yesterday had prayer)

## Critical Implementation Checklist

Before merging, verify:

- [ ] Trigger has `WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)` guard
- [ ] First insert uses `ON CONFLICT (user_id) DO UPDATE` not `IF NOT FOUND`
- [ ] All day calculations use `adjusted_day(p.generated_at, _tz)` - NO raw timestamps
- [ ] `get_effective_streak()` has NO slot filtering - checks ANY completed prayer
- [ ] Dedup EXISTS queries use `p.id != NEW.id`
- [ ] Tested first-day race condition (concurrent completions)
- [ ] Tested onboarding-initial-only prayer creates streak
- [ ] Tested DST boundary prayers
- [ ] Tested prayer toggling doesn't double-count
- [ ] Prepared rollback migration script

## Rollback Plan

**If this breaks:**
1. Run rollback migration that restores old `update_prayer_streak()` and `get_effective_streak()` functions
2. Optionally: Truncate user_stats and recompute from prayers history using:
   ```sql
   -- Create recompute function as safety net
   CREATE FUNCTION recompute_user_stats(p_user_id UUID) ...
   ```

**Risk:** Pre-launch with no real users - worst case is reset test data

## Questions to Resolve

1. **Week/month prayer counters:**
   - Currently use UTC DATE_TRUNC which will be off from adjusted_day 4am boundary
   - Fix to use timezone-aware boundaries? Or accept approximation?
   - Recommendation: Accept for now, fix later if user-facing

2. **Should we track "perfect day streak" as separate metric?**
   - Recommend: Not initially - keep it simple. Can add later if users engage with it.

3. **What happens to "BlessedDayModal" (perfect day celebration)?**
   - Recommend: Keep it, trigger when both prayers completed

---

## Next Steps

1. Review this plan with team
2. Get approval on messaging changes
3. Create feature branch: `feature/one-prayer-streaks`
4. Write migration SQL
5. Update UI components
6. Run test suite
7. Deploy to staging
8. Final QA
9. Ship to production
