# Crash Recovery System Fix

## Issue Summary

The custom onboarding crash recovery system was conflicting with Expo/EAS's internal error recovery mechanism, causing:

1. **Initial Issue**: App crashes when users clicked "Claim my discount" on the benefits screen
2. **Secondary Issue**: After crash, users couldn't reopen the app - got "undefined is not a function" error
3. **Root Cause**: Conflict between our crash recovery and Expo's `errorRecoveryQueue`

## Timeline

1. **Phase 1**: Implemented bulletproof onboarding with crash recovery system
2. **Phase 2**: Users experienced crashes on benefits screen 
3. **Phase 3**: Temporary fix - stubbed out crash recovery functions
4. **Phase 4**: Stub functions caused "undefined is not a function" errors
5. **Phase 5**: Complete removal of crash recovery system (current fix)

## Technical Details

### The Conflict
- Our crash recovery used AsyncStorage to track app state
- It marked sessions as "crashed" when app went to background
- This conflicted with Expo's internal error recovery queue
- Result: False positive crash detections and actual crashes

### Corrupted User States
Users who crashed had:
- `has_completed_onboarding: false`
- `onboarding_current_step: 1` (stuck)
- `onboarding_flow_id: 3c39463f-2c0f-4829-977d-a98fb3e15db2`

## Solution Implemented

### 1. Database Cleanup (Completed)
```sql
UPDATE profiles 
SET 
  onboarding_flow_id = NULL,
  onboarding_current_step = NULL,
  onboarding_started_at = NULL
WHERE 
  has_completed_onboarding = false 
  AND onboarding_current_step = 1;
```
Reset 17 affected users' onboarding state.

### 2. Code Cleanup (Completed)
- Removed all `useCrashRecovery` imports from onboarding screens
- Removed crash recovery hook usage
- Removed stub exports from `src/lib/onboarding/index.ts`
- Cleaned up related code in all 23 onboarding screen files

### 3. Files Modified
- All files in `src/screens/onboarding/sdui_components/`
- `src/lib/onboarding/index.ts`
- Removed crash recovery related imports and usage

## Future Considerations

If crash recovery is needed in the future:
1. Use React Error Boundaries instead of AsyncStorage tracking
2. Implement proper AppState handling for clean exits
3. Avoid conflicts with Expo's error recovery
4. Test thoroughly with EAS builds before production

## Verification Steps

1. Users who were stuck can now open the app
2. Onboarding flow starts fresh from welcome screen
3. No "undefined is not a function" errors
4. Benefits screen "Claim my discount" should work without crashes

## Lessons Learned

1. **Avoid Complex State Tracking**: AsyncStorage-based crash recovery adds complexity that can conflict with framework-level error handling
2. **Trust Framework Tools**: Expo has its own error recovery mechanism (`errorRecoveryQueue`) that we should work with, not against
3. **Script Quality Matters**: The removal script was sloppy and left orphaned code blocks:
   - Incomplete `useEffect` hooks
   - Empty try-catch blocks
   - Orphaned return statements
   - Always test automated refactoring scripts on a few files first
   - Use AST-based tools for code modifications rather than regex replacements
4. **Test Thoroughly**: When removing a system, test both new users AND users with existing state
5. **Profile Creation**: Always handle both regular and anonymous users properly in auth flows

## References
- Crash report: JustPray-2025-06-14-074843.ips
- Commit: a96e2a4 (temporary fix)

## Alternative Solutions

For crash recovery, consider:
- React Error Boundaries for component-level recovery
- Sentry for crash reporting and monitoring
- Server-side session recovery
- Simpler client-side state persistence without complex tracking 