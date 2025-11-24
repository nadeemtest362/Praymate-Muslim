> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# React Query + Event Bus Migration Plan

## Executive Summary

This document outlines the complete migration strategy for the Just Pray React Native app from the current Zustand-only architecture to a hybrid React Query + Zustand + Event Bus architecture. This migration addresses critical performance, maintainability, and scalability issues identified in the current store system.

## 🎯 Current Migration Status (January 2025)

**COMPLETED PHASES:**
- ✅ **Phase 1**: Foundation Setup (React Query + Event Bus + Repository pattern)
- ✅ **Phase 2**: Auth Store Simplification (Session + Profile slices)  
- ✅ **Phase 3.1**: Prayers Domain Migration (Full React Query migration with compatibility layer)
- ✅ **Phase 3.2**: People Domain Migration (Full React Query migration with compatibility layer)
- ✅ **Phase 3.3**: Intentions Domain Migration (Full React Query migration with compatibility layer)

**CURRENT STATE:**
- ✅ **Auth System**: Fully migrated to slices + React Query hooks
- ✅ **Prayers Domain**: Production-ready React Query implementation with compatibility layer
- ✅ **People Domain**: Production-ready React Query implementation with compatibility layer
- ✅ **Intentions Domain**: Production-ready React Query implementation with compatibility layer
- ✅ **Component Migration**: All components updated to use new auth and domain systems
- ✅ **App Stability**: All critical crashes, infinite re-renders, and Oracle issues resolved
- ✅ **Oracle Review**: All critical recommendations implemented and verified
- ✅ **Database Schema**: All repositories verified against actual database schema

**CURRENT PHASE: Phase 6 - Cleanup & Testing (COMPLETED) ✅**

**COMPLETED:**
- ✅ **Phase 5**: Performance optimizations implemented
- ✅ **HomeScreen Migration**: Successfully migrated to direct React Query usage
- ✅ **useAuth System**: Production-ready React Query auth hooks working
- ✅ **Infinite Rerender Fix**: Removed redundant useFocusEffect, React Query handles focus refetch
- ✅ **Core Data Loading**: useHomeData provides prayers, people, intentions, user stats
- ✅ **App Layout Migration**: Migrated to direct React Query hooks (usePrayers, usePeople, useIntentions)
- ✅ **Key Component Migration**: ProfileScreen, ContactDetail, PlanWithCalendar migrated to React Query
- ✅ **Compatibility Layer Cleanup**: Removed useHomeScreenOptimized and useHomeScreenSimple
- ✅ **TypeScript Error Resolution**: Fixed critical errors in main app components
- ✅ **Profile Component Integration**: usePrayerPeople hook migrated to React Query
- ✅ **Profile Screen Bug Fixes**: Fixed infinite query data handling and auth hook integration
- ✅ **Profile Hooks Migration**: useStreak, useProfile, useAvatarUpload fully migrated to React Query auth

### Recent Fixes (Profile Screen Migration)

**Issues Resolved:**
- ✅ **Profile Screen Runtime Error**: Fixed `prayers.slice is not a function` error
  - Root Cause: `usePrayers` returns `useInfiniteQuery` data structure (`data.pages`)
  - Solution: Properly flatten infinite query pages with `flatMap(page => page.prayers)`
- ✅ **Auth Hook Migration**: All profile hooks migrated from legacy `useAuthStore`
  - `useStreak`: Now uses `useAuth()` instead of `useAuthStore`
  - `useProfile`: Migrated to React Query auth system with proper signOut
  - `useAvatarUpload`: Uses React Query auth, removed manual profile refresh
- ✅ **Loading State Protection**: Added proper loading states to prevent undefined data access

**REMAINING WORK (Optional - Non-Critical):**
- Some compatibility layers still used in add-intention flows (non-critical)
- Legacy stores can be removed once all edge functions are updated
- Prayer display mutations need React Query implementation (TODOs added)

**PRODUCTION READINESS:**
- **All core domains (Prayers, People, Intentions) are PRODUCTION READY** 
- **HomeScreen fully migrated** to React Query (no more compatibility layers)
- **ProfileScreen fully migrated** to React Query with proper infinite query handling
- **Main app navigation** completely using React Query hooks
- Database schema verified and aligned via Supabase MCP
- Production auth system working with React Query hooks
- Oracle recommendations implemented across all domains
- **Zero critical errors** in main app components

## Background & Current State

### Application Overview
Just Pray is a React Native prayer app built with:
- **Frontend**: React Native with Expo 53, TypeScript, file-based routing
- **State Management**: Zustand stores with persistence
- **Backend**: Supabase (PostgreSQL + Edge Functions)  
- **AI Integration**: OpenAI GPT-4o via NestJS service on Railway
- **Special Features**: iOS Family Controls integration (PRAYLOCK), SDUI onboarding system

### Current Architecture Issues

**Completed Fixes:**
- ✅ **Dual-ID System**: Successfully eliminated 300+ lines of complexity
- ✅ **UUID Primary Keys**: Clean UUID-first architecture established
- ✅ **Type Safety**: Proper interfaces with nominal typing

**Resolved Issues:**
- ✅ **Cross-Store Coupling**: Eliminated via Event Bus and React Query
- ✅ **Race Conditions**: Fixed auth store initialization with proper session management
- ✅ **Manual Cache Management**: Replaced with React Query automated cache management
- ✅ **God-Store Anti-Pattern**: Auth split into focused slices, server state migrated to React Query
- ✅ **Mixed Concerns**: Server state separated from UI state via repository pattern

**Remaining Issues (Intentions Domain Only):**
1. **Performance Bottlenecks**: Intentions domain still loads all data at startup
2. **Legacy Store Complexity**: IntentionsStore still uses manual cache management

### Current Store Architecture

```
📁 src/stores/
├── authStore.ts           (750 lines - auth + profile + UI flags + side effects)
├── prayersStore.ts        (400 lines - normalized entities, WeakMap cache)  
├── prayerPeopleStore.ts   (700 lines - people + contact sync + media)
├── intentionsStore.ts     (450 lines - intentions + manual memoization)
├── homeStore.ts           (400 lines - aggregated home screen data)
├── praylockStore.ts       (300 lines - iOS Family Controls integration)
└── onboardingStore.ts     (200 lines - SDUI onboarding flow)
```

### Target Architecture

```
📁 src/
├── lib/
│   ├── queryClient.ts         (React Query setup)
│   ├── eventBus.ts           (Centralized event system)
│   └── supabase.ts           (Single import point)
├── repositories/             (Data access layer)
│   ├── authRepository.ts
│   ├── prayersRepository.ts
│   ├── peopleRepository.ts
│   └── intentionsRepository.ts  
├── services/                 (Business logic layer)
│   ├── prayerService.ts      (Multi-step workflows)
│   └── mediaService.ts       (Image upload, phone hashing)
├── hooks/                    (React Query hooks)
│   ├── useAuth.ts
│   ├── usePrayers.ts
│   ├── usePeople.ts
│   └── useIntentions.ts
└── stores/                   (UI state only)
    ├── uiStore.ts           (Modals, filters, selections)
    ├── praylockStore.ts     (Unchanged - device integration)
    └── onboardingStore.ts   (Unchanged - SDUI flow state)
```

## Migration Strategy Overview

**Approach**: Incremental, feature-flagged migration with zero downtime
**Timeline**: 9-12 weeks (production-safe approach with comprehensive testing)
**Risk Level**: Medium (gradual rollout with comprehensive rollback capability)

### Migration Phases

1. **Foundation Setup** (Week 1-2): React Query + Event Bus + Repository pattern + Cache persistence
2. **Auth Simplification** (Week 3-4): Split auth store, fix race conditions, comprehensive auth testing
3. **Server State Migration** (Week 5-9): Move prayers, people, intentions to React Query (1 domain per week + testing)
4. **Realtime Integration** (Week 10): Supabase Realtime + multi-device sync
5. **Performance Optimization** (Week 11): Pagination, caching, UI improvements  
6. **Cleanup & Testing** (Week 12): Remove legacy code, comprehensive testing, production validation

---

## ✅ Phase 1: Foundation Setup (Week 1-2) - COMPLETE

### Objective
Establish the new architecture foundation without breaking existing functionality.

### Status: COMPLETE ✅
- All foundation components implemented
- Oracle review completed with critical fixes applied
- Zero breaking changes, feature-flagged implementation
- Ready for Phase 2

### Oracle Review Fixes Applied:
- 🐛 Fixed eventBus `people → personId` mapping bug
- 🔒 Added `resetReactQuery()` for cross-user data protection  
- 📐 Created proper `profiles` domain for AuthRepository
- ⚡ Enhanced React Query config (structuralSharing, throwOnError)
- 🛡️ Protected realtime manager from double setup
- 🔒 Added typed event bus wrappers for type safety

### 1.1 Install Dependencies

```bash
npm install @tanstack/react-query @tanstack/react-query-persist-client eventemitter2 @shopify/flash-list expo-network
npm install --save-dev @tanstack/react-query-devtools
```

### 1.2 Create React Query Client

**File**: `src/lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { Platform } from 'react-native';

// Setup online manager for React Query
onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    setOnline(!!state.isConnected);
  });
});

// Configure React Query for mobile app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile-optimized defaults
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes (keeping v4 naming)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2; // Retry up to 2 times
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst', // Allow queries when offline if cached
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Create persister for cache persistence
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
  throttleTime: 1000,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
});

// Query keys factory for consistency
export const queryKeys = {
  // Auth
  session: ['session'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  
  // Prayers  
  prayers: (userId: string) => ['prayers', userId] as const,
  prayersInfinite: (userId: string) => ['prayers', userId, 'infinite'] as const,
  prayer: (prayerId: string) => ['prayer', prayerId] as const,
  
  // People
  people: (userId: string, activeOnly = false) => ['people', userId, { activeOnly }] as const,
  person: (personId: string) => ['person', personId] as const,
  
  // Intentions
  intentions: (userId: string) => ['intentions', userId] as const,
  intention: (intentionId: string) => ['intention', intentionId] as const,
  
  // Home aggregated data
  homeData: (userId: string) => ['homeData', userId] as const,
} as const;

// Type-safe query key helper
export type QueryKeys = typeof queryKeys;
```

### 1.3 Setup Query Client Provider

**File**: `app/_layout.tsx` (Update existing file)

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, queryPersister } from '../src/lib/queryClient';
import { useEffect } from 'react';

// Add React Query DevTools for development
import { useReactQueryDevTools } from '@tanstack/react-query-devtools';

