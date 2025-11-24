# Onboarding SDUI Screens - Gotchas & Issues Analysis

## Overview
This document analyzes the current onboarding flow's pain points, inconsistencies, and potential failure modes across all SDUI screens.

## Critical Issues

### 1. State Dependencies Between Screens

**Critical Issues:**
- `mood-context.tsx` expects `tempNavParams` to be set by the previous screen. If navigation happens differently or the store is cleared, it shows an error alert
- `first-prayer.tsx` depends on `firstPrayerContent` being in the store - shows "Loading your prayer..." if null
- `intention-added-confirmation.tsx` requires `currentBatchOfIntentions` to be populated

**Example:** In `mood-context.tsx`:
```typescript
if (isInitialized && moodId === null) {
  Alert.alert(
    config.errorMessages?.missingMoodInfo || "Error: Missing mood information", 
    "Please go back and select a mood.", 
    [{ text: "Go Back", onPress: handleGoBack }]
  );
}
```

### 2. Inconsistent Data Persistence Patterns

**Problem:** Different screens handle data differently:
- `prayer-people.tsx` saves directly to Supabase AND updates Zustand store
- `prayer-needs.tsx` only updates Zustand store (no Supabase save)
- `add-intention.tsx` saves to Supabase within the component
- This inconsistency could lead to data loss if the app crashes before final save

**Examples:**
```typescript
// prayer-people.tsx - Saves to BOTH
const { data, error } = await supabase
  .from('prayer_focus_people')
  .insert({...})
  
setPrayerFocusPeople([...prayerFocusPeople, newPerson]);

// prayer-needs.tsx - Only Zustand
setPrayerNeeds(newPrayerNeeds);
// No Supabase save!
```

### 3. Navigation Parameter Passing Issues

**Problem:** The flow relies on parameters being passed through navigation:
```typescript
// mood.tsx passes params
onNext({ 
  id: mood.id, 
  emoji: mood.emoji, 
  label: mood.label 
});

// mood-context.tsx expects them
const tempNavParams = useOnboardingStore(state => state.tempNavParams);
```
If the SDUI navigation skips or reorders screens, this breaks.

### 4. Type Mismatches

**Problem:** Store types don't match actual usage:
```typescript
// prayer-people.tsx uses device_contact_id
device_contact_id: contactToProfile.id

// But PrayerFocusPerson type doesn't include it
interface PrayerFocusPerson {
  id: string;
  name: string;
  imageUri?: string;
  relationship?: string;
  gender?: string;
  // device_contact_id is missing!
}
```

### 5. Race Conditions

**In `prayer-people.tsx`:**
- Duplicate person checking might have race conditions when adding multiple people quickly
- Complex async operations without proper queueing

```typescript
const existingPerson = isPersonAlreadyAdded({ name: trimmedName }, prayerFocusPeople);
// What if user adds same person twice before first save completes?
```

### 6. Permission Handling Inconsistencies

**Different approaches across screens:**
- `times.tsx`: Handles notification permissions one way
- `prayer-people.tsx`: Handles contacts permissions differently
- No unified permission management strategy

### 7. Missing Error Boundaries

No error boundaries to catch component crashes - if any screen throws, the entire onboarding could break.

### 8. Animation/Timer Cleanup

**`prayer-generation-loading.tsx` has complex cleanup:**
```typescript
useEffect(() => {
  return () => {
    isMounted.current = false;
    timers.current.forEach((timer) => clearTimeout(timer));
    cancelAnimation(progressWidth);
    // But timers are added throughout async operations
  };
}, []);
```
Potential memory leaks if timers aren't properly tracked.

### 9. Auth State Dependencies

