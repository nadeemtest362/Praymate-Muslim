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
  
  // Profile events
  'data:profiles:updated': { userId: string; profileId: string };
  
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
const SINGULAR_MAPPING = {
  prayers: 'prayer',
  people: 'person', 
  intentions: 'intention',
  profiles: 'profile'
} as const;

export const emitDataChange = (
  table: 'prayers' | 'people' | 'intentions' | 'profiles',
  action: 'created' | 'updated' | 'deleted' | 'toggled' | 'completed',
  payload: { userId: string; id: string }
) => {
  const eventKey = `data:${table}:${action}`;
  const singularKey = `${SINGULAR_MAPPING[table]}Id`;
  
  if (action === 'completed') {
    eventBus.emit(eventKey, {
      userId: payload.userId,
      prayerId: payload.id // Always use prayerId for completed actions
    });
  } else {
    eventBus.emit(eventKey, {
      userId: payload.userId,
      [singularKey]: payload.id
    });
  }
};

// Query invalidation helper
export const invalidateUserQueries = (userId: string, tables?: string[]) => {
  // Import dynamically to avoid circular dependency
  import('./queryClient').then(({ queryClient, queryKeys }) => {
    if (!tables || tables.includes('prayers')) {
      queryClient.invalidateQueries({ queryKey: ['prayers', userId], exact: false });
      // Also invalidate specific prayer queries
      queryClient.invalidateQueries({ queryKey: queryKeys.prayersToday(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.prayerState(userId) });
    }
    if (!tables || tables.includes('people')) {
      queryClient.invalidateQueries({ queryKey: ['people', userId], exact: false });
    }
    if (!tables || tables.includes('intentions')) {
      queryClient.invalidateQueries({ queryKey: ['intentions', userId], exact: false });
    }
    if (!tables || tables.includes('userStats')) {
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats(userId) });
    }
    if (!tables || tables.includes('homeData')) {
      queryClient.invalidateQueries({ queryKey: ['homeData', userId], exact: false });
      // Legacy support - also invalidate using new queryKeys structure
      queryClient.invalidateQueries({ queryKey: queryKeys.homeData(userId) });
    }
  });
};

// Auto-invalidation setup with wildcard support
eventBus.on('data:prayers:*', (payload) => {
  if (payload && typeof payload === 'object' && 'userId' in payload) {
    invalidateUserQueries(payload.userId as string, ['prayers', 'userStats', 'homeData']);

    // Also invalidate the specific prayer query when we know the prayerId
    try {
      const p: any = payload;
      if (p && typeof p === 'object' && 'prayerId' in p && p.prayerId && p.userId) {
        import('./queryClient').then(({ queryClient, queryKeys }) => {
          try {
            queryClient.invalidateQueries({ queryKey: queryKeys.prayer(p.userId as string, p.prayerId as string) });
          } catch {}
        }).catch(() => {});
      }
    } catch {}
  }
});

eventBus.on('data:people:*', (payload) => {
  if (payload && typeof payload === 'object' && 'userId' in payload) {
    invalidateUserQueries(payload.userId as string, ['people', 'intentions', 'homeData']);
  }
});

eventBus.on('data:intentions:*', (payload) => {
  if (payload && typeof payload === 'object' && 'userId' in payload) {
    invalidateUserQueries(payload.userId as string, ['intentions', 'people', 'homeData']);
  }
});

eventBus.on('data:profiles:*', (payload) => {
  if (payload && typeof payload === 'object' && 'userId' in payload) {
    invalidateUserQueries(payload.userId as string, ['profile', 'homeData']);
  }
});

// Typed wrappers for type safety
type EventKey = keyof AppEvents;

export const emit = <K extends EventKey>(key: K, payload: AppEvents[K]) => {
  eventBus.emit(key, payload);
};

export const on = <K extends EventKey>(key: K, callback: (payload: AppEvents[K]) => void) => {
  return eventBus.on(key, callback);
};

export const off = <K extends EventKey>(key: K, callback?: (payload: AppEvents[K]) => void) => {
  if (callback) {
    eventBus.off(key, callback);
  } else {
    eventBus.removeAllListeners(key);
  }
};

// Cleanup function for event listeners
export const cleanupEventBus = () => {
  eventBus.removeAllListeners();
};
