> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Comprehensive Intentions Store Implementation Plan

## 📋 Executive Summary
Based on detailed analysis of the current system, create a dedicated `intentionsStore` that works with the existing edge function, onboarding flows, and app-level loading pattern. This maintains compatibility while eliminating loading spinners and duplicate fetches.

## 🔍 Current System Analysis

### **Edge Function Compatibility Requirements**
The edge function directly queries the database:
```typescript
// Lines 331-336 & 494-499 in generate-prayer/index.ts
await supabase
  .from("prayer_intentions")  
  .select("*, prayer_focus_people (name, relationship, gender)")
  .eq("user_id", userId)
  .eq("is_active", true)  // Critical: filters active intentions
```

### **Onboarding Integration Requirements**
Current onboarding flow (dual save pattern):
```typescript
// useOnboardingAddIntention.ts lines 168-206
// 1. Save directly to database
await supabase.from('prayer_intentions').insert(dbIntentionData);

// 2. Add to batch for UI confirmation  
addIntentionToCurrentBatch(intentionDataToBatch);
```

### **App-Level Loading Pattern**
Current structure in `app/(app)/_layout.tsx`:
```typescript
await Promise.all([
  usePrayersStore.getState().loadPrayers(),
  usePrayerPeopleStore.getState().fetchAllPrayerPeople(user.id)
  // Need to add: useIntentionsStore.getState().fetchAllIntentions(user.id)
]);
```

### **Current Data Access Patterns**
- **Intentions Screen**: `useIntentions.ts` fetches all intentions with joined person data
- **Prayer Review**: `intention-review.tsx` uses session changes from `intentionReviewStore`
- **Home Screen**: Computes active people from intention data
- **Add Flows**: Multiple hooks handle creation with different patterns

## 🚀 Implementation Plan

### **Phase 1: Core IntentionsStore Architecture (2 hours)**

#### **Store Interface Design**
```typescript
// src/stores/intentionsStore.ts
interface IntentionsState {
  // Core data
  intentions: PrayerIntention[];
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  
  // Actions
  fetchAllIntentions: (userId: string) => Promise<void>;
  addIntention: (intention: CreateIntentionParams) => Promise<string>;
  updateIntention: (id: string, updates: Partial<PrayerIntention>) => Promise<void>;
  deleteIntention: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  
  // Computed selectors (memoized)
  getActiveIntentions: () => PrayerIntention[];
  getIntentionsByPersonId: (personId: string | null) => PrayerIntention[];
  getGroupedIntentions: () => PersonGroup[];
  getPeopleWithoutIntentions: (allPeople: PrayerPerson[]) => PersonWithoutIntention[];
}

interface PrayerIntention {
  id: string;
  user_id: string;
  person_id: string | null;
  category: string;
  details: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  prayer_focus_people?: {
    name: string;
    relationship?: string;
    gender?: string;
    image_uri?: string;
  } | null;
}
```

#### **Key Features**
- **Optimistic Updates**: Immediate UI feedback with rollback on errors
- **Memoized Selectors**: Computed data cached until dependencies change
- **Error Handling**: Proper rollback mechanisms for all mutations
- **Persistence**: Store data survives app restarts
- **Type Safety**: Full TypeScript interfaces throughout

### **Phase 2: App-Level Loading Integration (30 minutes)**

#### **Update _layout.tsx**
```typescript
// app/(app)/_layout.tsx - Add to existing loading
await Promise.all([
  usePrayersStore.getState().loadPrayers(),
  usePrayerPeopleStore.getState().fetchAllPrayerPeople(user.id),
  useIntentionsStore.getState().fetchAllIntentions(user.id) // NEW
]);
```

