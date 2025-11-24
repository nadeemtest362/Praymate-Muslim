## Generate-Prayer Resilience Plan

### Goal
Increase reliability of prayer generation by handling transient failures automatically, avoiding user-visible errors, and providing redundancy when the primary edge function fails.

### Current Behavior Recap
- Mobile clients (onboarding and intention review) call `supabase.functions.invoke('generate-prayer', …)` once and immediately surface errors via `Alert`.
- No retry/backoff logic; failures require manual retry by the user.
- There is no offline queue for generation (only for completions).
- Edge function forwards to NestJS service at `NESTJS_PRAYER_SERVICE_URL` with no fallback.

### Proposed Enhancements

#### 1. Client-Side Resilience Layer
1. Build a shared hook/util (e.g., `useGeneratePrayer` or `invokeGeneratePrayerWithRetry`) wrapping `supabase.functions.invoke`.
2. Implement exponential backoff with jitter (initial ~1s, doubling up to N attempts) for network/5xx/429 errors.
3. Detect retryable conditions (network errors, 5xx, rate limits); exit early for validation/user errors (4xx with explicit messages).
4. Surface progress UI: disable button, show inline spinner; only alert on final failure after all retries.
5. Record telemetry (e.g., `secureLogger` or new analytics event) for each attempt, failure, fallback usage.

#### 2. Background Recovery Queue
1. Reuse secure queue pattern: create `PrayerGenerationQueue` similar to `PrayerCompletionQueue`.
2. On repeated failure (after backoff), enqueue payload with metadata (slot, timestamp, attempt count).
3. Queue runner: triggered on app resume/network reconnect; processes items with backoff and max retry window (e.g., 1 hour).
4. UI should poll queue state to offer “generated prayer is on the way” messaging or allow manual cancel.

#### 3. Redundant Backend Endpoint
1. Extend edge function config to accept primary + secondary URLs via env (e.g., `NESTJS_PRAYER_SERVICE_URL_PRIMARY`, `…_SECONDARY`).
2. Edge function tries primary; on non-4xx failure or timeout, automatically retries against secondary with its own short backoff.
3. Propagate metadata in response to indicate which backend served the request.
4. Infrastructure: provision alternate deployment (different region or Supabase function) and ensure parity.

#### 4. Monitoring & Alerting
1. Add structured logs (attempt count, error codes, fallback usage) from both client retry layer and edge function.
2. Hook into existing monitoring (Sentry/Logflare) to alert on sustained failures or fallback engagement spikes.

### Work Breakdown
- **Client Resilience Utility**: create wrapper, update onboarding + intention review flows to use it.
- **Queue Implementation**: secure storage schema, migration, queue processor, UI integration.
- **Edge Function Updates**: add fallback URL logic, request retry wrapper, structured logging.
- **Config/Env**: update Supabase env templates and deployment scripts with new variables.
- **Testing Plan**: unit tests for retry utility, integration tests mocking network failures, manual mobile runbook simulating offline/timeout scenarios.

### Risks / Mitigations
- **Double Submissions**: ensure backend idempotency (existing prayer ID dedupe) to handle retries.
- **Queue Growth**: cap retry window; expose status for manual clearing.
- **Fallback Drift**: keep primary/secondary endpoints in sync via shared deployment pipeline.