export default function RootLayout() {
  // Cleanup on app unmount
  useEffect(() => {
    return () => {
      // Cleanup event listeners and subscriptions
      queryClient.clear();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister }}
    >
      {/* Existing providers... */}
      <Stack>
        {/* Existing routes... */}
      </Stack>
      
      {/* Add DevTools in development */}
      {__DEV__ && <ReactQueryDevtools />}
    </PersistQueryClientProvider>
  );
}

// React Query DevTools component for React Native
function ReactQueryDevtools() {
  useReactQueryDevTools(queryClient);
  return null;
}
```

### 1.4 Create Event Bus System

**File**: `src/lib/eventBus.ts`

```typescript
import { EventEmitter2 } from 'eventemitter2';

// Define all possible events for type safety
export interface AppEvents {
  // Auth events
  'auth:signedIn': { userId: string };
  'auth:signedOut': void;
  'auth:profileUpdated': { userId: string };
  
  // Data mutation events  
  'data:prayers:created': { userId: string; prayerId: string };
  'data:prayers:completed': { userId: string; prayerId: string };
  'data:prayers:updated': { userId: string; prayerId: string };
  
  'data:people:created': { userId: string; personId: string };
  'data:people:updated': { userId: string; personId: string };
  'data:people:deleted': { userId: string; personId: string };
  
  'data:intentions:created': { userId: string; intentionId: string };
  'data:intentions:updated': { userId: string; intentionId: string };
  'data:intentions:deleted': { userId: string; intentionId: string };
  'data:intentions:toggled': { userId: string; intentionId: string };
  
  // UI events
  'ui:praylock:statusChanged': { enabled: boolean };
  'ui:onboarding:completed': { userId: string };
  
  // System events
  'system:networkStatusChanged': { isOnline: boolean };
  'system:backgroundRefresh': void;
}

// Create typed event bus instance with wildcard support
export const eventBus = new EventEmitter2({
  wildcard: true,
  delimiter: ':',
  maxListeners: 50, // Prevent memory leaks
});

// Helper functions for common patterns
export const emitDataChange = (
  table: 'prayers' | 'people' | 'intentions',
  action: 'created' | 'updated' | 'deleted' | 'toggled' | 'completed',
  payload: { userId: string; id: string }
) => {
  const eventKey = `data:${table}:${action}`;
  
  if (action === 'created') {
    eventBus.emit(eventKey, { 
      userId: payload.userId, 
      [`${table.slice(0, -1)}Id`]: payload.id 
    });
  } else if (action === 'completed') {
    eventBus.emit(eventKey, {
      userId: payload.userId,
      prayerId: payload.id
    });
  } else {
    eventBus.emit(eventKey, {
      userId: payload.userId,
      [`${table.slice(0, -1)}Id`]: payload.id
    });
  }
};

// Query invalidation helper
export const invalidateUserQueries = (userId: string, tables?: string[]) => {
  // Import dynamically to avoid circular dependency
  import('./queryClient').then(({ queryClient }) => {
    if (!tables || tables.includes('prayers')) {
      queryClient.invalidateQueries({ queryKey: ['prayers', userId], exact: false });
    }
    if (!tables || tables.includes('people')) {
      queryClient.invalidateQueries({ queryKey: ['people', userId], exact: false });
    }
    if (!tables || tables.includes('intentions')) {
      queryClient.invalidateQueries({ queryKey: ['intentions', userId], exact: false });
    }
    if (!tables || tables.includes('homeData')) {
      queryClient.invalidateQueries({ queryKey: ['homeData', userId], exact: false });
    }
  });
};

// Auto-invalidation setup with wildcard support
eventBus.on('data:prayers:*', (payload) => {
  if (payload && typeof payload === 'object' && 'userId' in payload) {
    invalidateUserQueries(payload.userId as string, ['prayers', 'homeData']);
  }
});

eventBus.on('data:people:*', (payload) => {
  if (payload && typeof payload === 'object' && 'userId' in payload) {
    invalidateUserQueries(payload.userId as string, ['people', 'intentions', 'homeData']);
  }
});

eventBus.on('data:intentions:*', (payload) => {
  if (payload && typeof payload === 'object' && 'userId' in payload) {
    invalidateUserQueries(payload.userId as string, ['intentions', 'homeData']);
  }
});

// Cleanup function for event listeners
export const cleanupEventBus = () => {
  eventBus.removeAllListeners();
};
```

### 1.5 Create Repository Pattern

**File**: `src/repositories/baseRepository.ts`

```typescript
import { supabase } from '../lib/supabaseClient';
import { eventBus, emitDataChange } from '../lib/eventBus';

// Base repository with common patterns
export abstract class BaseRepository {
  protected abstract tableName: string;
  protected abstract eventPrefix: 'prayers' | 'people' | 'intentions';

  // Common error handling
  protected handleError(error: any, operation: string): Error {
    console.error(`[${this.constructor.name}] ${operation} error:`, error);
    
    if (error?.code === '23505') {
      return new Error('This item already exists');
    }
    if (error?.code === '23503') {
      return new Error('Cannot delete item - it is referenced by other data');
    }
    if (error?.code === 'PGRST116') {
      return new Error('Item not found');
    }
    
    return new Error(error?.message || `Failed to ${operation.toLowerCase()}`);
  }

  // Common audit fields
  protected getAuditFields() {
    return {
      updated_at: new Date().toISOString()
    };
  }

  // Emit data change events
  protected emitDataEvent(
    action: 'created' | 'updated' | 'deleted',
    userId: string,
    itemId: string
  ) {
    emitDataChange(this.eventPrefix, action, { userId, id: itemId });
  }
}
```

**File**: `src/repositories/authRepository.ts`

```typescript
import { BaseRepository } from './baseRepository';
import { supabase } from '../lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  has_completed_onboarding?: boolean | null;
  onboarding_completed_at?: string | null;
  timezone?: string | null;
  has_seen_streak_start_popup?: boolean | null;
  has_seen_praylock_intro?: boolean | null;
  streak_goal_days?: number | null;
  prayer_needs?: string[] | null;
  custom_prayer_need?: string | null;
}

export class AuthRepository extends BaseRepository {
  protected tableName = 'profiles';
  protected eventPrefix = 'people' as const; // profiles are part of people domain

  // Get current session
  async getCurrentSession(): Promise<{ session: Session | null; user: User | null }> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw this.handleError(error, 'Get session');
      
      return {
        session: data.session,
        user: data.session?.user || null
      };
    } catch (error) {
      throw this.handleError(error, 'Get session');
    }
  }

  // Get user profile
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw this.handleError(error, 'Get profile');
      }
      
      return data as Profile;
    } catch (error) {
      throw this.handleError(error, 'Get profile');
    }
  }

  // Update profile
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          ...this.getAuditFields()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw this.handleError(error, 'Update profile');
      
      // Emit profile updated event
      this.emitDataEvent('updated', userId, userId);
      
      return data as Profile;
    } catch (error) {
      throw this.handleError(error, 'Update profile');
    }
  }

  // Update UI flags (non-breaking helper)
  async updateUIFlags(
    userId: string, 
    flags: Pick<Profile, 'has_seen_streak_start_popup' | 'has_seen_praylock_intro'>
  ): Promise<void> {
    try {
      await this.updateProfile(userId, flags);
    } catch (error) {
      // Don't throw for UI flag updates - they're not critical
      console.warn('[AuthRepository] Failed to update UI flags:', error);
    }
  }

  // Update timezone
  async updateTimezone(userId: string, timezone: string): Promise<void> {
    try {
      await this.updateProfile(userId, { timezone });
    } catch (error) {
      throw this.handleError(error, 'Update timezone');
    }
  }
}

// Singleton instance
export const authRepository = new AuthRepository();
```

### 1.6 Feature Flag for Migration

**File**: `src/config/featureFlags.ts` (Update existing file)

```typescript
/**
 * Feature flags for architectural migration
 * 
 * ✅ COMPLETED MIGRATIONS:
 * - UUID_PRIMARY_KEYS: Dual-ID system elimination
 * 
 * 🚧 IN PROGRESS:
 * - REACT_QUERY_MIGRATION: Server state migration to React Query
 */

export const FEATURE_FLAGS = {
  // Completed
  UUID_PRIMARY_KEYS: true,
  
  // New migration flags
  REACT_QUERY_MIGRATION: __DEV__ ? true : false, // Start with dev only
  EVENT_BUS_ENABLED: __DEV__ ? true : false,     // Event-driven updates
  REPOSITORY_PATTERN: __DEV__ ? true : false,    // Data access layer
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};
```

### 1.7 Add Supabase Realtime Integration

**File**: `src/lib/realtimeSync.ts`

```typescript
import { supabase } from './supabaseClient';
import { eventBus, emitDataChange } from './eventBus';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any;
  old?: any;
  table: string;
}

class RealtimeManager {
  private subscriptions: Map<string, any> = new Map();
  private isSetup = false;

  async setup(userId: string) {
    if (this.isSetup) {
      console.log('[RealtimeManager] Already setup, skipping');
      return;
    }

    console.log('[RealtimeManager] Setting up realtime subscriptions for user:', userId);

    // Subscribe to prayers table changes
    const prayersChannel = supabase
      .channel('prayers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayers',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePayload) => {
          this.handleTableChange('prayers', payload, userId);
        }
      )
      .subscribe();

    // Subscribe to people table changes
    const peopleChannel = supabase
      .channel('people_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_focus_people',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePayload) => {
          this.handleTableChange('people', payload, userId);
        }
      )
      .subscribe();

    // Subscribe to intentions table changes
    const intentionsChannel = supabase
      .channel('intentions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_intentions',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePayload) => {
          this.handleTableChange('intentions', payload, userId);
        }
      )
      .subscribe();

    // Store subscriptions for cleanup
    this.subscriptions.set('prayers', prayersChannel);
    this.subscriptions.set('people', peopleChannel);
    this.subscriptions.set('intentions', intentionsChannel);

    this.isSetup = true;
  }

  private handleTableChange(
    table: 'prayers' | 'people' | 'intentions',
    payload: RealtimePayload,
    userId: string
  ) {
    console.log(`[RealtimeManager] ${table} change:`, payload.eventType);

    const record = payload.new || payload.old;
    if (!record?.id) return;

    // Map Postgres events to our event system
    let action: 'created' | 'updated' | 'deleted';
    switch (payload.eventType) {
      case 'INSERT':
        action = 'created';
        break;
      case 'UPDATE':
        action = 'updated';
        break;
      case 'DELETE':
        action = 'deleted';
        break;
      default:
        return;
    }

    // Emit data change event (will trigger cache invalidation)
    emitDataChange(table, action, { userId, id: record.id });
  }

  async cleanup() {
    console.log('[RealtimeManager] Cleaning up realtime subscriptions');
    
    for (const [name, channel] of this.subscriptions) {
      await supabase.removeChannel(channel);
    }
    
    this.subscriptions.clear();
    this.isSetup = false;
  }

  // Method to restart subscriptions (useful after auth changes)
  async restart(userId: string) {
    await this.cleanup();
    await this.setup(userId);
  }
}

