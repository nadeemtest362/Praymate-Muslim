# First Prayer Implementation Guide

> **SCOPE: Onboarding Flow Only** - First Prayer functionality is implemented ONLY within the onboarding flow and never appears on the home screen daily prayer dashboard.

## Background

Previously, the system displayed onboarding-generated prayers as "First Prayer" on the home screen after users completed onboarding. This caused several issues:

1. **Users got stuck** seeing "First Prayer" instead of morning/evening prayers
2. **Complex logic** to determine when to show/hide onboarding prayers
3. **Confusion** between onboarding flow and daily prayer flow

## Current Implementation

### Onboarding Prayers
- Generated during onboarding with slot `'onboarding-initial'`
- Displayed ONLY within the onboarding flow screens
- Never appear on the home screen or daily prayer dashboard
- Stored in database for historical record but not used in daily flow

### Home Screen
- Shows ONLY morning and evening prayers
- No special "First Prayer" handling
- Server function `get_current_prayer_state` returns only:
  - Morning prayer (4am-4pm)
  - Evening prayer (4pm-4am)
  - Current availability windows
  - NO onboarding prayer data

### Migration Applied
The `20250627_remove_onboarding_from_home.sql` migration:
- Removed all onboarding prayer logic from `get_current_prayer_state`
- Simplified the prayer system to only handle morning/evening
- Fixed users being stuck in "First Prayer" state

## For Developers

If you see references to:
- `onboardingPrayer` in home screen components
- `show_onboarding_prayer` in database functions
- "First Prayer" display logic in PrayerCard

These are outdated and should be removed. The home screen should ONLY deal with morning and evening prayers.

## Testing

To verify the system works correctly:
1. Complete onboarding (prayer is generated and shown in onboarding flow)
2. Navigate to home screen
3. Verify you see "Morning Prayer" or "Evening Prayer" based on time
4. No "First Prayer" should ever appear on home screen

## Overview

The "First Prayer" system provides new users with their onboarding-generated prayer as a special, always-available prayer on their first dashboard. This ensures users have immediate access to meaningful content after completing onboarding.

## How It Works

### 1. Prayer Generation During Onboarding
- During onboarding, when a user reaches the prayer generation step, a prayer is created with slot `'onboarding-initial'`
- This prayer is stored in the `prayers` table with their user_id
- The prayer includes personalized content based on their onboarding selections

### 2. First Dashboard Experience

#### Prayer Card Display
When a new user (sim account) lands on their first dashboard:
- The prayer card shows **"First Prayer"** as the title
- Uses a unique purple gradient background (`rgba(99, 102, 241, 0.9)` to `rgba(168, 85, 247, 0.7)`)
- Displays a Jesus emoji icon
- Button shows **"🙏 View First Prayer"** in indigo color (`#6366F1`)
- Always shows as "Ready" (no time restrictions)

#### Daily Prayer Tasks
- The current time period (morning/evening) is automatically marked as completed ✓
- The other time period shows its regular availability countdown
- Daily Challenge becomes available (flashing state)

### 3. Technical Implementation

#### Data Fetching (`useHomeScreen.ts`)
```typescript
// 1. Fetch onboarding prayer for ALL users
const { data: onboardingData } = await supabase
  .from('prayers')
  .select('*')
  .eq('user_id', user.id)
  .eq('slot', 'onboarding-initial')
  .limit(1);

// 2. Set it in separate state
setOnboardingPrayer(mappedOnboardingPrayer);

// 3. Handle completion states for first-day users
if (hasOnboardingPrayer && !mappedMorningPrayer && !mappedEveningPrayer) {
  // Mark current time period as completed
  if (isCurrentlyMorning) {
    setMorningCompleted(true);
  } else {
    setEveningCompleted(true);
  }
}
```

