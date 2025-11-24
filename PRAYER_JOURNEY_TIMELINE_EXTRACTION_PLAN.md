# Prayer Journey Timeline Component Extraction Plan

## Objective
Extract PrayerCard and timeline rendering logic from `plan-with-calendar.tsx` into a standalone `PrayerJourneyTimeline` component without breaking data flow, performance, or UI.

---

## Phase 1: Create New Component File

**File Location:** `/Users/milesdyson/secretlab/personal-prayers/src/components/plan/PrayerJourneyTimeline.tsx`

---

## Phase 2: Component Structure

### What to Extract

1. **PrayerCard component** (lines 77-407)
   - Complete component with all internal logic
   - All useMemo computations
   - All rendering logic
   
2. **renderPrayerCard callback** (lines 890-922)
   - Wrapper function that instantiates PrayerCard
   - Determines `isLastCard` logic

### Props Interface

```typescript
interface PrayerJourneyTimelineProps {
  prayers: any[];
  peopleImageMap: Map<string, string | null>;
  onLikeToggle: (prayerId: string, currentLiked: boolean | null) => void;
  onPrayerPress: (prayer: any) => void;
  hasDisplayedInitialPrayers: boolean;
  styles: any; // All prayer card-related styles
  R: ReturnType<typeof useResponsive>; // For creating styles if needed
}
```

### Data Flow - PRESERVE EXACTLY

**Inputs (from parent):**
1. `prayers` - Already filtered array from parent
2. `peopleImageMap` - Map from `useAllPeople` hook
3. `onLikeToggle` - Callback using `toggleLikeMutation`
4. `onPrayerPress` - Navigation callback from parent
5. `hasDisplayedInitialPrayers` - Animation control flag
6. `styles` - All style objects needed

**Internal Processing (Keep As-Is):**
1. Extract people from `prayer.input_snapshot`
2. Merge with `peopleImageMap` for avatar images
3. Extract mood data from `input_snapshot.dbProfileMoodAtGeneration`
4. Extract intention topics from multiple snapshot buckets
5. Apply 4am boundary logic for display date
6. Determine morning/evening from `prayer.slot`
7. Format date/time display
8. Render timeline, gradient, content, pills

**Outputs:**
- Rendered list of prayer cards with timeline

---

## Phase 3: Styles to Extract

### Styles to Pass from Parent

Extract from `createStyles` function:

**Timeline Styles:**
- `prayerCardContainer`
- `timelineContainer`
- `timelineCircle`
- `timelineIcon`
- `timelineLineContainer`
- `timelineLine`

**Card Styles:**
- `prayerCard`
- `prayerGradient`
- `prayerHeaderWrapper`
- `prayerHeader`
- `prayerDateContainer`
- `prayerSlotImageContainer`
- `morningImageContainer`
- `eveningImageContainer`
- `prayerSlotImage`

**Header Styles:**
- `prayerDateInfo`
- `prayerDateAndLikeRow`
- `likeButtonInlineDate`
- `prayerDate`
- `prayerTimeRow`
- `prayerTime`
- `peopleAvatarsHeader`
- `prayerMoodPill`
- `prayerMoodEmoji`
- `prayerMoodText`
- `prayerHeaderActions`

**Content Styles:**
- `prayerContent`
- `prayerFooter`
- `peopleSection`
- `peopleLabel`
- `peopleCount`
- `peopleAvatars`
- `personAvatar`
- `moreCount`
- `moreCountText`

**Topic Pills Styles:**
- `topicPillsContainer`
- `topicPill`
- `topicPillEmoji`
- `topicPillText`
- `topicPillMoreText`

**Strategy:** Pass complete `styles` object as prop from parent

---

## Phase 4: Dependencies to Import

```typescript
import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { Avatar } from "../../shared/ui";
import { safeSlice } from "../../utils/safeArrayMethods";
import { extractPeopleFromSnapshot } from "../../utils/prayerUtils";
import { PLAN_EVENING_ICON, PLAN_MORNING_ICON } from "../../utils/warmPlanIcons";
import { APP_MOOD_OPTIONS } from "../../constants/moodConstants";
import { PRAYER_TOPICS, PrayerTopicId } from "../../constants/prayerConstants";
```

---

## Phase 5: Performance Optimizations - MUST PRESERVE

### Critical Performance Patterns

1. **PrayerCard is React.memo**
   - Keep memoization wrapper
   - Keep exact props comparison

2. **All useMemo calls**
   - `snapshotPeople` - depends on `prayer.input_snapshot`
   - `safePeople` - depends on `snapshotPeople, peopleImageMap`
   - `moodData` - depends on `prayer.input_snapshot`
   - `intentionTopics` - depends on `prayer.input_snapshot`
   - `displayContent` - depends on `prayer.content`