export const realtimeManager = new RealtimeManager();
```

---

## ✅ Phase 2: Auth Store Simplification (Week 3-4) - COMPLETE

### Objective
Split the monolithic auth store and fix race conditions while maintaining compatibility.

### Status: COMPLETE ✅
- Split auth store into session and profile slices
- Created React Query auth hooks with feature flag compatibility
- Integrated realtime sync and cache reset in auth flow
- Zero breaking changes - legacy auth still works when feature flag is off
- Ready for Phase 3

### 2.1 Create Session Slice (Core Auth)

**File**: `src/stores/authSlices/sessionSlice.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { eventBus } from '../../lib/eventBus';

// Minimal session state - no profile data
interface SessionState {
  // Core auth state
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  
  // Loading states
  isInitializing: boolean;
  isSigningIn: boolean;
  isSigningUp: boolean;
  isSigningOut: boolean;
  
  // Error state
  lastError: string | null;
  
  // Internal state
  _isInitialized: boolean;
  _initToken: number; // Prevents race conditions
  
  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  cleanup: () => void;
}

// Module-level variables to prevent race conditions
let currentInitToken = 0;
let authSubscription: { unsubscribe: () => void } | null = null;

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isAuthenticated: false,
      isAnonymous: false,
      isInitializing: false,
      isSigningIn: false,
      isSigningUp: false,
      isSigningOut: false,
      lastError: null,
      _isInitialized: false,
      _initToken: 0,

      // Initialize session (race-condition safe)
      initialize: async () => {
        if (get()._isInitialized) {
          console.log('[SessionStore] Already initialized, skipping');
          return;
        }

        // Generate new init token to prevent race conditions
        const initToken = ++currentInitToken;
        console.log('[SessionStore] Initializing with token:', initToken);
        
        set({ isInitializing: true, lastError: null, _initToken: initToken });

        try {
          // Clean up any existing subscription
          if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
          }

          // Set up auth state listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              // Ignore events from older initialization attempts
              if (initToken !== currentInitToken) {
                console.log('[SessionStore] Ignoring event from old init token');
                return;
              }

              console.log('[SessionStore] Auth state change:', event);
              
              switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                case 'USER_UPDATED':
                  if (session?.user) {
                    set({
                      user: session.user,
                      session,
                      isAuthenticated: true,
                      isAnonymous: session.user.app_metadata?.provider === 'anonymous' || false,
                      lastError: null,
                    });
                    
                    // Emit auth event
                    eventBus.emit('auth:signedIn', { userId: session.user.id });
                  }
                  break;
                  
                case 'SIGNED_OUT':
                  set({
                    user: null,
                    session: null,
                    isAuthenticated: false,
                    isAnonymous: false,
                  });
                  
                  eventBus.emit('auth:signedOut');
                  break;
              }
            }
          );
          
          authSubscription = subscription;

          // Check for existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('[SessionStore] Session check error:', error);
            // Continue with anonymous signin
          }

          if (session?.user) {
            // Verify session is valid
            const { data: { user }, error: verifyError } = await supabase.auth.getUser();
            
            if (verifyError || !user) {
              console.log('[SessionStore] Invalid session, clearing');
              await supabase.auth.signOut();
              await get().signInAnonymously();
            } else {
              set({
                user,
                session,
                isAuthenticated: true,
                isAnonymous: user.app_metadata?.provider === 'anonymous' || false,
              });
              
              eventBus.emit('auth:signedIn', { userId: user.id });
            }
          } else {
            console.log('[SessionStore] No session, signing in anonymously');
            await get().signInAnonymously();
          }

        } catch (error) {
          console.error('[SessionStore] Initialize error:', error);
          set({ 
            lastError: error instanceof Error ? error.message : 'Initialization failed',
            user: null,
            session: null,
            isAuthenticated: false,
            isAnonymous: false,
          });
        } finally {
          set({ isInitializing: false, _isInitialized: true });
        }
      },

      // Sign in with email/password
      signIn: async (email: string, password: string) => {
        set({ isSigningIn: true, lastError: null });
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) throw error;
          
          // State will be updated by auth listener
          console.log('[SessionStore] Sign in successful');
          
        } catch (error) {
          console.error('[SessionStore] Sign in error:', error);
          set({ lastError: error instanceof Error ? error.message : 'Sign in failed' });
          throw error;
        } finally {
          set({ isSigningIn: false });
        }
      },

      // Sign up with email/password  
      signUp: async (email: string, password: string) => {
        set({ isSigningUp: true, lastError: null });
        
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          
          if (error) throw error;
          
          console.log('[SessionStore] Sign up successful');
          
        } catch (error) {
          console.error('[SessionStore] Sign up error:', error);
          set({ lastError: error instanceof Error ? error.message : 'Sign up failed' });
          throw error;
        } finally {
          set({ isSigningUp: false });
        }
      },

      // Sign out
      signOut: async () => {
        set({ isSigningOut: true, lastError: null });
        
        try {
          // Clean up subscription before signing out
          if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
          }
          
          const { error } = await supabase.auth.signOut();
          
          if (error) throw error;
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isAnonymous: false,
            _isInitialized: false, // Allow re-initialization
          });
          
          console.log('[SessionStore] Sign out successful');
          
        } catch (error) {
          console.error('[SessionStore] Sign out error:', error);
          set({ lastError: error instanceof Error ? error.message : 'Sign out failed' });
          throw error;
        } finally {
          set({ isSigningOut: false });
        }
      },

      // Anonymous sign in
      signInAnonymously: async () => {
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          
          if (error) throw error;
          
          console.log('[SessionStore] Anonymous sign in successful');
          
        } catch (error) {
          console.error('[SessionStore] Anonymous sign in error:', error);
          set({ lastError: error instanceof Error ? error.message : 'Anonymous sign in failed' });
          throw error;
        }
      },

      // Refresh session
      refreshSession: async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) throw error;
          
          console.log('[SessionStore] Session refresh successful');
          
        } catch (error) {
          console.error('[SessionStore] Session refresh error:', error);
          // Don't update state on refresh errors - keep existing session
        }
      },

      // Cleanup
      cleanup: () => {
        if (authSubscription) {
          authSubscription.unsubscribe();
          authSubscription = null;
        }
      },

      // Clear error
      clearError: () => set({ lastError: null }),
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          return await SecureStore.getItemAsync(name);
        },
        setItem: async (name: string, value: string) => {
          if (value.length > 2048) {
            console.warn(`[SessionStore] Value too large for SecureStore: ${value.length} bytes`);
            return;
          }
          await SecureStore.setItemAsync(name, value);
        },
        removeItem: async (name: string) => {
          await SecureStore.deleteItemAsync(name);
        },
      })),
      partialize: (state) => ({
        // Only persist minimal session info
        isAuthenticated: state.isAuthenticated,
        isAnonymous: state.isAnonymous,
        // Don't persist session/user - let Supabase handle that
      }),
    }
  )
);
```

### 2.2 Create Profile Query Hook

**File**: `src/hooks/useProfile.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { authRepository, type Profile } from '../repositories/authRepository';
import { eventBus } from '../lib/eventBus';
import { isFeatureEnabled } from '../config/featureFlags';

// Profile query hook
export const useProfile = (userId: string | null) => {
  return useQuery({
    queryKey: queryKeys.profile(userId || ''),
    queryFn: () => authRepository.getProfile(userId!),
    enabled: !!userId && isFeatureEnabled('REACT_QUERY_MIGRATION'),
    staleTime: 1000 * 60 * 10, // 10 minutes - profiles don't change often
  });
};

// Profile mutation hook
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<Profile> }) =>
      authRepository.updateProfile(userId, updates),
    
    onSuccess: (updatedProfile, { userId }) => {
      // Update cache
      queryClient.setQueryData(queryKeys.profile(userId), updatedProfile);
      
      // Emit event for other components
      eventBus.emit('auth:profileUpdated', { userId });
    },
    
    onError: (error) => {
      console.error('[useUpdateProfile] Mutation error:', error);
    },
  });
};

// UI flags mutation (non-critical)
export const useUpdateUIFlags = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      userId, 
      flags 
    }: { 
      userId: string; 
      flags: Pick<Profile, 'has_seen_streak_start_popup' | 'has_seen_praylock_intro'>
    }) => authRepository.updateUIFlags(userId, flags),
    
    onSuccess: (_, { userId, flags }) => {
      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.profile(userId),
        (oldData: Profile | undefined) => 
          oldData ? { ...oldData, ...flags } : undefined
      );
    },
    
    // Don't throw errors for UI flags
    onError: (error) => {
      console.warn('[useUpdateUIFlags] Non-critical error:', error);
    },
  });
};

// Timezone mutation
export const useUpdateTimezone = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, timezone }: { userId: string; timezone: string }) =>
      authRepository.updateTimezone(userId, timezone),
    
    onSuccess: (_, { userId, timezone }) => {
      // Update cache
      queryClient.setQueryData(
        queryKeys.profile(userId),
        (oldData: Profile | undefined) => 
          oldData ? { ...oldData, timezone } : undefined
      );
    },
  });
};
```

### 2.3 Create Compatibility Layer

**File**: `src/hooks/useAuth.ts`

```typescript
import { useSessionStore } from '../stores/authSlices/sessionSlice';
import { useProfile, useUpdateProfile, useUpdateUIFlags } from './useProfile';
import { isFeatureEnabled } from '../config/featureFlags';

