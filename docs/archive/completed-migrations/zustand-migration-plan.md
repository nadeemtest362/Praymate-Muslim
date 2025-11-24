> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# 🗺️ Zustand Migration Plan: Zero-Risk Transition

**Status**: 🟡 In Progress  
**Last Updated**: January 7, 2025  
**Estimated Duration**: 2-3 hours (with testing)

## 🎯 **Overview**

This document outlines the step-by-step migration from custom hooks to centralized Zustand stores for PRAYLOCK and home screen state management. The goal is to solve state synchronization issues while maintaining 100% functionality.

### **Why This Migration?**
- ✅ Fix PRAYLOCK icon not updating immediately between screens
- ✅ Centralize state management for better maintainability  
- ✅ Improve performance with optimized re-renders
- ✅ Add proper state persistence and DevTools support

---

## 📋 **Functionality Inventory**

### **🔒 PRAYLOCK Critical Functions**
- [ ] Enable/Disable Toggle (Home screen + Setup screen)
- [ ] Native iOS Monitoring (Background process)
- [ ] Prayer Completion App Unlock (Prayer display)
- [ ] Settings Database Persistence (All screens)
- [ ] Icon State Synchronization (PrayerCard component)

### **🏠 Home Screen Critical Functions**
- [ ] Prayer Data Loading (Morning/Evening prayers)
- [ ] Prayer People Avatars Display (PrayerCard)
- [ ] Task Completion States (DailyPrayerTasks)
- [ ] Challenge Progress Tracking (Home screen)
- [ ] Refresh Behaviors (Focus, foreground, manual)
- [ ] Deep Link Handling (Shield → Prayer)

### **🔗 Integration Points**
- [ ] Prayer Completion → PRAYLOCK Unlock
- [ ] Prayer Completion → Challenge Progress Update
- [ ] App State Changes → Data Refresh
- [ ] Network Failures → Offline Queue Processing

---

## 🚀 **Migration Phases**

### **Phase 1: Baseline Testing** ⚡️
**Goal**: Document current working state before any changes

#### **Test Checklist**
- [ ] **PRAYLOCK Enable Flow**
  - [ ] Navigate to PRAYLOCK setup
  - [ ] Enable PRAYLOCK with morning schedule
  - [ ] Return to home screen
  - [ ] ✅ **SUCCESS CRITERIA**: PRAYLOCK icon shows as enabled immediately

- [ ] **PRAYLOCK Disable Flow**
  - [ ] Navigate to PRAYLOCK setup  
  - [ ] Disable PRAYLOCK
  - [ ] Return to home screen
  - [ ] ✅ **SUCCESS CRITERIA**: PRAYLOCK icon shows as disabled immediately

- [ ] **Prayer Completion Flow**
  - [ ] Complete a prayer (tap Amen button)
  - [ ] ✅ **SUCCESS CRITERIA**: Apps unblock immediately if PRAYLOCK enabled

- [ ] **Prayer People Display**
  - [ ] Check home screen PrayerCard
  - [ ] ✅ **SUCCESS CRITERIA**: Avatar images display for prayer people

- [ ] **Task Completion States**
  - [ ] Check DailyPrayerTasks component
  - [ ] ✅ **SUCCESS CRITERIA**: Correct completion checkmarks show

- [ ] **Data Refresh Behaviors**
  - [ ] App focus (switch away and back)
  - [ ] App foreground (background and restore)
  - [ ] Manual refresh (pull to refresh)
  - [ ] ✅ **SUCCESS CRITERIA**: Data updates correctly in all scenarios

- [ ] **Deep Link Testing**
  - [ ] Enable PRAYLOCK and try to open blocked app
  - [ ] Tap "I'll Pray Now" button on shield
  - [ ] ✅ **SUCCESS CRITERIA**: App opens to prayer flow

#### **Baseline Results**
```
Date: ___________
Tester: ___________

PRAYLOCK Enable: [ PASS / FAIL ] Notes: ________________
PRAYLOCK Disable: [ PASS / FAIL ] Notes: ________________
Prayer Completion: [ PASS / FAIL ] Notes: ________________
Prayer People: [ PASS / FAIL ] Notes: ________________
Task States: [ PASS / FAIL ] Notes: ________________
Data Refresh: [ PASS / FAIL ] Notes: ________________
Deep Linking: [ PASS / FAIL ] Notes: ________________
```

