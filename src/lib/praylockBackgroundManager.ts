import { AppState, AppStateStatus } from "react-native";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { usePraylockStore } from "../stores/praylockStore";
import { getAuthSnapshot } from "../features/auth/services/auth/getAuthSnapshot";
import { rpcFunctions } from "./supabaseRpc";
import { getCurrentPeriod, isInPrayerWindow } from "./time/Clock";
import { getDeviceActivityModule, isDeviceActivityAvailable } from "./deviceActivity";

const PRAYLOCK_BACKGROUND_TASK = "praylock-background-task";

const obtainDeviceActivity = () => {
  const module = getDeviceActivityModule();
  if (!module) {
    console.warn("[PraylockBG] DeviceActivity module unavailable (simulator or missing native module)");
  }
  return module;
};

const deviceActivitySupported = isDeviceActivityAvailable();

if (deviceActivitySupported) {
  // Register background task for PRAYLOCK monitoring
  TaskManager.defineTask(PRAYLOCK_BACKGROUND_TASK, async () => {
    try {
      console.log("[PraylockBG] Background task triggered");

      const praylockState = usePraylockStore.getState();
      const { settings } = praylockState;

      if (!settings?.enabled) {
        console.log(
          "[PraylockBG] PRAYLOCK not enabled, skipping background check"
        );
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      const { user } = getAuthSnapshot();
      if (!user?.id) {
        console.log(
          "[PraylockBG] No user authenticated, skipping background check"
        );
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Check current prayer state and window
      const result = await rpcFunctions.getCurrentPrayerState(user.id);
      if (result.error || !result.data) {
        console.log("[PraylockBG] Could not get prayer state:", result.error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }

      const { current_window_available, current_period, prayers } = result.data;

      // Check if prayer is already completed for current period
      const currentPrayer = prayers?.[current_period];
      const isPrayerCompleted = !!(currentPrayer?.completed_at);

      // If we're in an active prayer window and prayer isn't completed, ensure blocking is active
      if (current_window_available && !isPrayerCompleted) {
        console.log(
          `[PraylockBG] In active prayer window and ${current_period} prayer not completed, ensuring apps are blocked`
        );

        const deviceActivity = obtainDeviceActivity();
        if (!deviceActivity) {
          console.warn("[PraylockBG] Cannot enforce blocking - DeviceActivity unavailable");
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        try {
          await deviceActivity.blockSelection({
            activitySelectionId: "praylock_selection",
          });
          console.log("[PraylockBG] Successfully ensured blocking is active");
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error("[PraylockBG] Failed to block selection:", error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      } else if (isPrayerCompleted) {
        console.log(
          `[PraylockBG] ${current_period} prayer already completed - no blocking needed`
        );
        return BackgroundFetch.BackgroundFetchResult.NoData;
      } else {
        console.log(
          `[PraylockBG] Not in active prayer window (${current_period}), no action needed`
        );
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    } catch (error) {
      console.error("[PraylockBG] Background task error:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

type PraylockBackgroundManagerInterface = {
  init(): Promise<void> | void;
  triggerBackgroundCheck(): Promise<void> | void;
  testPrayerWindowStatus(): Promise<{ isInWindow: boolean; currentPeriod: "morning" | "evening" }>;
  cleanup(): Promise<void> | void;
};

class PraylockBackgroundManager implements PraylockBackgroundManagerInterface {
  private isRegistered = false;
  private appStateSubscription: any = null;
  private lastBlockingAttempt: number = 0;
  private foregroundCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  async init() {
    try {
      // Skip background task registration - DeviceActivity handles killed app state
      console.log("[PraylockBG] Skipping background task registration - using DeviceActivity only");

      // Set up app state listener for foreground checks
      this.setupAppStateListener();

      console.log("[PraylockBG] Background manager initialized (DeviceActivity mode)");
    } catch (error) {
      console.error(
        "[PraylockBG] Failed to initialize background manager:",
        error
      );
    }
  }

  private async registerBackgroundTask() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        PRAYLOCK_BACKGROUND_TASK
      );

      if (!isRegistered) {
        console.log("[PraylockBG] Registering background task");

        await BackgroundFetch.registerTaskAsync(PRAYLOCK_BACKGROUND_TASK, {
          minimumInterval: 15 * 60 * 1000, // 15 minutes - minimum iOS allows
          stopOnTerminate: false,
          startOnBoot: true,
        });

        this.isRegistered = true;
        console.log("[PraylockBG] Background task registered successfully");
      } else {
        this.isRegistered = true;
        console.log("[PraylockBG] Background task already registered");
      }
    } catch (error) {
      console.error("[PraylockBG] Failed to register background task:", error);
    }
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange
    );
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      console.log("[PraylockBG] App came to foreground, checking blocking status...");
      
      // Clear any existing timeout to prevent stacking
      if (this.foregroundCheckTimeout) {
        clearTimeout(this.foregroundCheckTimeout);
        this.foregroundCheckTimeout = null;
      }
      
      // Add a small delay to prevent immediate blocking on app launch
      this.foregroundCheckTimeout = setTimeout(async () => {
        try {
          await this.checkAndEnforceBlocking();
        } catch (error) {
          console.error("[PraylockBG] Error in foreground check:", error);
        } finally {
          this.foregroundCheckTimeout = null;
        }
      }, 1000); // 1 second delay
    }
  };

  private async checkAndEnforceBlocking() {
    try {
      const praylockState = usePraylockStore.getState();
      const { settings } = praylockState;

      if (!settings?.enabled) {
        console.log("[PraylockBG] Praylock not enabled, skipping check");
        return;
      }

      const { user } = getAuthSnapshot();
      if (!user?.id) {
        console.log("[PraylockBG] No user authenticated, skipping check");
        return;
      }

      console.log("[PraylockBG] Checking prayer window status on foreground");
      
      // Debug: Check if we're in prayer window
      const isInWindow = this.isInPrayerWindow();
      console.log(`[PraylockBG] Is in prayer window: ${isInWindow}`);

      // Get current prayer state
      const result = await rpcFunctions.getCurrentPrayerState(user.id);
      if (result.error || !result.data) {
        console.error("[PraylockBG] Could not get prayer state:", result.error);
        return;
      }

      const { current_window_available, current_period, prayers } = result.data;

      // Check if prayer is already completed for current period
      const currentPrayer = prayers?.[current_period];
      const isPrayerCompleted = !!(currentPrayer?.completed_at);

      if (current_window_available && !isPrayerCompleted) {
        console.log(`[PraylockBG] Prayer window is active and ${current_period} prayer not completed, ensuring blocking`);

        try {
          // Prevent multiple blocking attempts within 5 seconds
          const now = Date.now();
          if (now - this.lastBlockingAttempt < 5000) {
            console.log("[PraylockBG] Blocking attempt too recent, skipping");
            return;
          }

          const deviceActivity = obtainDeviceActivity();
          if (!deviceActivity) {
            console.warn("[PraylockBG] Cannot enforce blocking - DeviceActivity unavailable");
            return;
          }
          
          this.lastBlockingAttempt = now;
          
          // Apply blocking directly (DeviceActivity handles duplicates gracefully)
          await deviceActivity.blockSelection({
            activitySelectionId: "praylock_selection",
          });
          console.log("[PraylockBG] Successfully enforced blocking on foreground");
        } catch (error) {
          console.error("[PraylockBG] Failed to enforce blocking:", error);
        }
      } else if (isPrayerCompleted) {
        console.log(
          `[PraylockBG] ${current_period} prayer already completed - no blocking needed`
        );
      } else {
        console.log(
          `[PraylockBG] Not in prayer window (${current_period}), no blocking needed`
        );
      }
    } catch (error) {
      console.error(
        "[PraylockBG] Error checking prayer window on foreground:",
        error
      );
    }
  }

  // Manual trigger for immediate background check
  async triggerBackgroundCheck() {
    try {
      console.log("[PraylockBG] Manually triggering background check");
      await this.checkAndEnforceBlocking();
    } catch (error) {
      console.error("[PraylockBG] Error in manual background check:", error);
    }
  }

  // Test function to check current prayer window status
  async testPrayerWindowStatus(): Promise<{ isInWindow: boolean; currentPeriod: "morning" | "evening" }> {
    try {
      console.log("[PraylockBG] Testing prayer window status...");
      
      const isInWindow = this.isInPrayerWindow();
      const currentPeriod = this.getCurrentPeriod();
      
      console.log(`[PraylockBG] Test results:`, {
        isInWindow,
        currentPeriod,
        currentTime: new Date().toLocaleString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      return { isInWindow, currentPeriod };
    } catch (error) {
      console.error("[PraylockBG] Error testing prayer window:", error);
      return { isInWindow: false, currentPeriod: "morning" };
    }
  }

  // Get current period based on user timezone
  private getCurrentPeriod(): "morning" | "evening" {
    const { profile } = getAuthSnapshot();
    const timezone = profile?.timezone ?? undefined;

    try {
      return getCurrentPeriod(timezone);
    } catch (error) {
      console.error("[PraylockBG] Error determining current period:", error);
      return "morning";
    }
  }

  // Check if we're currently in a prayer window
  private isInPrayerWindow(): boolean {
    const { profile } = getAuthSnapshot();
    const timezone = profile?.timezone ?? undefined;

    try {
      return isInPrayerWindow(timezone);
    } catch (error) {
      console.error("[PraylockBG] Error checking prayer window:", error);
      return false;
    }
  }

  async cleanup() {
    try {
      // No background tasks to unregister in DeviceActivity-only mode
      console.log("[PraylockBG] Skipping background task cleanup - DeviceActivity mode");

      // Clear any pending foreground check timeout
      if (this.foregroundCheckTimeout) {
        clearTimeout(this.foregroundCheckTimeout);
        this.foregroundCheckTimeout = null;
      }

      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

      console.log("[PraylockBG] Background manager cleaned up");
    } catch (error) {
      console.error(
        "[PraylockBG] Error cleaning up background manager:",
        error
      );
    }
  }
}

class NoopPraylockBackgroundManager implements PraylockBackgroundManagerInterface {
  async init() {
    if (__DEV__) {
      console.warn("[PraylockBG] DeviceActivity unavailable - running no-op background manager (simulator build).");
    }
  }

  async triggerBackgroundCheck() {
    if (__DEV__) {
      console.warn("[PraylockBG] triggerBackgroundCheck skipped - DeviceActivity unavailable.");
    }
  }

  async testPrayerWindowStatus() {
    if (__DEV__) {
      console.warn("[PraylockBG] testPrayerWindowStatus returning default - DeviceActivity unavailable.");
    }
    return { isInWindow: false, currentPeriod: "morning" as const };
  }

  async cleanup() {
    if (__DEV__) {
      console.warn("[PraylockBG] cleanup skipped - DeviceActivity unavailable.");
    }
  }
}

export const praylockBackgroundManager: PraylockBackgroundManagerInterface = deviceActivitySupported
  ? new PraylockBackgroundManager()
  : new NoopPraylockBackgroundManager();

export const isPraylockBackgroundManagerSupported = deviceActivitySupported;
