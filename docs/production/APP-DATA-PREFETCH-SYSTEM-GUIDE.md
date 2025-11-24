# Home, Plan & Intentions Data Flow & Prefetch Guide

This document explains how the Expo app hydrates the Home tab, Plan-with-Calendar, and Intentions immediately after a cold start. It covers the critical asset loading, data prefetch pipeline, the in-memory caches we layer on top of React Query, and the rendering strategy that prevents blank flashes when the user lands on each screen.

---

## 1. Overview

**Goals**
- Load all critical assets (fonts, icon fonts, hero images) before splash screen hides to ensure instant first paint.
- Warm the data and assets required by the Home and Intentions tabs during authentication.
- Reuse the prefetched payloads instantly when the user lands on either screen.
- Avoid blank states caused by FlashList virtualization or delayed React Query hydration.

**Core building blocks**
| Component | Responsibility |
| --- | --- |
| `app/_layout.tsx` | **Critical asset loader** - Preloads icon fonts and force-decodes hero images before splash hides. Runs the data prefetch task once the user session is ready. Persists the payload to React Query and to lightweight in-memory caches. |
| `src/utils/warmPlanIcons.ts` | Exports bundled hero images and warming functions. Used by root layout to ensure images are decoded into memory. |
| `src/utils/imagePrefetchRegistry.ts` | Tracks which remote URLs have already been prefetched so avatar components can skip their placeholder transition. |
| `src/features/intentions/prefetchCache.ts` | Stores the full intentions & people responses keyed by `user_id` so the Intentions tab can render before React Query hydrates. |
| `src/lib/queryClient.ts` | Resets both the image registry and the intentions cache on sign-out. |
| `src/components/intentions/useIntentions.ts` | Reads from React Query → prefetch cache → generic cache fallback to synchronously return groups. Warns in dev if cached data fails to produce groups. |
| `app/(app)/(tabs)/intentions/index.tsx` | Renders the Intentions tab using a lean `ScrollView`, ensuring the cached data appears immediately. |
| `src/shared/ui/core/Avatar.tsx` | Uses the image registry to decide whether to show placeholders or the pre-warmed avatar instantly. |

---

## 2. Critical Asset Loading (`app/_layout.tsx`)

Before the splash screen can hide, the app must load all critical assets that are needed for instant first paint. This prevents icons and hero images from "popping in" after the user sees the Home screen.

### 2.1 Icon Fonts for Tab Bar

The bottom tab bar uses `@expo/vector-icons` with three icon libraries:
- `Ionicons` (Home, Plan tabs)
- `MaterialCommunityIcons` (Intentions tab)
- `FontAwesome5` (Profile tab)

These are preloaded using their static `loadFont()` methods:

```ts
Promise.all([
  Ionicons.loadFont(),
  MaterialCommunityIcons.loadFont(),
  Font.loadAsync({
    'FontAwesome5Free-Solid': require('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
  }),
  warmPlanIcons(),
  warmPrayerJourneyImage(),
])
```

### 2.2 Hero Images - Force Decode Strategy

Bundled assets like `jesus-2.png`, `morning1.png`, and `evening1.png` are embedded in the bundle but still need to be **decoded into memory** before they can render instantly.

**The Problem:** Simply calling `Asset.fromModule()` + `ExpoImage.prefetch()` downloads the asset but doesn't guarantee ExpoImage has decoded it. When you use `source={require(...)}` with ExpoImage, it decodes on first render.

**The Solution:** Hidden rendering to force decode:

```tsx
const [heroImagesDecoded, setHeroImagesDecoded] = useState(false);
const onHeroImageLoad = useCallback(() => {
  heroImageLoadCount.current += 1;
  if (heroImageLoadCount.current >= 3) { // 3 hero images total
    setHeroImagesDecoded(true);
  }
}, []);

// Hidden preload view
<View pointerEvents="none" style={{ position: 'absolute', width: 0, height: 0, opacity: 0, zIndex: -9999 }}>
  <ExpoImage source={PLAN_MORNING_ICON} cachePolicy="memory" transition={0} onLoad={onHeroImageLoad} />
  <ExpoImage source={PLAN_EVENING_ICON} cachePolicy="memory" transition={0} onLoad={onHeroImageLoad} />
  <ExpoImage source={PRAYER_JOURNEY_JESUS} cachePolicy="memory" transition={0} onLoad={onHeroImageLoad} />
</View>
```

The splash screen waits for `heroImagesDecoded` to be true before hiding. This guarantees that when Home renders, all hero images are already in memory and paint instantly without any placeholder flash.

### 2.3 Splash Screen Wait Conditions

The splash screen hides only when ALL of these conditions are met:

```ts
if (
  (fontsLoaded || fontsError) &&        // SNPro fonts
  criticalAssetsLoaded &&                // Icon fonts + hero warming complete
  heroImagesDecoded &&                   // Hero images decoded into memory
  isQueryHydrated &&                     // React Query hydrated from disk
  !isAuthInitializing &&                 // Auth initialization complete
  !hasHiddenSplashRef.current
) {
  SplashScreen.hideAsync();
}
```