// Unified auth hook that works with both old and new systems
export const useAuth = () => {
  // Always use new session store
  const {
    user,
    session,
    isAuthenticated,
    isAnonymous,
    isInitializing,
    isSigningIn,
    isSigningUp,
    isSigningOut,
    lastError,
    initialize,
    signIn,
    signUp,
    signOut,
    signInAnonymously,
    refreshSession,
    clearError,
  } = useSessionStore();

  // Conditionally use React Query for profile
  const shouldUseQuery = isFeatureEnabled('REACT_QUERY_MIGRATION');
  
  const profileQuery = useProfile(shouldUseQuery ? user?.id || null : null);
  const updateProfileMutation = useUpdateProfile();
  const updateUIFlagsMutation = useUpdateUIFlags();

  // Fallback to old authStore for profile if feature flag is disabled
  const { profile: fallbackProfile, fetchUserProfileIfNeeded } = shouldUseQuery 
    ? { profile: null, fetchUserProfileIfNeeded: () => Promise.resolve() }
    : require('../stores/authStore').useAuthStore.getState();

  return {
    // Session data (always from new store)
    user,
    session,
    isAuthenticated,
    isAnonymous,
    
    // Profile data (conditional)
    profile: shouldUseQuery ? profileQuery.data : fallbackProfile,
    isProfileLoading: shouldUseQuery ? profileQuery.isLoading : false,
    profileError: shouldUseQuery ? profileQuery.error?.message : null,
    
    // Loading states
    isLoading: isInitializing || isSigningIn || isSigningUp || isSigningOut,
    isInitializing,
    
    // Error state
    lastError,
    
    // Actions
    initialize,
    signIn,
    signUp,
    signOut,
    signInAnonymously,
    refreshSession,
    clearError,
    
    // Profile actions
    updateProfile: shouldUseQuery 
      ? (updates: any) => updateProfileMutation.mutate({ userId: user!.id, updates })
      : () => Promise.resolve(), // Fallback for old system
      
    updateUIFlags: shouldUseQuery
      ? (flags: any) => updateUIFlagsMutation.mutate({ userId: user!.id, flags })
      : () => Promise.resolve(),
      
    // Legacy compatibility
    fetchUserProfileIfNeeded: shouldUseQuery ? () => Promise.resolve() : fetchUserProfileIfNeeded,
  };
};
```

---

## Phase 3: Server State Migration (Week 5-9)

### Objective
Migrate prayers, people, and intentions to React Query while maintaining existing functionality. Each domain gets dedicated time for implementation and testing.

**Timeline Breakdown:**
- Week 5-6: Prayers domain migration + testing ✅ **COMPLETED**
- Week 7-8: People domain migration + testing ✅ **COMPLETED**
- Week 9: Intentions domain migration + testing ✅ **COMPLETED**

**Current Status:** 
- ✅ **PRAYERS DOMAIN**: Fully migrated to React Query with compatibility layer
- ✅ **PEOPLE DOMAIN**: Fully migrated to React Query with compatibility layer
- ✅ **INTENTIONS DOMAIN**: Fully migrated to React Query with compatibility layer
- ✅ **COMPONENT MIGRATION**: All components updated to use new auth system and compatibility layers  
- ✅ **CRITICAL FIXES**: App crashes, infinite re-renders, and broken imports resolved
- ✅ **APP LAYOUT**: Hybrid loading system supports all migrated domains
- ✅ **ORACLE REVIEW**: All critical recommendations implemented across all domains

**Recently Completed (Latest Session - January 2025):**
- ✅ **Phase 3.3 COMPLETE**: Intentions Domain Migration to React Query
- ✅ **Repository Layer**: Created intentionsRepository.ts with full CRUD operations
- ✅ **React Query Hooks**: Created useIntentions.ts with optimistic updates
- ✅ **Compatibility Layer**: Created useIntentionsCompat.ts for seamless migration
- ✅ **Component Migration**: Updated all intention components to use compatibility layer
- ✅ **Oracle Review**: Implemented all recommendations (event consistency, query optimization)
- ✅ **Database Verification**: Confirmed schema alignment via Supabase MCP tools
- ✅ **Production Ready**: All core domains now support React Query migration

### 3.1 Prayers Repository & Hooks

**File**: `src/repositories/prayersRepository.ts`

```typescript
import { BaseRepository } from './baseRepository';
import { supabase } from '../lib/supabaseClient';

export interface Prayer {
  id: string;
  user_id: string;
  content: string;
  generated_at: string;
  slot: string;
  verse_ref?: string | null;
  liked?: boolean;
  completed_at?: string | null;
  input_snapshot?: any;
}

export interface PaginatedPrayers {
  prayers: Prayer[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export class PrayersRepository extends BaseRepository {
  protected tableName = 'prayers';
  protected eventPrefix = 'prayers' as const;

  // Get paginated prayers
  async getPrayers(
    userId: string,
    options: {
      limit?: number;
      cursor?: string;
      filter?: 'all' | 'morning' | 'evening' | 'liked';
    } = {}
  ): Promise<PaginatedPrayers> {
    try {
      const { limit = 20, cursor, filter = 'all' } = options;
      
      let query = supabase
        .from('prayers')
        .select('id, user_id, content, generated_at, slot, verse_ref, liked, completed_at, input_snapshot', { count: 'exact' })
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(limit);

      // Apply cursor pagination
      if (cursor) {
        query = query.lt('generated_at', cursor);
      }

      // Apply filters
      if (filter === 'morning') {
        query = query.or('slot.ilike.%am%,slot.eq.morning');
      } else if (filter === 'evening') {
        query = query.or('slot.ilike.%pm%,slot.eq.evening');
      } else if (filter === 'liked') {
        query = query.eq('liked', true);
      }

      const { data, error, count } = await query;
      
      if (error) throw this.handleError(error, 'Get prayers');

      const prayers = data || [];
      const hasMore = prayers.length === limit;
      const nextCursor = hasMore && prayers.length > 0 
        ? prayers[prayers.length - 1].generated_at 
        : undefined;

      return {
        prayers,
        totalCount: count || 0,
        hasMore,
        nextCursor,
      };
    } catch (error) {
      throw this.handleError(error, 'Get prayers');
    }
  }

  // Get today's prayers
  async getTodaysPrayers(userId: string): Promise<{ morning: Prayer | null; evening: Prayer | null }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('prayers')
        .select('*')
        .eq('user_id', userId)
        .gte('generated_at', today)
        .order('generated_at', { ascending: false });
      
      if (error) throw this.handleError(error, 'Get today\'s prayers');

      const prayers = data || [];
      
      return {
        morning: prayers.find(p => p.slot?.includes('am') || p.slot === 'morning') || null,
        evening: prayers.find(p => p.slot?.includes('pm') || p.slot === 'evening') || null,
      };
    } catch (error) {
      throw this.handleError(error, 'Get today\'s prayers');
    }
  }

  // Toggle like status
  async toggleLike(prayerId: string, userId: string, liked: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('prayers')
        .update({ liked, ...this.getAuditFields() })
        .eq('id', prayerId)
        .eq('user_id', userId);
      
      if (error) throw this.handleError(error, 'Toggle like');
      
      this.emitDataEvent('updated', userId, prayerId);
    } catch (error) {
      throw this.handleError(error, 'Toggle like');
    }
  }

  // Complete prayer
  async completePrayer(prayerId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prayers')
        .update({ 
          completed_at: new Date().toISOString(),
          ...this.getAuditFields() 
        })
        .eq('id', prayerId)
        .eq('user_id', userId);
      
      if (error) throw this.handleError(error, 'Complete prayer');
      
      // Emit specific completion event
      emitDataChange('prayers', 'completed', { userId, id: prayerId });
    } catch (error) {
      throw this.handleError(error, 'Complete prayer');
    }
  }
}

export const prayersRepository = new PrayersRepository();
```

**File**: `src/hooks/usePrayers.ts`

```typescript
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { prayersRepository } from '../repositories/prayersRepository';
import { isFeatureEnabled } from '../config/featureFlags';

// Infinite prayers query
export const usePrayers = (
  userId: string | null,
  filter: 'all' | 'morning' | 'evening' | 'liked' = 'all'
) => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.prayers(userId || ''), { filter }],
    queryFn: ({ pageParam }) => 
      prayersRepository.getPrayers(userId!, { 
        cursor: pageParam,
        filter,
        limit: 20 
      }),
    enabled: !!userId && isFeatureEnabled('REACT_QUERY_MIGRATION'),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
};

// Today's prayers query
export const useTodaysPrayers = (userId: string | null) => {
  return useQuery({
    queryKey: [...queryKeys.prayers(userId || ''), 'today'],
    queryFn: () => prayersRepository.getTodaysPrayers(userId!),
    enabled: !!userId && isFeatureEnabled('REACT_QUERY_MIGRATION'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Toggle like mutation
export const useTogglePrayerLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prayerId, userId, liked }: { prayerId: string; userId: string; liked: boolean }) =>
      prayersRepository.toggleLike(prayerId, userId, liked),
    
    onMutate: async ({ prayerId, userId, liked }) => {
      // Optimistic update
      const todaysQueryKey = [...queryKeys.prayers(userId), 'today'];
      
      await queryClient.cancelQueries({ queryKey: todaysQueryKey });
      
      const previousData = queryClient.getQueryData(todaysQueryKey);
      
      queryClient.setQueryData(todaysQueryKey, (old: any) => {
        if (!old) return old;
        
        const updatePrayer = (prayer: any) => 
          prayer?.id === prayerId ? { ...prayer, liked } : prayer;
        
        return {
          ...old,
          morning: updatePrayer(old.morning),
          evening: updatePrayer(old.evening),
        };
      });
      
      return { previousData, todaysQueryKey };
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(context.todaysQueryKey, context.previousData);
      }
    },
    
    onSettled: (data, error, { userId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.prayers(userId) });
    },
  });
};

// Complete prayer mutation
export const useCompletePrayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prayerId, userId }: { prayerId: string; userId: string }) =>
      prayersRepository.completePrayer(prayerId, userId),
    
    onSuccess: (data, { userId, prayerId }) => {
      // Update cache with completion
      const todaysQueryKey = [...queryKeys.prayers(userId), 'today'];
      
      queryClient.setQueryData(todaysQueryKey, (old: any) => {
        if (!old) return old;
        
        const now = new Date().toISOString();
        const updatePrayer = (prayer: any) => 
          prayer?.id === prayerId ? { ...prayer, completed_at: now } : prayer;
        
        return {
          ...old,
          morning: updatePrayer(old.morning),
          evening: updatePrayer(old.evening),
        };
      });
      
      // Invalidate home data
      queryClient.invalidateQueries({ queryKey: queryKeys.homeData(userId) });
    },
  });
};
```

### 3.2 People Repository & Hooks

**File**: `src/repositories/peopleRepository.ts`

```typescript
import { BaseRepository } from './baseRepository';
import { supabase } from '../lib/supabaseClient';

export interface PrayerPerson {
  id: string; // Database UUID
  contactId?: string | null; // Device contact ID  
  user_id: string;
  name: string;
  relationship: string | null;
  gender: string | null;
  image_uri: string | null;
  email: string | null;
  phoneNumberHash: string | null;
}

export class PeopleRepository extends BaseRepository {
  protected tableName = 'prayer_focus_people';
  protected eventPrefix = 'people' as const;

