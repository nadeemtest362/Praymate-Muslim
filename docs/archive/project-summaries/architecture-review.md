> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Personal Prayers - Architecture Review & Recommendations

## Executive Summary

This document provides a comprehensive review of the current implementation and proposes specific improvements to enhance scalability, maintainability, and code elegance.

## Current State Analysis

### 1. Component Architecture

#### Issues Identified:
- **Monolithic Components**: Files exceeding 1000+ lines (add-intention-app.tsx: 1628 lines)
- **Mixed Concerns**: UI, business logic, and animations tightly coupled
- **Repeated Code**: Similar UI patterns implemented multiple times

#### Specific Examples:
```typescript
// add-intention-app.tsx has 15+ different handlers
const handleSave = async () => { /* 140 lines */ }
const handlePersonSelect = () => { /* ... */ }
const handleNeedSelect = () => { /* ... */ }
// ... 12 more handlers
```

### 2. State Management

#### Current Implementation:
- ✅ Good: Zustand stores for global state
- ❌ Issue: Excessive local state in components
- ❌ Issue: No clear separation between UI and business state

### 3. Performance Bottlenecks

#### Identified Issues:
- Large style objects created inline
- Missing memoization on expensive renders
- Unoptimized list rendering

## Recommended Refactoring

### 1. Component Decomposition

#### Break Down Large Components:

**Before:**
```typescript
// add-intention-app.tsx (1628 lines)
export default function AddPrayerScreen() {
  // 200+ lines of state and handlers
  // 800+ lines of JSX
  // 600+ lines of styles
}
```

**After:**
```typescript
// add-intention-app/index.tsx
export { default } from './AddIntentionScreen';

// add-intention-app/AddIntentionScreen.tsx
import { PersonSelector } from './components/PersonSelector';
import { NeedSelector } from './components/NeedSelector';
import { DetailsInput } from './components/DetailsInput';
import { useAddIntentionFlow } from './hooks/useAddIntentionFlow';

export default function AddIntentionScreen() {
  const {
    state,
    handlers,
    navigation
  } = useAddIntentionFlow();

  return (
    <AddIntentionProvider value={{ state, handlers }}>
      <AddIntentionLayout>
        <MadlibSentence />
        {navigation.showPersonSelector && <PersonSelector />}
        {navigation.showNeedSelector && <NeedSelector />}
        {navigation.showDetailsInput && <DetailsInput />}
      </AddIntentionLayout>
    </AddIntentionProvider>
  );
}
```

### 2. Shared Component Library

Create reusable components:

```typescript
// src/components/ui/Card.tsx
interface CardProps {
  variant: 'prayer' | 'intention' | 'person';
  gradient?: [string, string];
  children: React.ReactNode;
}

// src/components/ui/AnimatedBackground.tsx
export const AnimatedBackground = ({ type }: { type: 'particles' | 'stars' }) => {
  // Shared animation logic
};

// src/components/ui/Avatar.tsx (already exists, good!)
```

### 3. Custom Hooks for Business Logic

Extract complex logic into hooks:

```typescript
// src/hooks/usePrayerGeneration.ts
export const usePrayerGeneration = () => {
  const { user } = useAuthStore();
  const { prayerPeople } = usePrayerPeopleStore();
  
  const generatePrayer = useCallback(async (slot: 'morning' | 'evening') => {
    // Prayer generation logic
  }, [user, prayerPeople]);
  
  return { generatePrayer, isGenerating, error };
};

// src/hooks/useIntentionForm.ts
export const useIntentionForm = (editingId?: string) => {
  // All form state and validation logic
  return { form, errors, handlers, isValid };
};
```

### 4. Optimize Performance

#### Memoization Strategy:
```typescript
// Memoize expensive computations
const prayerSlides = useMemo(() => 
  generateSlidesFromPrayer(prayer, verse),
  [prayer, verse]
);

// Memoize child components
const MemoizedPrayerCard = React.memo(PrayerCard);

// Use virtualization for long lists
<FlashList
  data={intentions}
  renderItem={renderIntention}
  estimatedItemSize={80}
/>
```

### 5. Consistent Design System

Create a centralized theme system:

```typescript
// src/theme/index.ts
export const theme = {
  colors: {
    gradients: {
      morning: ['#2E7DAF', '#4D6AE3'],
      evening: ['#1A237E', '#311B92'],
      primary: ['#6C63FF', '#5A52E5'],
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '800' },
    h2: { fontSize: 24, fontWeight: '700' },
    body: { fontSize: 16, fontWeight: '500' },
  }
};
```

### 6. File Structure Reorganization

```
app/
  (app)/
    (tabs)/
      home/
        index.tsx
        components/
          PrayerCard.tsx
          DailyTasks.tsx
        hooks/
          useHomeData.ts
    add-intention/
      index.tsx
      components/
      hooks/
      types.ts
      
src/
  components/
    ui/           # Shared UI components
    features/     # Feature-specific components
  hooks/          # Shared hooks
  utils/          # Shared utilities
  services/       # API and business logic
  types/          # Shared TypeScript types
```

### 7. Testing Strategy

Add tests for critical paths:

```typescript
// __tests__/screens/AddIntention.test.tsx
describe('AddIntention Flow', () => {
  it('should complete the full intention creation flow', async () => {
    // Test the happy path
  });
  
  it('should handle errors gracefully', async () => {
    // Test error scenarios
  });
});
```

## Implementation Roadmap

### Phase 1: Component Extraction (Week 1)
1. Extract PersonSelector component from add-intention-app
2. Extract NeedSelector component
3. Extract DetailsInput component
4. Create shared Card component

### Phase 2: State Management (Week 2)
1. Create useAddIntentionFlow hook
2. Create usePrayerDisplay hook
3. Refactor home screen to use custom hooks

### Phase 3: Performance Optimization (Week 3)
1. Add memoization to expensive renders
2. Implement virtualized lists
3. Optimize animation components

### Phase 4: Design System (Week 4)
1. Create theme configuration
2. Update all components to use theme
3. Create component documentation

## Metrics for Success

- **File Size**: No component file > 500 lines
- **Performance**: Initial render < 16ms
- **Code Reuse**: 70% of UI components shared
- **Test Coverage**: 80% for critical flows

## Conclusion

These refactorings will significantly improve:
- **Maintainability**: Smaller, focused components
- **Scalability**: Modular architecture
- **Performance**: Optimized rendering
- **Developer Experience**: Clear patterns and structure 