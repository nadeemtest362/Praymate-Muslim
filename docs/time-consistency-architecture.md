## Time Consistency Architecture & Migration Plan

### Executive summary
- **Goal**: Unify client/server time handling to eliminate UI staleness and mismatches when device time changes, while preserving server-side security for completion, streaks, and challenges.
- **Core solution**: Introduce an app-wide AuthoritativeClock anchored to server time, unify day/period boundaries (recommend 4:00), and compute UI state locally; server remains the source of truth for write-path validation.
- **Impact**: UI becomes responsive and robust to device time manipulation; background reliability kept; server continues enforcing integrity.

---

### Current issues (with references)

- Inconsistent boundary definitions (4:06 client vs 4:00 server)

```794:806:src/stores/praylockStore.ts
// Morning window: 4:06 AM-11:59AM, Evening window: 4:06 PM-11:59 PM
const inMorningWindow =
  (currentHour > 4 || (currentHour === 4 && currentMinute >= 6)) && currentHour <= 11;
const inEveningWindow =
  (currentHour > 16 || (currentHour === 16 && currentMinute >= 6)) && currentHour <= 23;
const isInWindow = inMorningWindow || inEveningWindow;
```

```294:300:src/lib/praylockBackgroundManager.ts
// Morning window: 4:06 AM-11:59AM, Evening window: 4:06 PM-11:59 PM
const inMorningWindow =
  (currentHour > 4 || (currentHour === 4 && currentMinute >= 6)) && currentHour <= 11;
const inEveningWindow =
  (currentHour > 16 || (currentHour === 16 && currentMinute >= 6)) && currentHour <= 23;
return inMorningWindow || inEveningWindow;
```

```39:59:supabase/migrations/20250127_fix_prayer_state_boundaries.sql
-- Calculate today's boundaries (4am to 4am) properly using timezone conversion
IF current_hour < 4 THEN
    -- Before 4am, we're still in yesterday's prayer day
    ...
ELSE
    -- After 4am, normal day
    ...
END IF;
-- Determine current period (simple: 4am-4pm = morning, 4pm-4am = evening)
IF current_hour >= 4 AND current_hour < 16 THEN
    current_period := 'morning';
    ...
ELSE
    current_period := 'evening';
    ...
END IF;
```

- UI depends on server period/availability → stale when device time changes & caches delay refresh

```308:324:src/components/home/PrayerCard.tsx
// Simplified logic - server decides what to show
const showMorningPrayer = currentPeriod === "morning";
// ...
// Use server-provided availability
const isAvailable = currentWindowAvailable;
```

```244:247:src/stores/homeStore.ts
const currentPeriod = prayerState?.current_period || get()._getCurrentPeriod();
const morningAvailable = prayerState?.morning_available || false;
const eveningAvailable = prayerState?.evening_available || false;
const currentWindowAvailable = prayerState?.current_window_available || false;
```

```31:56:src/utils/prayerNavigation.ts
const currentPrayer = currentPeriod === 'morning' ? morningPrayer : eveningPrayer;
// Route depends on server-provided currentPeriod
if (currentPrayer) {
  router.push({ pathname: '/prayer-display', params: { ... } });
} else {
  router.push(`/intention-review?time=${currentPeriod}`);
}
```

```45:56:src/hooks/useHomeData.ts
staleTime: 1000 * 60 * 2,
gcTime: 1000 * 60 * 5,
refetchInterval: 1000 * 60 * 5,
```

- Server correctly uses profile timezone and 4:00 boundary for challenge logic

```60:79:supabase/functions/complete-prayer/index.ts
const startDate = userProfile.onboarding_completed_at || userProfile.created_at;
const userTimezone = userProfile.timezone || 'America/New_York';
// Get current time in user's timezone
const now = new Date();
const userCurrentTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
const currentHour = userCurrentTime.getHours();
// Calculate "today" with 4 AM boundary
let adjustedToday: Date;
if (currentHour < 4) {
  adjustedToday = new Date(userCurrentTime);
  adjustedToday.setDate(adjustedToday.getDate() - 1);
} else {
  adjustedToday = new Date(userCurrentTime);
}
```

---

### Target architecture

