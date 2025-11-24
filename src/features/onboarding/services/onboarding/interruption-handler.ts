import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AtomicDataStore } from './atomic-data-store';
import { offlineManager } from './offline-manager';
import { enhancedAnalytics } from './analytics-enhanced';

interface InterruptionState {
  timestamp: number;
  screen: string;
  formData?: Record<string, any>;
  scrollPosition?: number;
  activeElement?: string;
}

export class InterruptionHandler {
  private static instance: InterruptionHandler;
  private currentState: InterruptionState | null = null;
  private appState: AppStateStatus = AppState.currentState;
  private stateListener: any;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly INTERRUPTION_KEY = 'onboarding_interruption_state';
  
  private constructor() {
    this.initializeListener();
  }
  
  static getInstance(): InterruptionHandler {
    if (!InterruptionHandler.instance) {
      InterruptionHandler.instance = new InterruptionHandler();
    }
    return InterruptionHandler.instance;
  }
  
  private initializeListener(): void {
    this.stateListener = AppState.addEventListener('change', this.handleAppStateChange);
  }
  
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const wasActive = this.appState === 'active';
    const isActive = nextAppState === 'active';
    
    if (wasActive && !isActive) {
      // App going to background
      this.handleInterruption();
    } else if (!wasActive && isActive) {
      // App coming to foreground
      this.handleResumption();
    }
    
    this.appState = nextAppState;
  };
  
  /**
   * Save current state when interrupted
   */
  async saveInterruptionState(
    screen: string,
    formData?: Record<string, any>,
    additionalData?: {
      scrollPosition?: number;
      activeElement?: string;
    }
  ): Promise<void> {
    try {
      this.currentState = {
        timestamp: Date.now(),
        screen,
        formData,
        ...additionalData,
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(
        this.INTERRUPTION_KEY,
        JSON.stringify(this.currentState)
      );
      
      // Also trigger atomic data save
      await AtomicDataStore.updateData(data => data);
      
      // Ensure offline operations are persisted
      if (offlineManager.getPendingOperationsCount() > 0) {
        console.log('[InterruptionHandler] Saving pending offline operations');
      }
      
      enhancedAnalytics.trackUserAction('interruption_state_saved', {
        screen,
        hasFormData: !!formData,
      });
    } catch (error) {
      console.error('[InterruptionHandler] Failed to save interruption state:', error);
    }
  }
  
  /**
   * Handle app interruption
   */
  private async handleInterruption(): Promise<void> {
    console.log('[InterruptionHandler] App interrupted');
    
    // Save current timestamp for session timeout check
    await AsyncStorage.setItem('last_active_timestamp', Date.now().toString());
    
    // Analytics
    enhancedAnalytics.trackUserAction('app_backgrounded', {
      screen: this.currentState?.screen || 'unknown',
    });
  }
  
  /**
   * Handle app resumption
   */
  private async handleResumption(): Promise<void> {
    console.log('[InterruptionHandler] App resumed');
    
    try {
      // Check session timeout
      const lastActiveStr = await AsyncStorage.getItem('last_active_timestamp');
      const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : Date.now();
      const sessionExpired = Date.now() - lastActive > this.SESSION_TIMEOUT;
      
      if (sessionExpired) {
        await this.handleSessionExpiry();
        return;
      }
      
      // Restore saved state
      const savedStateStr = await AsyncStorage.getItem(this.INTERRUPTION_KEY);
      if (savedStateStr) {
        const savedState = JSON.parse(savedStateStr) as InterruptionState;
        
        // Check if state is still valid (not too old)
        if (Date.now() - savedState.timestamp < this.SESSION_TIMEOUT) {
          this.currentState = savedState;
          
          enhancedAnalytics.trackUserAction('interruption_state_restored', {
            screen: savedState.screen,
            timeSinceInterruption: Date.now() - savedState.timestamp,
          });
        }
      }
      
      // Check for pending sync operations
      if (offlineManager.getIsOnline() && offlineManager.getPendingOperationsCount() > 0) {
        console.log('[InterruptionHandler] Syncing pending operations after resumption');
        offlineManager.syncPendingOperations();
      }
    } catch (error) {
      console.error('[InterruptionHandler] Failed to handle resumption:', error);
    }
  }
  
  /**
   * Handle session expiry
   */
  private async handleSessionExpiry(): Promise<void> {
    console.log('[InterruptionHandler] Session expired');
    
    // Save the screen before clearing
    const lastScreen = this.currentState?.screen || 'unknown';
    
    // Clear interruption state
    await AsyncStorage.removeItem(this.INTERRUPTION_KEY);
    this.currentState = null;
    
    enhancedAnalytics.trackUserAction('session_expired', {
      lastScreen,
    });
    
    // You might want to navigate to a session expired screen
    // or restart the onboarding flow
  }
  
  /**
   * Get saved interruption state
   */
  async getInterruptionState(): Promise<InterruptionState | null> {
    try {
      const savedStateStr = await AsyncStorage.getItem(this.INTERRUPTION_KEY);
      if (!savedStateStr) return null;
      
      const savedState = JSON.parse(savedStateStr) as InterruptionState;
      
      // Check if state is still valid
      if (Date.now() - savedState.timestamp > this.SESSION_TIMEOUT) {
        await this.clearInterruptionState();
        return null;
      }
      
      return savedState;
    } catch (error) {
      console.error('[InterruptionHandler] Failed to get interruption state:', error);
      return null;
    }
  }
  
  /**
   * Clear interruption state
   */
  async clearInterruptionState(): Promise<void> {
    await AsyncStorage.removeItem(this.INTERRUPTION_KEY);
    this.currentState = null;
  }
  
  /**
   * Check if we have a valid saved state
   */
  async hasValidSavedState(): Promise<boolean> {
    const state = await this.getInterruptionState();
    return state !== null;
  }
  
  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.stateListener) {
      this.stateListener.remove();
    }
  }
}

// Singleton instance
export const interruptionHandler = InterruptionHandler.getInstance();

// React hook for easy usage

export function useInterruptionHandler(screenName: string) {
  const [savedState, setSavedState] = useState<InterruptionState | null>(null);
  const lastFormDataRef = useRef<Record<string, any> | null>(null);
  const lastAdditionalDataRef = useRef<any>(null);
  
  useEffect(() => {
    // Check for saved state on mount
    interruptionHandler.getInterruptionState().then(state => {
      if (state?.screen === screenName) {
        setSavedState(state);
      }
    });
    
    // Auto-save on unmount if form data exists
    return () => {
      if (lastFormDataRef.current && Object.keys(lastFormDataRef.current).length > 0) {
        interruptionHandler.saveInterruptionState(
          screenName, 
          lastFormDataRef.current, 
          lastAdditionalDataRef.current
        );
      }
    };
  }, [screenName]);
  
  const saveFormData = async (formData: Record<string, any>, additionalData?: any) => {
    lastFormDataRef.current = formData;
    lastAdditionalDataRef.current = additionalData;
    await interruptionHandler.saveInterruptionState(screenName, formData, additionalData);
  };
  
  const clearSavedState = async () => {
    lastFormDataRef.current = null;
    lastAdditionalDataRef.current = null;
    await interruptionHandler.clearInterruptionState();
    setSavedState(null);
  };
  
  return {
    savedState,
    saveFormData,
    clearSavedState,
    hasSavedState: !!savedState,
  };
} 