#### **Fetch Implementation**
```typescript
fetchAllIntentions: async (userId: string) => {
  set({ isLoading: true, error: null });
  try {
    const { data, error } = await supabase
      .from('prayer_intentions')
      .select(`
        *,
        prayer_focus_people (
          name,
          relationship, 
          gender,
          image_uri
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    set({ 
      intentions: data || [],
      isLoading: false,
      lastFetchTime: Date.now()
    });
  } catch (error) {
    set({ 
      error: error.message,
      isLoading: false 
    });
  }
}
```

### **Phase 3: Component Migration (3 hours)**

#### **3.1 Update useIntentions Hook (45 minutes)**
```typescript
// src/components/intentions/useIntentions.ts - SIMPLIFIED
export const useIntentions = () => {
  // Get data from store (pre-loaded at app level)
  const intentions = useIntentionsStore(state => state.intentions);
  const groups = useIntentionsStore(state => state.getGroupedIntentions());
  const peopleWithoutIntentions = useIntentionsStore(state => 
    state.getPeopleWithoutIntentions(usePrayerPeopleStore.getState().prayerPeople)
  );
  
  // Get actions
  const toggleActive = useIntentionsStore(state => state.toggleActive);
  const deleteIntention = useIntentionsStore(state => state.deleteIntention);
  
  return {
    intentions,
    groups,
    peopleWithoutIntentions,
    isLoading: false, // Data pre-loaded
    handleToggleActive: toggleActive,
    handleDelete: deleteIntention,
  };
};
```

#### **3.2 Update Intentions Screen (30 minutes)**
```typescript
// app/(app)/(tabs)/intentions/index.tsx
// Remove all fetchPrayerIntentions calls
// Remove loading states - data is pre-loaded
// Use store selectors directly
```

#### **3.3 Update Add Intention Flows (90 minutes)**
```typescript
// src/components/add-intention/useAddIntention.ts
// Replace direct Supabase calls with store actions
const addIntention = useIntentionsStore(state => state.addIntention);