- **AuthoritativeClock (client)**
  - Anchor to server time: `serverNowEpochMs` captured alongside `perfAtSync = performance.now()`.
  - Provide `now()` as `serverNowEpochMs + (performance.now() - perfAtSync)`, which is stable even if user edits device time.
  - Use `profiles.timezone` as the canonical timezone for all UI computations.
  - Expose helpers: `nowInTz(tz)`, `getCurrentPeriod(tz)`, `isInPrayerWindow(tz)`, `getPrayerDayStartMs(tz)`, `onMinuteTick(cb)`, `resync(serverNowEpochMs, tz?)`.

- **Unified boundaries**
  - Adopt a single canonical boundary across client and server: **4:00** (recommended). Keep any “:06” reliability padding only within background scheduling, not in logical checks.

- **Responsibility split**
  - UI state (period/window/greetings) computed locally via AuthoritativeClock → immediate updates, unaffected by device manual time changes.
  - Server remains authoritative for security-sensitive paths (prayer completion, streak, challenge); server validates regardless of client clock.

- **Synchronization**
  - RPC returns `server_now_epoch_ms` (and optionally `user_timezone`) to anchor the clock.
  - Resync on app start, resume, network regain, and periodically (10–15 minutes) or when drift > 2s is detected.

---

### Proposed implementation (client)

Create `src/lib/time/Clock.ts`:

```typescript
// src/lib/time/Clock.ts
// Central, server-anchored clock for consistent UI time computations

type Period = 'morning' | 'evening';

let serverNowEpochMs = Date.now();
let perfAtSync = (typeof performance !== 'undefined' ? performance.now() : 0);
let canonicalTimezone: string | null = null;
let minuteInterval: any = null;
let minuteListeners = new Set<() => void>();

export function initClock(anchor: { serverNowEpochMs: number; timezone?: string }) {
  serverNowEpochMs = anchor.serverNowEpochMs;
  perfAtSync = performance.now();
  if (anchor.timezone) canonicalTimezone = anchor.timezone;
  ensureMinuteTicker();
}

export function resyncClock(anchor: { serverNowEpochMs: number; timezone?: string }) {
  serverNowEpochMs = anchor.serverNowEpochMs;
  perfAtSync = performance.now();
  if (anchor.timezone) canonicalTimezone = anchor.timezone;
}

export function setCanonicalTimezone(tz: string) {
  canonicalTimezone = tz;
}

export function now(): number {
  return serverNowEpochMs + (performance.now() - perfAtSync);
}

export function nowInTz(tz?: string): Date {
  const ms = now();
  const d = new Date(ms);
  const timeZone = tz || canonicalTimezone || 'UTC';
  // Represent as Date in the requested tz by formatting and reparsing
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(d);
  // yyyy-mm-dd, hh:mm:ss → construct a Date in local then return (used only for fields)
  const [datePart, timePart] = iso.split(', ');
  const [yyyy, mm, dd] = datePart.split('-').map(Number);
  const [HH, MM, SS] = timePart.split(':').map(Number);
  const proxy = new Date(0);
  proxy.setFullYear(yyyy, mm - 1, dd);
  proxy.setHours(HH, MM, SS, 0);
  return proxy;
}

export function getCurrentPeriod(tz?: string): Period {
  const d = nowInTz(tz);
  const h = d.getHours();
  return h >= 4 && h < 16 ? 'morning' : 'evening';
}

export function isInPrayerWindow(tz?: string): boolean {
  const d = nowInTz(tz);
  const h = d.getHours();
  const m = d.getMinutes();
  // Logical window is 4:00–11:59 and 16:00–23:59
  const morning = (h > 4 || (h === 4 && m >= 0)) && h <= 11;
  const evening = (h > 16 || (h === 16 && m >= 0)) && h <= 23;
  return morning || evening;
}

export function getPrayerDayStartMs(tz?: string): number {
  const d = nowInTz(tz);
  const h = d.getHours();
  const dayStart = new Date(d);
  // Day boundary 4:00
  if (h < 4) {
    dayStart.setDate(dayStart.getDate() - 1);
  }
  dayStart.setHours(4, 0, 0, 0);
  return dayStart.getTime();
}

export function onMinuteTick(listener: () => void) {
  minuteListeners.add(listener);
  ensureMinuteTicker();
  return () => minuteListeners.delete(listener);
}

function ensureMinuteTicker() {
  if (minuteInterval) return;
  minuteInterval = setInterval(() => {
    minuteListeners.forEach((l) => l());
  }, 60_000);
}
```