---

### **Phase 2: PRAYLOCK Migration** 🔒
**Goal**: Migrate PRAYLOCK to Zustand with full rollback capability

#### **Step 2.1: Enable Feature Flag System**

**File**: `src/config/featureFlags.ts`
```typescript
export const FEATURE_FLAGS = {
  USE_ZUSTAND_PRAYLOCK: false, // Start with false
  USE_ZUSTAND_HOME: false,     // For later phase
} as const;
```

**Update Files**:
- [ ] `app/(app)/(tabs)/home/index.tsx` - Add conditional hook usage
- [ ] `app/(app)/praylock-setup.tsx` - Add conditional hook usage

#### **Step 2.2: Test Zustand PRAYLOCK** 
```typescript
// Temporarily set to true for testing
FEATURE_FLAGS.USE_ZUSTAND_PRAYLOCK = true;
```

**Test All PRAYLOCK Functions**:
- [ ] Enable PRAYLOCK → Icon updates immediately
- [ ] Disable PRAYLOCK → Icon updates immediately  
- [ ] Prayer completion → Apps unblock
- [ ] Database persistence → Settings survive app restart
- [ ] Native monitoring → iOS background monitoring works

#### **Step 2.3: Switch to Zustand**
```typescript
// Make the switch permanent
FEATURE_FLAGS.USE_ZUSTAND_PRAYLOCK = true;
```

#### **Step 2.4: Validate & Clean Up**
- [ ] Full PRAYLOCK testing (repeat Phase 1 PRAYLOCK tests)
- [ ] Remove old `usePraylock` hook (if tests pass)
- [ ] Remove PRAYLOCK feature flag

#### **Phase 2 Results**
```
Date: ___________
Tester: ___________

Zustand PRAYLOCK Tests: [ PASS / FAIL ] Notes: ________________
Performance Improvement: [ YES / NO ] Notes: ________________
Ready for Phase 3: [ YES / NO ]
```

---

### **Phase 3: Home State Migration** 🏠
**Goal**: Migrate home screen data to centralized store

#### **Step 3.1: Enable Feature Flag**
```typescript
FEATURE_FLAGS.USE_ZUSTAND_HOME = false; // Start with false
```

**Update Files**:
- [ ] `app/(app)/(tabs)/home/index.tsx` - Add conditional hook usage

#### **Step 3.2: Test Zustand Home Store**
```typescript
// Temporarily set to true for testing  
FEATURE_FLAGS.USE_ZUSTAND_HOME = true;
```

**Test All Home Functions**:
- [ ] Prayer data loading → Morning/evening prayers display
- [ ] Prayer people avatars → Images show in PrayerCard
- [ ] Task completion tracking → Correct states in DailyPrayerTasks
- [ ] Challenge progress → Unlock states correct
- [ ] Refresh behaviors → Focus/foreground/manual all work

#### **Step 3.3: Switch to Zustand**
```typescript
// Make the switch permanent
FEATURE_FLAGS.USE_ZUSTAND_HOME = true;
```

#### **Step 3.4: Validate & Clean Up**
- [ ] Full home screen testing (repeat Phase 1 home tests)
- [ ] Remove old `useHomeScreen` hooks (if tests pass)
- [ ] Remove home feature flag

#### **Phase 3 Results**
```
Date: ___________  
Tester: ___________

Zustand Home Tests: [ PASS / FAIL ] Notes: ________________
Prayer People Fixed: [ YES / NO ] Notes: ________________
Performance Improvement: [ YES / NO ] Notes: ________________
Ready for Phase 4: [ YES / NO ]
```

---

### **Phase 4: Integration Testing** 🧪
**Goal**: Ensure all systems work together perfectly

#### **End-to-End Test Scenarios**
- [ ] **Complete PRAYLOCK Flow**
  1. Enable PRAYLOCK
  2. Open blocked app → See shield
  3. Tap "I'll Pray Now" → Navigate to prayer
  4. Complete prayer → Apps unblock
  5. Check home screen → All states correct

- [ ] **Prayer → Challenge Flow**
  1. Complete morning prayer
  2. Check challenge progress updates
  3. Verify day unlock if applicable

