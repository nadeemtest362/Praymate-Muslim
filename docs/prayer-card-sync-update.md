## Prayer Card Period Refresh Update

### Summary
- `useHomeData` now keeps `currentPeriod`, `currentWindowAvailable`, and a day-boundary token in state.
- After every `initClock`/`resyncClock` (and when the app foregrounds) the hook immediately recomputes those values and invalidates/refetches the "today" prayer query.
- `PrayerCard` accepts the derived period/window as optional props; it falls back to its local minute listener only when the parent does not provide them.
- `HomeScreen` passes the live values from `useHomeData` to `PrayerCard`, so the card flips to the correct prayer the moment the server anchor updates (e.g., right at 4 AM/4 PM).

### Why the Change Was Needed
- The card previously read `getCurrentPeriod()` once during mount and then relied on the minute ticker to update. If the user opened the app right after 4 PM, the UI stayed on the “Morning” variant until the next 60‑second tick.
- Completing a prayer triggered a refetch/resync, but the card’s internal state didn’t refresh immediately, so it still showed “Start New Prayer” even though an evening prayer existed.

### Implementation Details
1. `useHomeData`
   - Tracks a `currentDayKey` derived from `getPrayerDayStart()` alongside `currentPeriodState`/`currentWindowAvailableState`.
   - Immediately after `initClock`/`resyncClock`, minute ticks, or AppState foregrounds, it updates those values, invalidates `prayersToday`/`prayerState`, and removes the previous day's cached snapshot.
   - The minute tick now also detects day-boundary flips (4 AM) even when the period label stays "morning" and triggers the same refresh sequence.
2. `useTodaysPrayers` / cache keys
   - The "today" query key now includes the day-boundary token so hydration can’t reuse a previous day’s data.
   - Mutations (`useCompletePrayer`, `useTogglePrayerLike`) compute the same day key before calling `setQueryData`, keeping optimistic updates aligned.
3. `PrayerCard`
   - Accepts `currentPeriod` and `currentWindowAvailable` props.
   - Maintains local state as a fallback when props are undefined, preserving compatibility for other call sites (e.g., plan/contact screens).
4. `HomeScreen`
   - Passes the derived `currentPeriod`/`currentWindowAvailable` into `<PrayerCard />`.

### Outcomes
- Prayer card UI flips instantly at boundary transitions (e.g., 4 AM/4 PM push) without waiting a minute.
- After completing a prayer and returning home, the card now shows “View My Prayer” with the new content immediately.
- Other consumers of `PrayerCard` continue to work thanks to the optional prop contract.
- React Query no longer hydrates "yesterday’s today" snapshot after a cold start; the day-specific key forces a fresh fetch.
