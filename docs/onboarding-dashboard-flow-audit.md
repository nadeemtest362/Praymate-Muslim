## Updated Onboarding → Dashboard Flow Audit

### Overall Status
Flow remains healthy end-to-end: onboarding SDUI screens persist state via `AtomicDataStore`, Supabase edge functions (`generate-prayer`, `complete-prayer`) handle onboarding payloads correctly, and dashboard views render the initial prayer (people + slot indicators). Auth transitions continue to clear anonymous caches before loading the authenticated user, preventing data leakage.

### Data Capture & Persistence
- `onboardingStore.saveStateAtomically` still queues validated snapshots, converting empty enums to `null` and keeping AsyncStorage + Supabase profile data in sync.
- `AtomicDataStore.getData()` guards against corrupt payloads (resets step index, logs issues) before hydrating the store.
- **New confirmation:** `usePrayerPeopleManager` and `useOnboardingAddIntention` insert each person/intention into Supabase immediately during the flow, so the initial prayer won’t miss contacts/intentions even if the session ends early.

### Onboarding → Prayer Generation
- Faith tradition step continues to invoke `generate-prayer` with `initialOnboardingSnapshot`; the edge function re-fetches active intentions, resolves the effective slot, and stores the snapshot (`inputSnapshotForDB.clientSnapshot`).
- Weekly calendar logic now reads `input_snapshot.slot` (or falls back to completion timestamp) so onboarding prayers mark the correct half-circle indicator.

### Prayer Completion & Sync
- `complete-prayer` is still called from `PrayerDisplay`, with failures routed through `PrayerCompletionQueue` (secure retry, max 5 attempts, event-bus invalidations).
- Edge function returns `prayerTimeOfDay`, updates streaks, and pushes OneSignal tags; onboarding path still inserts the prayer row before completion—no race detected.

### Auth Transition
- `useSessionStore` and `userDataMigration` continue to reset/remove anonymous queries when the verified account takes over, then invalidate the new user’s caches for fresh data.
- Atomic onboarding data is cleared once the benefits/final steps run; if a user abandons mid-flow, the saved Supabase records ensure intentions/people persist, while the atomic store can be reused on resume.

### Dashboard / Calendar Integration
- `PlanWithCalendar` uses the enhanced `visiblePrayers` list; onboarding prayers count toward morning stats and feed the weekly calendar’s deduped slot indicators.
- `extractPeopleFromSnapshot` normalizes both `person` and `prayer_focus_people`, ensuring avatars render on the initial prayer card and in history.

### Remaining Risks / Watchpoints
1. `AtomicDataStore.updateData` still returns `{ success: true }` even when validation rejects a write; exposing validation status/telemetry would improve observability.
2. Auth race edges: concurrent `saveStateAtomically` calls during sign-up remain theoretically risky; worth auditing locking or deferring sign-in until pending queue flushes.
3. Edge function error surfacing: `generate-prayer` logs details but the onboarding UI only shows a generic failure state; consider surfacing actionable errors/toasts.
4. Testing gap persists: Jest can’t run React Native files without the missing transformer setup.

### Next Focus Areas
Maintain emphasis on atomic-store observability, auth-write concurrency, richer backend error reporting, and restoring automated tests to keep the onboarding-to-dashboard pipeline robust.
