> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Expo Router Authentication Restructure Plan

## Executive Summary

The current authentication system uses complex imperative navigation that fights against Expo Router's declarative patterns. This plan restructures the app to use Expo Router's official `Stack.Protected` approach, then completes the React Query migration within that proper architecture.

## Current Problems

### ❌ What's Wrong Now
1. **100+ lines of complex navigation logic** in `app/_layout.tsx` manually redirecting users
2. **Race conditions** between auth loading, profile loading, and navigation
3. **No true route protection** - relies on imperative redirects that can be bypassed
4. **Against Expo Router best practices** - not using declarative route protection
5. **Fighting the framework** - trying to do manual navigation management

### ✅ Expo Router Best Practice
Use `Stack.Protected` with `guard` props for declarative route protection:

```typescript
<Stack>
  <Stack.Protected guard={isAuthenticated}>
    <Stack.Screen name="(app)" />
  </Stack.Protected>
  
  <Stack.Protected guard={!isAuthenticated}>
    <Stack.Screen name="(auth)" />
  </Stack.Protected>
</Stack>
```

## New Architecture Plan

### Phase 1: Route Structure Redesign

#### 1.1 New Route Group Structure
```
app/
├── _layout.tsx                    # Root layout with Stack.Protected
├── index.tsx                      # Landing/loading screen
├── (auth)/                        # Unauthenticated routes
│   ├── _layout.tsx               # Auth stack layout
│   ├── sign-in.tsx               # Login screen
│   ├── sign-up.tsx               # Registration screen
│   └── password-reset.tsx        # Password reset screen
├── (onboarding)/                  # Authenticated but incomplete onboarding
│   ├── _layout.tsx               # Existing SDUI onboarding system
│   └── [step].tsx                # Dynamic onboarding steps
└── (app)/                         # Fully authenticated users
    ├── _layout.tsx               # Main app layout
    ├── (tabs)/                   # Tab navigation
    │   ├── _layout.tsx
    │   ├── home.tsx
    │   ├── plan.tsx
    │   ├── intentions.tsx
    │   └── profile.tsx
    └── modal/                    # Modal screens
        ├── prayer-display.tsx
        ├── intention-review.tsx
        └── praylock-setup.tsx
```

#### 1.2 Authentication States & Route Guards

**Authentication States:**
1. **Loading** - Auth initialization in progress
2. **Unauthenticated** - No session
3. **Authenticated (Incomplete)** - Session exists, needs onboarding
4. **Authenticated (Complete)** - Session exists, onboarding complete

**Route Guard Logic:**
```typescript
const isLoading = authLoading;
const isAuthenticated = !!session && !!user;
const needsOnboarding = isAuthenticated && (!profile || !profile.has_completed_onboarding);
const isFullyAuthenticated = isAuthenticated && !needsOnboarding;
```

### Phase 2: Root Layout Implementation

#### 2.1 New `app/_layout.tsx` (Declarative)

```typescript
import { Stack } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import AuthLoadingScreen from '../src/components/auth/AuthLoadingScreen';

function RootLayout() {
  const { session, user, profile, isLoading } = useAuth();

  // Show loading while auth initializes
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Calculate guard conditions
  const isAuthenticated = !!session && !!user;
  const needsOnboarding = isAuthenticated && (!profile || !profile.has_completed_onboarding);
  const isFullyAuthenticated = isAuthenticated && !needsOnboarding;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Unauthenticated routes */}
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Authenticated but needs onboarding */}
      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      {/* Fully authenticated routes */}
      <Stack.Protected guard={isFullyAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      {/* Always accessible - landing/loading */}
      <Stack.Screen name="index" />
    </Stack>
  );
}

export default function RootLayoutWithProviders() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
        <OnboardingFlowProvider>
          <RealtimeProvider>
            <AppStateProvider>
              <RootLayout />
            </AppStateProvider>
          </RealtimeProvider>
        </OnboardingFlowProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
```

#### 2.2 Benefits of This Approach

✅ **Declarative** - Route protection is explicit and clear
✅ **No manual navigation** - Expo Router handles redirects automatically
✅ **No race conditions** - Guards are evaluated reactively
✅ **True route protection** - Routes are actually inaccessible, not just redirected
✅ **Follows Expo best practices** - Uses official Stack.Protected pattern
✅ **Maintainable** - Simple guard logic vs 100+ lines of navigation code

### Phase 3: Route Group Implementations

#### 3.1 Auth Group: `app/(auth)/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="password-reset" />
    </Stack>
  );
}
```

#### 3.2 Move Auth Screens

- Move `src/screens/auth/LoginScreen.tsx` → `app/(auth)/sign-in.tsx`
- Move `src/screens/auth/RegisterScreen.tsx` → `app/(auth)/sign-up.tsx`
- Move `src/screens/auth/PasswordResetScreen.tsx` → `app/(auth)/password-reset.tsx`

#### 3.3 Update App Group Layout: `app/(app)/_layout.tsx`

Remove existing auth checks since protection is handled at root level:

```typescript
import { Stack } from 'expo-router';