- [ ] **Network Failure Recovery**
  1. Turn off network
  2. Complete prayer → Should queue locally
  3. Turn on network → Should sync automatically

- [ ] **App State Transitions**
  1. Background app during prayer
  2. Restore app → All state preserved
  3. Force close and reopen → State restored from persistence

#### **Phase 4 Results**
```
Date: ___________
Tester: ___________

PRAYLOCK E2E: [ PASS / FAIL ] Notes: ________________
Prayer-Challenge: [ PASS / FAIL ] Notes: ________________
Network Recovery: [ PASS / FAIL ] Notes: ________________
App Transitions: [ PASS / FAIL ] Notes: ________________

MIGRATION COMPLETE: [ YES / NO ]
```

---

## 🛡️ **Rollback Procedures**

### **Immediate Rollback** (Emergency)
If ANY test fails during migration:

1. **Flip feature flag back to `false`**:
   ```typescript
   FEATURE_FLAGS.USE_ZUSTAND_PRAYLOCK = false;
   FEATURE_FLAGS.USE_ZUSTAND_HOME = false;
   ```

2. **Test immediately** to confirm rollback works

3. **Debug issue** while old system is running

4. **Fix and re-test** before attempting migration again

### **Rollback Test Checklist**
- [ ] PRAYLOCK enable/disable works
- [ ] Prayer people avatars display  
- [ ] All home screen data loads
- [ ] Task completion states correct
- [ ] App behaves exactly as before migration attempt

---

## 📁 **File Changes Tracking**

### **New Files Created**
- [ ] `src/stores/praylockStore.ts` ✅ (Already exists)
- [ ] `src/stores/homeStore.ts` ✅ (Already exists)  
- [ ] `src/hooks/usePraylockSimple.ts` ✅ (Already exists)
- [ ] `src/hooks/useHomeScreenSimple.ts` ✅ (Already exists)
- [ ] `src/config/featureFlags.ts` (To be created)

### **Files to Modify**
- [ ] `app/(app)/(tabs)/home/index.tsx` - Add feature flag conditionals
- [ ] `app/(app)/praylock-setup.tsx` - Add feature flag conditionals

### **Files to Remove (After Success)**
- [ ] `src/hooks/usePraylock.ts` (Keep until Phase 2 complete)
- [ ] `src/hooks/useHomeScreen.ts` (Keep until Phase 3 complete)
- [ ] `src/hooks/useHomeScreenSafe.ts` (Keep until Phase 3 complete)

---

## 🏁 **Success Metrics**

### **Technical Metrics**
- [ ] PRAYLOCK icon updates instantly (< 100ms)
- [ ] Prayer people avatars always display
- [ ] No React warnings in console
- [ ] No memory leaks detected
- [ ] Bundle size unchanged or smaller

### **User Experience Metrics**  
- [ ] No visual glitches during state changes
- [ ] All animations work smoothly
- [ ] App feels more responsive
- [ ] No unexpected loading states

### **Reliability Metrics**
- [ ] All offline scenarios work
- [ ] App state persists across restarts
- [ ] Background/foreground transitions smooth
- [ ] Deep linking works in all scenarios

---

## 🚨 **Known Risks & Mitigations**

| Risk | Impact | Mitigation |
|------|--------|------------|
| State sync breaks | High | Feature flags for instant rollback |
| Prayer completion fails | Critical | Extensive testing + queue system backup |
| Native iOS monitoring breaks | High | Test on device before each phase |
| Performance regression | Medium | Measure before/after, rollback if slower |
| Data persistence fails | High | Test app restart scenarios thoroughly |

---

## 📞 **Emergency Contacts**

- **Rollback Decision**: Immediate - any team member can rollback
- **Technical Issues**: Review this document first, then debug systematically
- **Testing Blockers**: Skip to next phase if current phase tests pass

---

## ✅ **Migration Checklist Summary**

- [ ] **Phase 1**: Baseline testing complete
- [x] **Phase 2**: PRAYLOCK migrated successfully  
- [ ] **Phase 3**: Home screen migrated successfully
- [ ] **Phase 4**: Integration testing passed
- [ ] **Cleanup**: Old code removed, feature flags removed
- [ ] **Documentation**: AGENT.md updated with new patterns

**Migration Status**: 🟡 Ready to Begin

---

*This document should be updated at each checkpoint with actual test results and any issues encountered.*
