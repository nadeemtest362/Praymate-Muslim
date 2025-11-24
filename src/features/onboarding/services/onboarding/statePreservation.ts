/**
 * State Preservation System for Onboarding
 * Handles saving/restoring state during app backgrounding and crashes
 */

import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onboardingStateMachine, OnboardingContext } from './stateMachine';
import { onboardingDataRepository } from './dataRepository';
import { navigationController } from './navigationController';
import { supabase } from '../../../../lib/supabaseClient';

// Optional expo imports - won't break if not installed
let BackgroundFetch: any;
let TaskManager: any;
try {
  BackgroundFetch = require('expo-background-fetch');
  TaskManager = require('expo-task-manager');
} catch {
  // Expo packages not installed, background tasks won't be available
  console.log('Background task support not available');
}

// Constants
const STATE_PRESERVATION_KEY = '@onboarding_preserved_state';
const CRASH_RECOVERY_KEY = '@onboarding_crash_recovery';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const BACKGROUND_TASK_NAME = 'ONBOARDING_STATE_PRESERVATION';
const AUTO_SAVE_INTERVAL_MS = 30000; // 30 seconds

export interface PreservedState {
  context: OnboardingContext;
  navigationHistory: string[];
  timestamp: number;
  sessionId: string;
  version: string;
}

export interface CrashRecoveryData {
  lastKnownState: OnboardingContext;
  crashTimestamp: number;
  errorInfo?: {
    message: string;
    stack?: string;
  };
}

export class StatePreservationSystem {
  private appStateSubscription: any = null;
  private autoSaveInterval: any = null; // Changed to any to avoid type issues
  private isPreserving = false;
  private lastSaveTimestamp = 0;
  private sessionStartTime = Date.now();
  private isInitialized = false;



