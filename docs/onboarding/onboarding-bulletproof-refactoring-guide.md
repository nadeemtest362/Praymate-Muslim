# Onboarding SDUI Screens - Bulletproofing Refactoring Guide

This guide shows how to refactor existing onboarding SDUI screens to use our bulletproof components and patterns.

## Quick Reference

### Available Bulletproof Components

```typescript
import {
  // Error handling
  withSimpleFallback,        // Wrap screens with error boundary
  OnboardingFallback,        // Generic fallback component
  
  // Session management
  useSessionManager,         // Hook for session state
  withSessionProtection,     // HOC for session protection
  
  // Crash recovery
  useCrashRecovery,         // Hook for crash detection
  withCrashRecovery,        // HOC for crash recovery
  
  // Navigation protection
  useNavigationGuard,       // Hook for navigation tracking
  withNavigationGuard,      // HOC for navigation guard
  
  // Screen instances
  useScreenInstance,        // Hook to prevent duplicates
  ScreenInstanceGuard,      // Component wrapper
  withScreenInstanceProtection,  // HOC version
} from '@/lib/onboarding';
```

## Refactoring Patterns

### Pattern 1: Minimal Protection (Quick Win)

For a fast improvement with minimal changes:

```typescript
// BEFORE: Vulnerable screen
export function PrayerPeopleScreen({ config, onNext }) {
  return (
    <View>
      <Text>{config.title}</Text>
      <Button title="Continue" onPress={onNext} />
    </View>
  );
}

// AFTER: With basic protection
import { withSimpleFallback, ScreenInstanceGuard } from '@/lib/onboarding';

// Wrap with error boundary
const SafePrayerPeopleScreen = withSimpleFallback(
  PrayerPeopleScreen,
  'prayer-people'
);

// Then wrap with instance guard in your SDUI renderer
<ScreenInstanceGuard screenName="prayer-people">
  <SafePrayerPeopleScreen config={config} onNext={onNext} />
</ScreenInstanceGuard>
```

### Pattern 2: Progressive Enhancement

Add features incrementally based on needs:

```typescript
// Phase 1: Add error boundary
export default withSimpleFallback(YourScreen, 'screen-name');

// Phase 2: Add crash recovery
export default withCrashRecovery(
  withSimpleFallback(YourScreen, 'screen-name')
);

// Phase 3: Add session protection
export default withSessionProtection(
  withCrashRecovery(
    withSimpleFallback(YourScreen, 'screen-name')
  )
);

// Phase 4: Add navigation guard
export default withNavigationGuard(
  withSessionProtection(
    withCrashRecovery(
      withSimpleFallback(YourScreen, 'screen-name')
    )
  )
);
```

### Pattern 3: Full Integration with Hooks

For complete bulletproofing with fine control:

```typescript
import React, { useEffect, useState } from 'react';
import {
  withSimpleFallback,
  useSessionManager,
  useCrashRecovery,
  useNavigationGuard,
  useScreenInstance,
} from '@/lib/onboarding';

function PrayerPeopleScreenCore({ config, onNext }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Add all bulletproof hooks
  const sessionState = useSessionManager();
  const { isChecking, handleRecovery, hasCrashed } = useCrashRecovery();
  const navGuard = useNavigationGuard();
  const { isDuplicate } = useScreenInstance('prayer-people');
  
  // Prevent duplicate instances
  if (isDuplicate) {
    console.warn('Duplicate screen prevented');
    return null;
  }
  
  // Track navigation
  useEffect(() => {
    OnboardingNavigationGuard.getInstance().recordNavigation('prayer-people');
  }, []);
  
  // Check for crash recovery
  useEffect(() => {
    if (hasCrashed) {
      handleRecovery();
    }
  }, [hasCrashed]);
  
  // Save progress periodically
  useEffect(() => {
    const timer = setInterval(() => {
      OnboardingCrashRecovery.getInstance().saveProgress({
        currentScreen: 'prayer-people',
        data: { people }
      });
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(timer);
  }, [people]);
  
  // Enhanced submit with session check
  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Session is checked automatically by the hook
      if (!sessionState.isValid) {
        console.warn('Session invalid');
        return;
      }
      
      // Your existing logic
      await savePeople(people);
      
      // Clear saved progress on success
      await OnboardingCrashRecovery.getInstance().clearProgress();
      
      onNext();
    } catch (error) {
      // Errors are handled by the error boundary
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View>
      <Text>{config.title}</Text>
      {/* Your UI */}
      <Button 
        title="Continue" 
        onPress={handleSubmit}
        disabled={loading || people.length === 0}
      />
    </View>
  );
}

// Export with error boundary
export default withSimpleFallback(PrayerPeopleScreenCore, 'prayer-people');
```

