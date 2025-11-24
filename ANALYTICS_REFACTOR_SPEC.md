# Analytics Refactor Specification
**Date:** 2025-11-10  
**Status:** Ready for Implementation  
**Risk:** Medium (affects all analytics, but changes are surgical)

---

## Executive Summary

Current analytics implementation has **200-300% event inflation** due to mixed concerns between SDUI database logging and PostHog product analytics. This spec defines surgical changes to separate these concerns while maintaining full visibility.

**Key Metrics (from Dongo's timeline):**
- 252 total events in one onboarding session
- 59 `$screen` events (23% of all events)
- 3x duplication on every screen view
- 4-5x duplication on every button tap

**Goal:** Reduce event count by 60-70% while maintaining complete visibility for both SDUI experiments and product analytics.

---

## Problem Statement

### Current Architecture Issues

#### Issue 1: `logEventInternal()` Double-Fires
**Location:** `src/contexts/OnboardingFlowContext.tsx:263-341`

```typescript
const logEventInternal = useCallback((eventName, flowId, stepId, eventData) => {
  // 1. Saves to onboarding_analytics_events DB ✅ (correct)
  onboardingApiService.logOnboardingEvent({ ... });
  
  // 2. ALSO fires to PostHog ❌ (wrong - causes duplication)
  trackOnboardingEvent(normalizedEventName, { ... }); // LINE 334
}, [currentFlow]);
```

**Impact:** Every internal SDUI event (`step_viewed`, `navigated_away_next`) goes to both DB and PostHog, causing double-counting.

---

#### Issue 2: `handleNext/handleBack` Fire Multiple Events
**Location:** `app/(onboarding)/_layout.tsx:695-750`

```typescript
const handleNext = async (data?: any) => {
  const singleEvents = [
    trackingConfig.completedEvent,
    trackingConfig.continueTappedEvent,
    trackingConfig.actionButtonEvent,
    trackingConfig.primaryActionEvent,
  ];

  // Loops through ALL non-empty events ❌
  for (let index = 0; index < singleEvents.length; index += 1) {
    const candidate = trimEventName(singleEvents[index]);
    if (candidate) {
      logEvent(candidate, { action: 'next' });
    }
  }

  // Then fires ANOTHER event ❌
  if (trackingConfig.ctaTappedEvent) {
    logEvent(trimEventName(trackingConfig.ctaTappedEvent), { action: 'next' });
  }
  
  proceedToNextStep(data); // Also fires navigated_away_next ❌
}
```

**Impact:** Single button tap fires 5-6 events to PostHog.

---

#### Issue 3: Screen Views Fire 3x
**Locations:**
- PostHog autocapture: `$screen` events (React Navigation auto-tracking)
- Manual screen tracking: `app/(onboarding)/_layout.tsx:635` → `logScreen()`
- Custom view events: `logEventInternal()` → PostHog

**Example from timeline:**
```
20:26:04.123 - $screen "onboarding_welcome_viewed"          ❌ (autocapture)
20:26:04.060 - onboarding_flow_started "/"                  ✅ (valid)
20:26:04.058 - onboarding_welcome_viewed "/"                ❌ (duplicate)
```

**Impact:** Every screen transition creates 3 separate screen events in PostHog.

---

## File Locations Verified ✅

All file paths and line numbers in this spec have been verified against the actual codebase:

- `src/contexts/OnboardingFlowContext.tsx` - All line numbers exact
- `app/(onboarding)/_layout.tsx` - All line numbers exact  
- `app/_layout.tsx` - PostHog config location verified (lines 584-591)
- `src/lib/posthog.ts` - PostHog initialization verified (line 59)

---

## Solution Architecture

### Principle: Separation of Concerns

| System | Purpose | Scope | Implementation |
|--------|---------|-------|----------------|
| **Database (`onboarding_analytics_events`)** | SDUI split testing, flow diagnostics, experiment tracking | Internal flow events: `step_viewed`, `navigated_away_*`, `flow_started`, `flow_completed` | `logSduiEvent()` → DB only |
| **PostHog Analytics** | Product insights, user behavior, funnels, retention | Screen views + meaningful interactions | `PostHog.screen()` for screens, `logProductEvent()` for interactions |

### Event Classification

#### Type 1: SDUI Internal Events (DB Only)
- `step_viewed` - fired on every step change
- `navigated_away_next` - fired when proceeding forward
- `navigated_away_back` - fired when going back
- `flow_started` - fired when onboarding begins
- `flow_completed` - fired when onboarding ends
- `step_skipped` - fired when user skips a step

**Destination:** `onboarding_analytics_events` table ONLY (no PostHog)

#### Type 2: Screen View Events (PostHog Screen Tracking)
- `onboarding_welcome_viewed`
- `onboarding_mood_viewed`
- `onboarding_intentions_viewed`
- etc.

**Destination:** PostHog `.screen()` ONLY (via `logScreen()`)

#### Type 3: User Interaction Events (PostHog Capture)
- `mood_selected`
- `intention_save_completed`
- `paywall_shown`
- `prayer_generated`
- `onboarding_welcome_continue_clicked`

**Destination:** PostHog `.capture()` ONLY (via `logProductEvent()`)

---

## Implementation Steps

### Step 1: Create `logSduiEvent()` Function
**File:** `src/contexts/OnboardingFlowContext.tsx`  
**Lines:** 263-342 (`logEventInternal` function)

#### Changes Required:

1. **Rename `logEventInternal` to `logSduiEvent`**
2. **Remove PostHog call** (lines 334-340)
3. **Add JSDoc comment** explaining purpose
4. **Update all internal calls** - search for `logEventInternal` and replace with `logSduiEvent` (it's called in `markOnboardingComplete` at lines 832 and 836)

```typescript
/**
 * Logs SDUI-internal events to the database for split testing and flow diagnostics.
 * These events are NOT sent to PostHog - they are purely for experiment tracking.
 * 
 * @param eventName - Internal event name (step_viewed, navigated_away_next, etc.)
 * @param flowId - Current onboarding flow ID
 * @param stepId - Current step ID (optional)
 * @param eventData - Additional event metadata (optional)
 */
const logSduiEvent = useCallback(
  (eventName: string, flowId: string, stepId?: string, eventData?: Record<string, any>) => {
    if (!flowId) {
      console.warn('[OnboardingFlowProvider] logSduiEvent: flowId is missing.');
      return;
    }

    // Fire-and-forget with silent error handling - analytics should never block user flow
    onboardingApiService.logOnboardingEvent({
      flow_id: flowId,
      step_id: stepId,
      event_name: eventName,
      event_data: eventData,
    }).catch((error) => {
      // Silently log to console only - never surface to user
      if (__DEV__) {
        console.warn('[OnboardingFlowProvider] SDUI event failed (silent):', eventName, error);
      }
    });

    // ❌ REMOVED: trackOnboardingEvent() call
    // This function is now DB-only for SDUI tracking
  },
  [currentFlow] // Remove currentFlow dependency if not needed
);
```

---

### Step 2: Create `logProductEvent()` and Bound `logSduiEventBound()` Functions
**File:** `src/contexts/OnboardingFlowContext.tsx`  
**Lines:** Insert after `logSduiEvent`

```typescript
/**
 * Logs user interaction events to PostHog for product analytics.
 * These events represent meaningful user actions (selections, completions, CTAs).
 * They are NOT saved to the database - use logSduiEvent for experiment tracking.
 * 
 * @param eventName - Product event name (mood_selected, intention_saved, etc.)
 * @param properties - Event properties (optional)
 */
const logProductEvent = useCallback(
  (eventName: string, properties?: Record<string, any>) => {
    const flowMetadata: OnboardingFlowMetadataInput = {
      flow_id: currentFlow?.flow_id,
      flow_name: currentFlow?.flow_name,
      flow_version: currentFlow?.flow_version,
      steps: currentFlow?.steps,
    };

    const stepMetadata: OnboardingStepMetadataInput | null = currentStep || null;
    const stepIndex = currentStepIndex;

    // Ensure onboarding_ prefix exists, but don't double-prefix
    const normalizedEventName = eventName.indexOf(ONBOARDING_EVENT_PREFIX) === 0
      ? eventName
      : `${ONBOARDING_EVENT_PREFIX}${eventName}`;

    trackOnboardingEvent(normalizedEventName, {
      flow: flowMetadata,
      step: stepMetadata,
      stepIndex,
      stepCount: currentFlow?.steps?.length,
      properties,
    });
  },
  [currentFlow, currentStep, currentStepIndex]
);

/**
 * Bound version of logSduiEvent for screens to use.
 * Automatically includes current flow/step context - screens don't need to pass those.
 * 
 * @param eventName - SDUI event name
 * @param eventData - Additional event data (optional)
 */
const logSduiEventBound = useCallback(
  (eventName: string, eventData?: Record<string, any>) => {
    if (currentFlow?.flow_id) {
      logSduiEvent(eventName, currentFlow.flow_id, currentStep?.id, eventData);
    }
  },
  [currentFlow, currentStep, logSduiEvent]
);
```

---

### Step 3: Update `logEvent()` to Route to Correct Function
**File:** `src/contexts/OnboardingFlowContext.tsx`  
**Lines:** 478-482 (exact location of `logEvent`)

#### Current Implementation:
```typescript
const logEvent = useCallback(
  (eventName: string, eventData?: Record<string, any>) => {
    logEventInternal(eventName, currentFlow?.flow_id || '', currentStep?.id, eventData);
  },
  [currentFlow, currentStep, logEventInternal]
);
```

#### New Implementation:
```typescript
/**
 * Routes events to the appropriate logging function based on event type.
 * - SDUI internal events (onboarding_*_viewed, *_navigated_away_*) → DB only
 * - Product events (user interactions) → PostHog only
 */
const logEvent = useCallback(
  (eventName: string, eventData?: Record<string, any>) => {
    // SDUI internal events: screen views and navigation events
    const isSduiEvent = (
      eventName.startsWith('onboarding_') && eventName.endsWith('_viewed')
    ) || (
      eventName.includes('navigated_away_next') || 
      eventName.includes('navigated_away_back')
    ) || (
      eventName === 'flow_started' ||
      eventName === 'flow_completed' ||
      eventName === 'flow_completed_all_steps' ||
      eventName === 'step_skipped'
    );

    if (isSduiEvent) {
      // DB only for SDUI tracking (using bound version)
      logSduiEventBound(eventName, eventData);
    } else {
      // PostHog only for product analytics
      logProductEvent(eventName, eventData);
    }
  },
  [logSduiEventBound, logProductEvent]
);
```

---

### Step 4: Update `proceedToNextStep()` and `proceedToPreviousStep()`
**File:** `src/contexts/OnboardingFlowContext.tsx`  
**Lines:** 743-784

**Change:** Simply rename all `logEventInternal` calls to `logSduiEvent` (these functions already call it directly for SDUI events).

These functions fire:
- `navigated_away_next` / `navigated_away_back` (lines 749, 771)
- `step_viewed` (lines 758, 780) 
- `flow_completed_all_steps` (line 760)

After Step 1 renames `logEventInternal` → `logSduiEvent`, update the dependency arrays:
- Line 763: Change `logEventInternal` → `logSduiEvent`
- Line 784: Change `logEventInternal` → `logSduiEvent`

---

### Step 5: Fix `handleNext/handleBack` to Fire ONE Event
**File:** `app/(onboarding)/_layout.tsx`  
**Lines:** 695-750

#### Current Implementation:
```typescript
const handleNext = async (data?: any) => {
  try {
    if (currentStep?.config?.tracking) {
      const trackingConfig = currentStep.config.tracking;
      if (trackingConfig && typeof trackingConfig === 'object') {
        const singleEvents = [
          trackingConfig.completedEvent,
          trackingConfig.continueTappedEvent,
          trackingConfig.actionButtonEvent,
          trackingConfig.primaryActionEvent,
        ];

        for (let index = 0; index < singleEvents.length; index += 1) {
          const candidate = trimEventName(singleEvents[index]);
          if (candidate) {
            logEvent(candidate, { action: 'next' });
          }
        }

        if (trackingConfig.ctaTappedEvent) {
          const normalized = trimEventName(trackingConfig.ctaTappedEvent);
          if (normalized) {
            logEvent(normalized, { action: 'next' });
          }
        }
      }
    }

    proceedToNextStep(data)
  } catch (err) {
    Alert.alert('Error', err instanceof Error ? err.message : 'Failed to continue', [{ text: 'OK' }])
  }
}
```

#### New Implementation:
```typescript
const handleNext = async (data?: any) => {
  try {
    // Fire ONE CTA event using priority cascade
    if (currentStep?.config?.tracking) {
      const trackingConfig = currentStep.config.tracking;
      if (trackingConfig && typeof trackingConfig === 'object') {
        // IMPORTANT: Trim EACH candidate before checking
        const candidates = [
          trimEventName(trackingConfig.completedEvent),
          trimEventName(trackingConfig.primaryActionEvent),
          trimEventName(trackingConfig.continueTappedEvent),
          trimEventName(trackingConfig.actionButtonEvent),
          trimEventName(trackingConfig.ctaTappedEvent),
        ];

        // Find first non-empty trimmed event
        const ctaEvent = candidates.find(name => name && name.length > 0);

        if (ctaEvent) {
          // Log to PostHog as product event (user interaction)
          logEvent(ctaEvent, { action: 'next' });
        }
      }
    }

    // proceedToNextStep will handle SDUI logging (navigated_away_next to DB)
    proceedToNextStep(data);
  } catch (err) {
    Alert.alert('Error', err instanceof Error ? err.message : 'Failed to continue', [{ text: 'OK' }]);
  }
}
```

**Repeat for `handleBack`:**
```typescript
const handleBack = async () => {
  try {
    if (currentStep?.config?.tracking) {
      const trackingConfig = currentStep.config.tracking;
      if (trackingConfig && typeof trackingConfig === 'object') {
        // Trim BEFORE checking
        const candidates = [
          trimEventName(trackingConfig.backButtonEvent),
          trimEventName(trackingConfig.secondaryActionEvent),
        ];

        const backEvent = candidates.find(name => name && name.length > 0);

        if (backEvent) {
          logEvent(backEvent, { action: 'back' });
        }
      }
    }

    proceedToPreviousStep();
  } catch (err) {
    Alert.alert('Error', err instanceof Error ? err.message : 'Failed to go back', [{ text: 'OK' }]);
  }
}
```

---

### Step 6: Update Context Provider Export
**File:** `src/contexts/OnboardingFlowContext.tsx`  
**Lines:** 850-875 (contextValue definition) and 877-880 (Provider return)

Add new functions to the exported context:

```typescript
const contextValue = useMemo(() => ({
  currentFlow,
  currentStep,
  currentStepIndex,
  isLoadingFlow,
  flowError,
  isFlowActiveInSession,
  hasLoadedSavedState,
  startOnboardingFlow,
  forceStartOnboardingFlow,
  proceedToNextStep,
  proceedToPreviousStep,
  logEvent,
  logScreen,
  logSduiEvent: logSduiEventBound,  // NEW: Expose bound version (no flowId/stepId params needed)
  logProductEvent,                   // NEW: Add this
  markOnboardingComplete,
  saveDisplayAndUpdateProfile,
  saveMoodAndContextToProfile,
  saveGeneralQuestionResponse,
  saveFaithTradition,
  setSessionInactive
}), [
  currentFlow, currentStep, currentStepIndex, isLoadingFlow, flowError, isFlowActiveInSession,
  hasLoadedSavedState,
  startOnboardingFlow, forceStartOnboardingFlow, proceedToNextStep, proceedToPreviousStep, 
  logEvent, logScreen, logSduiEventBound, logProductEvent,  // NEW: Add to deps
  markOnboardingComplete,
  saveDisplayAndUpdateProfile, saveMoodAndContextToProfile, saveGeneralQuestionResponse, 
  saveFaithTradition, setSessionInactive
]);
```

---

### Step 7: Update TypeScript Interface
**File:** `src/contexts/OnboardingFlowContext.tsx`  
**Lines:** 102-122 (interface definition)

```typescript
interface OnboardingFlowContextType {
  currentFlow: OnboardingFlowResponse | null;
  currentStep: OnboardingStepConfig | null;
  currentStepIndex: number;
  isLoadingFlow: boolean;
  flowError: string | null;
  isFlowActiveInSession: boolean;
  hasLoadedSavedState: boolean;
  startOnboardingFlow: () => void;
  forceStartOnboardingFlow: () => void;
  proceedToNextStep: (data?: any) => void;
  proceedToPreviousStep: () => void;
  logEvent: (eventName: string, eventData?: Record<string, any>) => void;
  logScreen: (screenName: string, eventData?: Record<string, any>) => void;
  logSduiEvent: (eventName: string, eventData?: Record<string, any>) => void;  // NEW - Bound version (no flowId/stepId needed)
  logProductEvent: (eventName: string, properties?: Record<string, any>) => void;  // NEW
  markOnboardingComplete: () => Promise<void>;
  saveDisplayAndUpdateProfile: (displayName: string) => Promise<{ success: boolean; error?: any }>;
  saveMoodAndContextToProfile: (moodId: string, moodEmoji: string | null, moodContext: string | null) => Promise<{ success: boolean; error?: any }>;
  saveGeneralQuestionResponse: (questionType: 'relationshipWithGod' | 'prayerFrequency', responseValue: string) => Promise<{ success: boolean; error?: any }>;
  saveFaithTradition: (faithTradition: string) => Promise<{ success: boolean; error?: any }>;
  setSessionInactive: () => void;
}
```

---

### Step 8: Add Product Event for Onboarding Completion
**File:** `src/contexts/OnboardingFlowContext.tsx`
**Lines:** Around `markOnboardingComplete` function

Add a PostHog product event when onboarding completes (for funnels):

```typescript
const markOnboardingComplete = useCallback(async () => {
  // ... existing DB update code ...
  
  // After DB update succeeds, log to PostHog for product funnels
  logProductEvent('onboarding_completed', {
    completed_at: new Date().toISOString(),
    total_steps: currentFlow?.steps?.length,
  });
  
  // ... rest of function ...
}, [/* deps */]);
```

**Note:** Keep existing `logSduiEvent` calls for `onboarding_marked_complete` and `onboarding_completion_failed` - those go to DB for SDUI tracking. The new `onboarding_completed` event goes to PostHog for product analytics.

---

### Step 9: Audit Individual Onboarding Screens
**Files:** `src/features/onboarding/screens/*.tsx`

#### Known Files to Fix:

**`src/features/onboarding/screens/first-prayer.tsx` (lines 39-43)**
```typescript
// ❌ REMOVE - duplicates centralized screen tracking
useEffect(() => {
  if (logEvent) {
    logEvent('first_prayer_viewed');
  }
}, [logEvent]);
```

#### Pattern to Find All Duplicates:
Search for screens that manually call `logEvent` with "viewed" events:

```bash
grep -r "logEvent.*_viewed" src/features/onboarding/screens/
```

#### Pattern to Remove:
```typescript
// ❌ REMOVE - screen tracking is now centralized in _layout
useEffect(() => {
  logEvent('onboarding_*_viewed');
}, []);
```

#### Pattern to Keep:
```typescript
// ✅ KEEP - this is a meaningful user interaction
const handleMoodSelect = (mood: string) => {
  logEvent('mood_selected', { mood });
};
```

**Note:** After removing duplicate "_viewed" events, screens should only call `logEvent()` for user interactions (clicks, selections, saves), NOT for screen views.

---

## Testing Strategy

### Phase 1: Local Testing (Dev Environment)

#### Test Case 1: Screen View Tracking
1. Start fresh onboarding flow
2. Navigate through 5 onboarding screens
3. Check PostHog debug logs: Should see **6 screen events total**:
   - 1 route-level screen event when entering onboarding stack (from `app/_layout.tsx`)
   - 5 onboarding-named screen events (one per step from centralized `logScreen()` in onboarding host)
4. Check database: Should see exactly **5 rows with screen names** (one per step stored via internal `step_viewed` calls)

#### Test Case 2: Button Tap Events
1. Tap "Continue" on welcome screen
2. Check PostHog debug logs: Should see exactly **1 CTA event** (not 5)
3. Check database: Should see **1 navigated_away_next row**

#### Test Case 3: User Interaction Events
1. Select a mood
2. Save an intention
3. Check PostHog: Should see `mood_selected`, `intention_saved`
4. Check database: Should see **no duplicate entries**

---

### Phase 2: Integration Testing

#### Validation Script:
Create a test timeline export and count events:

```bash
# After running through full onboarding in dev
# Export PostHog timeline for test user
# Count events:

# Before: ~252 events for one session
# After: ~80-90 events for one session

# Screen events: 59 → 20 (one per screen)
# Navigation events: 40 → 0 in PostHog (DB only)
# CTA events: 80 → 20 (one per button tap)
```

---

### Phase 3: Production Validation

#### Week 1: Monitor Metrics
- PostHog event volume should drop 60-70%
- Database event volume should remain unchanged
- No user-facing errors or missing analytics

#### Week 2: Audit Funnels
- Onboarding funnel still accurate
- Retention cohorts still calculating
- No missing conversion events

---

## Rollback Plan

If analytics break or data is missing:

### Quick Rollback (< 5 minutes):
```bash
git revert <commit-hash>
git push
```

### Selective Fix:
If only one part breaks (e.g., screen tracking):
1. Re-add PostHog call to `logSduiEvent()` temporarily
2. Debug specific issue
3. Remove again once fixed

---

## Migration Checklist

- [ ] **Step 1:** Create `logSduiEvent()` function (DB-only, remove PostHog call)
- [ ] **Step 2:** Create `logProductEvent()` and `logSduiEventBound()` functions
- [ ] **Step 3:** Update `logEvent()` router with pattern matching
- [ ] **Step 4:** Update `proceedToNextStep()` and `proceedToPreviousStep()` dependency arrays
- [ ] **Step 5:** Fix `handleNext()` and `handleBack()` to fire ONE event (trim-before-check)
- [ ] **Step 6:** Update context provider export (expose `logSduiEventBound`)
- [ ] **Step 7:** Update TypeScript interface
- [ ] **Step 8:** Add `onboarding_completed` PostHog event to `markOnboardingComplete()`
- [ ] **Step 9:** Audit and clean individual screens (remove duplicate "_viewed" events)
- [ ] **Test:** Run full onboarding in dev
- [ ] **Test:** Export timeline and verify event counts
- [ ] **Test:** Check database for SDUI events
- [ ] **Test:** Check PostHog for product events
- [ ] **Deploy:** TestFlight build
- [ ] **Monitor:** Watch PostHog event volume
- [ ] **Validate:** Run through onboarding on TestFlight
- [ ] **Document:** Update AGENTS.md with new analytics contract

---

## Success Criteria

✅ **Event Reduction:** 60-70% fewer PostHog events (252 → ~80-90)  
✅ **Zero Duplication:** No duplicate screen views or CTA events  
✅ **Full Visibility:** All meaningful user actions still tracked  
✅ **SDUI Intact:** Database events still firing for experiments  
✅ **No User Impact:** No errors, crashes, or missing analytics  

---

## Post-Implementation

### Update Documentation

**File:** `AGENTS.md`  
Add section:

```markdown
## Analytics Architecture

### Event Types and Ownership

1. **SDUI Internal Events (Database Only)**
   - Purpose: Split testing, flow diagnostics, experiment tracking
   - Function: `logSduiEvent()`
   - Destination: `onboarding_analytics_events` table
   - Examples: `step_viewed`, `navigated_away_next`, `flow_completed`

2. **Screen Views (PostHog Screen Tracking)**
   - Purpose: Product analytics, user journey mapping
   - Function: `logScreen()`
   - Destination: PostHog `.screen()`
   - Examples: `onboarding_welcome_viewed`, `onboarding_mood_viewed`

3. **User Interactions (PostHog Event Tracking)**
   - Purpose: Product insights, conversion tracking, funnel analysis
   - Function: `logProductEvent()`
   - Destination: PostHog `.capture()`
   - Examples: `mood_selected`, `intention_saved`, `paywall_shown`

### Rules for Adding New Analytics

- **Screen tracking:** Centralized in `_layout.tsx` via SDUI config
- **User interactions:** Use `logProductEvent()` from screens
- **SDUI telemetry:** Use `logSduiEvent()` for internal flow tracking
- **Never** send SDUI internal events to PostHog
- **Never** loop through multiple event configs - use priority cascade
```

---

## Appendix: Event Mapping Reference

### Before → After Event Names

| Old Event | Type | New Destination | New Event Name |
|-----------|------|-----------------|----------------|
| `onboarding_welcome_viewed` (capture) | Screen | PostHog screen | `onboarding_welcome_viewed` |
| `$screen` (autocapture) | Screen | Disabled | N/A |
| `step_viewed` | SDUI | DB only | `step_viewed` |
| `navigated_away_next` | SDUI | DB only | `navigated_away_next` |
| `onboarding_welcome_continue_tapped` | CTA | PostHog capture | `onboarding_welcome_continue_tapped` |
| `onboarding_cta_tapped` | CTA | Disabled (duplicate) | N/A |
| `mood_selected` | Interaction | PostHog capture | `mood_selected` |

---

**End of Specification**
