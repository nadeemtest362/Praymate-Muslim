# Compat Hooks Migration Plan

## 🎯 **Goal**: Safely remove compatibility layers and migrate to pure React Query

**Priority**: Medium - Clean up technical debt without breaking functionality  
**Estimated Time**: 4-6 hours across multiple sessions  
**Files Affected**: 9 components + 2 compat hooks

---

## 📊 **Current State Analysis**

### `usePeopleCompat.ts` Usage (6 files)
- **Heavy users**: `useAddIntention.ts`, `useAddIntentionFlow.ts`
- **Simple data users**: `useIntentions.ts`, `contact-detail.tsx`
- **Modal users**: `manage-modal.tsx`, `add-intention-app.tsx`

### `useIntentionsCompat.ts` Usage (4 files)  
- **Complex users**: `useAddIntention.ts`, `useIntentions.ts`
- **Simple users**: `useOnboardingAddIntention.ts`, `intention-review.tsx`

---

## 🔍 **Migration Complexity Assessment**

### **Low Complexity** (Direct 1:1 mapping)
| File | Compat Hook | Direct Replacement | Effort |
|------|-------------|-------------------|--------|
| `contact-detail.tsx` | `usePeopleCompatible` | `usePeople`, `useUpdatePerson`, `useDeletePerson` | 30min |
| `add-intention-app.tsx` | `usePeopleCompatible` | `usePeople`, `useAllPeople` | 15min |
| `intention-review.tsx` | `useIntentionsCompat` | `useIntentions`, `useToggleIntentionActive` | 20min |
| `useOnboardingAddIntention.ts` | `useIntentionsCompat` | `useCreateIntention` | 15min |

### **Medium Complexity** (Minor logic adjustments)
| File | Issue | Solution | Effort |
|------|-------|----------|--------|
| `manage-modal.tsx` | Uses fetch patterns | Replace with React Query `refetch()` | 45min |
| `useAddIntentionFlow.ts` | Custom fetch logic | Use React Query invalidation | 30min |

### **High Complexity** (Significant refactoring needed)
| File | Issue | Solution | Effort |
|------|-------|----------|--------|
| `useAddIntention.ts` | Uses both compat hooks heavily + complex state | Split into multiple React Query hooks | 2hrs |
| `useIntentions.ts` | Uses `getGroupedIntentions` + computed data | Implement computed logic with `useMemo` | 1.5hrs |

---

## 🚀 **Safe Migration Strategy**

### **Phase 1**: Simple Migrations (1-2 hours)
Low-risk files with direct 1:1 mapping

1. **`intention-review.tsx`**
   ```typescript
   // Before
   const { intentions, toggleActive } = useIntentionsCompat();
   
   // After  
   const { data: intentions } = useIntentions(user?.id);
   const toggleActiveMutation = useToggleIntentionActive();
   ```

2. **`contact-detail.tsx`**
   ```typescript
   // Before
   const { updatePrayerPerson, removePrayerPerson } = usePeopleCompatible();
   
   // After
   const updatePersonMutation = useUpdatePerson();
   const deletePersonMutation = useDeletePerson();
   ```

3. **`add-intention-app.tsx`** & **`useOnboardingAddIntention.ts`**
   - Direct hook replacements
   - No state logic changes needed

### **Phase 2**: Medium Complexity (1 hour)
Minor logic adjustments for fetch patterns

4. **`manage-modal.tsx`**
   ```typescript
   // Before
   const { fetchAllPrayerPeople } = usePeopleCompatible();
   
   // After
   const { refetch } = useAllPeople(user?.id);
   ```

5. **`useAddIntentionFlow.ts`**
   - Replace compat fetch with React Query invalidation
   - Use mutation `onSuccess` callbacks

### **Phase 3**: Complex Migrations (3.5 hours)
High-impact files requiring careful refactoring

6. **`useIntentions.ts`**
   - Extract `getGroupedIntentions` logic into `useMemo`
   - Replace compat computed methods with direct React Query
   - **Strategy**: Keep existing interface, change implementation

7. **`useAddIntention.ts`** (Most complex)
   - Split compat usage into individual React Query hooks
   - Preserve all existing state management logic
   - **Strategy**: Incremental replacement, test each step

---

## 🛡️ **Risk Mitigation**

### **Testing Strategy**
1. **Test after each phase** - Don't batch multiple files
2. **Focus on key flows**:
   - Add new intention (person + intention)
   - Edit existing intention  
   - Delete person/intention
   - Onboarding flow
3. **Verify data consistency** - Check React Query cache invalidation

### **Rollback Plan**
- Keep compat hooks until all migrations complete
- Each file migration is atomic (complete or rollback)
- Test with `npm start` after each file

### **Breaking Change Prevention**
- Maintain exact same component interfaces
- No props changes to parent components
- Preserve all loading states and error handling

---

## 📋 **Execution Plan**

### **Day 1** (2 hours): Foundation
1. **Phase 1**: Migrate 4 simple files
   - `intention-review.tsx` (20 min)
   - `contact-detail.tsx` (30 min)  
   - `add-intention-app.tsx` (15 min)
   - `useOnboardingAddIntention.ts` (15 min)
   - **Test thoroughly** (40 min)

### **Day 2** (1 hour): Medium Complexity  
2. **Phase 2**: Migrate fetch patterns
   - `manage-modal.tsx` (45 min)
   - `useAddIntentionFlow.ts` (30 min)
   - **Test thoroughly** (25 min)

### **Day 3** (3.5 hours): Complex Refactoring
3. **Phase 3**: High-complexity files
   - `useIntentions.ts` (1.5 hrs)
   - **Test intention displays** (30 min)
   - `useAddIntention.ts` (2 hrs)
   - **Full flow testing** (30 min)

### **Day 4** (30 min): Cleanup
4. **Remove compat hooks**
   - Delete `usePeopleCompat.ts`
   - Delete `useIntentionsCompat.ts`  
   - Update imports (if any lingering references)
   - **Final testing** (15 min)

---

## ✅ **Success Criteria**

### **Functional Requirements**
- [ ] All intention CRUD operations work
- [ ] All people CRUD operations work  
- [ ] Onboarding flow creates intentions correctly
- [ ] Contact detail editing/deletion works
- [ ] React Query cache invalidation works properly

### **Code Quality**
- [ ] No compat hook imports remain
- [ ] All TypeScript errors resolved
- [ ] No console errors in app
- [ ] Loading states preserved
- [ ] Error handling maintained

### **Performance**
- [ ] No unnecessary re-renders introduced
- [ ] React Query caching working optimally
- [ ] Network request patterns unchanged

---

## 🚨 **Migration Notes**

### **Key Differences to Watch**
1. **Loading States**: Compat hooks aggregate loading - React Query hooks are individual
2. **Error Handling**: Compat hooks centralize errors - React Query requires per-hook handling  
3. **Cache Invalidation**: Compat methods trigger invalidation - React Query requires manual orchestration
4. **Optimistic Updates**: React Query provides this automatically in mutations

### **Data Flow Changes**
```typescript
// BEFORE (Compat)
const { prayerPeople, addPrayerPersonAndIntention } = usePeopleCompatible();

// AFTER (Pure React Query) 
const { data: prayerPeople } = usePeople(user?.id, { activeOnly: true });
const addPersonMutation = useAddPersonWithIntention();
```

---

## 🔗 **Related Documentation**
- React Query migration docs: `docs/archive/`
- Modern architecture guide: `AGENT.md`
- Query keys: `src/lib/queryClient.ts`

This plan ensures safe, incremental migration with comprehensive testing at each step.
