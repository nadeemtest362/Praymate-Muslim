import React, { createContext, useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { usePraylockStore } from '../stores/praylockStore';
import { useHomeData } from '../hooks/useHomeData';
import { realtimeManager } from '../lib/realtimeSync';
import { navigateToPrayer } from '../utils/prayerNavigation';
import { praylockBackgroundManager } from '../lib/praylockBackgroundManager';


// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppStateContextType {
  // Context can be extended later if needed
}

const AppStateContext = createContext<AppStateContextType>({});

export function useAppState() {
  return useContext(AppStateContext);
}

interface AppStateProviderProps {
  children: React.ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const { user, updateTimezoneIfNeeded } = useAuth();
  const router = useRouter();
  const hasNavigatedToPrayer = useRef(false);
  
  // Use React Query for home data
  const homeData = useHomeData(user?.id || null);
  
  // Use Zustand PRAYLOCK store
  const praylockStore = usePraylockStore();
  const initializePraylock = praylockStore.initialize;
  const refetchPraylock = praylockStore.refetch;

  // Initialize stores when user is available
  useEffect(() => {
    if (user?.id) {
      console.log('[AppState] User authenticated, initializing stores');
      
      // React Query automatically handles data fetching for home data
      // Initialize PRAYLOCK store and background manager
      Promise.all([
        initializePraylock(),
        Promise.resolve(praylockBackgroundManager.init())
      ]).catch(error => {
        console.error('[AppState] Error initializing stores:', error);
      });
    }
  }, [user?.id, initializePraylock]);

  // Handle app state changes for background/foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && user?.id) {
        console.log('[AppState] App came to foreground - checking for stale data');
        
        // Reset navigation flag when app comes to foreground (in case period changed)
        // React Query automatically handles stale data detection and refetching
        hasNavigatedToPrayer.current = false;
        
        // Always refresh critical data when app comes to foreground
        const promises = [
          updateTimezoneIfNeeded(),
          refetchPraylock()
        ];
        
        // React Query automatically refetches stale data when app comes to foreground
        // Verify realtime connection when coming to foreground
        realtimeManager.verifyConnection();
        
        Promise.all(promises.map(promise => Promise.resolve(promise))).then(() => {
          // Automatic navigation to prayer screen disabled
          // User must manually navigate to prayer screen
          console.log('[AppState] Data refreshed on foreground - automatic navigation disabled');
        }).catch(error => {
          console.error('[AppState] Error refreshing data on foreground:', error);
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user?.id, updateTimezoneIfNeeded, refetchPraylock, homeData, router]);

  const contextValue: AppStateContextType = {};

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      Promise.resolve(praylockBackgroundManager.cleanup()).catch(error => {
        console.error('[AppState] Error cleaning up PRAYLOCK background manager:', error);
      });
    };
  }, []);

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}