**Multiple screens do:**
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  throw new Error('User not authenticated');
}
```
But no central auth check before onboarding starts.

### 10. Loading State Gaps

**Inconsistent loading UX:**
- `first-name.tsx` shows loading during save but not during initial load
- `prayer-people.tsx` has loading for some operations but not others

### 11. Validation Timing Issues

**Problems:**
- `prayer-needs.tsx` validates on continue but not during selection
- `mood-context.tsx` validates after component mount (shows alert)
- Better to validate before navigation

### 12. Store Cleanup

**No clear pattern for when/how the onboarding store is reset:**
```typescript
clearCurrentBatchOfIntentions() // Called in some places
// But other temporary data like tempNavParams isn't consistently cleared
```

### 13. Image Handling Issues

**In `prayer-people.tsx`:**
```typescript
await FileSystem.copyAsync({ 
  from: originalUri, 
  to: fullLocalPath 
});
```
No cleanup of these cached images - could fill up storage.

### 14. Async Operation Handling

**Multiple screens have patterns like:**
```typescript
setTimeout(() => {
  onNext();
}, 3500);
```
If user navigates quickly or app backgrounds, these could fire at wrong times.

### 15. Mock Data in Production

**`prayer-generation-loading.tsx` has:**
```typescript
const mockData = (config as any).mockData;
const dataSource = mockData || onboardingData;
```
This could accidentally use mock data in production if config is wrong.

## Recommendations

### 1. Add a State Validation Layer
Create a middleware that validates required state before each screen:
```typescript
const validateScreenDependencies = (screenType: string) => {
  switch(screenType) {
    case 'mood-context':
      if (!store.tempNavParams?.id) {
        // Redirect to mood screen
      }
      break;
  }
};
```

### 2. Implement Centralized Data Persistence
- Create a single save strategy: either save everything at the end or save incrementally to Supabase
- Add a persistence queue to handle saves reliably

### 3. Add Error Boundaries
```typescript
<ErrorBoundary fallback={<OnboardingErrorScreen />}>
  {renderCurrentScreen()}
</ErrorBoundary>
```

### 4. Standardize Permission Handling
Create a unified permission manager:
```typescript
const PermissionManager = {
  requestNotifications: async () => {...},
  requestContacts: async () => {...},
  handleDenied: (type: PermissionType) => {...}
};
```

### 5. Implement Proper Navigation State
Replace tempNavParams with proper navigation state:
```typescript
interface OnboardingNavigation {
  currentStep: number;
  stepData: Record<string, any>;
  canNavigateTo: (step: number) => boolean;
}
```

### 6. Add Loading States Consistently
Every async operation should show loading state:
```typescript
const withLoading = async (fn: () => Promise<void>) => {
  setLoading(true);
  try {
    await fn();
  } finally {
    setLoading(false);
  }
};
```

### 7. Implement Proper Store Reset
```typescript
const resetOnboardingStore = () => {
  // Clear ALL temporary data
  setTempNavParams(null);
  clearCurrentBatchOfIntentions();
  setFirstPrayerContent(null);
  // etc...
};
```

### 8. Add Validation Before Navigation
```typescript
const canNavigateToNext = (currentScreen: string): boolean => {
  switch(currentScreen) {
    case 'prayer-people':
      return prayerFocusPeople.length > 0;
    case 'prayer-needs':
      return prayerNeeds.length > 0 || customPrayerNeed !== '';
    // etc...
  }
};
```

### 9. Fix Type Definitions
Update the PrayerFocusPerson interface:
```typescript
interface PrayerFocusPerson {
  id: string;
  name: string;
  imageUri?: string;
  relationship?: string;
  gender?: string;
  device_contact_id?: string | null; // Add this
}
```

### 10. Add Cleanup Utilities
```typescript
const cleanupOnboardingAssets = async () => {
  // Clean cached images
  await FileSystem.deleteAsync(contactImagesDir, { idempotent: true });
  // Cancel pending timers
  cancelAllTimers();
  // Reset animations
  cancelAllAnimations();
};
```

## Priority Fixes

### High Priority
1. Fix state dependencies between screens
2. Standardize data persistence
3. Add error boundaries
4. Fix type mismatches

### Medium Priority
5. Implement proper navigation state
6. Add consistent loading states
7. Standardize permission handling
8. Fix validation timing

### Low Priority
9. Cleanup temporary assets
10. Optimize animations
11. Remove mock data references

## Testing Recommendations

1. **Test interrupted flows**: Kill app mid-onboarding and restart
2. **Test reordered screens**: Change SDUI config to skip screens
3. **Test permission denials**: Deny all permissions and continue
4. **Test rapid navigation**: Navigate quickly between screens
5. **Test offline mode**: Complete onboarding without network
6. **Test background/foreground**: Background app during async operations 