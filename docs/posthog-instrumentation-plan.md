# PostHog Instrumentation Implementation Plan

## Overview

Scope: instrument the Expo React Native client so that core onboarding, prayer, intentions, Praylock, paywall/subscription, reminders, and sharing flows emit PostHog screen views and custom events. The plan references existing modules and handlers only—no speculative features.

## 1. Foundational Setup

### 1.1 Helper wrapper (`src/lib/analytics.ts`)
- Export `trackScreen(name: string, properties?: Record<string, unknown>)` → reads the singleton via `getPostHogClient()` (or accepts an injected instance returned from `usePostHog()`) and calls `.screen(...)`.
- Export `trackEvent(name: string, properties?: Record<string, unknown>)` → delegates to `capturePostHogEvent`.
- Where we’re already inside React components (e.g., screens), prefer `const posthog = usePostHog()` and pass that instance into helpers to avoid extra lookups.
- Export `withTiming(label, fn)` utility to measure durations (for prayer completion duration).

### 1.2 Identification lifecycle
- In `app/_layout.tsx` (already using `identifyPostHogUser`): extend payload to pass sanitized `$set` traits (plan, streak, prayer counts). Ensure email/name withheld if not allowed.
- In `app/(app)/settings.tsx`, just invoke `resetPostHog()` inside `handleSignOut()` (manual flush not required given users rarely log out).

### 1.3 Environment configuration & defaults
- Confirm `.env` includes `EXPO_PUBLIC_POSTHOG_API_KEY` (host optional for US cloud).
- In `src/lib/posthog.ts`, keep PostHog’s default batching (remove `flushAt: 1`) so events flush in small batches automatically.
- Disable session replay for now (`enableSessionReplay: false`) to avoid the native dependency overhead (revisit later if needed).
- Document QA workflow (development build, enable debug logging by passing `debug={__DEV__}` to `PostHogProvider` or using the VS devtools proxy).

### 1.4 Provider-level autocapture config
- Update `PostHogProvider` props in `app/_layout.tsx` so `autocapture={{ captureTouches: false, captureScreens: false, ... }}`. Expo Router manual screen tracking makes touch autocapture unnecessary and disabling it prevents accidental large payloads.
- Consider adding an `AppState` listener (optional) to call `posthog.flush()` when the app transitions to background if we notice delayed delivery; otherwise rely on batching.

## 2. Onboarding Flow Instrumentation

Applies to `app/(onboarding)` entry + SDUI screens in `src/features/onboarding/screens/*`.

### 2.1 Screen tracking
- `app/(onboarding)/_layout.tsx`
  - Replace existing `console.log` routing with `trackScreen("Onboarding – ${screen_type}", {...})` when `currentStep` changes.
  - Include properties: `flow_id`, `step_id`, `step_order`, `skippable`, `is_retry`.

### 2.2 SDUI event propagation
- Wrap `logEventInternal` in `OnboardingFlowContext` (`src/contexts/OnboardingFlowContext.tsx`) so every call also invokes `trackEvent(eventName, { flow_id, step_id, ...payload })`.

### 2.3 Specific screens
- `welcome.tsx` → in option tap handler (`handleSelectOption`) fire `trackEvent("onboarding_motivation_selected", { option_id })`.
- `general-question.tsx`, `mood.tsx`, `prayer-needs.tsx` → log `*_selected` with chosen IDs.
- `prayer-people/index.tsx`
  - When user adds a person: `trackEvent("onboarding_prayer_person_added", { total_people })`.
  - When removing: `..._removed`.
- `faith-tradition.tsx`
  - Before invoking `supabase.functions.invoke`: `trackEvent("onboarding_prayer_generation_started", { slot })`.
  - On success: `..._completed` with `{ slot, prayer_id }`.
  - On catch: `..._failed` with `{ slot, error: safeMessage }`.
- `first-paywall.tsx`
  - On mount after paywall data loads: `trackScreen("Onboarding – First Paywall", { paywall_id })`.
  - CTA press: `trackEvent("onboarding_paywall_cta", { package_id, intro_offer })`.
  - Purchase success/failure within RevenueCat callbacks.
  - Restore purchases path logs `onboarding_paywall_restore_attempt/result`.
- `times.tsx`
  - Before `Notifications.requestPermissionsAsync()`: `trackEvent("onboarding_reminder_permission_requested")`.
  - After resolution: `trackEvent("onboarding_reminder_permission_result", { status })`.
  - On continue success: `trackEvent("onboarding_prayer_times_saved", { slots: selectedSlots })`.
- `prayer-share-screen.tsx`
  - Share option triggers `trackEvent("onboarding_prayer_share_action", { platform })`.
- `OnboardingFlowContext.tsx`
  - After `markOnboardingComplete()` resolves: `trackEvent("onboarding_completed", { has_subscription, streak_goal })`.

## 3. Authenticated Home & Prayer Flow