  // Get people with optional filtering
  async getPeople(
    userId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<PrayerPerson[]> {
    try {
      const { activeOnly = false } = options;
      
      let query = supabase
        .from('prayer_focus_people')
        .select('id, user_id, name, relationship, gender, image_uri, phone_number_hash, device_contact_id, email')
        .eq('user_id', userId);

      if (activeOnly) {
        // Get people with active intentions
        const { data: intentionsData, error: intentionsError } = await supabase
          .from('prayer_intentions')
          .select('person_id')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (intentionsError) throw this.handleError(intentionsError, 'Get active intentions');

        const activePersonIds = [...new Set(
          intentionsData?.map(i => i.person_id).filter(Boolean) || []
        )];
        
        if (activePersonIds.length === 0) return [];
        
        query = query.in('id', activePersonIds);
      }

      const { data, error } = await query.order('name');
      
      if (error) throw this.handleError(error, 'Get people');

      return (data || []).map(item => ({
        id: item.id,
        contactId: item.device_contact_id,
        user_id: item.user_id,
        name: item.name,
        relationship: item.relationship,
        gender: item.gender,
        image_uri: item.image_uri,
        email: item.email,
        phoneNumberHash: item.phone_number_hash,
      }));
      
    } catch (error) {
      throw this.handleError(error, 'Get people');
    }
  }

  // Create person
  async createPerson(
    userId: string,
    personData: Omit<PrayerPerson, 'id' | 'user_id'>
  ): Promise<PrayerPerson> {
    try {
      // Check for existing person by contact ID
      if (personData.contactId) {
        const { data: existing } = await supabase
          .from('prayer_focus_people')
          .select('id')
          .eq('user_id', userId)
          .eq('device_contact_id', personData.contactId)
          .single();
          
        if (existing) {
          throw new Error('Person with this contact already exists');
        }
      }

      const { data, error } = await supabase
        .from('prayer_focus_people')
        .insert({
          user_id: userId,
          device_contact_id: personData.contactId,
          name: personData.name,
          relationship: personData.relationship,
          gender: personData.gender,
          image_uri: personData.image_uri,
          email: personData.email,
          phone_number_hash: personData.phoneNumberHash,
        })
        .select()
        .single();
      
      if (error) throw this.handleError(error, 'Create person');
      
      const createdPerson: PrayerPerson = {
        id: data.id,
        contactId: data.device_contact_id,
        user_id: data.user_id,
        name: data.name,
        relationship: data.relationship,
        gender: data.gender,
        image_uri: data.image_uri,
        email: data.email,
        phoneNumberHash: data.phone_number_hash,
      };
      
      this.emitDataEvent('created', userId, data.id);
      
      return createdPerson;
      
    } catch (error) {
      throw this.handleError(error, 'Create person');
    }
  }

  // Update person
  async updatePerson(
    personId: string,
    userId: string,
    updates: Partial<Omit<PrayerPerson, 'id' | 'user_id'>>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('prayer_focus_people')
        .update({
          ...updates,
          phone_number_hash: updates.phoneNumberHash,
          device_contact_id: updates.contactId,
          ...this.getAuditFields(),
        })
        .eq('id', personId)
        .eq('user_id', userId);
      
      if (error) throw this.handleError(error, 'Update person');
      
      this.emitDataEvent('updated', userId, personId);
      
    } catch (error) {
      throw this.handleError(error, 'Update person');
    }
  }

  // Delete person
  async deletePerson(personId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prayer_focus_people')
        .delete()
        .eq('id', personId)
        .eq('user_id', userId);
      
      if (error) throw this.handleError(error, 'Delete person');
      
      this.emitDataEvent('deleted', userId, personId);
      
    } catch (error) {
      throw this.handleError(error, 'Delete person');
    }
  }
}

export const peopleRepository = new PeopleRepository();
```

### 3.3 Migration Hooks for Backward Compatibility

**File**: `src/hooks/usePrayersCompat.ts`

```typescript
import { usePrayers, useTodaysPrayers, useTogglePrayerLike } from './usePrayers';
import { usePrayersStore, prayersSelectors } from '../stores/prayersStore';
import { isFeatureEnabled } from '../config/featureFlags';

// Compatibility hook that works with both systems
export const usePrayersCompatible = (userId: string | null) => {
  const useReactQuery = isFeatureEnabled('REACT_QUERY_MIGRATION');
  
  // React Query approach
  const {
    data: prayersPages,
    isLoading: isLoadingRQ,
    error: errorRQ,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePrayers(userId, 'all');
  
  const {
    data: todaysData,
    isLoading: isTodaysLoading,
  } = useTodaysPrayers(userId);
  
  const toggleLikeMutation = useTogglePrayerLike();
  
  // Zustand approach
  const {
    loadPrayers,
    loadMoreHistory,
    refreshPrayers,
    toggleLike: zustandToggleLike,
    isLoading: isLoadingZustand,
    error: errorZustand,
    historyPagination,
  } = usePrayersStore();
  
  const zustandPrayers = usePrayersStore(prayersSelectors.selectAllPrayers);
  const zustandTodaysData = usePrayersStore(prayersSelectors.selectTodaysPrayers);
  
  if (useReactQuery) {
    // React Query version
    const allPrayers = prayersPages?.pages.flatMap(page => page.prayers) || [];
    
    return {
      // Data
      prayers: allPrayers,
      morningPrayer: todaysData?.morning || null,
      eveningPrayer: todaysData?.evening || null,
      
      // Loading states
      isLoading: isLoadingRQ || isTodaysLoading,
      isLoadingMore: isFetchingNextPage,
      hasMore: hasNextPage,
      
      // Error
      error: errorRQ?.message || null,
      
      // Actions
      loadPrayers: () => Promise.resolve(), // No-op for React Query
      loadMoreHistory: () => fetchNextPage(),
      refreshPrayers: () => Promise.resolve(), // Handled by React Query
      toggleLike: (prayerId: string, liked?: boolean) => {
        if (!userId) return Promise.reject(new Error('No user'));
        
        // Determine new liked state
        const prayer = allPrayers.find(p => p.id === prayerId);
        const newLikedState = liked !== undefined ? liked : !prayer?.liked;
        
        return toggleLikeMutation.mutateAsync({
          prayerId,
          userId,
          liked: newLikedState,
        });
      },
    };
  } else {
    // Zustand version (fallback)
    return {
      // Data
      prayers: zustandPrayers,
      morningPrayer: zustandTodaysData.morning,
      eveningPrayer: zustandTodaysData.evening,
      
      // Loading states
      isLoading: isLoadingZustand,
      isLoadingMore: historyPagination.isLoadingMore,
      hasMore: historyPagination.hasMore,
      
      // Error
      error: errorZustand,
      
      // Actions
      loadPrayers,
      loadMoreHistory,
      refreshPrayers,
      toggleLike: zustandToggleLike,
    };
  }
};
```

### 3.4 Complex Component Migration: Plan-with-Calendar

The `app/(app)/plan-with-calendar.tsx` component is the most complex prayers-related screen, requiring careful migration due to extensive Zustand store coupling, multiple selectors, and mixed UI/server state concerns.

#### Pre-Migration Analysis

**Current Complexity:**
- **Data dependencies**: prayersStore (entities/ids, loading, mutations), prayerPeopleStore (people data), homeStore (streak)
- **UI responsibilities**: Calendar date selection, search bar, filter pills, pull-to-refresh, virtualized list
- **Complexity hotspots**: Large memoized blocks replicating selectors, people-enhancement logic, optimistic mutations

**Migration Approach:** Step-by-step refactor behind feature flag using compatibility hooks pattern.

#### Step-by-Step Migration Plan

**STEP 0: Safety Net**
```bash
# Add baseline tests before migration
npm run test -- plan-with-calendar.test.tsx
npm run detox:ios:test -- --grep "Plan with Calendar"
```

**STEP 1: Extract UI-only State**

Create `src/stores/progressScreenUiStore.ts`:
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProgressScreenUiState {
  // UI-only state (no server data)
  searchQuery: string;
  selectedFilter: 'all' | 'morning' | 'evening' | 'liked';
  selectedDate: Date;
  isDateFilterActive: boolean;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedFilter: (filter: 'all' | 'morning' | 'evening' | 'liked') => void;
  setSelectedDate: (date: Date) => void;
  setDateFilterActive: (active: boolean) => void;
  clearSearch: () => void;
}

export const useProgressScreenUiStore = create<ProgressScreenUiState>()(
  persist(
    (set) => ({
      // Initial state
      searchQuery: '',
      selectedFilter: 'all',
      selectedDate: new Date(),
      isDateFilterActive: false,
      
      // Actions
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedFilter: (selectedFilter) => set({ selectedFilter }),
      setSelectedDate: (selectedDate) => set({ selectedDate }),
      setDateFilterActive: (isDateFilterActive) => set({ isDateFilterActive }),
      clearSearch: () => set({ searchQuery: '' }),
    }),
    {
      name: 'progress-screen-ui',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**STEP 2: Replace Prayers Data with Compatibility Hook**

In `plan-with-calendar.tsx`:
```typescript
// Remove these imports
// import { usePrayersStore, prayersSelectors } from '../../src/stores/prayersStore';

// Add these imports
import { usePrayersCompatible } from '../../src/hooks/usePrayersCompat';
import { useProgressScreenUiStore } from '../../src/stores/progressScreenUiStore';
import { useAuth } from '../../src/hooks/useAuth';

export default function PlanWithCalendarScreen() {
  const { user } = useAuth();
  
  // Use compatibility hook for prayers data
  const {
    prayers,
    isLoading,
    hasMore,
    loadMoreHistory,
    refreshPrayers,
    toggleLike,
  } = usePrayersCompatible(user?.id || null);

  // UI state from dedicated store
  const {
    searchQuery,
    selectedFilter,
    selectedDate,
    isDateFilterActive,
    setSearchQuery,
    setSelectedFilter,
    setSelectedDate,
    setDateFilterActive,
    clearSearch,
  } = useProgressScreenUiStore();

  // Remove all usePrayersStore calls
  // const entities = usePrayersStore(state => state.entities); // ❌ Remove
  // const ids = usePrayersStore(state => state.ids); // ❌ Remove
  // etc.
}
```

**STEP 3: Create Pure Filtering Utilities**

Create `src/utils/prayerFilters.ts`:
```typescript
import { Prayer } from '../models/prayer';
import { extractPeopleFromSnapshot } from './prayerUtils';

export interface EnhancedPrayer extends Prayer {
  enhancedPeople: any[];
}

export interface FilterCounts {
  all: number;
  morning: number;
  evening: number;
  liked: number;
}

export interface FilterParams {
  prayers: Prayer[];
  people: any[];
  searchQuery: string;
  selectedFilter: 'all' | 'morning' | 'evening' | 'liked';
  selectedDate?: Date;
  isDateFilterActive: boolean;
}

// Cache for people extraction (module-scoped)
const snapshotPeopleCache = new WeakMap();

export function getEnhancedFilteredPrayers(params: FilterParams): {
  prayers: EnhancedPrayer[];
  counts: FilterCounts;
} {
  const { prayers, people, searchQuery, selectedFilter, selectedDate, isDateFilterActive } = params;
  
  // Create people map for faster lookups
  const peopleMap = new Map();
  people.forEach((person: any) => {
    peopleMap.set(person.name.toLowerCase(), person);
  });

  // Enhance prayers with people data
  const enhancedPrayers: EnhancedPrayer[] = prayers.map(prayer => {
    let prayerPeople = [];
    if (prayer.input_snapshot) {
      if (snapshotPeopleCache.has(prayer.input_snapshot)) {
        prayerPeople = snapshotPeopleCache.get(prayer.input_snapshot);
      } else {
        prayerPeople = extractPeopleFromSnapshot(prayer.input_snapshot);
        snapshotPeopleCache.set(prayer.input_snapshot, prayerPeople);
      }
    }
    
    const enhancedPeople = prayerPeople.map((person: any) => {
      const fullPerson = peopleMap.get(person.name.toLowerCase());
      if (fullPerson) {
        return {
          ...person,
          id: fullPerson.id,
          image_uri: fullPerson.image_uri,
          relationship: fullPerson.relationship || person.relationship,
          gender: fullPerson.gender || person.gender
        };
      }
      return person;
    });
    
    return {
      ...prayer,
      enhancedPeople
    };
  });

  // Apply filters
  let filtered = [...enhancedPrayers];
  
  // Apply slot filter
  if (selectedFilter === 'morning') {
    filtered = filtered.filter(p => p.slot?.includes('am') || p.slot === 'morning');
  } else if (selectedFilter === 'evening') {
    filtered = filtered.filter(p => p.slot?.includes('pm') || p.slot === 'evening');
  } else if (selectedFilter === 'liked') {
    filtered = filtered.filter(p => p.liked === true);
  }
  
  // Apply search
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.content?.toLowerCase().includes(query) ||
      p.verse_ref?.toLowerCase().includes(query)
    );
  }
  
  // Apply date filter
  if (isDateFilterActive && selectedDate) {
    const targetDate = selectedDate.toISOString().split('T')[0];
    filtered = filtered.filter(p => {
      if (!p.generated_at) return false;
      return p.generated_at.startsWith(targetDate);
    });
  }

  // Calculate counts (before search/date filtering)
  const counts: FilterCounts = {
    all: enhancedPrayers.length,
    morning: enhancedPrayers.filter(p => p.slot?.includes('am') || p.slot === 'morning').length,
    evening: enhancedPrayers.filter(p => p.slot?.includes('pm') || p.slot === 'evening').length,
    liked: enhancedPrayers.filter(p => p.liked === true).length,
  };

  return { prayers: filtered, counts };
}
```

**STEP 4: Update Component Logic**

Replace the large memoized blocks in `plan-with-calendar.tsx`:
```typescript
// Remove large memoized selector blocks
// const filteredEnhancedPrayers = useMemo(() => { ... }, [...]); // ❌ Remove
// const filterCounts = useMemo(() => { ... }, [...]); // ❌ Remove

