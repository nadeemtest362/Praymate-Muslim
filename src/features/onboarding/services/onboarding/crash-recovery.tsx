import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useOnboardingStore } from '../../../../stores/onboardingStore';

/**
 * Simple crash recovery for onboarding
 * Detects crashes and helps users resume where they left off
 */

const CRASH_DETECTION_KEY = '@onboarding_crash_detection';
const LAST_SCREEN_KEY = '@onboarding_last_screen';
const PROGRESS_SNAPSHOT_KEY = '@onboarding_progress';

interface RecoveryState {
  hasCrashed: boolean;
  lastScreen: string | null;
  canRecover: boolean;
}

export class OnboardingCrashRecovery {
  /**
   * Mark session as active (called on app start)
   */
  static async markSessionActive() {
    // TEMPORARILY DISABLED: Crash recovery causing conflicts
    return;
    
    // Original code commented out:
    // try {
    //   await AsyncStorage.setItem(CRASH_DETECTION_KEY, 'active');
    // } catch (error) {
    //   console.error('[CrashRecovery] Failed to mark session active:', error);
    // }
  }

  /**
   * Mark session as completed cleanly (called on app background/exit)
   */
  static async markSessionClean() {
    try {
      await AsyncStorage.setItem(CRASH_DETECTION_KEY, 'clean');
    } catch (error) {
      console.error('[CrashRecovery] Failed to mark session clean:', error);
    }
  }

  /**
   * Check if last session crashed
   */
  static async detectCrash(): Promise<boolean> {
    try {
      const lastState = await AsyncStorage.getItem(CRASH_DETECTION_KEY);
      // If it was 'active' but app restarted, it crashed
      return lastState === 'active';
    } catch (error) {
      console.error('[CrashRecovery] Failed to detect crash:', error);
      return false;
    }
  }

  /**
   * Save current screen for recovery
   */
  static async saveProgress(screenName: string) {
    // TEMPORARILY DISABLED: Crash recovery causing conflicts
    // TODO: Fix clean exit handling before re-enabling
    return;
    
    // Original code commented out:
    // try {
    //   await AsyncStorage.setItem(LAST_SCREEN_KEY, screenName);
    //   
    //   // Also save a snapshot of critical data
    //   const store = useOnboardingStore.getState();
    //   const snapshot = {
    //     firstName: store.firstName,
    //     faithTradition: store.faithTradition,
    //     currentStep: store.currentStep,
    //     timestamp: Date.now(),
    //   };
    //   
    //   await AsyncStorage.setItem(PROGRESS_SNAPSHOT_KEY, JSON.stringify(snapshot));
    // } catch (error) {
    //   console.error('[CrashRecovery] Failed to save progress:', error);
    // }
  }

  /**
   * Get recovery information
   */
  static async getRecoveryInfo(): Promise<RecoveryState> {
    try {
      const hasCrashed = await this.detectCrash();
      const lastScreen = await AsyncStorage.getItem(LAST_SCREEN_KEY);
      const progressData = await AsyncStorage.getItem(PROGRESS_SNAPSHOT_KEY);
      
      // Validate if we can actually recover
      let canRecover = false;
      if (hasCrashed && lastScreen && progressData) {
        const progress = JSON.parse(progressData);
        // Only recover if crash was recent (within 24 hours)
        const hoursSinceCrash = (Date.now() - progress.timestamp) / (1000 * 60 * 60);
        canRecover = hoursSinceCrash < 24;
      }

      return { hasCrashed, lastScreen, canRecover };
    } catch (error) {
      console.error('[CrashRecovery] Failed to get recovery info:', error);
      return { hasCrashed: false, lastScreen: null, canRecover: false };
    }
  }

