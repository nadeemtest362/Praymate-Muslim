import { useCallback, useEffect, useState } from 'react';
import { usePraylockStore } from '../../../stores/praylockStore';
import { useAuth } from '../../../hooks/useAuth';
import { getDeviceActivityModule, isDeviceActivityAvailable } from '../../../lib/deviceActivity';

const obtainDeviceActivity = () => {
  const module = getDeviceActivityModule();
  if (!module) {
    console.warn('[PRAYLOCK] DeviceActivity module unavailable (simulator or missing native module)');
  }
  return module;
};

const initialDeviceActivityModule = getDeviceActivityModule();
console.log('[PRAYLOCK] ReactNativeDeviceActivity module check:', {
  moduleExists: !!initialDeviceActivityModule,
  moduleType: typeof initialDeviceActivityModule,
  hasGetAuthStatus: !!(initialDeviceActivityModule && initialDeviceActivityModule.getAuthorizationStatus),
  hasRequestAuth: !!(initialDeviceActivityModule && initialDeviceActivityModule.requestAuthorization),
  hasPollAuth: !!(initialDeviceActivityModule && initialDeviceActivityModule.pollAuthorizationStatus),
  allMethods: initialDeviceActivityModule ? Object.keys(initialDeviceActivityModule) : 'module null/undefined'
});

// Safe wrapper for Device Activity calls
const safeDeviceActivity = {
  getAuthorizationStatus: async () => {
    const module = obtainDeviceActivity();
    if (!module || !module.getAuthorizationStatus) {
      console.log('[PRAYLOCK] getAuthorizationStatus not available (simulator/unsupported device)');
      return 0; // denied
    }
    return module.getAuthorizationStatus();
  },
  requestAuthorization: async () => {
    const module = obtainDeviceActivity();
    if (!module || !module.requestAuthorization) {
      console.log('[PRAYLOCK] requestAuthorization not available (simulator/unsupported device)');
      return 0; // denied
    }
    return module.requestAuthorization();
  },
  pollAuthorizationStatus: async () => {
    const module = obtainDeviceActivity();
    if (!module || !module.pollAuthorizationStatus) {
      console.log('[PRAYLOCK] pollAuthorizationStatus not available (simulator/unsupported device)');
      return 0; // denied
    }
    return module.pollAuthorizationStatus();
  },
  onAuthorizationStatusChange: (callback: (status: number) => void) => {
    const module = obtainDeviceActivity();
    if (!module || !module.onAuthorizationStatusChange) {
      console.log('[PRAYLOCK] onAuthorizationStatusChange not available (simulator/unsupported device)');
      return () => {};
    }

    const subscription = module.onAuthorizationStatusChange((event: { authorizationStatus: number }) => {
      callback(event?.authorizationStatus ?? 0);
    });

    return () => {
      try {
        subscription?.remove?.();
      } catch (error) {
        console.warn('[PRAYLOCK] Failed to remove authorization subscription', error);
      }
    };
  }
};


/**
 * Simplified PRAYLOCK hook that uses centralized store
 */