  /**
   * Initialize the state preservation system
   * Call this after app is ready and auth is initialized
   */
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    this.initializeAppStateListener();
    this.initializeAutoSave();
    this.setupCrashHandler();
  }

  /**
   * Initialize app state listener for background/foreground events
   */
  private async initializeAppStateListener() {
    // Check if user has already completed onboarding
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_completed_onboarding')
        .eq('id', user.id)
        .single();
        
      if (profile?.has_completed_onboarding) {
        console.log('User has completed onboarding, skipping state preservation initialization');
        return;
      }
    }
    
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );

    // Set initial app state
    this.handleAppStateChange(AppState.currentState);
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    console.log('App state changed to:', nextAppState);

    switch (nextAppState) {
      case 'background':
        await this.preserveStateOnBackground();
        break;
      
      case 'active':
        await this.restoreStateOnForeground();
        break;
      
      case 'inactive':
        // iOS only - prepare for backgrounding
        await this.quickSaveState();
        break;
    }
  };

  /**
   * Preserve state when app goes to background
   */
  private async preserveStateOnBackground(): Promise<void> {
    try {
      console.log('Preserving state on background...');
      
      // Stop auto-save interval
      this.stopAutoSave();

      // Save current state
      await this.saveCurrentState();

      // Register background task for periodic state sync
      await this.registerBackgroundTask();
    } catch (error) {
      console.error('Failed to preserve state on background:', error);
    }
  }

  /**
   * Restore state when app comes to foreground
   */
  private async restoreStateOnForeground(): Promise<void> {
    try {
      console.log('Restoring state on foreground...');

      // Check for crash recovery first
      const crashRecovered = await this.checkAndRecoverFromCrash();
      if (crashRecovered) {
        return;
      }

      // Load preserved state
      const preservedState = await this.loadPreservedState();
      
      if (preservedState && this.isValidSession(preservedState)) {
        await this.restoreFromPreservedState(preservedState);
      } else if (preservedState) {
        // Session expired
        console.log('Session expired, starting fresh');
        await this.clearPreservedState();
      }

      // Restart auto-save
      this.initializeAutoSave();
    } catch (error) {
      console.error('Failed to restore state on foreground:', error);
    }
  }

  /**
   * Quick save state (for iOS inactive state)
   */
  private async quickSaveState(): Promise<void> {
    if (this.isPreserving) return;

    try {
      this.isPreserving = true;
      
      // Check if we're actually in onboarding before saving
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('id', user.id)
          .single();
          
        if (profile?.has_completed_onboarding) {
          return;
        }
      }
      
      const context = onboardingStateMachine.getContext();
      
      // Quick save to memory/cache
      await AsyncStorage.setItem(
        STATE_PRESERVATION_KEY + '_quick',
        JSON.stringify({
          context,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Quick save failed:', error);
    } finally {
      this.isPreserving = false;
    }
  }

  /**
   * Save current state
   */
  async saveCurrentState(): Promise<void> {
    if (this.isPreserving) return;

    try {
      this.isPreserving = true;
      
      // Check if we're actually in onboarding before saving
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('id', user.id)
          .single();
          
        // If user has completed onboarding, don't save onboarding state
        if (profile?.has_completed_onboarding) {
          console.log('User has completed onboarding, skipping state save');
          return;
        }
      }
      
      const context = onboardingStateMachine.getContext();
      const navigationHistory = navigationController.getNavigationHistory();

      const preservedState: PreservedState = {
        context,
        navigationHistory,
        timestamp: Date.now(),
        sessionId: context.sessionId,
        version: '1.0.0', // App version for migration handling
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        STATE_PRESERVATION_KEY,
        JSON.stringify(preservedState)
      );

      // Also save to data repository for sync
      await onboardingDataRepository.saveOnboardingState(context);

      this.lastSaveTimestamp = Date.now();
      console.log('State preserved successfully');
    } catch (error) {
      console.error('Failed to save state:', error);
    } finally {
      this.isPreserving = false;
    }
  }

  /**
   * Load preserved state
   */
  private async loadPreservedState(): Promise<PreservedState | null> {
    try {
      const savedData = await AsyncStorage.getItem(STATE_PRESERVATION_KEY);
      if (!savedData) return null;

      const preservedState: PreservedState = JSON.parse(savedData);
      
      // Validate the loaded state
      if (!this.isValidPreservedState(preservedState)) {
        console.warn('Invalid preserved state, ignoring');
        return null;
      }

      return preservedState;
    } catch (error) {
      console.error('Failed to load preserved state:', error);
      return null;
    }
  }

  /**
   * Restore from preserved state
   */
  private async restoreFromPreservedState(
    preservedState: PreservedState
  ): Promise<void> {
    try {
      console.log('Restoring from preserved state...');

      // Update state machine context
      onboardingStateMachine.updateContext(preservedState.context);

      // Navigate to the last known state
      const currentState = preservedState.context.currentState;
      if (currentState !== 'welcome' && currentState !== 'complete') {
        await navigationController.navigateToState(currentState, {
          skipValidation: true,
          replaceHistory: true,
          saveState: false,
        });
      }

      console.log('State restored successfully');
    } catch (error) {
      console.error('Failed to restore state:', error);
      // Fall back to starting fresh
      await this.clearPreservedState();
    }
  }

  /**
   * Check if preserved state is from a valid session
   */
  private isValidSession(preservedState: PreservedState): boolean {
    const now = Date.now();
    const age = now - preservedState.timestamp;
    
    // Check if session is too old
    if (age > SESSION_TIMEOUT_MS) {
      return false;
    }

    // Check if session ID matches
    const currentSessionId = onboardingStateMachine.getContext().sessionId;
    if (preservedState.sessionId && preservedState.sessionId !== currentSessionId) {
      // This is a different session, but we might want to restore it
      return true; // Allow restoration from different session
    }

    return true;
  }

  /**
   * Validate preserved state structure
   */
  private isValidPreservedState(state: any): state is PreservedState {
    return (
      state &&
      typeof state === 'object' &&
      state.context &&
      Array.isArray(state.navigationHistory) &&
      typeof state.timestamp === 'number' &&
      typeof state.sessionId === 'string'
    );
  }

  /**
   * Clear preserved state
   */
  async clearPreservedState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STATE_PRESERVATION_KEY,
        STATE_PRESERVATION_KEY + '_quick',
        CRASH_RECOVERY_KEY,
      ]);
    } catch (error) {
      console.error('Failed to clear preserved state:', error);
    }
  }

  /**
   * Initialize auto-save
   */
  private initializeAutoSave() {
    this.stopAutoSave();
    
    this.autoSaveInterval = setInterval(async () => {
      // Only save if there have been changes
      const context = onboardingStateMachine.getContext();
      if (context.lastActivity.getTime() > this.lastSaveTimestamp) {
        await this.saveCurrentState();
      }
    }, AUTO_SAVE_INTERVAL_MS);
  }

  /**
   * Stop auto-save
   */
  private stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Setup crash handler
   */
  private setupCrashHandler() {
    // Set up global error handler
    const originalHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler(async (error, isFatal) => {
      if (isFatal) {
        // Save crash recovery data
        try {
          const context = onboardingStateMachine.getContext();
          const crashData: CrashRecoveryData = {
            lastKnownState: context,
            crashTimestamp: Date.now(),
            errorInfo: {
              message: error.message,
              stack: error.stack,
            },
          };

          await AsyncStorage.setItem(
            CRASH_RECOVERY_KEY,
            JSON.stringify(crashData)
          );
        } catch (saveError) {
          console.error('Failed to save crash data:', saveError);
        }
      }

      // Call original handler
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }

  /**
   * Check and recover from crash
   */
  private async checkAndRecoverFromCrash(): Promise<boolean> {
    try {
      const crashDataStr = await AsyncStorage.getItem(CRASH_RECOVERY_KEY);
      if (!crashDataStr) return false;

      const crashData: CrashRecoveryData = JSON.parse(crashDataStr);
      
      // Clear crash data
      await AsyncStorage.removeItem(CRASH_RECOVERY_KEY);

      // Check if crash was recent (within last hour)
      const crashAge = Date.now() - crashData.crashTimestamp;
      if (crashAge > 60 * 60 * 1000) {
        return false;
      }

      // Restore from crash
      console.log('Recovering from crash...');
      
      // Set error state in state machine
      onboardingStateMachine.setError({
        code: 'APP_CRASH_RECOVERY',
        message: 'Recovered from app crash',
        recoverable: true,
        retryCount: 0,
      });

      // Restore last known state
      onboardingStateMachine.updateContext(crashData.lastKnownState);

      // Navigate to recovery screen or last state
      if (crashData.lastKnownState.currentState !== 'welcome') {
        await navigationController.navigateToState(
          crashData.lastKnownState.currentState,
          {
            skipValidation: true,
            replaceHistory: true,
          }
        );
      }

      return true;
    } catch (error) {
      console.error('Failed to recover from crash:', error);
      return false;
    }
  }

  /**
   * Register background task for state preservation
   */
  private async registerBackgroundTask() {
    if (!BackgroundFetch) {
      console.log('Background task support not available');
      return;
    }
    
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } catch (error) {
      console.error('Failed to register background task:', error);
    }
  }

  /**
   * Get preservation statistics
   */
  getPreservationStats() {
    return {
      lastSaveTimestamp: this.lastSaveTimestamp,
      sessionDuration: Date.now() - this.sessionStartTime,
      isPreserving: this.isPreserving,
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopAutoSave();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Define background task if TaskManager is available
if (TaskManager) {
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    try {
      console.log('Running background state preservation...');
      
      // Check if user has completed onboarding before syncing
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('id', user.id)
          .single();
          
        if (profile?.has_completed_onboarding) {
          console.log('User has completed onboarding, skipping background sync');
          return BackgroundFetch?.BackgroundFetchResult?.NoData || 1;
        }
      }
      
      // Load current state from repository
      const result = await onboardingDataRepository.loadOnboardingState();
      
      if (result && result.success && result.data) {
        // Sync with server if needed
        await onboardingDataRepository.saveOnboardingState(result.data);
      }

      return BackgroundFetch?.BackgroundFetchResult?.NewData || 0;
    } catch (error) {
      console.error('Background task error:', error);
      return BackgroundFetch?.BackgroundFetchResult?.Failed || 2;
    }
  });
}

// Export singleton instance
export const statePreservation = new StatePreservationSystem();

// Export hook for React components
export function useStatePreservation() {
  React.useEffect(() => {
    // State preservation is automatically handled by the singleton
    // This hook can be used to access preservation stats if needed
    return () => {
      // Cleanup if needed
    };
  }, []);

  return {
    getStats: () => statePreservation.getPreservationStats(),
    clearState: () => statePreservation.clearPreservedState(),
    saveNow: () => statePreservation.saveCurrentState(),
  };
} 