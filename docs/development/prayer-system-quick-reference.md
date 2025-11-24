# Prayer System Quick Reference

## Prayer Windows

```
4 AM ─────► 4 PM = MORNING WINDOW (am prayers)
4 PM ─────► 4 AM = EVENING WINDOW (pm prayers)
```

## Key Rules

1. **One prayer per window per day**
2. **All prayers respect window boundaries** (including onboarding)
3. **Anonymous users lose everything on reinstall** (by design)
4. **Network failures handled gracefully** with local queue and retry system

## Common Scenarios

### User completes onboarding at midnight
- Prayer shows immediately ✓
- Prayer stops showing at 4 AM ✓
- User can generate morning prayer after 4 AM ✓

### User opens app at 3 PM
- Still in MORNING window ✓
- Can generate morning prayer if not done ✓
- Morning window ends at 4 PM ✓

### Anonymous user reinstalls app
- All data lost ✓
- New user ID created ✓
- Must complete onboarding again ✓

### Network failure during prayer completion
- Prayer marked complete in UI immediately ✓
- Completion queued via `prayerCompletionQueue.ts` for retry when connection restored ✓
- User experience never blocked ✓
- PRAYLOCK unlocked when sync succeeds ✓

## Key Functions

### `get_current_prayer_state` (RPC)
```sql
-- Returns the prayer to display right now
-- Checks window boundaries
-- Onboarding prayers stop showing when next window opens
```

### `generate-prayer` Edge Function
```typescript
// Handles ALL prayer generation:
// - Onboarding prayers (slot: 'onboarding-initial')
// - Morning prayers (slot includes 'am')  
// - Evening prayers (slot includes 'pm')
// Enforces time windows (except for onboarding)
```

### `complete-prayer` Edge Function
```typescript
// Handles prayer completion with full reliability:
// - Updates prayer.completed_at timestamp
// - Updates user_stats via database triggers
// - Unlocks daily challenges retroactively
// - Updates PRAYLOCK completion flags
// - Returns prayer window info for client
```

### Prayer Completion Queue System
```typescript
// Local retry system for network resilience:
// - Stores failed completions in AsyncStorage
// - Retries with exponential backoff (max 5 attempts)
// - Processes queue on app foreground/network restore
// - Prevents duplicate processing with throttling
```

## Database Flags

- `prayers.is_onboarding`: Marks onboarding prayers
- `prayers.slot`: Format `YYYY-MM-DD-am/pm` or `onboarding-initial`
- `prayers.completed_at`: Timestamp of completion (null = not completed)
- `daily_challenges.is_locked`: Challenge availability
- `praylock_settings.morning_completed`: Morning prayer completed flag
- `praylock_settings.evening_completed`: Evening prayer completed flag

## Don't Do This

❌ Special-case onboarding prayers in the UI  
❌ Try to prevent anonymous user "duplicates"  
❌ Show prayers outside their window  
❌ Add complex first-time user logic  
❌ Block user experience for network failures  
❌ Implement immediate retries in UI (use queue system)  

## Do This

✅ Let window boundaries handle everything  
✅ Trust the `get_current_prayer_state` function  
✅ Accept anonymous user data loss  
✅ Keep it simple  
✅ Show optimistic UI updates immediately  
✅ Use queue system for network reliability  
✅ Let PRAYLOCK sync happen in background  

## Debugging Checklist

Prayer not showing?
1. Check current time vs windows
2. Run `get_current_prayer_state` manually
3. Verify prayer exists in DB

Onboarding prayer showing too long?
1. Check prayer's `generated_at` time
2. Verify window calculation logic
3. Ensure latest migrations applied

Prayer completion not syncing?
1. Check pending queue: `prayerCompletionQueue.getPendingCount()`
2. Force process queue: `prayerCompletionQueue.processPendingCompletions(true)`
3. Check PRAYLOCK settings table for completion flags
4. Verify network connectivity and edge function logs

## Quick SQL Queries

```sql
-- Check user's prayers
SELECT * FROM prayers 
WHERE user_id = 'USER_ID' 
ORDER BY generated_at DESC;

-- Check current prayer state
SELECT * FROM get_current_prayer_state('USER_ID');

-- Check user's challenges
SELECT * FROM daily_challenges 
WHERE user_id = 'USER_ID' 
ORDER BY day_number;

-- Check PRAYLOCK completion status
SELECT enabled, schedule, morning_completed, evening_completed 
FROM praylock_settings 
WHERE user_id = 'USER_ID';

-- Check pending completions (AsyncStorage - use debug tools)
-- In React Native Debugger: AsyncStorage.getItem('pendingPrayerCompletions')
``` 