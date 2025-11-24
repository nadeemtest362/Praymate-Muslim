# Analytics user_id Property Investigation

## Question
After full auth (UUID-B), is `user_id` added to all post-auth events app-wide and across app restarts?

## Finding
**NO** - `user_id` is currently **NOT** added to all events app-wide. It's only added to onboarding-specific events.

---

## Current Implementation

### 1. PostHog Identity Management
**File:** `src/lib/posthog.ts`
- `identifyPostHogUser(userId)` - Sets PostHog's `distinct_id` to the Supabase user ID
- Called in `app/_layout.tsx` line 380 whenever `user?.id` changes
- **Does NOT** automatically add `user_id` as a property to events

### 2. Analytics Context System
**File:** `src/lib/analytics.ts`

**Global context storage:**
```typescript
let analyticsContext: NullableRecord = null; // Line 51
```

**Context setter:**
```typescript
export const setAnalyticsContext = (context?: Record<string, unknown> | null): void => {
  if (!context) {
    analyticsContext = null;
    return;
  }
  const cloned: Record<string, unknown> = {};
  copyProperties(context, cloned);
  analyticsContext = cloned;
}; // Lines 72-81
```

**Where context is set:**
- **ONLY** in `src/contexts/OnboardingFlowContext.tsx` lines 146-204
- Sets `user_id`, `profile_has_completed_onboarding`, `profile_timezone`, onboarding flow metadata
- Context is scoped to onboarding flow lifecycle

### 3. Event Tracking Functions

**`trackEvent()` (lines 177-199):**
```typescript
export const trackEvent = (
  name: string,
  properties?: AnalyticsProperties,
  client?: PostHog | null
): void => {
  // ...
  resolved.capture(name, properties); // Line 192 - NO context merge
}
```
❌ **Does NOT merge `analyticsContext`**

**`buildOnboardingEventProperties()` (lines 119-174):**
```typescript
export const buildOnboardingEventProperties = (...): Record<string, unknown> => {
  const properties: Record<string, unknown> = {};
  
  if (analyticsContext) {
    copyProperties(analyticsContext, properties); // Lines 125-127
  }
  // ... adds onboarding-specific properties
}
```
✅ **Merges `analyticsContext` (including `user_id`)**

**`trackOnboardingEvent()` (lines 225-245):**
- Calls `buildOnboardingEventProperties()` ✅
- Then calls `trackEvent()` with merged properties ✅

---

## What Events Get `user_id`?

### ✅ Events WITH `user_id`:
- All events fired via `trackOnboardingEvent()` or `trackOnboardingScreen()`
- Used in: onboarding flow screens, flow navigation, step completion
- **Only active during onboarding** (when OnboardingFlowContext is mounted)

### ❌ Events WITHOUT `user_id`:
**Examples from codebase:**
- `intentions_hero_shown` - `src/components/intentions/IntentionsHero.tsx:420`
- `share_platform_selected`, `share_success` - `src/components/shared/PrayerShareModal.tsx`
- `praylock_session_completed`, `praylock_schedule_attempt` - `src/stores/praylockStore.ts`
- `prayer_history_filter_set` - `src/components/plan/PlanWithCalendarContent.tsx:198`
- All direct `trackEvent()` calls throughout the app

---

## PostHog Behavior Analysis

### PostHog `identify()` vs `register()`

**From PostHog docs:**
- `posthog.identify(userId, properties)`:
  - Sets `distinct_id` to userId ✅ (we do this)
  - Stores properties as **person properties** on the user profile
  - Person properties are NOT auto-added to every event ❌

- `posthog.register({ property: value })`:
  - Sets **super properties** that are sent with EVERY event automatically
  - Persists across app restarts (stored in AsyncStorage)
  - This is what we SHOULD use for `user_id`

**PostHog React Native SDK** (`posthog-react-native@4.9.1`):
- Has `register(properties)` method available
- Has `unregister(property)` method for cleanup
- Super properties persist across sessions in local storage

---

## Problems with Current Implementation

1. **Incomplete tracking:** Post-auth events from home, intentions, prayer completion, sharing, PRAYLOCK, etc. have NO `user_id` property
2. **Context scope limitation:** `analyticsContext` only exists when OnboardingFlowContext is mounted
3. **No persistence:** Context is lost on app restart
4. **CRM data gaps:** CRM cannot reliably link events to authenticated users outside onboarding