  /**
   * Restore progress after crash
   */
  static async restoreProgress(): Promise<boolean> {
    try {
      const progressData = await AsyncStorage.getItem(PROGRESS_SNAPSHOT_KEY);
      if (!progressData) return false;

      const progress = JSON.parse(progressData);
      const store = useOnboardingStore.getState();
      
      // Restore critical data
      if (progress.firstName) store.setFirstName(progress.firstName);
      if (progress.faithTradition) store.setFaithTradition(progress.faithTradition);
      // Note: Add more fields as needed based on your store interface
      
      console.log('[CrashRecovery] Progress restored successfully');
      return true;
    } catch (error) {
      console.error('[CrashRecovery] Failed to restore progress:', error);
      return false;
    }
  }

  /**
   * Clear recovery data
   */
  static async clearRecoveryData() {
    try {
      await AsyncStorage.multiRemove([
        CRASH_DETECTION_KEY,
        LAST_SCREEN_KEY,
        PROGRESS_SNAPSHOT_KEY,
      ]);
    } catch (error) {
      console.error('[CrashRecovery] Failed to clear recovery data:', error);
    }
  }
}

/**
 * React hook for crash recovery
 */
export function useCrashRecovery() {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    hasCrashed: false,
    lastScreen: null,
    canRecover: false,
  });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkForCrash();
  }, []);

  const checkForCrash = async () => {
    // TEMPORARILY DISABLED: Crash recovery causing conflicts with Expo
    // TODO: Fix clean exit handling before re-enabling
    setIsChecking(false);
    return;
    
    // Original code commented out:
    // setIsChecking(true);
    // const state = await OnboardingCrashRecovery.getRecoveryInfo();
    // setRecoveryState(state);
    // setIsChecking(false);
    // 
    // // Mark new session as active
    // await OnboardingCrashRecovery.markSessionActive();
  };

  const handleRecovery = async (onSuccess?: (lastScreen: string) => void) => {
    if (!recoveryState.canRecover) return;

    Alert.alert(
      'Welcome Back!',
      'It looks like something went wrong last time. Would you like to continue where you left off?',
      [
        {
          text: 'Start Fresh',
          style: 'cancel',
          onPress: async () => {
            await OnboardingCrashRecovery.clearRecoveryData();
            setRecoveryState({ hasCrashed: false, lastScreen: null, canRecover: false });
          },
        },
        {
          text: 'Continue',
          onPress: async () => {
            const restored = await OnboardingCrashRecovery.restoreProgress();
            if (restored && recoveryState.lastScreen) {
              onSuccess?.(recoveryState.lastScreen);
            }
            await OnboardingCrashRecovery.clearRecoveryData();
            setRecoveryState({ hasCrashed: false, lastScreen: null, canRecover: false });
          },
        },
      ]
    );
  };

  return {
    ...recoveryState,
    isChecking,
    handleRecovery,
  };
}

/**
 * HOC to add crash recovery to screens
 */
export function withCrashRecovery<P extends object>(
  Component: React.ComponentType<P>,
  screenName: string
): React.ComponentType<P> {
  const CrashRecoveryWrapper = (props: P) => {
    useEffect(() => {
      // Save progress when screen mounts
      OnboardingCrashRecovery.saveProgress(screenName);
    }, []);

    return <Component {...props} />;
  };

  CrashRecoveryWrapper.displayName = `withCrashRecovery(${Component.displayName || Component.name})`;

  return CrashRecoveryWrapper;
}

/**
 * Example integration in app/(onboarding)/_layout.tsx:
 * 
 * export default function OnboardingLayout() {
 *   const { canRecover, handleRecovery } = useCrashRecovery();
 *   const router = useRouter();
 * 
 *   useEffect(() => {
 *     if (canRecover) {
 *       handleRecovery((lastScreen) => {
 *         // Navigate to the last screen
 *         router.push(`/onboarding/${lastScreen}`);
 *       });
 *     }
 *   }, [canRecover]);
 * 
 *   // Clean exit handling
 *   useEffect(() => {
 *     const subscription = AppState.addEventListener('change', (state) => {
 *       if (state === 'background') {
 *         OnboardingCrashRecovery.markSessionClean();
 *       }
 *     });
 *     
 *     return () => subscription.remove();
 *   }, []);
 * 
 *   return <Stack />;
 * }
 */ 