Wire it into consumers:

```typescript
// src/components/home/HomeHeader.tsx (conceptual)
const { profile } = useAuthStore();
useEffect(() => {
  const unsub = onMinuteTick(() => setCurrentTime(nowInTz(profile?.timezone)));
  return unsub;
}, [profile?.timezone]);
```

```typescript
// src/components/home/PrayerCard.tsx (conceptual)
const tz = profile?.timezone;
const currentPeriod = getCurrentPeriod(tz);
const currentWindowAvailable = isInPrayerWindow(tz);
// Use currentPeriod/currentWindowAvailable for rendering instead of RPC hints
```

```typescript
// src/utils/prayerNavigation.ts (conceptual)
const tz = profile?.timezone;
const currentPeriod = getCurrentPeriod(tz);
// Navigate using computed period
```

```typescript
// src/stores/praylockStore.ts (replace local Date math)
_isCurrentlyInPrayerWindow: () => isInPrayerWindow(profile?.timezone)
```

```typescript
// src/lib/praylockBackgroundManager.ts (replace local Date math)
private isInPrayerWindow(): boolean {
  const { profile } = getAuthSnapshot();
  return isInPrayerWindow(profile?.timezone);
}
```

React Query adjustments in `src/hooks/useHomeData.ts`:
- Remove large `refetchInterval` for time-sensitive state.
- On minute tick, detect only boundary transitions (crossing 4:00 or 16:00) and invalidate `prayerState` query; otherwise keep cached prayers.

```typescript
// Pseudo: boundary-driven invalidation
const prevRef = useRef(getCurrentPeriod(profile?.timezone));
useEffect(() => onMinuteTick(() => {
  const next = getCurrentPeriod(profile?.timezone);
  if (prevRef.current !== next) {
    queryClient.invalidateQueries({ queryKey: queryKeys.prayerState(userId) });
    prevRef.current = next;
  }
}), [userId, profile?.timezone]);
```

---

### Proposed implementation (server)

Add server time to RPC response to anchor the client clock (backward compatible):

```sql
-- In get_current_prayer_state, include server_now_epoch_ms
RETURN JSONB_BUILD_OBJECT(
  'server_now_epoch_ms', FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  'current_period', current_period,
  'current_window_available', CASE WHEN current_period = 'morning' THEN morning_available ELSE evening_available END,
  'morning_available', morning_available,
  'evening_available', evening_available,
  'prayers', JSONB_BUILD_OBJECT('morning', morning_prayer, 'evening', evening_prayer),
  'debug', debug_info
);
```

Keep 4:00 as the canonical boundary in SQL; ensure any other server functions (e.g., challenge day calc) also align to 4:00.

---

### Edge cases
- **Manual device time changes**: UI unaffected (clock anchored to server/perf); server still validates write actions.
- **Timezone changes**: Detect via `react-native-localize`; if different from `profiles.timezone`, prompt to update profile, then `resyncClock` and recompute.
- **Offline**: Continue simulating time from last anchor; show “unsynced clock” if no sync > 24h; degrade to device time with warning only if never synced.
- **Background scheduling**: Keep reliability padding (e.g., notifications after 4:06) inside scheduler only; logical checks remain at 4:00.

---

### Rollout plan
1) Add `server_now_epoch_ms` to RPC output; read it in `useHomeData` and call `initClock({ serverNowEpochMs, timezone: profile.timezone })`.
2) Introduce `Clock.ts` and switch `HomeHeader`, `PrayerCard`, `prayerNavigation` to use it for period/window.
3) Update `praylockStore` and `praylockBackgroundManager` to use `Clock.isInPrayerWindow()`; unify all client boundaries to 4:00.
4) Replace time-based polling with boundary-driven invalidation.
5) Keep server validation authoritative; add graceful UX when a server correction occurs.

---

### Acceptance tests
- Manual time change from morning→evening and back: UI flips within a minute without server refetch; no stale cards.
- Background Praylock: windows respected; notifications fire correctly after timezone changes and app resume.
- Prayer completion: Server rejects invalid periods; client shows correction toast and refreshes state.
- Cross-device: Devices agree on period/window after syncing; no streak/challenge regressions.
- Timezone switch: Update profile timezone; UI and background schedules adjust immediately.