#### Prayer Card Logic (`PrayerCard.tsx`)
```typescript
// Priority display logic
const hasFirstPrayer = !!onboardingPrayer;
const currentPrayer = hasFirstPrayer ? onboardingPrayer : (showMorningPrayer ? morningPrayer : eveningPrayer);
const isFirstPrayer = hasFirstPrayer && currentPrayer === onboardingPrayer;

// First prayer is always available
const isAvailable = isFirstPrayer || (showMorningPrayer ? morningAvailable : eveningAvailable);
```

#### Navigation (`handleBeginPrayer`)
```typescript
if (onboardingPrayer) {
  router.push({
    pathname: '/prayer-display',
    params: {
      prayer: onboardingPrayer.content,
      slot: 'first', // Special slot identifier
      verse: onboardingPrayer.verse || '',
      prayerId: onboardingPrayer.id
    }
  });
  return;
}
```

### Technical Implementation

1. **Database Query**: `useHomeScreen` queries for prayers with `slot: 'onboarding-initial'`
2. **Display Logic**: PrayerCard shows special "First Prayer" styling for onboarding prayers
3. **Completion Tracking**: First day users see the appropriate time period as completed based on when the prayer was generated (not current time)
4. **Routing**: Navigation passes the actual time of day (morning/evening) based on when the prayer was generated, ensuring proper gradient styling in the prayer display
5. **Time-based Styling**: 
   - Morning prayers (generated 4am-12pm): Blue gradient
   - Evening prayers (generated 5pm-4am): Purple gradient
   - Prayers generated outside prayer windows (12pm-5pm): Use current time

## Database Schema

The first prayer uses the existing `prayers` table structure:
- `slot`: `'onboarding-initial'` (distinguishes from regular prayers)
- `user_id`: Links to the user
- `content`: The generated prayer text
- `verse_ref`: Associated Bible verse
- `generated_at`: When it was created

## User Experience Flow

1. **Complete Onboarding** → Prayer generated with slot `'onboarding-initial'`
2. **Land on Dashboard** → See "First Prayer" in prayer card
3. **Tap "View First Prayer"** → Navigate to prayer display
4. **View Prayer** → Can read, share, or continue to regular prayer flow
5. **Return to Dashboard** → Current time period shows as completed

## Benefits

1. **Immediate Value**: Users see personalized content immediately after onboarding
2. **No Time Restrictions**: First prayer is always available, reducing friction
3. **Clear Differentiation**: Unique styling and labeling make it special
4. **Honest Data Model**: Keeps onboarding prayer in its original slot
5. **Smooth Transition**: Marks appropriate time period as completed for progression

## Key Differences from Original Implementation

### Previous Approach (Deprecated)
- Tried to duplicate onboarding prayer into morning/evening slots
- Created data integrity issues
- Confused the prayer tracking system

### Current Approach (Implemented)
- Keeps onboarding prayer in its original `'onboarding-initial'` slot
- Treats it as a special "First Prayer" type
- Displays it separately from regular morning/evening prayers
- Maintains data integrity while providing great UX

## Testing

To test the first prayer implementation:

1. Create a new sim account
2. Complete onboarding (prayer will be generated)
3. Land on dashboard
4. Verify:
   - Prayer card shows "First Prayer" with purple gradient
   - Button says "View First Prayer"
   - Current time period shows as completed in daily tasks
   - Tapping the card navigates to prayer display with slot `'first'`

## Future Considerations

- First prayer remains accessible until user generates their first regular prayer
- Could potentially show first prayer in prayer history with special badge
- May want to add analytics to track first prayer engagement 

## Visual Design

- **Card Appearance**: Unique purple gradient background
- **Icon**: Jesus emoji (✝️) instead of time-based icons
- **Title**: "First Prayer" instead of "Morning/Evening Prayer"
- **Button Text**: "View First Prayer" for clarity
- **No Time Restrictions**: Always available, unlike regular prayers
- **Avatars Display**: Shows profile images of people being prayed for (when available)
  - Extracted from the prayer's `input_snapshot` data
  - Displays up to 5 people with their avatars
  - Shows relationship labels under avatars 