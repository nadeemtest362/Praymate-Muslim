# PostHog Onboarding Instrumentation Plan

## Status Overview

- [x] Analytics helper expanded (`src/lib/analytics.ts`) with onboarding-aware property builders and context caching.
- [x] Onboarding context updated to route Supabase logging through the helper, expose `logEvent`/`logScreen`, and publish flow metadata.
- [x] SDUI host layout wired to call `logScreen` for step transitions.
- [x] Initial screen-level instrumentation migrated (welcome, moods, general question, faith tradition) to the context helper.
- [x] Remaining onboarding screens (reminders, paywall variations, final completion checks) instrumented with onboarding analytics helpers.
- [x] RevenueCat/paywall events and CTA outcomes wired into onboarding analytics.
- [x] SDUI configuration audit completed; end-to-end validation outstanding.

## 1. Analytics Helper Enhancements ✅
- Build a dedicated helper module that wraps the PostHog client (screen/event tracking, property merging, timing utilities).
- Guard against duplicate initialization and respect the repo’s safe array method constraints.
- Add onboarding-specific helpers (`setAnalyticsContext`, `trackOnboardingEvent`, `trackOnboardingScreen`).

## 2. Onboarding Context Wiring ✅
- Extend `OnboardingFlowContext` so every `logEvent` call also routes through the helper.
- Enrich events with flow/step metadata and expose consistent APIs for SDUI screens while keeping Supabase logging intact.
- Surface `logScreen` for host/layout usage and broadcast analytics context values (user, flow, step index).

## 3. SDUI Host Layout Integration ✅
- Update `app/(onboarding)/_layout.tsx` to track screen transitions via the context and forward enriched payloads to the helper.
- Ensure SDUI props propagate flow/step information to child screens.

## 4. Screen-Level Instrumentation 🚧
- Instrument each onboarding screen (welcome, general question, moods, prayer people, intentions, faith tradition, prayer generation/loading, paywalls, reminders, sharing, completion).
  - [x] Welcome, general question, moods, faith tradition, prayer people, intentions, prayer generation/loading, paywalls (first & value/benefits), sharing, streak goal, commitment question, prayer needs, first prayer display.
  - [x] Reminder scheduling confirmation and post-onboarding completion wrap-ups (final navigation to home, schedule follow-ups).
- Fire analytics events for all key interactions (option select, add/remove person, save intention, prayer generation states, reminder permissions, share actions) with contextual properties (flow_id, step_id, step_order, counts, RevenueCat identifiers, permission status, etc.).

## 5. RevenueCat / Paywall Coordination ✅
- Log paywall screen views from SDUI config and ensure CTA, restore, alternative plans, and purchase outcomes emit distinct events.
- Maintain existing Expo Go bypass behavior while still capturing analytics.

## 6. SDUI Configuration Validation ✅
- Normalized onboarding step tracking to prefer SDUI-provided event names, with snake-case fallbacks for unnamed steps.
- Centralized host-layout `logScreen` calls so PostHog captures consistent flow/step metadata and avoids duplicate screen events.

## 7. End-to-End Verification ☐
- Walk the full onboarding flow in a development build to confirm PostHog receives events with correct payloads and Supabase logging remains unchanged.
- Run lint/tests to ensure stability after the instrumentation changes.
