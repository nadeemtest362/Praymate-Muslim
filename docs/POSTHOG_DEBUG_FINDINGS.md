# PostHog Event Tracking Failure - Investigation Report

**Date:** 2025-11-17  
**Status:** Events working in dev (existing user), FAILING in production (new users)  
**Symptom:** Zero client-side PostHog events reaching dashboard after commit 6bad2a5

---

## Confirmed Working

- ✅ Dev build with existing user (rankjumpers@gmail.com) - ALL events fire correctly
- ✅ RevenueCat server-side webhook events (subscription_purchase, etc.)
- ✅ PostHog client initializes (`getPostHogClient()` returns non-null)
- ✅ API key is present in .env (`EXPO_PUBLIC_POSTHOG_API_KEY`)

## Confirmed Broken

- ❌ Production builds - NO client-side events reach PostHog
- ❌ New user signups - NO events tracked
- ❌ Anonymous users - NO events tracked
- ❌ All `trackEvent()` calls silently fail to send

---

## Code Changes Timeline

### Commit e2a243d (Oct 11) - PostHog Integration Added ✅ WORKING
```typescript
// src/lib/posthog.ts - ORIGINAL WORKING CONFIG
const buildOptions = (host: string): PostHogOptions => ({
  host,
  flushAt: 1,  // ← Events sent immediately
  captureAppLifecycleEvents: true,
  enableSessionReplay: Platform.OS !== 'web',
  // ... rest
});
```

### Commit 87e60cd (Oct 17) - "cleanup PostHog logging" 🔴 SUSPECT
```diff
- flushAt: 1,
+ flushAt: 20,          // ← Need 20 events to flush
+ flushInterval: 10000, // ← OR wait 10 seconds
- enableSessionReplay: Platform.OS !== 'web',
+ enableSessionReplay: false,
+ posthogClient.debug(__DEV__);  // ← Added
```

**Impact:** Events now batch - need 20 events OR 10 seconds before sending to server.

### Commit ac53bd8 (Nov 8) - "add user_id super property" 🔴 SUSPECT
```typescript
// app/_layout.tsx - NEW CODE
registerPostHogProperties({ user_id: user.id });

// src/lib/posthog.ts - NEW FUNCTION
export const registerPostHogProperties = (properties: Record<string, any>) => {
  const client = getPostHogClient();
  if (!client) return;
  client.register(properties);  // Promise<void> - NOT awaited
};
```

**Impact:** Super properties registered for ALL events (including user_id).

### Commit 523d93d (Nov 8) - "implement PostHog identity aliasing" 🔴 SUSPECT
```typescript
// src/lib/auth.ts - NEW CODE (lines 84-93)
const { aliasPostHogUser } = await import('./posthog');
aliasPostHogUser(data.user.id);
```

**Impact:** Links anonymous ID to authenticated user ID during signup.

### Commit 6bad2a5 (Nov 11) - "Analytics System Refactor" 🔴 BREAKING COMMIT
**Changes:**
1. No changes to posthog.ts or analytics.ts core functions
2. Removed `trackScreen()` calls from all app screens
3. Split onboarding logging into DB-only vs PostHog-only
4. Removed granular interaction tracking from onboarding screens

---

## Possible Root Causes (Ranked by Likelihood)

### 1. `flushAt: 20` Configuration (Commit 87e60cd) - MOST LIKELY
**Evidence:**
- Changed from `flushAt: 1` (immediate) to `flushAt: 20` (batch of 20)
- New users likely don't generate 20 events before closing app
- Events queue locally but never flush to server
- Oracle confirmed: "If users close the app before 20 events, events are lost"

**Why dev works:**
- Existing user generates enough events OR has persistent state from flushAt:1 era
- Dev testing sessions longer/more active

**Why production fails:**
- New users generate 5-10 events per session
- Close app before flushInterval (10s) triggers
- Events lost forever

**Test:** Temporarily set `flushAt: 1` and deploy - if events start appearing, this is the cause.

---

