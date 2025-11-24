# Simplified Prayer System Documentation

## Overview

This document describes the simplified prayer system implemented in January 2025, which removed complex onboarding-specific logic and streamlined how prayers are displayed and managed.

## Key Changes Summary

### 1. Removed Onboarding-Specific Logic
- **Before**: Home screen had special handling for onboarding prayers with complex conditions
- **After**: All prayers (onboarding and regular) follow the same display rules
- **Files affected**: 
  - `app/(app)/(tabs)/home/index.tsx`
  - `src/hooks/useHomeScreen.ts`
  - `src/constants/homeConstants.ts`

### 4. Added Network Reliability System (2025-01-06)
- **New**: Prayer completion queue with local persistence and retry logic
- **Benefit**: Network failures never block user experience
- **Files added**:
  - `src/utils/prayerCompletionQueue.ts` - Queue management system
- **Files updated**:
  - `app/(app)/prayer-display.tsx` - Simplified completion with queue integration
  - `src/hooks/useHomeScreen.ts` - Background queue processing

### 2. Simplified Prayer State Function
- **Location**: `get_current_prayer_state` RPC function in database
- **Key change**: Onboarding prayers now respect prayer window boundaries
- **Behavior**: 
  - Shows onboarding prayer only until the next prayer window opens
  - No more all-day display of onboarding prayers

### 3. Prayer Window Boundaries
- **Morning window**: 4:00 AM - 4:00 PM (12 hours)
- **Evening window**: 4:00 PM - 4:00 AM (12 hours)
- **Always an active window - no gaps!**

## How the System Works Now

### Prayer Display Logic

The `get_current_prayer_state` function determines what to show:

```sql
-- Simplified logic flow:
1. Check if user has any prayers
2. If first prayer is from onboarding:
   - Show it ONLY if we're still in the same prayer window
   - Hide it once the next prayer window opens
3. Otherwise, show the current window's prayer (if any)
```

### Prayer Windows

- **Morning prayers**: Generated and shown 4:00 AM - 4:00 PM
- **Evening prayers**: Generated and shown 4:00 PM - 4:00 AM

### Key Behaviors

1. **Onboarding Prayer Lifecycle**:
   - Created during onboarding (any time)
   - Displayed immediately
   - Stops showing when next prayer window opens
   - Example: Onboarding at midnight → shows until 4 AM

2. **Regular Prayer Generation**:
   - Always during active windows
   - One prayer per window per day
   - Can generate any time during the window

3. **Anonymous User Considerations**:
   - Data loss on app reinstall is expected
   - No account recovery possible
   - Each reinstall = new user

4. **Network Failure Handling**:
   - Prayer marked complete in UI immediately
   - Completion queued locally via `prayerCompletionQueue.ts` if network fails
   - Automatic retry with exponential backoff when connection restored
   - PRAYLOCK unlocked when sync succeeds

## Database Schema

### Key Tables

1. **prayers**:
   - `slot`: Format `YYYY-MM-DD-am/pm` (e.g., '2025-01-20-am')
   - `is_onboarding`: Boolean flag
   - `generated_at`: Timestamp of creation

2. **user_stats**:
   - Tracks streaks and prayer counts
   - Updated via triggers

3. **daily_challenges**:
   - `day_number`: 1-21
   - `is_locked`: Boolean
   - Day 1 always unlocked by default

## Removed Features

1. **Complex Onboarding Checks**:
   - `isFirstTimeUser` logic
   - `shouldShowOnboardingPrayer` 
   - Special onboarding prayer handling in home screen

2. **All-Day Onboarding Prayer Display**:
   - Previously showed for entire creation day
   - Now respects window boundaries

3. **Duplicate Prevention Logic**:
   - Removed from edge functions
   - Not needed since anonymous users get new IDs

## Migration Files Applied

1. `20250627_remove_onboarding_from_home.sql`:
   - Simplified prayer state function
   - Fixed window boundary logic

2. `20250627_fix_upsert_challenge_security.sql`:
   - Security improvements for challenge updates

3. `20250626_simplify_prayer_system.sql`:
   - Core simplification of prayer logic

## API Endpoints

### RPC Functions

1. **`get_current_prayer_state`**:
   ```typescript
   // Returns current prayer to display
   {
     prayer_id: string,
     content: string,
     verse_ref: string,
     generated_at: timestamp,
     is_onboarding: boolean
   }
   ```

2. **`upsert_daily_challenge`**:
   - Updates challenge completion status
   - Handles streak tracking

### Edge Functions

1. **`generate-prayer`**:
   - Handles ALL prayer generation (onboarding and regular)
   - Checks window validity
   - No duplicate prevention for anonymous users

2. **`complete-prayer`**:
   - Marks prayer as completed with timestamp
   - Updates user stats via database triggers
   - Unlocks daily challenges retroactively
   - Updates PRAYLOCK completion flags
   - Handles timezone calculations properly

## Testing Scenarios

1. **Onboarding at Midnight**:
   - Prayer shows immediately
   - Stops showing at 4 AM
   - Morning prayer can be generated after 4 AM

2. **App Reinstall (Anonymous)**:
   - All data lost
   - New user created
   - Can complete onboarding again

3. **Prayer Generation**:
   - Any time during windows
   - One per window
   - Always available (no gaps)

4. **Network Failure During Completion**:
   - Prayer appears completed immediately
   - Completion queued via `prayerCompletionQueue.ts` for background retry
   - PRAYLOCK unlocks when sync succeeds
   - No user interaction required

## Best Practices

1. **Don't Special-Case Onboarding**:
   - Treat all prayers equally
   - Let window boundaries handle visibility

2. **Respect Window Boundaries**:
   - Always check current time vs window
   - Don't show prayers outside their window

3. **Handle Anonymous Users**:
   - Expect data loss on reinstall
   - Don't try to prevent "duplicates"
   - Each install is a fresh start

4. **Network Reliability**:
   - Always show optimistic UI updates
   - Let queue system handle retries
   - Never block user experience for network issues
   - Trust the background sync system

## Troubleshooting

### Prayer Not Showing
1. Check current time vs prayer windows
2. Verify prayer exists in database
3. Check `is_onboarding` flag and creation time

### Onboarding Prayer Showing Too Long
1. Verify `get_current_prayer_state` logic
2. Check prayer window boundaries
3. Ensure migration was applied

### Anonymous User Issues
1. Data loss is expected on reinstall
2. No recovery mechanism available
3. Consider prompting for email signup

### Prayer Completion Sync Issues
1. Check pending queue count in AsyncStorage
2. Force process queue for immediate retry
3. Verify edge function logs for errors
4. Check PRAYLOCK table for completion flags
5. Ensure app is processing queue on foreground

## Future Considerations

1. **Email Signup Prompt**:
   - Could prevent data loss
   - Show after first prayer
   - Make benefits clear

2. **Window Adjustments**:
   - Current windows are 12 hours each
   - No gaps between windows
   - Could adjust based on user feedback

3. **Streak Recovery**:
   - Currently no recovery for anonymous users
   - Could implement grace periods

4. **Queue System Enhancements**:
   - Could add exponential backoff for queue processing frequency
   - Could implement queue size limits for storage optimization
   - Could add metrics/analytics for sync success rates 