### 3.1 Home tab (`app/(app)/(tabs)/home/index.tsx`)
- ✅ On initial data ready (after `hasLoadedPrayers` true): emits `trackScreen("Home", { ...context })` with step metadata.
- ✅ Consolidated `trackEvent` helpers (`trackHomeEvent`) covering prayer start, Praylock toggles, subscription modals, share modal open/close, refresh, and Blessed Day modal.
- ✅ Praylock intro modal now tracked via `trackScreen("Praylock – Upsell", …)` plus associated events.

### 3.2 Intention review (`app/(app)/intention-review.tsx`)
- ✅ Screen tracked on first load with aggregate counts.
- ✅ `trackIntentionEvent` helper wraps mood selection, toggles, add-intention CTA, generation lifecycle (requested/completed/failure/queued), and existing prayer navigation.

### 3.3 Prayer display (`app/(app)/prayer-display.tsx`)
- ✅ Screen + interactions instrumented via `trackPrayerEvent`, alongside existing onboarding `logEvent` calls; amen duration captured with elapsed timing.

### 3.4 Plan with calendar (`app/(app)/plan-with-calendar.tsx`)
- ✅ Screen tracked once data visible; filter/date/refresh/streak modal/prayer open/like toggle events wired (with filter taps handled inside content component).

## 4. Intentions Feature

### 4.1 Intentions tab (`app/(app)/(tabs)/intentions/index.tsx`)
- ✅ Screen tracked on first render with aggregate counts (`total_groups`, `active_intentions`, etc.) via `trackScreen("Intentions", …)`.
- ✅ Unified `trackIntentionsEvent` helper emits add/edit/toggle/delete paths, paywall/subscription modal flows, and purchase outcomes with contextual metadata.
- ✅ Subscription modal close/continue flows preserve follow-up navigation while logging `intentions_subscription_modal_*` events.

### 4.2 Add intention flow (`src/features/add-intention/useAddIntention.ts`)
- ✅ Person/self selection emits `intentions_flow_person_selected`; need selection fires `intentions_flow_need_selected` with category metadata.
- ✅ Save path distinguishes edit vs. new (existing vs. new person) and records success/failure outcomes through `intentions_flow_saved` + `intentions_created_success`.

### 4.3 Intentions hero (`src/components/intentions/IntentionsHero.tsx`)
- ✅ On mount logs `intentions_hero_shown` summarizing top people/categories, time pattern, and mood distribution when data available.

## 5. Praylock

### 5.1 Toggle & gating (Home tab)
- Already covered in §3.1.
- If there is a settings screen (`praylockSettings`) log screen and toggle events there.

### 5.2 Reminders / schedules (Locate actual implementation)
- Review `src/lib/praylockBackgroundManager.ts`, `src/stores/praylockStore.ts`.
  - When enabling: `trackEvent("praylock_schedule_attempt", { slots })` before scheduling tasks.
  - On success callback: `..._success` with `{ scheduled_count }`.
  - On failure: `..._failure` with sanitized error.
- When user completes Praylock session (likely via `handleCompleteLockedPrayer`): `trackEvent("praylock_session_completed", { prayer_id, duration_seconds })`.

## 6. Reminders & Notification Settings
- `app/(app)/settings.tsx`: log `settings_reminder_toggle` for morning/evening/sound toggles; include `enabled` and `source: 'settings'`.
- If there’s a custom time picker component, instrument confirm/cancel actions.

## 7. Paywall & Subscription (outside onboarding)

### 7.1 Shared components
- `src/components/shared/PaymentBottomSheet.tsx`
  - On mount: `trackScreen("Paywall – ${context}", { selected_plan })` via prop injection (pass `context` from caller).
  - On CTA: `trackEvent("payment_sheet_purchase_attempt", { package_id, context })`; log success/failure in promise handlers.
- `src/components/shared/SubscriptionStatusModal.tsx` / `SubscriptionManagementSheet.tsx`
  - `trackEvent("subscription_modal_opened", { context, status })` when `visible` becomes true.
  - On close/dismiss: `..._closed`.

### 7.2 Call sites
- In home/intentions/Praylock gating code, ensure `context` passed so events identify origin.

## 8. Sharing

- `src/components/shared/PrayerShareModal.tsx`: for each action, log `prayer_share_export` with `{ platform }`; log cancellation/close.
- `src/components/shared/PrayerShareCarousel.tsx`: log `prayer_share_carousel_export` with template info.
- Ensure onboarding share screen already covered (§2.3).

## 9. QA & Verification Checklist

1. Run `npm run lint` to ensure new imports satisfy project style.
2. Use development build (`npx expo start --dev-client`) and walk through:
   - Full onboarding (including paywall, reminders, first prayer, share).
   - Daily prayer flow (Begin → Review → Generate → Display → Amen → Share).
   - Intentions add/edit/complete.
   - Praylock enable/disable and completion.
   - Paywall access from different contexts.
3. Validate events arriving in PostHog (use Live Events & `$recent` debug).
4. Confirm no PII captured (names/emails masked).
5. Document event naming & property conventions in internal doc (optional follow-up).

## 10. Estimated Timeline
- Implementation: ~1 developer day (screen + event wiring, helper creation, Praylock coverage).
- QA & verification: ~0.5 day (manual flows + PostHog validation).
- Buffer for revisions: 0.25 day.