export function usePraylock() {
  const {
    settings,
    isLoading,
    error,
    isNativeMonitoringActive,
    initialize,
    enable,
    disable,
    markPrayerCompleted,
    refetch,
  } = usePraylockStore();

  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [deviceActivityReady, setDeviceActivityReady] = useState(isDeviceActivityAvailable());
  
  // Check authorization status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentStatus = await safeDeviceActivity.getAuthorizationStatus();
        console.log('[PRAYLOCK] Authorization status check - raw value:', currentStatus);
        console.log('[PRAYLOCK] Status meaning:', currentStatus === 0 ? 'denied' : currentStatus === 1 ? 'notDetermined' : currentStatus === 2 ? 'approved' : 'unknown');
        const isApproved = currentStatus === 2;
        console.log('[PRAYLOCK] Setting isAuthorized to:', isApproved);
        setIsAuthorized(isApproved);
      } catch (error) {
        console.error('[PRAYLOCK] Error checking auth status:', error);
        setIsAuthorized(false);
      }
    };

    checkAuth();
    setDeviceActivityReady(isDeviceActivityAvailable());

    const unsubscribe = safeDeviceActivity.onAuthorizationStatusChange((status) => {
      const meaning = status === 0 ? 'denied' : status === 1 ? 'notDetermined' : status === 2 ? 'approved' : 'unknown';
      console.log('[PRAYLOCK] Authorization status changed:', status, meaning);
      setIsAuthorized(status === 2);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize when user is available
  useEffect(() => {
    if (user?.id && !settings) {
      initialize();
    }
  }, [user?.id, settings, initialize]);

  // Enable PRAYLOCK
  const enablePraylock = useCallback(async (
    schedule: 'morning' | 'evening' | 'both',
    familyActivitySelection: string
  ) => {
    try {
      await enable(schedule, familyActivitySelection);
    } catch (error) {
      console.error('[usePraylock] Error enabling PRAYLOCK:', error);
      throw error;
    }
  }, [enable]);

  // Disable PRAYLOCK
  const disablePraylock = useCallback(async () => {
    try {
      await disable();
      // Force refresh to ensure UI updates
      await refetch();
    } catch (error) {
      console.error('[usePraylock] Error disabling PRAYLOCK:', error);
      throw error;
    }
  }, [disable, refetch]);

  // Mark prayer as completed
  const completePrayer = useCallback(async (period: 'morning' | 'evening') => {
    try {
      await markPrayerCompleted(period);
    } catch (error) {
      console.error('[usePraylock] Error completing prayer:', error);
      throw error;
    }
  }, [markPrayerCompleted]);

  // Refetch settings
  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('[usePraylock] Error refreshing:', error);
      throw error;
    }
  }, [refetch]);

  return {
    settings,
    isLoading,
    error,
    isNativeMonitoringActive,
    enablePraylock,
    disablePraylock,
    completePrayer,
    refresh,
    refetch: refresh, // Alias for compatibility
    // Additional properties for compatibility with original usePraylock hook
    isAuthorized,
    deviceActivityReady,
    requestAuthorization: async () => {
      try {
        const moduleAvailable = isDeviceActivityAvailable();
        setDeviceActivityReady(moduleAvailable);

        if (!moduleAvailable) {
          console.warn('[PRAYLOCK] DeviceActivity module unavailable before authorization request');
          return false;
        }

        console.log('[PRAYLOCK] Starting authorization request...');
        await safeDeviceActivity.requestAuthorization();
        console.log('[PRAYLOCK] Authorization request completed');
        
        // Use pollAuthorizationStatus to handle delays
        console.log('[PRAYLOCK] Polling for final authorization status...');
        let currentStatus = await safeDeviceActivity.pollAuthorizationStatus();
        console.log('[PRAYLOCK] Polled status raw value:', currentStatus);
        console.log('[PRAYLOCK] Polled status meaning:', currentStatus === 0 ? 'denied' : currentStatus === 1 ? 'notDetermined' : currentStatus === 2 ? 'approved' : 'unknown');

        if (currentStatus === 1) {
          // Give iOS a little more time to finalize the status
          await new Promise((resolve) => setTimeout(resolve, 750));
          currentStatus = await safeDeviceActivity.getAuthorizationStatus();
          console.log('[PRAYLOCK] Fallback status check after delay:', currentStatus);
        }
        
        const authorized = currentStatus === 2; // 2 = approved
        console.log('[PRAYLOCK] Final authorization result:', authorized);
        setIsAuthorized(authorized);
        return authorized;
      } catch (error) {
        console.error('[PRAYLOCK] Authorization failed:', error);
        setIsAuthorized(false);
        return false;
      }
    },
    markPrayerCompleted: completePrayer, // Alias
    syncCompletionStatus: refresh, // Alias
  };
}
