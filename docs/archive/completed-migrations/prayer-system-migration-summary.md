> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Prayer System Migration Summary

## Overview
This document provides a technical summary of all SQL migrations applied to simplify the prayer system in January 2025.

## Applied Migrations

### 1. `20250626_simplify_prayer_system.sql`
**Purpose**: Core simplification of prayer display logic

**Key Changes**:
- Removed complex onboarding prayer conditions
- Unified prayer display rules for all prayer types
- Simplified the `get_current_prayer_state` function

**Before**:
```sql
-- Complex logic with multiple special cases for onboarding
-- All-day display of onboarding prayers
-- Different rules for first-time users
```

**After**:
```sql
-- Single unified logic path
-- All prayers respect window boundaries
-- No special cases for onboarding
```

### 2. `20250627_remove_onboarding_from_home.sql`
**Purpose**: Fix onboarding prayer window boundaries

**Key Changes**:
```sql
-- Updated get_current_prayer_state function
-- Onboarding prayers now check if we're in the same window
-- Uses CASE statement to determine current window:
CASE
  WHEN hour >= 4 AND hour < 12 THEN 'morning'
  WHEN hour >= 17 OR hour < 4 THEN 'evening'
  ELSE NULL
END

-- Onboarding prayer visibility logic:
-- Only show if prayer window matches current window
```

**Impact**:
- Onboarding prayers created at midnight stop showing at 4 AM
- Prevents 13+ hour display of onboarding prayers
- Aligns with regular prayer window behavior

### 3. `20250627_fix_upsert_challenge_security.sql`
**Purpose**: Improve security for challenge updates

**Key Changes**:
```sql
-- Added RLS policies for daily_challenges table
-- Ensured users can only update their own challenges
-- Added security definer to upsert_daily_challenge function
-- Proper permission checks
```

## Deleted/Reverted Migrations

### Failed Attempts (Not Applied)
These migrations were created but ultimately not used:

1. **`20250625_fix_onboarding_prayer_window.sql`**
   - Initial attempt to fix window boundaries
   - Replaced by simpler approach

2. **`20250625_prevent_duplicate_onboarding_prayers.sql`**
   - Attempted to prevent duplicate onboarding prayers
   - Removed because anonymous users get new IDs anyway

3. **`20250625_fix_prayer_day_boundaries.sql`**
   - Complex day boundary logic
   - Simplified in later migrations

4. **`20250627_ensure_day_one_unlocked.sql`**
   - Trigger to auto-unlock day 1
   - Not needed with current approach

## Database Function Changes

### `get_current_prayer_state(user_id)`
**Location**: RPC function in database

**Simplified Logic**:
```sql
1. Get user's prayers ordered by generated_at
2. If first prayer is onboarding:
   - Check if we're still in the same prayer window
   - Return it only if windows match
3. Otherwise:
   - Return current window's prayer if exists
   - Return NULL if no prayer for current window
```

### `upsert_daily_challenge()`
**Changes**:
- Added security definer
- Improved permission checks
- Better error handling

## Edge Function Changes

### `generate-first-prayer`
**Reverted Changes**:
- Removed duplicate prayer prevention
- Anonymous users can regenerate on reinstall
- Simpler logic without user existence checks

### `generate-prayer`
**No Changes Required**:
- Already respects window boundaries
- Works with simplified prayer state function

## Client-Side Changes

### Removed from `useHomeScreen.ts`:
```typescript
// REMOVED:
- isFirstTimeUser calculation
- shouldShowOnboardingPrayer logic
- Special onboarding prayer handling
- Complex date comparisons

// KEPT:
- Simple prayer display from RPC
- Window-based prayer generation
```

### Removed from `homeConstants.ts`:
```typescript
// REMOVED:
- ONBOARDING_PRAYER_DISPLAY_HOURS
- Complex time calculations
- Special first-user logic
```

## Key Technical Decisions

1. **Window-Based Display**:
   - All prayers follow window boundaries
   - No exceptions for onboarding
   - Consistent behavior

2. **Anonymous User Handling**:
   - Accept data loss on reinstall
   - No complex duplicate prevention
   - Clean slate approach

3. **Simplification Over Features**:
   - Removed edge cases
   - Unified code paths
   - Easier to maintain

## Performance Impact

- **Positive**: Simpler queries, less conditional logic
- **Neutral**: Same number of database calls
- **No degradation**: All features still work

## Security Improvements

1. **RLS Policies**: Properly enforced on all tables
2. **Function Security**: Added security definer where needed
3. **User Isolation**: Users can only modify their own data

## Testing Checklist

- [ ] Onboarding at midnight stops at 4 AM
- [ ] Morning prayers work 4 AM - 12 PM
- [ ] Evening prayers work 5 PM - 4 AM
- [ ] No prayers show during gap (12 PM - 5 PM)
- [ ] Anonymous reinstall works properly
- [ ] Challenge completion tracked correctly
- [ ] Streaks update appropriately 