## Step-by-Step Refactoring Checklist

For each SDUI screen:

- [ ] **1. Add Error Boundary**
  ```typescript
  export default withSimpleFallback(YourScreen, 'screen-name');
  ```

- [ ] **2. Prevent Duplicate Instances**
  ```typescript
  const { isDuplicate } = useScreenInstance('screen-name');
  if (isDuplicate) return null;
  ```

- [ ] **3. Add Crash Recovery**
  ```typescript
  const { hasCrashed, handleRecovery } = useCrashRecovery();
  // Save progress periodically
  // Offer recovery on mount
  ```

- [ ] **4. Track Navigation**
  ```typescript
  useEffect(() => {
    OnboardingNavigationGuard.getInstance().recordNavigation('screen-name');
  }, []);
  ```

- [ ] **5. Monitor Session**
  ```typescript
  const sessionState = useSessionManager();
  // Check sessionState.isValid before critical operations
  ```

- [ ] **6. Add Loading States**
  ```typescript
  if (loading) return <LoadingSpinner />;
  if (sessionState.isRefreshing) return <RefreshingSession />;
  ```

- [ ] **7. Handle Errors Gracefully**
  ```typescript
  // Let error boundary catch rendering errors
  // Show user-friendly messages for operational errors
  ```

- [ ] **8. Test Edge Cases**
  - Kill app mid-screen
  - Toggle airplane mode
  - Background/foreground app
  - Rapid navigation

## Common Patterns for SDUI Screens

### Data Collection Screens (e.g., prayer-people, add-intention)

```typescript
function DataCollectionScreen({ config, onNext }) {
  // 1. State for collected data
  const [data, setData] = useState([]);
  
  // 2. Bulletproof hooks
  const sessionState = useSessionManager();
  const { isDuplicate } = useScreenInstance(config.screenType);
  
  // 3. Crash recovery with auto-save
  useEffect(() => {
    const timer = setInterval(() => {
      OnboardingCrashRecovery.getInstance().saveProgress({
        currentScreen: config.screenType,
        data: { items: data }
      });
    }, 30000);
    
    return () => clearInterval(timer);
  }, [data]);
  
  // 4. Protected submit
  const handleSubmit = async () => {
    if (!sessionState.isValid) return;
    
    try {
      await saveData(data);
      await OnboardingCrashRecovery.getInstance().clearProgress();
      onNext();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };
  
  if (isDuplicate) return null;
  
  return (
    <SafeAreaView>
      {/* Your UI */}
    </SafeAreaView>
  );
}

export default withSimpleFallback(DataCollectionScreen, 'data-collection');
```

### Selection Screens (e.g., mood, preferences)

```typescript
function SelectionScreen({ config, onNext }) {
  const [selected, setSelected] = useState(null);
  
  // Restore selection from crash
  const { hasCrashed } = useCrashRecovery();
  
  useEffect(() => {
    if (hasCrashed) {
      OnboardingCrashRecovery.getInstance().getProgress().then(progress => {
        if (progress?.data?.selected) {
          setSelected(progress.data.selected);
        }
      });
    }
  }, [hasCrashed]);
  
  // Save selection on change
  useEffect(() => {
    if (selected) {
      OnboardingCrashRecovery.getInstance().saveProgress({
        currentScreen: config.screenType,
        data: { selected }
      });
    }
  }, [selected]);
  
  return (
    <View>
      {/* Selection UI */}
    </View>
  );
}
```

### Loading/Processing Screens