export default function AppLayout() {
  // No auth checks needed - protected at root level
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      
      {/* Modal screens */}
      <Stack.Screen 
        name="modal/prayer-display" 
        options={{ presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="modal/intention-review" 
        options={{ presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="modal/praylock-setup" 
        options={{ presentation: 'modal' }} 
      />
    </Stack>
  );
}
```

#### 3.4 Keep Onboarding As-Is

The `(onboarding)` group already works well with SDUI. Only change needed:

```typescript
// app/(onboarding)/_layout.tsx
export default function OnboardingLayout() {
  // Remove auth checks - protected at root level
  // Keep existing SDUI logic
  
  return (
    <OnboardingProvider>
      {/* Existing SDUI implementation */}
    </OnboardingProvider>
  );
}
```

### Phase 4: Deep Links & Navigation

#### 4.1 Update Deep Link Handling

Move deep link logic from root layout to app group:

```typescript
// app/(app)/_layout.tsx
useEffect(() => {
  const handleDeepLink = (url: string) => {
    if (url.startsWith('justpray://prayer')) {
      router.push('/(tabs)/home?deeplink=prayer');
    }
  };

  Linking.getInitialURL().then(handleDeepLink);
  const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
  return () => subscription?.remove();
}, []);
```

#### 4.2 Navigation Utilities

Update navigation utilities to work with new structure:

```typescript
// src/utils/navigationHelpers.ts
export const navigateToAuth = () => router.push('/(auth)/sign-in');
export const navigateToApp = () => router.push('/(app)/(tabs)/home');
export const navigateToOnboarding = () => router.push('/(onboarding)');
```

### Phase 5: React Query Migration (After Route Restructure)

Once routes are properly protected, complete the React Query migration:

#### 5.1 Clean Migration Path

With proper route protection, auth migration becomes safer:

1. ✅ Routes are truly protected (not just redirected)
2. ✅ No complex navigation logic to worry about
3. ✅ Clear auth state boundaries
4. ✅ Easier to test and debug

#### 5.2 Auth Hook Simplification

```typescript
// src/hooks/useAuth.ts - Simplified for route protection
export const useAuth = () => {
  const session = useSession();
  const profile = useProfile(session.user?.id);

  return {
    // Simple state for route guards
    session: session.session,
    user: session.user,
    profile: profile.profile,
    isLoading: session.isLoading || profile.isLoading,
    
    // Actions
    signIn: session.signIn,
    signUp: session.signUp,
    signOut: session.signOut,
    // ... other actions
  };
};
```

## Implementation Timeline

### Week 1: Route Structure Foundation ⚡ IN PROGRESS
- [ ] Create `(auth)` group and move auth screens **← NEXT**
- [✅] Implement new root layout with `Stack.Protected` **DONE**
- [✅] Update `(app)` group layout (remove auth checks) **DONE**
- [✅] Fix white flash and animation issues **DONE**
- [ ] Test basic route protection

### Week 2: Deep Links & Navigation
- [ ] Move deep link handling to appropriate layouts
- [ ] Update navigation utilities
- [ ] Test navigation flows
- [ ] Update onboarding layout (remove auth checks)

### Week 3: React Query Migration (Clean)
- [ ] Complete auth store migration (now safe)
- [ ] Remove legacy auth store
- [ ] Update all components to use React Query auth
- [ ] Remove feature flags

### Week 4: Testing & Polish
- [ ] Comprehensive auth flow testing
- [ ] Performance testing
- [ ] Edge case handling
- [ ] Documentation updates

## Risk Mitigation

### High-Risk Areas

1. **Existing Deep Links**: Route structure changes might break deep links
   - **Mitigation**: Comprehensive deep link testing
   - **Rollback**: Keep old route structure in feature flag

2. **Onboarding Flow**: Complex SDUI system might be affected
   - **Mitigation**: Preserve existing onboarding logic, only remove auth checks
   - **Rollback**: Isolated changes, easy to revert

3. **User Sessions**: Route protection changes might affect session handling
   - **Mitigation**: Thorough testing of auth flows
   - **Rollback**: Feature flag for old vs new routing

### Testing Strategy

```typescript
// Test all authentication states and route access
describe('Route Protection', () => {
  it('redirects unauthenticated users to (auth)', () => {
    // Test unauthenticated access to (app) routes
  });

  it('redirects incomplete users to (onboarding)', () => {
    // Test authenticated but incomplete onboarding
  });

  it('allows full access for completed users', () => {
    // Test fully authenticated access
  });
});
```

## Success Criteria

### Technical Completion
- [✅] Zero imperative navigation in root layout **DONE**
- [✅] All routes use `Stack.Protected` pattern **DONE**
- [ ] React Query migration complete
- [ ] All tests passing

### Functional Completion
- [ ] All auth flows work identically to before
- [ ] Deep links work correctly
- [ ] Onboarding flow unchanged
- [ ] No user-facing regressions

### Code Quality
- [ ] Follows Expo Router best practices
- [ ] Declarative route protection
- [ ] Maintainable architecture
- [ ] Clear auth state boundaries

## Files to Create/Modify

### New Files
- `app/(auth)/_layout.tsx`
- `app/(auth)/sign-in.tsx` (moved from src/screens/auth/)
- `app/(auth)/sign-up.tsx` (moved from src/screens/auth/)
- `app/(auth)/password-reset.tsx` (moved from src/screens/auth/)

### Modified Files
- [✅] `app/_layout.tsx` (complete rewrite) **DONE**
- [✅] `app/(app)/_layout.tsx` (remove auth checks) **DONE**
- [ ] `app/(onboarding)/_layout.tsx` (remove auth checks)
- [ ] All auth-related components (React Query migration)

### Deleted Files
- `src/navigation/RootNavigator.tsx` (no longer needed)
- `src/stores/authStore.ts` (after migration complete)
- `src/screens/auth/` directory (moved to app/(auth)/)

This plan follows Expo Router best practices and creates a maintainable, declarative authentication system that properly protects routes without complex imperative navigation logic.