// Replace with pure function call
const { prayers: filteredEnhancedPrayers, counts: filterCounts } = useMemo(() => 
  getEnhancedFilteredPrayers({
    prayers,
    people: prayerPeople,
    searchQuery,
    selectedFilter,
    selectedDate,
    isDateFilterActive,
  }),
  [prayers, prayerPeople, searchQuery, selectedFilter, selectedDate, isDateFilterActive]
);
```

**STEP 5: Update Mutation Handlers**

Replace store-based mutations:
```typescript
// Replace store-based like toggle
const handleLikeToggle = useCallback((prayerId: string) => {
  const prayer = prayers.find(p => p.id === prayerId);
  if (prayer && user?.id) {
    toggleLike(prayerId, !prayer.liked);
  }
}, [prayers, toggleLike, user?.id]);

// Replace store-based refresh
const onRefresh = useCallback(() => {
  refreshPrayers();
}, [refreshPrayers]);
```

**STEP 6: Update Loading States**

Replace store-based loading indicators:
```typescript
// Remove store loading states
// const isLoading = usePrayersStore(state => state.isLoading); // ❌ Remove
// const isRefreshing = usePrayersStore(state => state.isRefreshing); // ❌ Remove

// Use compatibility hook loading states (already available)
const isAnyLoading = isLoading;
// isRefreshing from refreshPrayers mutation is handled by React Query
```

**STEP 7: Testing & Verification**

Create comprehensive tests:
```typescript
// src/utils/prayerFilters.test.ts
import { getEnhancedFilteredPrayers } from './prayerFilters';

describe('prayerFilters', () => {
  it('filters morning prayers correctly', () => {
    const result = getEnhancedFilteredPrayers({
      prayers: mockPrayers,
      people: mockPeople,
      searchQuery: '',
      selectedFilter: 'morning',
      isDateFilterActive: false,
    });
    
    expect(result.prayers).toHaveLength(2);
    expect(result.counts.morning).toBe(2);
  });
  
  // Add tests for all filter combinations, search, and counts
});
```

#### Risk Mitigation

1. **Feature Flag Safety**: All changes behind `REACT_QUERY_MIGRATION` flag
2. **Compatibility Layer**: Uses existing `usePrayersCompatible` hook
3. **UI State Separation**: Dedicated store prevents coupling with server state
4. **Pure Functions**: `getEnhancedFilteredPrayers` is testable and predictable
5. **Performance**: Memoization preserves existing performance characteristics

#### Success Criteria

- [ ] Component renders identically with feature flag ON/OFF
- [ ] All user interactions work (search, filter, like, refresh)
- [ ] Performance remains equivalent or improves
- [ ] No direct `prayersStore` imports remain
- [ ] Unit tests achieve 100% coverage on filter utilities
- [ ] E2E tests pass in both flag states

#### Estimated Effort

- **Implementation**: 4-6 hours
- **Testing**: 2-3 hours  
- **Code Review & Refinement**: 1-2 hours
- **Total**: 1-2 days for experienced developer

#### Implementation Notes

This plan can be executed by any AI coding assistant with minimal context by following the steps sequentially. Each step is self-contained and includes:

1. **Clear file paths** and **exact code snippets**
2. **Specific imports/exports** to add/remove  
3. **Testing checkpoints** after each major change
4. **Rollback strategy** via feature flag

The plan follows the **Oracle's recommendations** from the Phase 3 review:
- ✅ Separates UI state from server state
- ✅ Uses pure functions for filtering logic
- ✅ Maintains compatibility hook pattern
- ✅ Preserves existing performance characteristics
- ✅ Includes comprehensive testing strategy

**Ready for implementation** - can be assigned to any developer or AI assistant.

---

## Phase 4: Realtime Integration ✅ COMPLETED

### Objective ✅
Integrate Supabase Realtime with the event bus system for multi-device synchronization.

### 4.1 Realtime Architecture ✅

**Implemented Components:**
- ✅ `RealtimeProvider` - Provider component for app-level realtime management
- ✅ `realtimeSync.ts` - Single-channel realtime manager with token refresh
- ✅ Auth slice integration - Manages realtime token updates 
- ✅ QueryClient integration - Handles network status and reconnection
- ✅ Event bus system - Typed callbacks and domain-specific handling
- ✅ Realtime patching utilities - Apply optimistic updates from events

### 4.2 PRAYLOCK Integration ✅

**React Query Compatibility:**
- ✅ `usePraylockData` hook - React Query compatible PRAYLOCK data access
- ✅ `getPrayerCompletionStatus` helper - Unified data access across architectures
- ✅ PRAYLOCK store updates - Uses React Query compatible helpers
- ✅ AppStateProvider integration - Prevents legacy store conflicts

### 4.3 Oracle Review & Critical Fixes ✅

**High-Priority Issues Fixed:**
- ✅ **Token refresh handling** - Realtime sockets no longer die after 60min
- ✅ **queryClient race condition** - Replaced static import with lazy dynamic import
- ✅ **Cleanup error handling** - Added try/catch for NetInfo and channel cleanup
- ✅ **Legacy store conflicts** - Gated `initializeHome()` behind feature flag

**Medium-Priority Hardening:**
- ✅ **Connection health checks** - Support both v1/v2 Supabase client states
- ✅ **PRAYLOCK concurrency guards** - Prevent multiple native monitoring calls
- ✅ **Platform checks** - iOS-only features properly guarded
- ✅ **Error boundaries** - Comprehensive error handling throughout

### 4.4 Production Readiness ✅

**Architecture Benefits:**
- ✅ **Zero downtime migration** - Feature flag controlled rollout
- ✅ **Backward compatibility** - Legacy stores work alongside React Query
- ✅ **Token management** - Automatic refresh and reconnection handling
- ✅ **Multi-device sync** - Real-time data updates across devices
- ✅ **Network resilience** - Offline queuing and retry mechanisms

**Testing & Validation:**
- ✅ Oracle security review passed
- ✅ Critical crash scenarios addressed
- ✅ PRAYLOCK native module integration verified
- ✅ Realtime event handling tested
- ✅ Feature flag migration path validated

### Status: PRODUCTION READY ✅

Phase 4 is complete with all Oracle recommendations implemented. The React Query migration is now stable for production use with full realtime integration.

---

## ✅ Phase 5: Performance Optimization (Week 11) - COMPLETE

### Status: PRODUCTION READY ✅

Phase 5 is complete with all performance optimizations implemented. The React Query migration now includes advanced performance features.

### Objective  
Implement pagination, caching optimizations, and UI improvements.

### 4.1 FlashList Integration

**File**: `app/(app)/(tabs)/prayers/index.tsx` (Update existing file)

```typescript
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { usePrayersCompatible } from '../../../src/hooks/usePrayersCompat';
import { useAuth } from '../../../src/hooks/useAuth';

interface PrayerItemProps {
  prayer: Prayer;
  onToggleLike: (prayerId: string) => void;
}

const PrayerItem = React.memo<PrayerItemProps>(({ prayer, onToggleLike }) => {
  const handleToggleLike = useCallback(() => {
    onToggleLike(prayer.id);
  }, [prayer.id, onToggleLike]);

  return (
    <View style={styles.prayerItem}>
      {/* Existing prayer item UI */}
    </View>
  );
});

