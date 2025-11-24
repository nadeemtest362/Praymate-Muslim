## IntentionsHero Side-Scroll Performance Plan

### Goal
Eliminate jank when horizontally paging the `IntentionsHero` on the Intentions tab by reducing gesture contention and render cost, and optionally upgrading the screen structure for consistent 60fps.

### Current context
- `IntentionsHero` uses a horizontal `FlatList` with `pagingEnabled` inside a vertical `ScrollView` on the Intentions screen.
- Cards use shadows, gradients, and per-card layout that can be expensive during scroll.
- Container uses negative horizontal margins to achieve edge-to-edge layout.

### Likely root causes
- Nested scrollables (horizontal child inside vertical parent) causing gesture contention and overscroll.
- Heavy shadow rendering on each card during horizontal motion.
- Negative margins may trigger extra layout work on update.
- Overly aggressive momentum/snap settings causing micro-fights between lists.

## Phase 1: Non-invasive improvements (quick wins)
Implement these prop/style tweaks without structural changes.

### 1) Stabilize horizontal paging
- Add interval snapping and reduce overshoot.

```tsx
// IntentionsHero FlatList
<FlatList
  horizontal
  pagingEnabled
  snapToInterval={cardWidth}
  snapToAlignment="start"
  disableIntervalMomentum
  bounces={false}
  removeClippedSubviews
  decelerationRate="normal"
  // keep: getItemLayout, initialNumToRender, maxToRenderPerBatch, windowSize
/>
```

### 2) Reduce parent-child gesture contention
- Lock vertical scroll direction on the parent container.

```tsx
// Intentions screen container ScrollView
<ScrollView
  directionalLockEnabled
  // optionally toggle scrollEnabled while hero is dragging
  // scrollEnabled={verticalScrollEnabled}
/>
```

- Optional: temporarily disable vertical scrolling while the hero is dragged.
  - Expose `onHorizontalDragStart/onHorizontalDragEnd` from `IntentionsHero` to toggle parent `scrollEnabled`.
  - Wire to `onScrollBeginDrag`/`onScrollEndDrag` of the hero list.

### 3) Rasterize and slightly simplify shadows
- Rasterize to offload repeated compositing work during scroll.
- Slightly reduce shadow intensity/radius to lower GPU load.

```ts
// styles.card (IntentionsHero)
card: {
  // existing styles ...
  shadowOpacity: 0.12, // slightly reduced
  shadowRadius: R.w(1.6), // slightly reduced
  shouldRasterizeIOS: true,
  renderToHardwareTextureAndroid: true,
}
```

### 4) Remove negative margin layout trick
- Replace `marginHorizontal: -horizontalInset` with list padding.
  - Use `contentContainerStyle={{ paddingHorizontal: horizontalInset }}` on the `FlatList`.
  - Keep each card width equal to `cardWidth - (horizontalInset * 2)` or keep full width and rely on internal padding for visual spacing.

```tsx
<FlatList
  contentContainerStyle={{ paddingHorizontal: horizontalInset }}
  // remove container negative margins
/>
```

## Phase 2: Structural upgrade (bigger win)

### Option A: Vertical FlashList with ListHeaderComponent (recommended)
- Replace the parent vertical `ScrollView` with a vertical `FlashList`.
- Move `IntentionsHero` into `ListHeaderComponent`.
- Benefits: better virtualization of the main list, fewer re-measures during horizontal swipes, smoother overall.

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={groups}
  renderItem={({ item }) => (
    <PersonGroup /* ... */ />
  )}
  ListHeaderComponent={<>
    <IntentionsHeader onAddPerson={handleAddPerson} />
    <IntentionsHero />
  </>}
  estimatedItemSize={220}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ paddingHorizontal: R.w(3), paddingBottom: R.h(12) }}
/>
```

### Option B: Replace hero `FlatList` with horizontal `ScrollView`
- If hero has few cards (≤5–6), swap to `ScrollView` + `pagingEnabled`.
- Simplifies virtualization overhead; often feels smoother with small item counts.

```tsx
<ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
  {cards.map(c => (
    <View key={c.key} style={styles.cardContainer}>{c.content}</View>
  ))}
</ScrollView>
```

## Phase 3: UX/perf polish (optional)

### 1) Pagination dots without React re-renders
- Use Animated value (or Reanimated) bound to horizontal scroll instead of `setCurrentIndex`-driven state.
- This avoids re-rendering the hero component on every page snap.

```tsx
// Drive dot width/color via scrollX interpolation
// onScroll={({ nativeEvent }) => scrollX.setValue(nativeEvent.contentOffset.x)}
```

### 2) Gradient cost containment
- Ensure gradient elements don’t overdraw large areas where not needed.
- Prefer static images when possible; keep gradients but limit their bounds.

## Implementation order
1) Apply Phase 1 changes (props, directional lock, rasterization, layout padding).
2) Test on iPhone SE, 14 Pro, 16 Pro Max. If micro-jank remains, implement parent scroll toggle during horizontal drag.
3) If still not silky, migrate to vertical `FlashList` (Phase 2A). Only consider 2B if hero card count remains small.
4) Add Animated pagination (Phase 3) if needed.

## Test plan
- Measure with RN Performance Monitor: JS FPS and UI FPS during horizontal swipes.
- Scenarios:
  - Fast horizontal paging back and forth on the hero.
  - Horizontal paging while the vertical list contains 50+ items.
  - With/without active network queries (background noise).
- Devices: iPhone SE (small), iPhone 14 Pro (baseline), iPhone 16 Pro Max (large).

## Rollout & risk
- Phase 1 is low risk and reversible.
- FlashList migration affects the entire Intentions screen scroll container—test thoroughly.
- Keep changes behind a simple feature flag or environment toggle if needed.

## Acceptance criteria
- Horizontal hero paging feels smooth with no visible stutter on target devices.
- UI frame rate remains consistently near 60fps during hero scroll.
- No gesture conflicts between horizontal hero and vertical main list.