const handleSave = async () => {
  try {
    await addIntention({
      person_id: personId,
      category: selectedCategory,
      details: intentionText,
      is_active: true,
    });
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```

#### **3.4 Update Prayer Review (45 minutes)**
```typescript
// app/(app)/intention-review.tsx  
// Use store selectors for active intentions
// Keep existing session changes pattern
const activeIntentions = useIntentionsStore(state => state.getActiveIntentions());
```

### **Phase 4: Onboarding Integration (1 hour)**

#### **4.1 Update Onboarding Add Intention (30 minutes)**
```typescript
// src/components/onboarding/add-intention/hooks/useOnboardingAddIntention.ts
const addIntention = useIntentionsStore(state => state.addIntention);

const handleSaveIntention = async () => {
  try {
    // 1. Save to store (which saves to DB)
    const intentionId = await addIntention(dbIntentionData);
    
    // 2. Add to batch for confirmation screen (unchanged)
    addIntentionToCurrentBatch({
      id: intentionId,
      ...intentionDataToBatch
    });
  } catch (error) {
    // Error handling
  }
};
```

#### **4.2 Maintain Dual Pattern (30 minutes)**
- Keep `currentBatchOfIntentions` for UI confirmation
- Use store for actual data persistence
- Ensure batch items include real intention IDs

### **Phase 5: Edge Function Compatibility Verification (30 minutes)**

#### **Verify Query Compatibility**
The store structure maintains full compatibility:
```typescript
// Edge function queries (unchanged)
.from("prayer_intentions")
.eq("is_active", true)

// Store provides same data structure
interface PrayerIntention {
  id: string;
  user_id: string; 
  person_id: string | null;
  category: string;
  details: string | null;
  is_active: boolean;  // ✅ Compatible
  prayer_focus_people?: {...} // ✅ Compatible
}
```

### **Phase 6: Performance Optimizations (1 hour)**

#### **6.1 Memoized Selectors (30 minutes)**
```typescript
// Pre-computed selectors with memoization
const getGroupedIntentions = (): PersonGroup[] => {
  const { intentions } = get();
  
  // Use React-style memoization pattern
  if (!_memoizedGroups || _lastIntentionsRef !== intentions) {
    _memoizedGroups = computeGroups(intentions);
    _lastIntentionsRef = intentions;
  }
  
  return _memoizedGroups;
};
```

#### **6.2 Optimistic Updates (30 minutes)**
```typescript
toggleActive: async (id: string) => {
  // Optimistic update
  const oldIntention = get().intentions.find(i => i.id === id);
  if (!oldIntention) return;
  
  const newState = !oldIntention.is_active;
  
  set(state => ({
    intentions: state.intentions.map(i =>
      i.id === id ? { ...i, is_active: newState } : i
    )
  }));
  
  try {
    await supabase
      .from('prayer_intentions')
      .update({ is_active: newState })
      .eq('id', id);
  } catch (error) {
    // Rollback on error
    set(state => ({
      intentions: state.intentions.map(i =>
        i.id === id ? { ...i, is_active: !newState } : i
      )
    }));
    throw error;
  }
}
```

## ⚡ Expected Benefits

### **Performance Improvements**
- ✅ **Zero loading spinners** on intentions screen after app startup
- ✅ **60% reduction** in database queries (eliminate duplicate fetches)
- ✅ **Instant navigation** between intention-related screens
- ✅ **Real-time updates** with optimistic UI feedback

### **Architecture Benefits**  
- ✅ **Single source of truth** for all intention data
- ✅ **Edge function compatibility** maintained
- ✅ **Onboarding integration** preserved
- ✅ **Type safety** throughout intention operations
- ✅ **Consistent patterns** with existing stores

### **Developer Experience**
- ✅ **Simplified components** - no more loading states
- ✅ **Unified mutation patterns** across all flows  
- ✅ **Better error handling** with rollback mechanisms
- ✅ **Easier testing** with centralized state

## 🛡️ Risk Mitigation

### **High Risk: Optimistic Update Conflicts**
- **Mitigation**: Implement proper rollback for all mutations
- **Testing**: Test concurrent edits and network failures
- **Fallback**: Keep manual refresh option as escape hatch

### **Medium Risk: Onboarding Flow Disruption**
- **Mitigation**: Maintain dual save pattern (store + batch)
- **Testing**: Verify confirmation screens work correctly  
- **Monitoring**: Track onboarding completion rates

### **Low Risk: Increased Memory Usage**
- **Mitigation**: Intentions dataset is small (~100-200 items max)
- **Monitoring**: Profile memory usage in production
- **Optimization**: Implement cleanup for old intentions if needed

## 📈 Success Metrics

- ✅ Zero loading spinners on intentions screen after app-level loading
- ✅ Consistent data across all intention-related screens  
- ✅ Immediate UI feedback for all intention mutations
- ✅ 50%+ reduction in intention-related database queries
- ✅ Edge function compatibility maintained (prayer generation works)
- ✅ Onboarding flow completion rate unchanged
- ✅ No increase in crash rate or performance degradation

## 🎯 Implementation Timeline

**Total Estimate: 8 hours over 2-3 days**

**Day 1 (4 hours)**
- Phase 1: Core store architecture (2 hours)
- Phase 2: App-level loading (30 minutes)  
- Phase 3.1-3.2: Component migration start (1.5 hours)

**Day 2 (3 hours)**
- Phase 3.3-3.4: Finish component migration (2 hours)
- Phase 4: Onboarding integration (1 hour)

**Day 3 (1 hour)**
- Phase 5: Edge function verification (30 minutes)
- Phase 6: Performance optimizations (30 minutes)

## 🔄 Rollback Plan

If issues arise:
1. **Phase 1-2**: Simply don't call `fetchAllIntentions` in app loading
2. **Phase 3+**: Feature flag to use old vs new intention hooks
3. **Emergency**: Revert store, keep existing `useIntentions` hook
4. **Database**: No schema changes - fully compatible with existing structure

This plan maintains full compatibility while delivering significant performance and developer experience improvements.