This ensures the first frame the user sees has:
- ✅ All tab icons visible
- ✅ All hero images visible
- ✅ All cached data loaded
- ✅ No placeholder flashes

---

## 2. Prefetch Pipeline (`app/_layout.tsx`)

When the authenticated app layout mounts, it runs `prefetchHomeDataQueries(userId, timezone, profileAvatarUri)`:

1. It executes a list of `queryClient.fetchQuery(...)` calls for prayers, people, intentions, prayer state, etc. Any success result is written to the React Query cache immediately.
2. Each `fulfilled` result is also stored in a `summary` object.  
   - If the payload is `summary.peopleAll`, we gather avatar URLs into `peopleForImages`.
   - If the payload is `summary.intentions`, we cache it via `setPrefetchedIntentions(userId, summary.intentions)`.
   - The same pattern applies to `setPrefetchedPeople`.
3. We kick off `ExpoImage.prefetch(uri, { cachePolicy: 'memory-disk' })` for the collected avatar URIs (and the profile avatar). Successful URLs are registered with `registerPrefetchedImageUrl`.
4. Warm static assets used by the home hero (`warmPlanIcons`, `warmPrayerJourneyImage`).

**Why the extra cache?**  
React Query still needs time to hydrate from AsyncStorage on cold start. By storing the raw payloads in `prefetchCache.ts`, the Intentions hook can synchronously return the same data even if hydration hasn’t finished yet.

---

## 4. Intentions Prefetch Cache (`src/features/intentions/prefetchCache.ts`)

The cache keeps the most recently prefetched `intentions` and `people` arrays **per user**.

```ts
type PrefetchCache<T> = { userId: string; data: T } | null;
let intentionsCache: PrefetchCache<PrayerIntention[]> = null;
let peopleCache: PrefetchCache<PrayerPerson[]> = null;
```

- `setPrefetchedIntentions(userId, intentions)` / `setPrefetchedPeople` are called from the prefetch pipeline.
- `getPrefetchedIntentions(userId)` returns the cached array if the IDs match; otherwise `undefined`.
- `resetIntentionsPrefetchCache()` clears both caches on `resetReactQuery()` (triggered during sign-out).

**Important:** This cache is **in-memory only** and gets wiped whenever the process restarts or when the user signs out.

---

## 5. Home Data Hydration (`src/hooks/useHomeData.ts`)

`useHomeData` now participates in the cold-start pipeline instead of waiting for network responses. The hook pulls the exact payload that `_layout` prefetched before React renders Home, then keeps it around for subsequent renders:

- On initialization it tries `queryClient.getQueryData(queryKeys.prayersToday(...))` and `queryClient.getQueryData(queryKeys.prayerState(...))`. Whatever is found becomes the synchronous return value for the first render.
- The hook stores those snapshots in refs (`todaysPrayersFallbackRef`, `prayerStateFallbackRef`) so we never drop back to `null` while a refetch is in flight.
- When live RPC responses arrive, the refs are refreshed and the derived state recomputes without any visible flash.
- We prefer the authoritative flags from the RPC (`current_period`, `morning_available`, `evening_available`, `current_window_available`, and completed timestamps). If a field is missing—offline mode or legacy responses—we fall back to the clock-based calculation that already powered the old flow.

Because **every** home-adjacent surface (Home hero, PrayerJourney, DailyBread, plan-with-calendar, etc.) relies on `useHomeData`, this one change eliminates the stale-empty frame across the app. All of the “instant” feelings you noticed on Home, Plan, and Intentions now stem from that shared cached snapshot being fed straight into React on frame zero.

## 6. Intentions Hook (`src/components/intentions/useIntentions.ts`)

The hook now layers three data sources to ensure a non-null result:

1. **React Query cache** – `queryClient.getQueryData(queryKeys.intentions(userId))`.
2. **Prefetch cache** – `getPrefetchedIntentions(userId)` and `getPrefetchedPeople(userId)`.
3. **Generic cache fallback** – the first cached payload for any user (useful during early migrations or dev tools).

```ts
const cachedIntentions = queryClient.getQueryData(...);
const prefetchedIntentions = getPrefetchedIntentions(user?.id);
const fallbackIntentions = cachedIntentions
  ?? prefetchedIntentions
  ?? getFirstCachedIntentions();

const intentions = intentionsQuery.data ?? fallbackIntentions ?? [];
```

We mark the screen as “loading” *only* if there is no cached/prefetched data **and** the query is still fetching. In dev builds we log the source of the data to help diagnose edge cases:

```ts
console.log('[Intentions/useIntentions] datasets', {
  queryIntentions: Array.isArray(intentionsQuery.data) ? intentionsQuery.data.length : null,
  cachedIntentions: Array.isArray(cachedIntentions) ? cachedIntentions.length : null,
  prefetchedIntentions: Array.isArray(prefetchedIntentions) ? prefetchedIntentions.length : null,
  // ...
});
```

If cached data still fails to produce groups, we warn so the developer can investigate:

```ts
if (groupsArray.length === 0 && hasCachedIntentions) {
  console.warn('[Intentions] Prefetched intentions did not produce any groups', {
    intentionsCount: intentions.length,
  });
}
```