---

## Recommended Solution

### Option 1: Use PostHog Super Properties (RECOMMENDED)
**Where:** `app/_layout.tsx` lines 377-400 (where we identify users)

**Current code:**
```typescript
useEffect(() => {
  if (user?.id) {
    identifyPostHogUser(user.id);
    // ...
  }
  resetPostHog();
}, [user?.id, session?.user?.email]);
```

**Proposed code:**
```typescript
useEffect(() => {
  if (user?.id) {
    identifyPostHogUser(user.id);
    // ADD: Register user_id as super property
    const client = getPostHogClient();
    if (client) {
      client.register({ user_id: user.id });
    }
    // ...
  } else {
    resetPostHog(); // Clears super properties on logout
  }
}, [user?.id, session?.user?.email]);
```

**Benefits:**
- ✅ `user_id` sent with ALL events automatically
- ✅ Persists across app restarts
- ✅ Cleared on logout via `resetPostHog()`
- ✅ Works for anonymous users too (Supabase anon UUID)
- ✅ Minimal code changes

---

### Option 2: Merge Context in trackEvent/trackScreen
**Where:** `src/lib/analytics.ts` lines 177-223

**Proposed code:**
```typescript
export const trackEvent = (
  name: string,
  properties?: AnalyticsProperties,
  client?: PostHog | null
): void => {
  try {
    const resolved = resolveClient(client);
    if (!resolved) {
      if (__DEV__) console.warn('[analytics] trackEvent skipped - PostHog client unavailable', name);
      return;
    }
    
    // Merge analytics context into all events
    const mergedProperties = analyticsContext 
      ? mergeAnalyticsProperties(analyticsContext as Record<string, unknown>, properties as Record<string, unknown> | undefined)
      : properties;
    
    resolved.capture(name, mergedProperties);
  } catch (error) {
    if (__DEV__) console.warn('[analytics] trackEvent failed (silent):', name, error);
  }
};
```

**Problems:**
- ❌ Still requires setting context globally (not currently done outside onboarding)
- ❌ No persistence across app restarts
- ❌ Need to manage context lifecycle manually

---

### Option 3: Set Global Analytics Context at App Level
**Where:** `app/_layout.tsx` after user state loads

**Create new global context setter:**
```typescript
// In app/_layout.tsx
useEffect(() => {
  if (user?.id && profile) {
    setAnalyticsContext({
      user_id: user.id,
      profile_has_completed_onboarding: profile.has_completed_onboarding,
      profile_timezone: profile.timezone,
    });
  } else {
    setAnalyticsContext(null);
  }
}, [user?.id, profile?.has_completed_onboarding, profile?.timezone]);
```

**Then modify `trackEvent()` to use it (see Option 2)**

**Problems:**
- ❌ Duplicates logic from OnboardingFlowContext
- ❌ Still no persistence across restarts
- ❌ More complex than Option 1

---

## RECOMMENDATION: Option 1 (PostHog Super Properties)

**Why:**
- Simplest implementation
- Leverages PostHog's built-in persistence
- Works for ALL events (auto-captured, custom, onboarding)
- Automatically cleared on logout
- No breaking changes to existing analytics code

**Implementation:**
1. Add `registerPostHogProperties()` helper to `src/lib/posthog.ts`
2. Call it in `app/_layout.tsx` after `identifyPostHogUser()`
3. Optionally remove `user_id` from `analyticsContext` in OnboardingFlowContext (now redundant)

---

## Files Referenced
- `src/lib/posthog.ts` - PostHog client wrapper
- `src/lib/analytics.ts` - Analytics tracking functions
- `src/contexts/OnboardingFlowContext.tsx` - Sets analytics context for onboarding
- `app/_layout.tsx` - App-level user identification
- `src/components/intentions/IntentionsHero.tsx` - Example event without user_id
- `src/components/shared/PrayerShareModal.tsx` - Example events without user_id
- `src/stores/praylockStore.ts` - Example events without user_id

---

## Next Steps
1. Decide on solution approach (recommend Option 1)
2. Implement changes
3. Test in dev to confirm `user_id` appears on all events
4. Verify persistence across app restart
5. Verify CRM can see unified user_id in all events
