# Streak System Reliability Plan (Updated with Oracle Review)

## Principles (non‑negotiable)

- Database is the single source of truth for streaks, completions, time windows, and date boundaries.
- Timezone correctness: always use `profiles.timezone` (default `America/New_York`). No UTC shortcuts for user logic.
- Day boundary is 4:00 local time → 4:00 next day. Windows: Morning 4:00–16:00, Evening 16:00–4:00.
- Smallest safe diffs; no schema changes for this pass; add optional improvements behind follow‑ups.

## Current state (summary)

- Tables: `prayers`, `user_stats`, `profiles`, `praylock_settings`, `daily_challenge_progress`.
- Trigger: `update_prayer_streak_trigger` calls `public.update_prayer_streak()` on `completed_at` change.
- Auto-completion: `public.auto_complete_engaged_prayers()` (cron 04:05/16:05 UTC) uses `public.current_window_start()` (UTC based).
- Edge function: `complete-prayer` calls `complete_prayer_with_coalesce` → DB trigger updates stats.
- Client:
  - Streak UI reads `user_stats.current_streak` via React Query.
  - Weekly calendar perfect-day currently derives from generation (not completion).
  - RPC `get_current_prayer_state` still in test-mode windows and shape mismatch.

## Problems identified

1. Trigger resets streak on first (non‑perfect) completion, breaking continuity.
2. Auto-complete uses UTC window; needs per-user local windows.
3. RPC `get_current_prayer_state` has test windows and shape mismatch with the client.
4. Weekly calendar visually shows perfect days without requiring completion.

## Shared helper (DST‑safe parity across DB)

Introduce a single SQL helper used by all DB logic to guarantee identical “day” semantics everywhere.

- `public.adjusted_day(ts timestamptz, tz text) returns date`
  - Implementation pattern: `(ts AT TIME ZONE tz) - INTERVAL '4 hours'` → `date_trunc('day', ..)::date`
  - Rationale: robust through DST transitions, shared by trigger, RPC, auto‑complete, analytics.

## Changes (scoped, DB‑first)

### 1) Fix streak trigger (only change streak on perfect-day)

- Guard for idempotency: early return unless `NEW.completed_at IS DISTINCT FROM OLD.completed_at`.
- Lock stats row to avoid races: `SELECT * FROM public.user_stats WHERE user_id = _user_id FOR UPDATE`.
- Use `adjusted_day(NEW.completed_at, profile_tz)` and derive the adjusted day for each related check.
- Perfect‑day branch (both morning & evening completed for adjusted day):
  - Determine continuity:
    - Compute yesterday’s adjusted day.
    - If prior perfect day was yesterday → `current_streak = current_streak + 1`, else `current_streak = 1`.
    - Update `streak_start_date` only when resetting to 1.
  - Always set `last_prayer_date = NEW.completed_at`; update `longest_streak` if exceeded.
  - Increment counters (`total`, `week`, `month`).
- Non‑perfect branch (first completion in day):
  - Increment counters only.
  - Keep `current_streak` and `streak_start_date` unchanged.
  - Set `last_prayer_date = NEW.completed_at` (do NOT null it).
- Notes:
  - Do not read back prayers by `completed_at` equality; use `adjusted_day(generated_at, tz)` filters as in existing code, but with the helper.
  - Optional future improvement (not in this pass): add `last_perfect_day_date date` to simplify continuity math.

### 2) Auto‑completion per user timezone (preserve cron schedule)

- Update `public.auto_complete_engaged_prayers()` to:
  - Join `prayers` → `profiles` to get `tz := COALESCE(profiles.timezone, 'America/New_York')`.
  - Compute the user’s local current window start/end using the same adjusted-day logic (`adjusted_day(now(), tz)` then map to 4:00/16:00 local).
  - `UPDATE prayers SET completed_at = now()` WHERE `engaged = true` AND `completed_at IS NULL` AND `generated_at < user_local_window_start(now, tz)`.
- Keep cron at 04:05/16:05 UTC initially; per-user logic ensures correctness. Consider increasing cadence (e.g., every 30–60 minutes) later for timelier closure.

### 3) Align `get_current_prayer_state` RPC to production rules and client contract

- Replace test windows (2:15/2:35) with production windows (4:00/16:00) using shared helper.
- Response shape must match client expectations:
  - `current_period: 'morning' | 'evening'`
  - `morning_available: boolean`, `evening_available: boolean`, `current_window_available: boolean`
  - `prayers: { morning: <prayer|null>, evening: <prayer|null> }`
  - Optional `debug` block
