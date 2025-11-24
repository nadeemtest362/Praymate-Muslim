# Onboarding Flow Consistency Fix Plan

## Goal
- Eliminate regressions where adding a person during onboarding rewinds the flow to step 0 by ensuring progress is never persisted without a flow id.
- Guarantee the invariant: “No progress without a flow.”

## Root Cause (for reference)
- Current sequence persists `currentStepIndex` before `currentFlowId`, creating a brief state where `stepIndex > 0` and `flowId` is null. Unrelated saves (like adding a person) serialize that partial snapshot, and the integrity guard resets progress to 0 on next load.
- Integrity guard that triggers reset: [`atomic-data-store.ts`](../../src/features/onboarding/services/onboarding/atomic-data-store.ts#L188-L193).
- Problematic ordering during bootstrap and restoration: [`OnboardingFlowContext.tsx`](../../src/contexts/OnboardingFlowContext.tsx#L329-L338). Step index is persisted before the flow id.
- Setters persist immediately: [`setCurrentStepIndex`](../../src/stores/onboardingStore.ts#L467-L473), [`setCurrentFlowId`](../../src/stores/onboardingStore.ts#L459-L466).

## Approach (minimal, robust, no new deps)
1) Atomic bootstrap write (primary fix)
- After fetching the flow (and deciding the restore index), persist `currentFlowId` and `currentStepIndex` together in one atomic transform, so a partial snapshot can never exist.
- Perform event logging only after the atomic write so logs always include a valid `flow_id`.

2) Narrow setter guard (belt-and-suspenders)
- In the onboarding store’s `setCurrentStepIndex`, no-op (or log and return) if `currentFlowId` is falsy. This prevents future regressions from reintroducing the partial-state write.
- Do not globally gate all `saveStateAtomically()`; only guard step-index persistence. Early legitimate writes (e.g., adding a person) should continue working.

3) Keep the read-time integrity guard
- Leave the existing integrity check in place as a last resort; it should no longer trigger under normal flows post-fix.

## Detailed Steps

### 1. Add an atomic setter for flow + step
- Add a new store method (name suggestion: `setFlowAndStep(flowId: string, stepIndex: number)`) that:
  - Updates both `currentFlowId` and `currentStepIndex` in memory.
  - Performs a single `saveStateAtomically()` (or directly uses `AtomicDataStore.updateData`) to persist both values together.
- Coding style: mirror current store patterns in [`onboardingStore.ts`](../../src/stores/onboardingStore.ts).

### 2. Use the atomic setter during flow bootstrap
- In `fetchAndSetFlow` inside [`OnboardingFlowContext.tsx`](../../src/contexts/OnboardingFlowContext.tsx):
  - Compute `targetIndex` (restored saved index if same flow, else 0).
  - Replace any immediate calls to `setCurrentStepIndex(...)` and subsequent `setCurrentFlowId(...)` with a single call to `setFlowAndStep(flow.flow_id, targetIndex)`.
  - After the atomic write returns, `setCurrentStepIndex(targetIndex)` for the component’s local state and then log the step view events.

### 3. Guard `setCurrentStepIndex`
- In [`onboardingStore.ts`](../../src/stores/onboardingStore.ts#L467-L473):
  - If `get().currentFlowId` is falsy when `index > 0`, log a warning and return without persisting. This ensures no accidental progress write without a flow id.

### 4. Telemetry and diagnostics
- Keep the integrity guard log in [`atomic-data-store.ts`](../../src/features/onboarding/services/onboarding/atomic-data-store.ts#L188-L193).
- Add a telemetry counter (via existing logging) when the step write guard prevents a write (to validate it’s catching regressions without impacting users).

## Acceptance Criteria
- Starting or resuming onboarding persists a snapshot where `currentFlowId` and `currentStepIndex` are either both present or both defaulted; never `step > 0` with missing `flow_id`.
- Adding a person during onboarding no longer causes progress reset to step 0.
- No onboarding screen-view events logged with `unknown_flow` at bootstrap.
- Integrity guard warnings for “step > 0 but no flow id” drop to zero after deployment.

## Test Scenarios
- Fresh user path:
  - Start onboarding; immediately add a person; remain on the current step.
  - Kill and relaunch app; resume at the same step.
- Resume same-flow path:
  - Save at step N; relaunch; fetches same `flow_id`; restore to step N.
- Resume new-flow path:
  - Save at step N under `flow_id=A`; relaunch with `flow_id=B`; reset to step 0 and log `flow_started_new_version`.
- Crash window safety:
  - If crash occurs after `flow_id` set but before step persistence, relaunch starts at step 0 with a valid `flow_id` (safe default); no regressions.

## Rollout Plan
- Implement atomic setter and bootstrap change behind the existing codepaths (no feature flags needed).
- Verify locally with the above scenarios.
- Monitor logs for integrity guard warnings and any `unknown_flow` events post-deploy.

## Notes
- No new dependencies.
- Small, localized changes to provider/store only; no architecture churn.
- The integrity guard remains as a safety net but should not trigger after this fix.