---

## 7. Rendering Strategy (`app/(app)/(tabs)/intentions/index.tsx`)

We replaced the FlashList container with a simple `ScrollView`. The virtualization in FlashList delayed the first paint even when data was ready, causing a blank flash. The new approach mirrors the prefetched groups directly:

```tsx
<ScrollView contentContainerStyle={styles.scrollContent}>
  <IntentionsHero />

  {groups.length > 0 ? (
    <>
      {groups.map(group => (
        <PersonGroup key={group.id} group={group} ... />
      ))}
      {peopleWithoutIntentions.length > 0 && (
        <PeopleWithoutIntentions ... />
      )}
    </>
  ) : (
    <EmptyState onAddIntention={handleAddIntention} onAddPerson={handleAddPerson} />
  )}
</ScrollView>
```

We can revisit FlashList in the future once we’re confident the data is always present and we’ve tuned `initialNumToRender`.

---

## 8. Avatar Behaviour (`src/shared/ui/core/Avatar.tsx`)

- At mount, the avatar checks `isImageUrlPrefetched(resolvedUrl)` to decide if it should skip the gradient placeholder.
- When the `Image` loads, it re-registers the URL to keep the registry up to date.

```tsx
const [imageLoaded, setImageLoaded] = React.useState(() => isImageUrlPrefetched(resolvedUrl));

<Image
  cachePolicy="memory-disk"
  onLoad={() => {
    setImageLoaded(true);
    registerPrefetchedImageUrl(resolvedUrl);
  }}
/>;
```

This guarantees that avatars on Home and Intentions appear immediately after a cold start if they were warmed during prefetch.

---

## 9. Cold Start Sequence

### Phase 1: Critical Asset Loading (Blocks Splash)
1. **App boot** → `RootLayoutWithProviders` starts loading fonts and critical assets
2. **Font loading** → `useFonts` loads SNPro family
3. **Icon font loading** → Ionicons, MaterialCommunityIcons, FontAwesome5 fonts load via `Promise.all`
4. **Hero image warming** → `warmPlanIcons()` and `warmPrayerJourneyImage()` prepare assets
5. **Hero image decoding** → Hidden `<ExpoImage>` components render and decode images into memory
6. **React Query hydration** → Query cache restores from AsyncStorage
7. **Splash screen hides** → Only when fonts + icon fonts + hero images decoded + query hydrated + auth initialized

### Phase 2: Data Prefetch (After Auth, Before Home Paint)
1. **Auth resolves** → `useAuth()` returns authenticated user
2. **Prefetch task starts** → `prefetchHomeDataQueries(userId, timezone, profileAvatarUri)` runs
3. **Data fetching** → People, intentions, prayers, prayer state fetched in parallel
4. **Cache population** → Results stored in React Query + `prefetchCache.ts` + image registry
5. **Avatar warming** → Up to 12 profile avatars prefetched in background (non-blocking)
6. **Home ready** → `isHomeDataPrefetched` becomes true

### Phase 3: First Paint
1. **Home renders** → `useHomeData` and `useIntentions` synchronously return cached snapshots
2. **Hero images** → Already decoded, render instantly with no placeholder
3. **Tab icons** → Already loaded, visible immediately
4. **Avatars** → Show instantly if prefetched, graceful placeholder if still loading
5. **Data** → Home, Plan-with-Calendar, PrayerJourney, DailyBread, Intentions all mount with real data

### Phase 4: Post-Paint
1. **Background fetches** → React Query updates cache with fresh data
2. **Ref updates** → Hooks update their fallback refs without visible flashes
3. **Navigation** → Secondary screens reuse cached data instantly

**Key Insight:** By splitting asset loading (blocking) from data prefetch (mostly blocking) and avatar warming (non-blocking), we ensure the first frame is instant while still warming as much as possible before Home paint.

---

## 9. Debugging Tips

- Enable dev mode and check for `[Intentions/useIntentions] datasets` logs to confirm which layer provided the data.
- If groups still render empty, look for `[Intentions] Prefetched intentions did not produce any groups`.
- Avatar placeholders indicate that `registerPrefetchedImageUrl` wasn’t triggered; check the prefetch logs in `_layout.tsx`.
- Remember that caches are in-memory. A full process restart wipes them until the next prefetch.

---

## 10. Maintenance Checklist

- **Sign-out behaviour** – make sure any new caches are cleared in `resetReactQuery`.
- **New assets** – if you add hero images or additional avatars, wire them into the prefetch pipeline and the image registry.
- **Screen tweaks** – if we reintroduce FlashList or another virtualized list, set `initialNumToRender` high enough to avoid blank frames when cached data is present.
- **Telemetry** – consider keeping the dev-only logs while tuning; remove them or guard them behind `__DEV__` once you’re confident in the flow.

---

This setup ensures the home and intentions experiences feel instant after a cold start while keeping the logic maintainable. Reach out in the `#app-platform` channel if you plan to extend the prefetch pipeline or notice new blank states. Happy shipping! 🎯
