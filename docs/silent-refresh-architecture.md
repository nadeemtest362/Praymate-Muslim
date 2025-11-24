## Silent Refresh Hardening

### Objective
Stop background prayer refreshes and subscription polls from spamming logs/toasts during transient network drops while still keeping PrayerCard and premium gating in sync when real day/period changes occur.

### Key Changes
1. **Silent fetch fallbacks**
   - `useTodaysPrayers` and `getCurrentPrayerState` queries now mark auto refetches as `meta.silent`; on `Network request failed` they reuse cached data instead of throwing, keeping React Query satisfied without triggering UI errors.
2. **Home data throttling**
   - `triggerPrayerRefresh` ignores auto calls unless 10 min have elapsed (time-zone changes still force refresh) and day/period flips are debounced (15 s for period, 2 s at 4 AM/PM) to avoid minute-by-minute Supabase churn.
   - Clock resync/AppState handlers only invalidate when the boundary actually changes and reuse the throttle for non-forced refreshes.
3. **Background manager cooldown**
   - `backgroundRefreshManager` tracks the last refresh timestamp, enforcing a 10 min cooldown and selectively refetching active queries; PRAYLOCK checks only run when the period truly switches.
4. **Subscription polling guard**
   - Home screen subscription check now remembers the last run and skips repeats within 10 min unless forced by retries; “unknown” results back off exponentially but stay silent otherwise.

### Result
- Opening the app across prayer boundaries refreshes data once, silently retrying if offline, while transient disconnects or idle screens no longer emit toast storms or rapid Supabase traffic.
- Subscription status stays current without hammering RevenueCat, eliminating the infinite log loop seen in dev.
