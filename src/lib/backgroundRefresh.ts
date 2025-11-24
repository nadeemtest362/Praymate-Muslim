import { AppState, AppStateStatus } from 'react-native';
import { queryClient } from './queryClient';
import { eventBus } from './eventBus';
import { getAuthSnapshot } from '../features/auth/services/auth/getAuthSnapshot';
import { praylockBackgroundManager } from './praylockBackgroundManager';
import { getCurrentPeriod, setCanonicalTimezone } from './time/Clock';

class BackgroundRefreshManager {
  private appStateSubscription: any = null;
  private lastActiveTime: number = Date.now();
  private lastPeriodCheck: 'morning' | 'evening' | null = null;
  private readonly STALE_THRESHOLD = 1000 * 60 * 5; // 5 minutes
  private readonly REFRESH_COOLDOWN = 1000 * 60 * 10; // 10 minutes
  private lastRefreshTimestamp = 0;

  init() {
    this.lastPeriodCheck = this.getCurrentPeriod();
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );

    console.debug('[BackgroundRefresh] Initialized');
  }

  private getCurrentPeriod(): 'morning' | 'evening' {
    const { profile } = getAuthSnapshot();
    const timezone = profile?.timezone ?? undefined;

    if (timezone) {
      setCanonicalTimezone(timezone);
    }

    try {
      return getCurrentPeriod(timezone);
    } catch (error) {
      console.error('[BackgroundRefresh] Error determining current period:', error);
      return 'morning';
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      const now = Date.now();
      const timeSinceBackground = now - this.lastActiveTime;
      const currentPeriod = this.getCurrentPeriod();
      const periodChanged = this.lastPeriodCheck !== null && currentPeriod !== this.lastPeriodCheck;
      
      if (timeSinceBackground > this.STALE_THRESHOLD || periodChanged) {
        const reason = periodChanged ? 'prayer period changed' : `${Math.round(timeSinceBackground / 1000)}s stale`;
        const sinceLastRefresh = now - this.lastRefreshTimestamp;
        const allowRefresh = periodChanged || sinceLastRefresh >= this.REFRESH_COOLDOWN;

        if (!allowRefresh) {
          console.debug(
            `[BackgroundRefresh] Skipping refresh (${reason}) - last refresh ${Math.round(sinceLastRefresh / 1000)}s ago`
          );
        } else {
          console.debug(`[BackgroundRefresh] App became active - ${reason}`);
          this.refreshStaleQueries(periodChanged || timeSinceBackground > this.STALE_THRESHOLD);
          this.lastRefreshTimestamp = now;

          if (periodChanged) {
            Promise.resolve(praylockBackgroundManager.triggerBackgroundCheck()).catch(error => {
              console.error('[BackgroundRefresh] Error triggering PRAYLOCK background check:', error);
            });
          }
        }
      }
      
      this.lastActiveTime = now;
      this.lastPeriodCheck = currentPeriod;
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Handle both background and inactive states (lock screen)
      this.lastActiveTime = Date.now();
      this.lastPeriodCheck = this.getCurrentPeriod();
      console.debug(`[BackgroundRefresh] App ${nextAppState}`);
    }
  };

  private refreshStaleQueries(refetchActive = false) {
    // Refresh critical queries when app becomes active after being stale
    queryClient.invalidateQueries({
      predicate: (query) => {
        const { queryKey } = query;
        
        // Refresh home data, today's prayers, active people, and prayer state
        const isHomeData = queryKey[0] === 'homeData';
        const isTodaysPrayers = queryKey[0] === 'prayers' && queryKey.includes('today');
        const isActivePeople = queryKey[0] === 'people' && queryKey.length > 2 && queryKey[2] === 'active';
        const isPrayerState = queryKey[0] === 'prayerState';
        
        return isHomeData || isTodaysPrayers || isActivePeople || isPrayerState;
      },
      refetchType: refetchActive ? 'active' : 'inactive',
    });
    
    // Emit background refresh event for components that need it
    eventBus.emit('system:backgroundRefresh');
    
    console.debug('[BackgroundRefresh] Refreshed stale queries');
  }

  // Manual refresh trigger for pull-to-refresh scenarios
  refreshCriticalData() {
    console.debug('[BackgroundRefresh] Manual refresh triggered');
    this.refreshStaleQueries(true);
  }

  // Cleanup method
  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
      console.debug('[BackgroundRefresh] Cleaned up');
    }
  }

  // Get stale threshold for external use
  getStaleThreshold() {
    return this.STALE_THRESHOLD;
  }

  // Check if data is considered stale
  isDataStale() {
    const timeSinceBackground = Date.now() - this.lastActiveTime;
    return timeSinceBackground > this.STALE_THRESHOLD;
  }
}

export const backgroundRefreshManager = new BackgroundRefreshManager();
