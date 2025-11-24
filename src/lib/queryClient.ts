import { QueryClient, QueryCache } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { resetPrefetchedImageRegistry } from '../utils/imagePrefetchRegistry';
import { resetIntentionsPrefetchCache } from '../features/intentions/prefetchCache';
import { captureException } from './sentry';

// Setup online manager for React Query
onlineManager.setEventListener(setOnline => {
  const unsubscribe = NetInfo.addEventListener(state => {
    const isOnline = !!state.isConnected;
    setOnline(isOnline);

    // Handle realtime reconnection when coming back online
    if (isOnline) {
      // Import dynamically to avoid circular dependency
      import('./realtimeSync').then(({ realtimeManager }) => {
        realtimeManager.verifyConnection();
      }).catch(error => {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Online manager verify error');
        captureException(err, { area: 'queryClient.onlineManager' });
      });
    }
  });

  // Return cleanup function
  return () => {
    try {
      unsubscribe();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Online manager unsubscribe error');
      captureException(err, { area: 'queryClient.onlineManager' });
    }
  };
});

// Create query cache with error handling for hydration issues
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Handle missing queryFn errors that occur during hydration (silent removal)
    if ((error as any)?.message?.includes('Missing queryFn')) {
      queryCache.remove(query);
      return;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Query cache error');
    captureException(err, { area: 'queryClient.queryCache', key: query.queryKey });
  },
});

// Configure React Query for mobile app
export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      // Mobile-optimized defaults
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (v5 naming)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          if (status >= 400 && status < 500) return false;
        }

        // Don't retry missing queryFn errors (hydration issues)
        if (error?.message?.includes('Missing queryFn')) {
          return false;
        }

        return failureCount < 2; // Retry up to 2 times
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst', // Allow queries when offline if cached
      structuralSharing: true, // Better performance for list pagination
      throwOnError: true, // Bubble errors to components immediately
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
  key: 'REACT_QUERY_OFFLINE_CACHE_V1', // Versioned to handle schema changes
  throttleTime: 1000,
  serialize: (data) => {
    try {
      return JSON.stringify(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Query persister serialization error');
      captureException(err, { area: 'queryClient.persister' });
      return '{}';
    }
  },
  deserialize: (data) => {
    try {
      return JSON.parse(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Query persister deserialization error');
      captureException(err, { area: 'queryClient.persister' });
      return {};
    }
  },
});

// Cache configuration helpers
export const cacheConfig = {
  // For user-controlled static data that never changes externally
  userControlled: {
    staleTime: Infinity, // Never mark as stale - only invalidate on user mutations
    gcTime: Infinity,    // Never garbage collect - keep in memory until sign-out
  },
  // For time-sensitive or external data
  timeSensitive: (minutes: number) => ({
    staleTime: 1000 * 60 * minutes,
    gcTime: 1000 * 60 * (minutes * 2), // Keep in cache longer than stale time
  }),
} as const;

// Query keys factory for consistency
export const queryKeys = {
  // Auth
  session: ['session'] as const,
  profile: (userId: string) => ['profile', userId] as const,

  // Prayers
  prayers: (userId: string) => ['prayers', userId] as const,
  prayersInfinite: (userId: string, filter: 'all' | 'morning' | 'evening' | 'liked') =>
    ['prayers', userId, 'infinite', filter] as const,
  prayersToday: (userId: string, dayKey?: string | null) => {
    if (dayKey) {
      return ['prayers', userId, 'today', dayKey] as const;
    }
    return ['prayers', userId, 'today'] as const;
  },
  prayer: (userId: string, prayerId: string) => ['prayer', userId, prayerId] as const,

  // People
  people: (userId: string, activeOnly = false) => ['people', userId, activeOnly ? 'active' : 'all'] as const,
  person: (personId: string) => ['person', personId] as const,

  // Intentions
  intentions: (userId: string) => ['intentions', userId] as const,
  activeIntentions: (userId: string) => ['intentions', userId, 'active'] as const,
  intentionsByPerson: (userId: string, personId: string | null) =>
    ['intentions', userId, 'person', personId] as const,
  intention: (intentionId: string) => ['intention', intentionId] as const,

  // Home aggregated data
  homeData: (userId: string) => ['homeData', userId] as const,

  // User stats
  userStats: (userId: string) => ['userStats', userId] as const,

  // Prayer state
  prayerState: (userId: string) => ['prayerState', userId] as const,

  // Onboarding (for Phase 3)
  onboardingFlow: (userId: string) => ['onboardingFlow', userId] as const,
  onboardingState: (userId: string) => ['onboardingState', userId] as const,
  onboardingSteps: (userId: string, flowId: string) => ['onboardingSteps', userId, flowId] as const,
} as const;

// Type-safe query key helper
export type QueryKeys = typeof queryKeys;

// Reset function for sign-out to prevent cross-user data leaks
export const resetReactQuery = async () => {
  try {
    // Clear persisted cache first
    await queryPersister.removeClient();
    // Clear in-memory cache
    await queryClient.clear();
    resetIntentionsPrefetchCache();
    resetPrefetchedImageRegistry();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('React Query reset failed');
    captureException(err, { area: 'queryClient.reset' });
    // Still try to clear memory cache even if persister fails
    await queryClient.clear();
    resetIntentionsPrefetchCache();
    resetPrefetchedImageRegistry();
  }
};

// Function to clean up invalid cache entries (useful after onboarding)
export const cleanupInvalidCacheEntries = () => {
  const allQueries = queryCache.getAll();
  let removedCount = 0;

  allQueries.forEach(query => {
    // Check for queries that might have hydration issues
    if (!query.options.queryFn) {
      const hasSuccessfulData =
        query.state.status === 'success' ||
        (typeof query.state.dataUpdatedAt === 'number' && query.state.dataUpdatedAt > 0);

      if (hasSuccessfulData) {
        return;
      }
      queryCache.remove(query);
      removedCount++;
    }
  });

  return removedCount;
};

// Enhanced reset function that also cleans up invalid entries
export const resetAndCleanupReactQuery = async () => {
  try {
    // First clean up any invalid entries
    cleanupInvalidCacheEntries();

    // Then do the normal reset
    await resetReactQuery();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('React Query reset+cleanup failed');
    captureException(err, { area: 'queryClient.reset' });
    // Still try to clean up memory cache
    cleanupInvalidCacheEntries();
  }
};

// Function to retry queries that might have failed due to hydration issues
export const retryHydrationFailedQueries = () => {
  const allQueries = queryCache.getAll();
  let retryCount = 0;

  allQueries.forEach(query => {
    // Check if this query failed due to missing queryFn
    if (query.state.error?.message?.includes('Missing queryFn')) {
      // Remove the failed query and let it be recreated with proper queryFn
      queryCache.remove(query);
      retryCount++;
    }
  });

  return retryCount;
};