3. **useCallback for renderPrayerCard**
   - Dependencies: `handleLikeToggle, router, styles, peopleImageMap, hasDisplayedInitialPrayers, dateFilteredPrayers.length`

4. **FadeIn animations**
   - Only animate when `shouldAnimateEntry` is true
   - Stagger delays based on index

5. **Production-safe array methods**
   - Using `safeSlice` instead of native `slice`

---

## Phase 6: What STAYS in plan-with-calendar.tsx

### Parent Responsibilities

1. **Data Fetching:**
   - `usePrayers` hook
   - `useAllPeople` hook
   - `useTodaysPrayers` hook
   - All React Query logic
   - Cache management

2. **Filter Logic:**
   - `selectedFilter` state
   - `searchQuery` state
   - `isDateFilterActive` state
   - `filteredEnhancedPrayers` computation
   - `dateFilteredPrayers` computation
   - Filter counts

3. **State Management:**
   - `peopleImageMap` construction
   - `hasDisplayedInitialPrayers` state
   - `visiblePrayers` state
   - Fallback prayer logic

4. **Callbacks:**
   - `handleLikeToggle` - uses `toggleLikeMutation`
   - Navigation logic for `onPress`
   - `onRefresh` callback

5. **UI Components:**
   - Calendar component
   - Header/greeting section
   - Search bar
   - Filter pills
   - Empty state
   - Loading state
   - List footer/header

6. **Analytics:**
   - Screen tracking
   - Event tracking
   - Performance logging

---

## Phase 7: Integration Back Into Parent

### In plan-with-calendar.tsx

```typescript
import PrayerJourneyTimeline from "../../src/components/plan/PrayerJourneyTimeline";

// ... existing code ...

const handlePrayerPress = useCallback((prayer: any) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  router.push({
    pathname: "/prayer-display",
    params: {
      verseRef: prayer.verse_ref || "",
      prayerId: prayer.id,
      initialLiked: prayer.liked ? "true" : "false",
      slot: prayer.slot || "",
    },
  });
  trackEvent("prayer_history_prayer_opened", {
    prayer_id: prayer.id,
    slot: prayer.slot || "",
    liked: prayer.liked === true,
  });
}, [router]);

// Replace renderPrayerCard usage with:
<PrayerJourneyTimeline
  prayers={dateFilteredPrayers}
  peopleImageMap={peopleImageMap}
  onLikeToggle={handleLikeToggle}
  onPrayerPress={handlePrayerPress}
  hasDisplayedInitialPrayers={hasDisplayedInitialPrayers}
  styles={styles}
  R={R}
/>
```

---

## Phase 8: Validation Checklist

### Before Committing

- [ ] No data fetching added to new component
- [ ] All memoization preserved with exact dependencies
- [ ] All callbacks have correct dependencies
- [ ] Styles render identically (pixel-perfect match)
- [ ] Animations work the same (timing, delays)
- [ ] No performance regression (check React DevTools)
- [ ] People images still merge correctly from map
- [ ] 4am boundary logic still applies correctly
- [ ] Like button toggles and updates optimistically
- [ ] Navigation to prayer-display still works
- [ ] Timeline renders correctly with proper spacing
- [ ] Morning/evening gradients apply correctly
- [ ] Mood pills display correct data
- [ ] Intention topic pills show correct categories
- [ ] Content preview shows first paragraph only
- [ ] Avatar overlapping works correctly
- [ ] "+X more" count displays when >4 people
- [ ] Empty state shows when no prayers
- [ ] Refresh functionality still works
- [ ] Date filtering still applies
- [ ] Search filtering still applies
- [ ] Slot filtering (morning/evening/liked) still applies

### Testing Strategy

1. **Visual Regression:** Compare screenshots before/after
2. **Performance:** Check render times in React DevTools Profiler
3. **Data Flow:** Verify all props flow correctly
4. **Interactions:** Test like, navigation, animations
5. **Edge Cases:** Empty lists, single prayer, many prayers

---

## Implementation Order

1. Create new file with component skeleton
2. Copy PrayerCard component code
3. Copy renderPrayerCard logic
4. Set up props interface
5. Add all imports
6. Test in isolation (if possible)
7. Integrate into parent
8. Remove old code from parent
9. Run validation checklist
10. Test thoroughly

---

## Rollback Plan

If anything breaks:
1. Git revert the changes
2. Investigate issue in isolation
3. Fix and retry
4. Keep parent component working at all times

---

## Notes

- **DO NOT** add any new data fetching logic
- **DO NOT** change memoization dependencies
- **DO NOT** modify 4am boundary logic
- **DO NOT** change animation timings
- **PRESERVE** all production-safe array operations
- **PRESERVE** all useMemo/useCallback patterns
- **PRESERVE** exact style object structure
