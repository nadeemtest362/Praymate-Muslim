# AGENT.md – Praymate Engineering Guide

**RULE #1:**  DO NOT MAKE ASSUMPTIONS. READ ALL RELATED CODE TO UNDERSTAND THE USER'S ACTUAL QUESTION, MEANING, AND IMPLICATIONS FIRST BEFORE REPLYING. No assumptions, no shortcuts.

Before answering any question about code, tables, or systems: use Read/Grep/execute_sql to verify facts first. Zero assumptions.

If you do not know something, stop and investigate. Ask questions or use tools/references rather than bluffing.

## Build / Test Commands

- `npm start` – Expo development server (hot reload on port 8082)
- `npm run ios` – iOS app build/run (primary target; **no Android builds**)
- `npm run test:prayer` – Prayer generation tests (dev)
- `npm run test:prayer:staging` – Prayer generation tests (staging)
- `npm run test:prayer:prod` – Prayer generation tests (production)
- `npm run test:prayer-slides` – Prayer slides integration test
- `npm run prebuild` – Clean native prebuild
- `npm run build:ios` / `npm run build:ios:preview` – EAS builds
- `npm run lint`, `npm run lint:auth` – ESLint checks
- `npx expo run:ios --configuration Release` – Local release validation (mandatory before TestFlight)

## Architecture Snapshot (Q4 2025)

- **App Shell:** Expo 53 + React Native 0.79.x + React 19 with file-based routing under `/app` (ship target: **iOS only**)
- **State Model:** React Query for all server data, repositories for data access (`/src/repositories`), Zustand only for UI/ephemeral state (`/src/stores`)
- **Backend:** Supabase (auth, Postgres, functions) + Railway-hosted prayer service
- **AI:** OpenAI Responses API (stateful prayers with `previous_response_id` chain)
- **Analytics:** PostHog client in `src/lib/posthog.ts` and helpers in `src/lib/analytics.ts`
- **Subscriptions:** RevenueCat wrapper (`src/lib/revenueCatService.ts`) + UI hooks in home/praywall screens
- **Shared Utilities:** `src/lib/queryClient.ts` configures React Query persistence/offline-first, `src/utils/safeArrayMethods.ts` wraps array operations for production safety

### React Query + Repository Pattern
- Hooks such as `useHomeData`, `useTodaysPrayers`, `usePeople`, `useIntentions`, and `usePraylock` orchestrate data fetching, caching, invalidation, and optimistic updates
- Repositories (`authRepository.ts`, `prayersRepository.ts`, `peopleRepository.ts`, etc.) encapsulate Supabase queries/RPCs
- Query keys live in `src/lib/queryClient.ts`; respect cacheConfig rules (many queries use `userControlled` = infinite stale/gc)
- Offline persistence lives in the AsyncStorage persister; reset via `resetReactQuery()` on sign-out

### Zustand Usage (UI Only)
- `src/stores/praylockStore.ts` – device authorization state, completion flags
- `src/stores/onboardingStore.ts` – SDUI flow scratchpad (mood, intentions, streak goals)
- Do **not** add long-lived server data to Zustand; keep it in React Query

## Critical Production Rules

- **Analytics failures must be invisible:** All analytics calls (PostHog, edge functions, etc.) must use try-catch or .catch() to silently handle errors. Analytics failures must NEVER surface to users, show error screens, or block app flow. All analytics functions in `src/lib/analytics.ts` implement defensive error handling—maintain this pattern everywhere.
- **Array methods:** Never rely on `filter(Boolean)`, `includes`, `find`, `some`, `findIndex`, `slice`, or `Array.from(new Set())` directly—use helpers from `src/utils/safeArrayMethods.ts` or explicit loops
- **Promise.allSettled:** Use `safeAllSettled` instead
- **Timezone:** Every prayer window or day-boundary calculation must use the user’s timezone (see `src/lib/time/Clock.ts`); database functions already enforce this—do not regress
- **Network safety:** Treat Supabase/network errors as first-class; most hooks already detect silent network failures and fall back to cache
- **Release validation:** Always run `npx expo run:ios --configuration Release` before shipping; staging QA relies on it

## SDUI Onboarding System

- Host layout lives at `app/(onboarding)/_layout.tsx` with >25 screen types defined under `src/features/onboarding/screens`
- Flow configuration served from Supabase tables (`onboarding_flows`, `onboarding_flow_steps`); override locally via `DEV_OVERRIDE_SCREEN_TYPE`
- Prayer generation queue integrates with `invokeGeneratePrayerWithRetry` and `prayerGenerationQueue.ts` for retries/resume
- Always maintain analytics wiring when adding screens (`trackOnboardingEvent`, `trackOnboardingScreen`)

## Prayer Generation Pipeline

- Stateful chain using OpenAI Responses API: first call sends full snapshot, follow-ups reference `previous_response_id`
- Edge functions (`supabase/functions/generate-prayer`, `complete-prayer`) feed into the NestJS service and back to app
- Home screen uses `useHomeData` to combine prayer state RPC, React Query hooks, and local clock synchronization to determine availability/completion
- Completion triggers React Query invalidations (`useCompletePrayer` handles caches + stats + PRAYLOCK)

## PRAYLOCK (Family Controls)

- Device Activity integration via `src/features/praylock/hooks/usePraylockSimple.ts`
- Authorization flow must call `requestAuthorization` + `pollAuthorizationStatus`; never assume approval
- Background enforcement handled by `src/lib/praylockBackgroundManager.ts`, `src/lib/deviceActivity.ts`, and iOS extensions under `/targets`
- Database table `praylock_settings` stores schedule and completion flags—keep mutations in sync with background tasks

## Code Style & Conventions

- Match surrounding style; imports sorted third-party first then relative
- TypeScript strictness is enforced; define interfaces/types—no `any` without justification
- Respect snake_case fields from database (no camel case remapping)
- UI components live under `src/components` or feature folders; keep them functional with memoization where needed
- Use `StyleSheet.create` or existing design-system primitives; avoid inline styles unless dynamic
- Handle errors gracefully: prefer user-friendly messages via utilities (`getUserFriendlyMessage`, toasts)

## Engineering Mindset

1. Understand the actual problem before coding
2. Match solution complexity to the issue—no band-aids, no over-engineering
3. Check for existing utilities/hooks before writing new ones
4. Maintain brutal honesty—call out incorrect assumptions or risky changes immediately
5. Keep analytics, subscriptions, and background behaviours intact when refactoring

## Reference Map

- Routing: `/app/**`
- Hooks: `/src/hooks`, `/src/features/**/hooks`
- Stores: `/src/stores`
- Repositories: `/src/repositories`
- Lib utilities: `/src/lib`
- Supabase: `/supabase/functions`, `/supabase/migrations`
- Services: `/services/prayer-api-service`, `/services/command-center-app`

Keep this document in sync with `CLAUDE.md`; every agent should read identical guidance before acting.
