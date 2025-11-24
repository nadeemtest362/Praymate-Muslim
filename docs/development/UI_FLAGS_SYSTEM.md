# UI Flags System

## Overview
The UI flags system manages "show once" user interface elements that should persist across app reinstalls and device changes. This system fixes issues where UI elements (like popups, introductions, tutorials) would reappear when users reinstall the app or switch devices.

## Problem Solved
**Before**: UI state stored in AsyncStorage (device-specific) → cleared on app reinstall/device change
**After**: UI state stored in database (user-specific) → persists across devices and reinstalls

## Current Implementation

### Database Schema
```sql
-- Added to profiles table
ALTER TABLE profiles ADD COLUMN has_seen_streak_start_popup BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE profiles ADD COLUMN has_seen_praylock_intro BOOLEAN DEFAULT FALSE NOT NULL;
```

### Type Definitions
```typescript
// src/stores/authStore.ts
export interface Profile {
  // ... existing fields
  has_seen_streak_start_popup?: boolean | null;
  has_seen_praylock_intro?: boolean | null;
}
```

### Core API
```typescript
// Update UI flags in database
await useAuthStore.getState().updateUIFlags({
  has_seen_streak_start_popup: true,
  has_seen_praylock_intro: true
});
```

## Current UI Flags

### 1. has_seen_streak_start_popup
- **Purpose**: Prevents Day 1 celebration popup from showing again after fresh installs
- **Trigger**: User dismisses the streak start popup
- **Logic**: Dual-check system (AsyncStorage + Database) for backward compatibility
- **Files**: 
  - `src/stores/homeStore.ts` - Logic and updates
  - `src/features/home/StreakStartPopup.tsx` - UI component

### 2. has_seen_praylock_intro
- **Purpose**: Skip PRAYLOCK intro modal after first time, go directly to setup
- **Trigger**: User clicks "Get Started" in PraylockModal
- **Logic**: Check flag before showing modal - if true, route directly to setup
- **Files**: 
  - `src/features/home/PraylockModal.tsx` - Sets flag
  - `app/(app)/(tabs)/home/index.tsx` - Checks flag

## Implementation Strategy

### Safe Dual-System Approach
We use a **backward-compatible dual system** that checks both AsyncStorage and database:

```typescript
// Check both sources before showing UI
const hasShownInStorage = await AsyncStorage.getItem('has_shown_streak_start_popup');
const hasShownInDB = profile?.has_seen_streak_start_popup === true;

// If EITHER source says "shown", don't show
if (hasShownInStorage !== 'true' && !hasShownInDB) {
  // Show UI element
}

// Update BOTH sources when dismissing
AsyncStorage.setItem('has_shown_streak_start_popup', 'true');
updateUIFlags({ has_seen_streak_start_popup: true });
```

### Benefits
- **No Breaking Changes**: Existing AsyncStorage logic continues to work
- **Gradual Migration**: Can eventually remove AsyncStorage when confident
- **Fault Tolerance**: If database fails, AsyncStorage backup prevents UX issues

## Future Architecture: Standalone Flags Table

### Motivation
As we add more UI flags, storing them in the `profiles` table becomes unwieldy:
- **Schema Bloat**: Main profile table gets cluttered with UI-specific columns
- **Performance**: Fetching profile loads unnecessary UI flag data
- **Maintenance**: Hard to manage and query UI flags independently

### Proposed Schema
```sql
CREATE TABLE user_ui_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  flag_name TEXT NOT NULL,
  flag_value BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, flag_name)
);

-- Create indexes for performance
CREATE INDEX idx_user_ui_flags_user_id ON user_ui_flags(user_id);
CREATE INDEX idx_user_ui_flags_flag_name ON user_ui_flags(flag_name);
```

### Benefits of Standalone Table
- **Scalability**: Can add unlimited flags without schema changes
- **Performance**: Only load UI flags when needed
- **Analytics**: Easy to query flag adoption rates
- **Clean Architecture**: Separation of concerns

### Migration Strategy
1. **Phase 1**: Keep current system (profiles table)
2. **Phase 2**: Create `user_ui_flags` table alongside existing
3. **Phase 3**: Dual-write to both systems
4. **Phase 4**: Switch reads to new table
5. **Phase 5**: Remove columns from profiles table

### Example Future API
```typescript
// Generic flag management
await setUIFlag('has_seen_streak_start_popup', true);
const hasSeenPopup = await getUIFlag('has_seen_streak_start_popup');

// Bulk operations
await setUIFlags({
  has_seen_streak_start_popup: true,
  has_seen_praylock_intro: true,
  has_seen_prayer_tips: false
});
```

## Adding New UI Flags

### Current Process (Profiles Table)
1. **Add Column**: `ALTER TABLE profiles ADD COLUMN has_seen_xyz BOOLEAN DEFAULT FALSE;`
2. **Update Interface**: Add to `Profile` type in `authStore.ts`
3. **Add Logic**: Use `updateUIFlags()` method to set flag
4. **Check Logic**: Read from `profile.has_seen_xyz` in components

### Guidelines
- **Naming**: Use `has_seen_*` prefix for consistency
- **Default**: Always default to `FALSE` (haven't seen it)
- **Documentation**: Update this document with new flags
- **Testing**: Test across fresh installs and existing users

## Best Practices

### When to Use UI Flags
- ✅ One-time tutorials or introductions
- ✅ Feature announcement popups
- ✅ Onboarding completion celebrations
- ✅ "Skip intro" functionality
- ❌ User preferences (use settings table)
- ❌ Frequently changing states (use regular state)

### Implementation Patterns
```typescript
// GOOD: Check flag before showing UI
const hasSeenIntro = profile?.has_seen_praylock_intro === true;
if (!hasSeenIntro) {
  showIntroModal();
}

// GOOD: Set flag when user completes action
const handleIntroComplete = () => {
  closeModal();
  updateUIFlags({ has_seen_praylock_intro: true });
};

// BAD: Don't use for user preferences
// updateUIFlags({ prefers_dark_mode: true }); // Use settings instead
```

## Error Handling
All UI flag operations include error handling to prevent UX disruption:

```typescript
// Safe flag updates
updateUIFlags({ has_seen_streak_start_popup: true }).catch(console.error);

// Graceful degradation
const hasSeenPopup = profile?.has_seen_streak_start_popup === true;
if (!hasSeenPopup) {
  // Show popup, but don't break if flag is undefined
}
```

## Testing Considerations
- **Fresh Install**: Test that flags work correctly on new installations
- **Existing Users**: Ensure existing users don't see UI elements again
- **Network Failures**: Test behavior when database updates fail
- **Migration**: Test both old and new systems working together

## Files Modified
- `src/stores/authStore.ts` - Core flag management
- `src/stores/homeStore.ts` - Streak popup logic
- `src/features/home/PraylockModal.tsx` - Praylock intro flag
- `app/(app)/(tabs)/home/index.tsx` - Home screen logic
- `supabase/migrations/` - Database schema changes

## Monitoring
- **Database**: Monitor `profiles` table size and query performance
- **Logs**: Track flag update success/failure rates
- **User Behavior**: Monitor if users are seeing UI elements appropriately
- **Performance**: Watch for any impact on app startup time

---

*This system ensures a consistent, professional user experience where UI elements behave intelligently across devices and app reinstalls.*