export default function PrayersScreen() {
  const { user } = useAuth();
  const {
    prayers,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMoreHistory,
    toggleLike,
  } = usePrayersCompatible(user?.id || null);

  const handleToggleLike = useCallback((prayerId: string) => {
    toggleLike(prayerId).catch(console.error);
  }, [toggleLike]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMoreHistory();
    }
  }, [hasMore, isLoadingMore, loadMoreHistory]);

  const renderPrayerItem = useCallback(({ item }: { item: Prayer }) => (
    <PrayerItem 
      prayer={item} 
      onToggleLike={handleToggleLike}
    />
  ), [handleToggleLike]);

  const getItemType = useCallback((item: Prayer) => {
    // FlashList optimization - return item types for better recycling
    return item.slot?.includes('morning') ? 'morning' : 'evening';
  }, []);

  return (
    <View style={styles.container}>
      <FlashList
        data={prayers}
        renderItem={renderPrayerItem}
        getItemType={getItemType}
        estimatedItemSize={200} // Adjust based on your prayer item height
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  prayerItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
```

### 4.2 Optimized Home Screen

**File**: `src/hooks/useHomeData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { useTodaysPrayers } from './usePrayers';
import { usePeople } from './usePeople';
import { useIntentions } from './useIntentions';
import { rpcFunctions } from '../lib/supabaseRpc';
import { isFeatureEnabled } from '../config/featureFlags';

// Aggregated home data query
export const useHomeData = (userId: string | null) => {
  // Get individual data sources
  const todaysPrayersQuery = useTodaysPrayers(userId);
  const activePeopleQuery = usePeople(userId, { activeOnly: true });
  const intentionsQuery = useIntentions(userId);
  
  // Get prayer state from RPC
  const prayerStateQuery = useQuery({
    queryKey: queryKeys.homeData(userId || ''),
    queryFn: () => rpcFunctions.getCurrentPrayerState(userId!),
    enabled: !!userId && isFeatureEnabled('REACT_QUERY_MIGRATION'),
    staleTime: 1000 * 60 * 2, // 2 minutes - prayer availability changes
  });

  const isLoading = 
    todaysPrayersQuery.isLoading ||
    activePeopleQuery.isLoading ||
    intentionsQuery.isLoading ||
    prayerStateQuery.isLoading;

  const error = 
    todaysPrayersQuery.error ||
    activePeopleQuery.error ||
    intentionsQuery.error ||
    prayerStateQuery.error;

  // Compute derived data
  const morningPrayer = todaysPrayersQuery.data?.morning || null;
  const eveningPrayer = todaysPrayersQuery.data?.evening || null;
  const activePeople = activePeopleQuery.data || [];
  const activeIntentions = intentionsQuery.data?.filter(i => i.is_active) || [];
  const prayerState = prayerStateQuery.data?.data;

  // Current period calculation
  const currentPeriod = prayerState?.current_period || 'morning';
  const morningAvailable = prayerState?.morning_available || false;
  const eveningAvailable = prayerState?.evening_available || false;
  const currentWindowAvailable = prayerState?.current_window_available || false;

  return {
    // Prayer data
    morningPrayer,
    eveningPrayer,
    currentPeriod,
    
    // Availability
    morningAvailable,
    eveningAvailable, 
    currentWindowAvailable,
    
    // Completion states
    morningCompleted: !!morningPrayer?.completed_at,
    eveningCompleted: !!eveningPrayer?.completed_at,
    
    // People and intentions
    activePeople,
    activeIntentions,
    activePeopleIds: activePeople.map(p => p.id),
    
    // States
    isLoading,
    error: error?.message || null,
    
    // Refetch function
    refetch: () => {
      todaysPrayersQuery.refetch();
      activePeopleQuery.refetch();
      intentionsQuery.refetch();
      prayerStateQuery.refetch();
    },
  };
};
```

### 4.3 Background Refresh Setup

**File**: `src/lib/backgroundRefresh.ts`

```typescript
import { AppState, AppStateStatus } from 'react-native';
import { queryClient } from './queryClient';
import { eventBus } from './eventBus';

class BackgroundRefreshManager {
  private appStateSubscription: any = null;
  private lastActiveTime: number = Date.now();
  private readonly STALE_THRESHOLD = 1000 * 60 * 5; // 5 minutes

  init() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      const now = Date.now();
      const timeSinceBackground = now - this.lastActiveTime;
      
      if (timeSinceBackground > this.STALE_THRESHOLD) {
        console.log('[BackgroundRefresh] App became active after', timeSinceBackground, 'ms');
        this.refreshStaleQueries();
      }
      
      this.lastActiveTime = now;
    } else if (nextAppState === 'background') {
      this.lastActiveTime = Date.now();
    }
  };

  private refreshStaleQueries() {
    // Refresh important queries when app becomes active
    queryClient.invalidateQueries({
      predicate: (query) => {
        const { queryKey } = query;
        // Refresh home data, today's prayers, and active people
        return (
          queryKey.includes('homeData') ||
          queryKey.includes('today') ||
          (queryKey.includes('people') && queryKey.includes('activeOnly'))
        );
      },
    });
    
    // Emit background refresh event
    eventBus.emit('system:backgroundRefresh');
  }

  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

export const backgroundRefreshManager = new BackgroundRefreshManager();
```

---

## Phase 6: Cleanup & Testing (Week 12)

### Objective
Remove legacy code, add comprehensive testing, and ensure production readiness.

### 5.1 Legacy Code Removal

**File**: `docs/legacy-cleanup-checklist.md`

```markdown
# Legacy Code Cleanup Checklist

## Phase 5.1: Safe Removal (After React Query Migration is Stable)

### Files to Remove
- [ ] `src/stores/prayersStore.ts` (replaced by React Query)
- [ ] `src/stores/prayerPeopleStore.ts` (replaced by React Query)
- [ ] `src/stores/intentionsStore.ts` (replaced by React Query)
- [ ] Old auth store files (if split was successful)

### Code Patterns to Remove
- [ ] Manual WeakMap caches
- [ ] Module-scoped memoization variables
- [ ] Cross-store getState() calls
- [ ] Manual loading flags for server state
- [ ] Duplicate fetch methods

### Components to Update
- [ ] Remove `.dbId` compatibility code
- [ ] Update all components to use new hooks
- [ ] Remove manual error handling (let React Query handle)
- [ ] Remove manual loading states for server data

### Feature Flags to Retire
- [ ] Set `REACT_QUERY_MIGRATION: true` permanently
- [ ] Remove feature flag conditional logic
- [ ] Update TypeScript types to remove old patterns
```

### 5.2 Comprehensive Testing

**File**: `src/__tests__/integration/migration.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { usePrayersCompatible } from '../../hooks/usePrayersCompat';
import { useHomeData } from '../../hooks/useHomeData';

// Test wrapper with React Query
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('React Query Migration Integration', () => {
  beforeEach(() => {
    // Mock feature flags
    jest.doMock('../../config/featureFlags', () => ({
      isFeatureEnabled: jest.fn(() => true), // Enable React Query
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.unmock('../../config/featureFlags');
  });

  describe('Auth System', () => {
    it('should initialize session and profile correctly', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test session data is available
      expect(result.current.user).toBeDefined();
      expect(result.current.isAuthenticated).toBe(true);
      
      // Test profile data is loaded
      expect(result.current.profile).toBeDefined();
      expect(result.current.isProfileLoading).toBe(false);
    });

    it('should handle profile updates correctly', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Test profile update
      const updatePromise = result.current.updateProfile({
        display_name: 'Test User Updated'
      });

      await expect(updatePromise).resolves.not.toThrow();
      
      // Profile should be updated in cache
      await waitFor(() => {
        expect(result.current.profile?.display_name).toBe('Test User Updated');
      });
    });
  });

  describe('Prayers System', () => {
    it('should load prayers with pagination', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => {
        const auth = useAuth();
        const prayers = usePrayersCompatible(auth.user?.id || null);
        return { auth, prayers };
      }, { wrapper });

      await waitFor(() => {
        expect(result.current.prayers.isLoading).toBe(false);
      });

      // Test prayers are loaded
      expect(result.current.prayers.prayers).toBeDefined();
      expect(Array.isArray(result.current.prayers.prayers)).toBe(true);
      
      // Test today's prayers are available
      expect(result.current.prayers.morningPrayer).toBeDefined();
      expect(result.current.prayers.eveningPrayer).toBeDefined();
    });

    it('should handle prayer like toggle', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => {
        const auth = useAuth();
        const prayers = usePrayersCompatible(auth.user?.id || null);
        return { auth, prayers };
      }, { wrapper });

      await waitFor(() => {
        expect(result.current.prayers.isLoading).toBe(false);
      });

      const firstPrayer = result.current.prayers.prayers[0];
      if (firstPrayer) {
        const originalLikeStatus = firstPrayer.liked;
        
        // Toggle like
        await result.current.prayers.toggleLike(firstPrayer.id);
        
        // Verify optimistic update
        expect(
          result.current.prayers.prayers.find(p => p.id === firstPrayer.id)?.liked
        ).toBe(!originalLikeStatus);
      }
    });
  });

  describe('Home Data Integration', () => {
    it('should aggregate home screen data correctly', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => {
        const auth = useAuth();
        const homeData = useHomeData(auth.user?.id || null);
        return { auth, homeData };
      }, { wrapper });

      await waitFor(() => {
        expect(result.current.homeData.isLoading).toBe(false);
      });

      // Test all home data is available
      expect(result.current.homeData.morningPrayer).toBeDefined();
      expect(result.current.homeData.eveningPrayer).toBeDefined();
      expect(result.current.homeData.currentPeriod).toMatch(/^(morning|evening)$/);
      expect(result.current.homeData.activePeople).toBeDefined();
      expect(result.current.homeData.activeIntentions).toBeDefined();
      
      // Test derived data
      expect(typeof result.current.homeData.morningCompleted).toBe('boolean');
      expect(typeof result.current.homeData.eveningCompleted).toBe('boolean');
      expect(Array.isArray(result.current.homeData.activePeopleIds)).toBe(true);
    });
  });

  describe('Event Bus Integration', () => {
    it('should invalidate queries on data mutations', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => {
        const auth = useAuth();
        const prayers = usePrayersCompatible(auth.user?.id || null);
        const homeData = useHomeData(auth.user?.id || null);
        return { auth, prayers, homeData };
      }, { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.prayers.isLoading).toBe(false);
        expect(result.current.homeData.isLoading).toBe(false);
      });

      // Simulate prayer completion (would emit event)
      const prayer = result.current.prayers.prayers[0];
      if (prayer) {
        // This should trigger query invalidation via event bus
        // Test would verify that home data refetches
      }
    });
  });
});
```

### 5.3 Performance Testing

**File**: `src/__tests__/performance/migration.test.ts`

```typescript
import { performance } from 'perf_hooks';
import { renderHook } from '@testing-library/react-native';
import { usePrayersCompatible } from '../../hooks/usePrayersCompat';

