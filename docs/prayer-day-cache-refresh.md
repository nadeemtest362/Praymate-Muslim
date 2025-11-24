## Prayer Day Cache Refresh

### Goal
Ensure the home screen always shows the current period’s prayer immediately after a 4 AM/4 PM boundary or when the app returns from background, eliminating stale “yesterday” data.

### Key Changes
1. **`useHomeData` updates**
   - Tracks `currentDayKey` (ISO string from `getPrayerDayStart`) alongside `currentPeriodState`/`currentWindowAvailableState`.
   - After every `initClock`/`resyncClock`, minute tick, or AppState foreground, it recomputes those values, removes the previous day’s cached snapshot, and invalidates `prayersToday`/`prayerState` for an immediate refetch.
   - Minute ticker now detects day-boundary flips even when the period label stays “morning,” guaranteeing a refresh at 4 AM.

2. **Query key tightening**
   - `queryKeys.prayersToday` includes the day-boundary token (with and without day key variants) so persisted caches never reuse a different day’s data.
   - `useTodaysPrayers`, `useCompletePrayer`, and `useTogglePrayerLike` compute the same day key before reading/writing cache entries, keeping optimistic updates aligned with the active prayer day.

3. **AppState awareness**
   - When the app foregrounds, `useHomeData` immediately re-evaluates the clock snapshot and triggers the same invalidation flow, covering cold starts and wake-from-lock scenarios.

### Result
- Opening the app at 4 AM/4 PM (cold start or from background) now triggers an instant refresh, so `PrayerCard` renders the correct morning/evening prayer without manual pull-to-refresh.
- Persisted caches never leak yesterday’s “today” snapshot thanks to the day-keyed query entries.
- Existing consumers of `PrayerCard` remain compatible because the component still falls back to its local ticker when props are omitted.
