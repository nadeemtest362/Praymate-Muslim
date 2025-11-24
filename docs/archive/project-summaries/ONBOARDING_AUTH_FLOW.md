> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Onboarding Authentication Flow

## Overview

This document describes the authentication flow during onboarding, particularly the transition from anonymous to authenticated users, and how the auth state change listener fixes the "Setup Failed" error.

## The Problem

Users were experiencing a "Setup Failed" error at the benefits screen (final onboarding step) after signing up with email or Apple Sign In. The root cause was a race condition where the auth store wasn't updated with the new user ID after signup.

## Technical Flow

### 1. Anonymous User Creation
- App launches → `authStore.initialize()` creates anonymous user
- Database trigger creates profile for anonymous user
- User begins onboarding with anonymous auth

### 2. First Prayer Screen
- User reaches `first-prayer.tsx` screen
- Shows `PrayerDisplayScreen` component with `isOnboarding=true`
- Prayer is generated using anonymous user's onboarding data

### 3. Automatic Signup Prompt
```typescript
// In prayer-display.tsx
useEffect(() => {
  if (isOnboarding && currentIndex === 0 && isAnon && !hasSignedUp) {
    // Shows signup sheet on intro slide for anonymous users
    setTimeout(() => {
      setShowSignUpSheet(true);
    }, 500);
  }
}, [currentIndex, isOnboarding, user, hasSignedUp]);
```

### 4. User Signup Process
When user enters email in `SignUpBottomSheet`:

1. **New User Created**: Supabase creates NEW user (cannot convert anonymous)
2. **Data Migration**: `migrate-anonymous-data` edge function copies data
3. **Auth State Update**: 
   - Before fix: Auth store had stale anonymous user
   - After fix: Auth state change listener updates store

### 5. Auth State Change Listener
```typescript
// In authStore.ts
supabase.auth.onAuthStateChange(async (event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      const isUserChange = currentUser?.id !== newUser.id;
      if (isUserChange) {
        // Update user in store
        set({ user: newUser, session, ... });
        // Fetch new profile
        await get().fetchUserProfileIfNeeded({ forceRefresh: true });
      }
      break;
  }
});
```

### 6. Benefits Screen Success
- User completes prayer → navigates to `benefits-highlight.tsx`
- Benefits screen uses `useAuthStore()` to get current user
- Now has correct user ID from updated auth store
- Profile update succeeds

## Key Implementation Details

### SignUpBottomSheet Improvements
```typescript
// Added delay for auth state propagation
await new Promise(resolve => setTimeout(resolve, 1000));

// Force profile refresh
const authStore = useAuthStore.getState();
await authStore.fetchProfile();

// Then call completion
onSignUpComplete();
```

### Benefits Screen Robustness
```typescript
// Fallback to latest auth store state
const currentUserId = user?.id || useAuthStore.getState().user?.id;
if (!currentUserId) {
  throw new Error('No user ID available');
}
```

### Auth Store Safety
- Prevents multiple initializations with `_isInitialized` flag
- Cleans up existing subscriptions before creating new ones
- Handles errors in listener without corrupting state
- Excludes subscription from persistence

## Migration Function

The `migrate-anonymous-data` edge function handles:
- Profile data (mood, preferences, etc.)
- Prayer people
- Prayer intentions
- Generated prayers

This runs automatically when anonymous user signs up.

## Testing Checklist

1. ✅ Anonymous user can start onboarding
2. ✅ Signup sheet appears on first prayer intro slide
3. ✅ Email signup creates new user and migrates data
4. ✅ Auth store updates with new user
5. ✅ Benefits screen uses correct user ID
6. ✅ Profile updates successfully
7. ✅ No memory leaks from auth listener

## Common Issues

### "Setup Failed" Error
- **Cause**: Auth store has wrong user ID
- **Fix**: Auth state change listener ensures store is updated

### Foreign Key Errors
- **Cause**: Cached prayer people IDs from before database wipe
- **Fix**: Clear stale cached data on onboarding start

### Race Conditions
- **Cause**: Benefits screen runs before auth state updates
- **Fix**: 1-second delay + explicit profile refresh after signup