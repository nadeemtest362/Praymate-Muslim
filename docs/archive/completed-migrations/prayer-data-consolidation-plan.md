> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Prayer Data Consolidation Project

## Executive Summary

**Goal**: Consolidate 5 different prayer data sources into a single unified store to eliminate duplicate fetching, improve performance, and create a single source of truth.

**Discovery**: Found a complete architectural disaster with 5 prayer sources and 4 prayer people sources, all with duplicate logic and inconsistent interfaces.

**Strategy**: Targeted core-layer rewrite with incremental rollout using compatibility layers to avoid breaking changes.

---

## Current Status: 60% Complete

### ✅ COMPLETED (Phase 1)

#### 1. Unified Data Models
- ✅ Created `src/models/prayer.ts` - Single Prayer interface
- ✅ Created `src/models/prayerPerson.ts` - Single PrayerPerson interface
- ✅ Uses consistent snake_case field naming matching database schema

#### 2. Unified Prayer Store
- ✅ Created `src/stores/prayersStore.ts` (300+ lines)
  - Normalized data structure (`entities` + `ids`)
  - All filtering/search logic centralized
  - Optimistic updates for like/unlike
  - Pagination support for profile history
  - Total count tracking
  - Uses existing `prayerPeopleStore` (no duplication)
  - WeakMap cache for JSON parsing performance
  - Auth state cleanup on logout

#### 3. Migrated Prayer Sources (3/5)
- ✅ **`usePrayersScreen`** (201 lines → 7 lines + compatibility layer)
  - **Location**: `src/hooks/usePrayersScreen.ts`
  - **Usage**: 3 screens (prayers, plan-with-calendar, contact-detail)
  - **Benefit**: Eliminated duplicate fetches between screens
  
- ✅ **`usePrayerHistory`** (85 lines → 7 lines + compatibility layer)
  - **Location**: `src/components/profile/hooks/usePrayerHistory.ts`
  - **Usage**: Profile screen paginated history
  - **Benefit**: Shares data with main prayers list

- ✅ **`homeStore`** (Duplicate prayer fetching removed)
  - **Location**: `src/stores/homeStore.ts`
  - **Usage**: Home screen morning/evening prayers
  - **Benefit**: Now uses `prayersSelectors.selectTodaysPrayers` - eliminated duplicate fetching, maintains data consistency

#### 4. Enhanced People Integration
- ✅ Restored enhanced people functionality with snapshot parsing
- ✅ Fixed infinite render loops with stable selectors
- ✅ Backward compatibility maintained - zero breaking changes

---

## 🔴 REMAINING PROBLEMS (Phase 2)

### 3. Prayer Display Hook (MEDIUM IMPACT)

**Problem**:
```typescript
// src/components/prayer-display/usePrayerDisplay.ts
// Fetches individual prayers by ID for modal display
```

**Impact**:
- Modal displays prayer but data isn't synced with main store
- Potential for showing stale data
- Additional network request for prayer that may already be cached

**Solution Strategy**:
- Replace with selector: `usePrayersStore(state => state.entities[prayerId])`
- Fallback to fetch if prayer not in cache
- Sync fetched prayer back to main store

### 4. Mock Prayer Constants (LOW IMPACT)

**Problem**:
```typescript
// src/constants/homeConstants.ts
export const MOCK_PRAYERS: { morning: Prayer, evening: Prayer }
```

**Impact**:
- Different interface than real prayers
- Fallback logic clutters components
- Testing uses fake data instead of proper mocks

**Solution Strategy**:
- Remove mock constants entirely
- Replace with proper loading states
- Update tests to use store-based mocking

### 5. Prayer People Duplication (MEDIUM IMPACT)

**Problem**:
```typescript
// src/stores/homeStore.ts line 45
prayerPeople: any[];  // Duplicates prayerPeopleStore data
```

**Impact**:
- Same people data stored in two places
- Potential for inconsistency
- Extra memory usage
- Confusion about which store to use

**Solution Strategy**:
- Remove `homeStore.prayerPeople`
- Update home screen to use `usePrayerPeopleStore` selectors
- Test prayer people filtering on home screen

---

## DETAILED IMPLEMENTATION PLAN

### Phase 2A: Prayer Display Migration (MEDIUM PRIORITY)

**Time Estimate**: 1-2 hours

**Step 1: Create Prayer Display Selector (30 min)**
```typescript
// Add selector for individual prayer with fallback fetch
selectPrayerById: (id: string) => (state: PrayersState) => {
  return state.entities[id] || null;
}
```

**Step 2: Update usePrayerDisplay (1 hour)**
- Check store first for prayer data
- Fallback to fetch if not cached
- Sync fetched prayer back to store
- Test prayer modal functionality

### Phase 2B: Remove Mock Constants (LOW PRIORITY)

**Time Estimate**: 1 hour

**Step 1: Remove Mock Data (30 min)**
- Delete `src/constants/homeConstants.ts` mock prayers
- Update imports across components

**Step 2: Update Loading States (30 min)**
- Replace mock data fallbacks with proper loading states
- Update tests to use store-based mocking

### Phase 2C: Final Cleanup (LOW PRIORITY)

**Time Estimate**: 1 hour

**Step 1: Delete Compatibility Layers**
- Once all components migrated, delete:
  - `src/hooks/usePrayersScreenCompat.ts`
  - `src/components/profile/hooks/usePrayerHistoryCompat.ts`
- Update imports to use store selectors directly

**Step 2: Performance Optimization**
- Add React.memo to prayer list components
- Optimize selectors for minimal re-renders
- Add performance monitoring

---

## SUCCESS METRICS

### Performance Improvements
- [ ] **Navigation Speed**: Plan ↔ Prayers navigation should be instant (cached data)
- [ ] **Network Requests**: Reduce prayer-related requests by ~60%
- [ ] **Memory Usage**: Single prayer cache vs 5 separate caches

### Data Consistency
- [ ] **Like Sync**: Like/unlike updates visible across all screens instantly
- [ ] **Real-time Updates**: Prayer completion updates all screens
- [ ] **Single Source**: Only one place fetches/stores prayer data

### Code Quality
- [ ] **Lines Removed**: ~400+ lines of duplicate code eliminated
- [ ] **Interfaces**: Single Prayer/PrayerPerson interface used everywhere
- [ ] **Testing**: Centralized mock strategy for prayer data

### Maintainability
- [ ] **Future Features**: New prayer features only need store updates
- [ ] **Bug Fixes**: Prayer-related bugs fixed in one place
- [ ] **Onboarding**: New developers understand prayer data flow immediately

---

## RISK MITIGATION

### High Risk: Home Screen Breakage
- **Mitigation**: Test home screen thoroughly with different user states
- **Rollback**: Keep original homeStore prayer logic as fallback
- **Testing**: Verify PRAYLOCK integration and prayer completion flow

### Medium Risk: Prayer Display Modal
- **Mitigation**: Gradual migration with fallback fetch logic
- **Testing**: Test modal with prayers both in/out of cache

### Low Risk: Component Re-renders
- **Mitigation**: Proper memoization and selector optimization
- **Monitoring**: Watch for performance regressions during testing

---

## TIMELINE

**Total Remaining Effort**: 3-4 hours focused work

**Week 1**: 
- Day 1: Prayer display migration (medium impact)
- Day 2: Remove mock constants and prayer people duplication
- Day 3: Final cleanup and performance optimization

**Success Definition**: All 5 prayer data sources consolidated into single store with zero functionality regressions and measurable performance improvements.
