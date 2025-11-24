> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Timezone Fix Summary

## Problem
The `get_current_prayer_state` database function was using UTC time instead of the user's timezone, causing prayers to change at incorrect times. For example, evening prayers would disappear at 8pm EST (midnight UTC) instead of midnight in the user's local time.

## Solution
Updated the function to properly handle user timezones throughout all calculations.

## Key Changes Made

### 1. User Timezone Handling
- Fetches timezone from `profiles.timezone` (defaults to 'America/New_York')
- Added NULL check for cases where user doesn't exist
- All time calculations now use user's local timezone

### 2. Fixed Timezone Conversions
- Correctly converts `NOW()` to user's timezone: `NOW() AT TIME ZONE user_timezone`
- Properly calculates day boundaries in user's timezone before converting to UTC for queries
- Fixed the complex double timezone conversion issue

### 3. Improved Prayer Queries
- Onboarding prayers are now properly handled based on when they were created
- Morning/evening assignment for onboarding prayers based on creation hour
- Added proper handling to prevent onboarding prayers from appearing as both morning AND evening

### 4. Better Edge Case Handling
- Changed `today_end` to use `< today_end` instead of `<= today_end - 1 second`
- Added explicit boolean tracking for regular vs onboarding prayers
- Improved onboarding prayer display logic

### 5. Performance Optimization
- Added index recommendation: `idx_prayers_user_slot_generated`
- Optimized queries to properly use indexes

## Testing Recommendations

1. Test with users in different timezones:
   - EST (UTC-5)
   - PST (UTC-8)
   - International timezones

2. Test edge cases:
   - Prayer generation near midnight in user's timezone
   - Users without timezone set (should default to America/New_York)
   - Onboarding prayers created at different times of day

3. Verify prayer windows work correctly:
   - Morning: 4am-12pm local time
   - Evening: 5pm-4am local time

## Migration Instructions

1. Apply the migration:
   ```bash
   supabase db push
   ```

2. Verify the function is updated:
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'get_current_prayer_state';
   ```

3. Test with a user in a non-UTC timezone to confirm the fix works.

## Debug Information

The function now returns helpful debug information including:
- `user_timezone`: The timezone being used
- `user_now`: Current time in user's timezone
- `current_hour`: Hour in user's timezone
- `today_start_utc` and `today_end_utc`: Day boundaries converted to UTC

This can help diagnose any remaining timezone issues.