```typescript
function ProcessingScreen({ config, onNext }) {
  const [progress, setProgress] = useState(0);
  const sessionState = useSessionManager();
  
  useEffect(() => {
    const process = async () => {
      try {
        // Check session before long operation
        if (!sessionState.isValid) {
          console.warn('Session invalid');
          return;
        }
        
        // Simulate processing
        for (let i = 0; i <= 100; i += 10) {
          setProgress(i);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Save progress for recovery
          await OnboardingCrashRecovery.getInstance().saveProgress({
            currentScreen: config.screenType,
            data: { progress: i }
          });
        }
        
        onNext();
      } catch (error) {
        console.error('Processing failed:', error);
      }
    };
    
    process();
  }, []);
  
  return (
    <View>
      <Text>Processing... {progress}%</Text>
    </View>
  );
}
```

## Migration Strategy

### Phase 1: Critical Screens 
1. **prayer-people.tsx** - User data collection
2. **add-intention.tsx** - Critical user input
3. **first-prayer.tsx** - Key experience screen

### Phase 2: Navigation Screens 
4. **mood.tsx** - Selection screen
5. **preferences.tsx** - User settings
6. **prayer-needs.tsx** - Data collection

### Phase 3: Supporting Screens 
7. Loading screens
8. Confirmation screens
9. Information screens

## Testing Refactored Screens

### Manual Test Scenarios

1. **Crash Recovery Test**
   - Fill form halfway
   - Kill app
   - Reopen and verify data restored

2. **Session Timeout Test**
   - Start onboarding
   - Wait for session to expire
   - Verify refresh happens automatically

3. **Navigation Loop Test**
   - Navigate back and forth rapidly
   - Verify loop detection alert

4. **Duplicate Screen Test**
   - Try to open same screen twice
   - Verify only one instance exists

5. **Network Failure Test**
   - Toggle airplane mode during submit
   - Verify graceful error handling

### Automated Tests

```typescript
describe('Bulletproof Prayer People Screen', () => {
  it('should recover from crash', async () => {
    // Simulate crash with saved data
    await AsyncStorage.setItem('onboarding_progress', JSON.stringify({
      currentScreen: 'prayer-people',
      data: { people: [{ name: 'John' }] }
    }));
    
    const { getByText } = render(<PrayerPeopleScreen />);
    
    // Should restore data
    expect(getByText('John')).toBeTruthy();
  });
  
  it('should prevent duplicate instances', () => {
    const { rerender } = render(<PrayerPeopleScreen />);
    const consoleSpy = jest.spyOn(console, 'warn');
    
    // Try to render again
    rerender(<PrayerPeopleScreen />);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate')
    );
  });
});
```

## Monitoring & Metrics

After refactoring, monitor:

1. **Error Rates**
   - Crash frequency
   - Error boundary triggers
   - Network failures

2. **Recovery Success**
   - Crash recovery usage
   - Session refresh success
   - Navigation loop detection

3. **User Experience**
   - Onboarding completion rates
   - Time to complete
   - Drop-off points

## Best Practices

1. **Start Simple**
   - Add error boundary first
   - Test thoroughly
   - Add features incrementally

2. **Preserve Existing Logic**
   - Don't rewrite business logic
   - Just add protection layers
   - Keep changes minimal

3. **Test in Production-like Environment**
   - Use release builds
   - Test on real devices
   - Simulate real network conditions

4. **Document Changes**
   - Note which protections were added
   - Document any behavior changes
   - Update component documentation

## Troubleshooting

### Common Issues

1. **"Maximum update depth exceeded"**
   - Check useEffect dependencies
   - Avoid state updates in render

2. **Session refresh loops**
   - Verify refresh logic
   - Check token expiry times

3. **Navigation guards too sensitive**
   - Adjust loop detection threshold
   - Consider legitimate use cases

4. **Performance impact**
   - Use React.memo where appropriate
   - Debounce progress saves
   - Profile with React DevTools

## Summary

Bulletproofing onboarding screens is about adding layers of protection without disrupting the existing flow. Start with the most critical screens, add basic protection first, then enhance based on real-world issues. The goal is resilience, not perfection. 