### 2. `client.register()` Storage Write Failure - POSSIBLE
**Evidence:**
- `register()` writes super properties to AsyncStorage/file system
- Returns `Promise<void>` but code doesn't await it
- No try-catch around the call
- If storage write fails, could corrupt client state

**Why dev works:**
- Storage already initialized from previous app runs
- Different permissions or storage state

**Why production fails:**
- Fresh install, storage initialization might fail
- No error handling to detect this

**Test:** Wrap `client.register()` in try-catch and log errors.

---

### 3. `alias()` + `identify()` Race Condition - LESS LIKELY
**Evidence:**
- For migrating anon users: `alias()` called in auth.ts, then `identify()` in _layout.tsx
- PostHog docs unclear on timing requirements
- Could create identity conflict

**Why dev works:**
- Dev user created before alias code existed
- No migration path

**Why production fails:**
- New signups go through full migration flow
- Identity chain breaks

**Test:** Remove `aliasPostHogUser()` call temporarily and test new signup.

---

### 4. Production Build Stripping Code - UNLIKELY
**Evidence:**
- babel.config.js strips console logs in production
- metro.config.js has minification settings

**Why unlikely:**
- Babel only strips console.* calls, not PostHog SDK code
- Metro config preserves function names and critical code

---

## What to Debug Next

### Step 1: Check Production Logs (Sentry)
Look for:
- `"PostHog storage initialization failed"`
- `"[PostHog] register skipped - client unavailable"`
- Any unhandled promise rejections from `client.register()`

### Step 2: Test Hypothesis - flushAt
```typescript
// src/lib/posthog.ts - TEMPORARY TEST
const buildOptions = (host: string): PostHogOptions => ({
  host,
  flushAt: 1,  // ← CHANGE BACK TO 1
  flushInterval: 3000,  // ← Lower to 3s
  // ...rest unchanged
});
```

Deploy and test with new user. If events appear, `flushAt: 20` is the culprit.

### Step 3: Add Error Handling to register()
```typescript
// src/lib/posthog.ts
export const registerPostHogProperties = (properties: Record<string, any>) => {
  const client = getPostHogClient();
  if (!client) {
    if (__DEV__) {
      console.warn('[PostHog] register skipped - client unavailable');
    }
    return;
  }

  try {
    if (__DEV__) {
      console.log('[PostHog] register', { propertiesKeyCount: Object.keys(properties).length });
    }
    client.register(properties);  // ADD: .catch() or try-catch
  } catch (error) {
    // Log to Sentry in production
    console.error('[PostHog] register failed:', error);
    captureException(error);
  }
};
```

### Step 4: Force Flush on Critical Actions
If `flushAt: 20` is needed for perf, add manual flush calls:
- On app background
- After prayer completion
- After major events

---

## My Assessment

**Primary suspect: `flushAt: 20`**

Your dev user generates enough activity (or has persistent queue from when it was `flushAt: 1`). New production users don't generate 20 events and close app before 10-second flush interval, so events never send.

**Secondary suspect: `client.register()` storage failure with no error handling**

The missing try-catch means if storage writes fail in production, the error propagates silently and could break the client.

---

## Immediate Action

**UPDATED Nov 17 - Query Results Show:**
- ✅ Events ARE flowing from production builds (84 unique users, 3,529 events in last 7 days)
- ❌ NEW users (joined after Nov 13) have ZERO client-side events, only RevenueCat webhooks
- ✅ OLD users (joined before Nov 13) continue sending events normally

**Root Cause: Production build on Nov 13 broke PostHog for new anonymous users**

Commit `7762d89` (Nov 13) was the last build push. Something in that build or the EAS build config is preventing new users from initializing PostHog client.

**Next Steps:**
1. ✅ Added error handling to `registerPostHogProperties()` with Sentry logging
2. Check production Sentry logs for PostHog errors after Nov 13
3. Verify `EXPO_PUBLIC_POSTHOG_API_KEY` is in production .env and accessible in release builds
4. Test: Install fresh production build on simulator, check if `getPostHogClient()` returns null
5. Compare EAS build logs from Nov 13 vs earlier successful builds