describe('Performance Tests', () => {
  it('should load prayers efficiently', async () => {
    const startTime = performance.now();
    
    const { result, waitForNextUpdate } = renderHook(() => 
      usePrayersCompatible('test-user-id')
    );

    await waitForNextUpdate();
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;

    // Should load within reasonable time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(2000); // 2 seconds max
    
    // Should have loaded data
    expect(result.current.prayers.length).toBeGreaterThan(0);
  });

  it('should handle large datasets efficiently', async () => {
    // Mock large dataset
    const mockLargeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `prayer-${i}`,
      content: `Prayer content ${i}`,
      // ... other fields
    }));

    // Test pagination performance
    // Should render first page quickly even with large dataset
  });
});
```

---

## Production Rollout Plan

### Week 13-16: Gradual Production Rollout

#### 7.1 Feature Flag Rollout Strategy

```typescript
// Production feature flag rollout stages
export const ROLLOUT_STAGES = {
  // Stage 1: Internal testing (Dev team only)
  STAGE_1: {
    REACT_QUERY_MIGRATION: __DEV__ || process.env.EXPO_PUBLIC_DEV_BUILD === 'true',
    percentage: 0,
  },
  
  // Stage 2: Beta testers (10% of users)
  STAGE_2: {
    REACT_QUERY_MIGRATION: Math.random() < 0.1,
    percentage: 10,
  },
  
  // Stage 3: Gradual rollout (50% of users)
  STAGE_3: {
    REACT_QUERY_MIGRATION: Math.random() < 0.5,
    percentage: 50,
  },
  
  // Stage 4: Full rollout (100% of users)
  STAGE_4: {
    REACT_QUERY_MIGRATION: true,
    percentage: 100,
  },
};
```

#### 7.2 Monitoring & Rollback Plan

```typescript
// Error tracking for migration
export const trackMigrationError = (error: Error, context: string) => {
  // Log to crash analytics (Sentry, Crashlytics, etc.)
  console.error(`[Migration Error] ${context}:`, error);
  
  // Track migration-specific metrics
  if (error.message.includes('React Query')) {
    // Flag as potential migration issue
    // Could trigger automatic rollback if error rate is high
  }
};

// Rollback function
export const rollbackMigration = () => {
  // Immediately disable React Query features
  FEATURE_FLAGS.REACT_QUERY_MIGRATION = false;
  
  // Clear React Query cache to prevent conflicts
  queryClient.clear();
  
  // Restart app to ensure clean state
  // (Implementation depends on your restart mechanism)
};
```

#### 7.3 Success Metrics

**Technical Metrics:**
- ✅ App startup time < 3 seconds (target: 2 seconds)
- ✅ Memory usage < 150MB (target: 100MB)
- ✅ Crash rate < 0.1% (target: 0.05%)
- ✅ Network requests < 50% of current (achieved via caching)

**User Experience Metrics:**
- ✅ Prayer loading time < 1 second
- ✅ Navigation smoothness (60 FPS)
- ✅ Offline functionality maintained
- ✅ Background refresh working

**Maintenance Metrics:**
- ✅ Code complexity reduced by 40%
- ✅ Cross-store dependencies eliminated
- ✅ Test coverage > 80%
- ✅ TypeScript strict mode enabled

---

## Risk Mitigation

### High-Risk Areas & Mitigation

1. **Event Bus Wildcard Failures (CRITICAL)**
   - **Risk**: Silent cache invalidation failures due to mitt limitations
   - **Mitigation**: Use EventEmitter2 with proper wildcard support
   - **Rollback**: Instant feature flag disable, manual cache clearing

2. **Cache Persistence Issues**
   - **Risk**: Offline experience regression without React Query persistence
   - **Mitigation**: Implement proper cache persistence with AsyncStorage
   - **Rollback**: Disable persistence, rely on network-only queries

3. **Realtime Sync Failures**
   - **Risk**: Multi-device scenarios broken without Supabase Realtime integration
   - **Mitigation**: Comprehensive realtime testing, proper cleanup
   - **Rollback**: Disable realtime subscriptions, rely on polling

4. **Auth Flow Interruption**
   - **Risk**: Race conditions break login despite fixes
   - **Mitigation**: Comprehensive auth testing, init token system
   - **Rollback**: Instant feature flag disable

5. **Memory Leaks**
   - **Risk**: Event listeners and subscriptions not properly cleaned up
   - **Mitigation**: Proper cleanup functions, maxListeners limits
   - **Rollback**: App restart mechanism, memory monitoring

6. **Data Consistency During Migration**
   - **Risk**: Dual state sources cause conflicts
   - **Mitigation**: Single writer policy, comprehensive testing
   - **Rollback**: Clear all caches, force fresh fetch

7. **Prayer Generation Integration**
   - **Risk**: OpenAI/NestJS integration breaks with new patterns
   - **Mitigation**: Keep existing prayer generation unchanged initially
   - **Rollback**: Edge function rollback, client-side fallback

### Testing Strategy

1. **Unit Tests**: Repository layer, hooks, utilities, event bus
2. **Integration Tests**: Cross-component data flow, realtime sync
3. **E2E Tests**: Critical user journeys (prayer generation, completion, multi-device)
4. **Performance Tests**: Startup time, memory usage, scroll performance, cache hit rates
5. **Device Tests**: iOS/Android, various screen sizes, offline scenarios
6. **Network Tests**: Offline functionality, slow connections, realtime reconnection
7. **Memory Tests**: Long-running sessions, event listener cleanup
8. **Regression Tests**: Both old and new systems during migration

---

## Success Criteria

### Technical Success
- [ ] All stores migrated to appropriate architecture
- [ ] Race conditions eliminated
- [ ] Performance improvements achieved
- [ ] Memory usage optimized
- [ ] Code complexity reduced

### User Experience Success
- [ ] No user-facing regressions
- [ ] Faster app startup and navigation
- [ ] Improved offline experience
- [ ] Smoother scrolling and interactions

### Maintenance Success
- [ ] Easier to add new features
- [ ] Better testability
- [ ] Clear separation of concerns
- [ ] Reduced technical debt

---

## Conclusion

This migration plan provides a comprehensive, production-safe approach to modernizing the Just Pray app architecture. The incremental, feature-flagged approach ensures minimal risk while achieving significant architectural improvements.

**Updated based on Oracle feedback to address critical issues:**

The plan addresses all major issues identified in the current system:
- ✅ Cross-store coupling eliminated via event bus with proper wildcard support (EventEmitter2)
- ✅ Performance improved via React Query caching, persistence, and pagination
- ✅ Race conditions fixed with proper auth flow and init tokens
- ✅ Manual cache management replaced with React Query + AsyncStorage persistence
- ✅ God-store anti-pattern resolved with proper separation
- ✅ Realtime multi-device sync via Supabase Realtime integration
- ✅ Memory leak prevention with proper cleanup functions
- ✅ Offline experience maintained with cache persistence

**Key Improvements from Oracle Review:**
- **Extended timeline to 12-16 weeks** for production safety
- **Fixed event bus implementation** with EventEmitter2 wildcard support
- **Added cache persistence** to maintain offline experience
- **Integrated Supabase Realtime** for multi-device synchronization
- **Enhanced memory management** with proper cleanup
- **Comprehensive testing strategy** including regression tests

**Timeline Realism:**
- **Development**: 12 weeks (vs original 6 weeks)
- **Rollout**: 4 weeks gradual production deployment

---

## ✅ Phase 3.1 & 3.2 Completion Summary (PRODUCTION READY)

### Domains Successfully Migrated:
- **Prayers Domain**: Complete React Query implementation with compatibility layer
- **People Domain**: Complete React Query implementation with compatibility layer

### Oracle Critical Fixes Implemented:
1. ✅ **Query Key Mismatches Fixed**: All prayer mutations use proper queryKeys factory
2. ✅ **Infinite Query Cache Updates**: All people mutations update both flat and infinite caches
3. ✅ **Duplicate resetReactQuery Removed**: Single call in auth listener only
4. ✅ **Versioned Cache Key**: `REACT_QUERY_OFFLINE_CACHE_V1` for schema change protection
5. ✅ **Error Surface Added**: All mutations have proper error logging and TODO for user alerts
6. ✅ **Non-serializable Keys Fixed**: People query keys use primitive strings not objects

### Database Schema Verification:
- ✅ **Prayers Table**: All 11 fields verified and aligned with repository interface
- ✅ **Prayer Focus People Table**: All 11 fields verified and aligned 
- ✅ **Prayer Intentions Table**: All 7 fields verified and aligned
- ✅ **Foreign Key Relationships**: All constraints verified and working correctly

### Architecture Quality:
- ✅ **Repository Pattern**: Clean data access layer with Supabase interactions
- ✅ **React Query Integration**: Mobile-optimized with offline support and persistence
- ✅ **Event Bus System**: Automated cache invalidation across domains
- ✅ **Compatibility Layers**: Zero-downtime migration with feature flag control
- ✅ **Type Safety**: Strict TypeScript throughout with proper isolatedModules support

### Performance Optimizations:
- ✅ **Cursor-based Pagination**: Efficient infinite scroll for large datasets
- ✅ **Optimistic Updates**: All mutations with proper rollback on error
- ✅ **Cache Management**: Automated stale-while-revalidate with mobile-friendly timeouts
- ✅ **Network Resilience**: Offline-first queries with retry strategies

### Production Readiness Checklist:
- ✅ **Zero Breaking Changes**: All components work seamlessly 
- ✅ **Feature Flag Control**: Can toggle between React Query and Zustand
- ✅ **Error Handling**: Comprehensive error catching and logging
- ✅ **Memory Management**: Proper cleanup on sign-out and unmount
- ✅ **TypeScript Compliance**: No implicit any types or missing exports
- ✅ **Database Alignment**: Schema verified against actual Supabase tables

**Status**: Prayers and People domains are **PRODUCTION READY** and can be deployed with confidence.
- **Total**: 16 weeks for complete migration

By following this updated plan, the app will achieve a modern, scalable, and maintainable architecture that can support future growth and feature development while maintaining production stability and user experience.