- Prayer selection for “today” must use `adjusted_day(generated_at, tz) = adjusted_day(now(), tz)` and prefer latest per slot.

### 4) Weekly Calendar visual truth

- Compute status from `completed_at` (and `slot`), not only `generated_at`.
- Keep 4 AM boundary in JS (with a code comment referencing DB’s `adjusted_day`).
- Guard historical data: if some legacy entries lack `completed_at`, fall back to requiring it (i.e., don’t mark perfect unless both completions exist).

### 5) Minor polish/safety

- `complete-prayer` response default streak fallback: use `0` instead of `1` (DB is authoritative; UI reads via React Query).
- Keep `complete_prayer_with_coalesce` unchanged to avoid races with auto-completion.

## Verification & Tests

- SQL/pgTAP: create dedicated tests covering:
  - 4 consecutive perfect days: streak increments 1→2→3→4.
  - Day with only morning complete (no reset); evening later completes and increments streak.
  - Gap day (no perfect) resets next perfect day to 1.
  - DST transitions (spring-forward, fall-back) for at least `America/New_York` and one non‑US TZ.
  - Idempotency: duplicate updates do not double-increment streak.
  - Concurrency: two updates racing on same user_stats row do not corrupt counts (FOR UPDATE).
- Auto-complete:
  - Users in UTC-8 and UTC+5:30; verify morning engaged prayer auto-completes after local 16:00, and evening after local 04:00.
- RPC:
  - Snapshots at 03:00, 05:00, 17:00 local for multiple TZs; verify period flags and prayers object shape.
- UI:
  - Weekly calendar shows full ring only after both completions; still shows partial arcs for single completion if desired (left/right semicircles).

## Rollout and safeguards

- No schema changes for this pass; function body updates only.
- Pre-launch deployment (simplest, fastest): deploy directly to main. Apply function body replacements in a single transaction (BEGIN…COMMIT). Before edits, export current function bodies and commit them under `docs/archive/functions/` for instant reapply.
- Immediate kill switches:
  - Disable streak updates: `ALTER TABLE public.prayers DISABLE TRIGGER update_prayer_streak_trigger;` (ENABLE to restore)
  - No-op auto-complete: `CREATE OR REPLACE FUNCTION public.auto_complete_engaged_prayers() RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN RETURN 0; END; $$;` (restore previous body to resume)
- Recommended order (pre-launch):
  1) RPC to production windows and correct response shape (read-only)
  2) WeeklyCalendar to completed_at with 4 AM boundary (UI-only)
  3) Auto-completion per-user timezone (function body)
  4) Streak trigger fix (idempotency, no reset on non-perfect, row lock)
- Optional (staging first): if you want extra safety, apply on a Supabase dev branch and validate seeded users across timezones first.
- Monitoring:
  - Track `COUNT(*) FILTER (WHERE current_streak > 1)` daily; should rise above 0.
  - Log number of auto-completed prayers per run (NOTICE or table log).
  - Run Supabase Advisors after updates.

## Backout plan

- Restore prior function bodies from backups if regressions occur.
- Revert Weekly Calendar change if needed (visual-only).

## Prioritized checklist (implementation)

HIGH (must) — DB truth & parity
1) Add `public.adjusted_day(ts timestamptz, tz text)` helper and tests (6 TZs incl. DST).
2) Patch `public.update_prayer_streak()`
   - Early return unless `NEW.completed_at IS DISTINCT FROM OLD.completed_at`.
   - `SELECT … FOR UPDATE` on `user_stats` row.
   - Use `adjusted_day()`; only change streak on perfect days; don’t clear it otherwise; set `last_prayer_date = NEW.completed_at`.
3) Patch `public.auto_complete_engaged_prayers()` to per-user TZ with `COALESCE` fallback; use `adjusted_day()`.
4) Rewrite `public.get_current_prayer_state()` to production windows and return `{ prayers: { morning, evening } }` with availability flags; use `adjusted_day()`.

MEDIUM (should)
5) Increase cron cadence (e.g., every 30–60 minutes) for timely auto-completion.
6) Weekly Calendar: switch to `completed_at` + 4 AM boundary, guarded for legacy rows.
7) `complete-prayer` default response streak fallback → `0`.

LOW (nice-to-have)
8) Add `user_stats.last_perfect_day_date date` in a future migration to simplify continuity math.
9) Optional materialized view `perfect_days(user_id, date)` for analytics.

— End of plan —
