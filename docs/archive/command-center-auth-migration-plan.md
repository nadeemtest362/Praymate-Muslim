# Command Center App Auth Migration Plan

## Overview

The `services/command-center-app` is a standalone React web application that currently uses Zustand for auth state management. It must be migrated to align with the main app's React Query auth architecture to complete the overall migration.

## Current State Analysis

### Legacy Auth Usage Found:
- **Store**: `src/stores/authStore.ts` (418 LOC) - Full Zustand auth implementation
- **Components**: 8 files with 22 `useAuthStore` import/usage instances
- **Pattern**: Uses same Supabase instance as main app but separate auth management

### Files Requiring Migration:
```bash
src/main.tsx (3 usages)
src/features/auth/sign-in/components/user-auth-form.tsx (2 usages)
src/utils/session-keeper.ts (6 usages) 
src/components/layout/nav-user.tsx (2 usages)
src/routes/_authenticated/debug.tsx (6 usages)
src/routes/_authenticated/route.tsx (4 usages)
src/features/flow-studio/preview/mocks/stores.ts (1 mock usage)
```

## Migration Strategy

### Option 1: Replicate React Query Auth (Recommended)
Create a React Query-based auth system in Command Center that mirrors the main app's `useAuth` hook.

**Pros:**
- Consistent architecture across all apps
- Shared patterns and concepts
- Independent deployment capability
- No cross-package dependencies

**Cons:**
- Some code duplication
- Requires implementing React Query auth hooks

### Option 2: Shared Auth Package (Future Enhancement)
Create a shared npm package with auth logic that both apps can use.

**Pros:**
- Zero duplication
- Single source of truth

**Cons:**
- Requires package setup and versioning
- Cross-package dependency management
- More complex build/deployment pipeline

## Implementation Plan - Option 1

### Phase 1: Create React Query Auth Infrastructure

1. **Create Auth Hook** - `src/hooks/useAuth.ts`
   ```typescript
   // Mirror the main app's useAuth interface
   export function useAuth() {
     // Session management with React Query
     // Profile management with React Query  
     // Auth actions (signIn, signOut, etc.)
   }
   ```

2. **Create Auth Repository** - `src/repositories/authRepository.ts`
   ```typescript
   // Supabase auth operations
   // Profile CRUD operations
   // Session management
   ```

3. **Add React Query Keys** - `src/lib/queryKeys.ts`
   ```typescript
   export const queryKeys = {
     session: () => ['session'],
     profile: (userId: string) => ['profile', userId],
   }
   ```

### Phase 2: Component Migration

1. **Simple Components** (Priority 1)
   - `nav-user.tsx` - Basic user display
   - `user-auth-form.tsx` - Sign-in form

2. **Complex Components** (Priority 2)  
   - `main.tsx` - App initialization and error handling
   - `route.tsx` - Route guards and auth checks

3. **Utility Files** (Priority 3)
   - `session-keeper.ts` - Remove or integrate with React Query
   - `debug.tsx` - Debug information display

### Phase 3: Cleanup

1. **Delete Legacy Files**
   - Remove `src/stores/authStore.ts`
   - Remove Zustand auth dependencies

2. **Update Dependencies**
   - Remove Zustand from package.json (if only used for auth)
   - Ensure React Query dependencies are present

## Implementation Steps

### Step 1: Setup React Query Auth Infrastructure

```typescript
// src/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { queryKeys } from '@/lib/queryKeys'

export function useAuth() {
  const queryClient = useQueryClient()
  
  // Session query
  const { data: session, isLoading } = useQuery({
    queryKey: queryKeys.session(),
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Profile query
  const { data: profile } = useQuery({
    queryKey: queryKeys.profile(session?.user?.id || ''),
    queryFn: async () => {
      if (!session?.user?.id) return null
      // Fetch profile from database
    },
    enabled: !!session?.user?.id,
  })

  // Auth mutations
  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string, password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session() })
    }
  })

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.clear() // Clear all cache on sign out
    }
  })

  return {
    // State
    user: session?.user || null,
    session,
    profile,
    isLoading,
    isAuthenticated: !!session?.user,
    
    // Actions
    signIn: signInMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    
    // Loading states
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
  }
}
```

### Step 2: Migration Pattern

**Before (Zustand):**
```typescript
import { useAuthStore } from '@/stores/authStore'

const { user, signOut, isLoading } = useAuthStore()
```

**After (React Query):**
```typescript
import { useAuth } from '@/hooks/useAuth'

const { user, signOut, isLoading } = useAuth()
```

### Step 3: Handle Imperative Access

**Before (getState):**
```typescript
const { user } = useAuthStore.getState()
```

**After (React Query Client):**
```typescript
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'

const session = queryClient.getQueryData(queryKeys.session())
const user = session?.user
```

## Testing Strategy

1. **Component Testing**: Verify each migrated component works with new auth hook
2. **Integration Testing**: Test sign-in/sign-out flows end-to-end
3. **Session Management**: Verify session persistence and refresh
4. **Error Handling**: Test auth error scenarios
5. **Route Guards**: Verify protected routes work correctly

## Risk Mitigation

1. **Gradual Migration**: Migrate one component at a time
2. **Feature Branch**: Keep changes in feature branch until complete
3. **Rollback Plan**: Keep Zustand store until all components migrated
4. **Session Compatibility**: Ensure session storage keys are compatible

## Timeline

- **Phase 1**: 2-3 hours - Setup React Query auth infrastructure
- **Phase 2**: 3-4 hours - Migrate all components  
- **Phase 3**: 1 hour - Cleanup and delete legacy files

**Total Estimated Time**: 6-8 hours

## Success Criteria

- ✅ Zero `useAuthStore` imports in Command Center app
- ✅ All auth flows work identically to before
- ✅ Session persistence works correctly
- ✅ No regressions in auth behavior
- ✅ Clean codebase with no technical debt

Once this migration is complete, the overall React Query auth migration will be ready for feature flag cleanup and final completion.
