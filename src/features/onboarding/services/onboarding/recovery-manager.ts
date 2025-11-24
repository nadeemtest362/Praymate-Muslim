import AsyncStorage from '@react-native-async-storage/async-storage';
import { AtomicDataStore } from './atomic-data-store';
import { offlineManager } from './offline-manager';
import { interruptionHandler } from './interruption-handler';
import { onboardingDataRepository } from './dataRepository';
import { onboardingStateMachine, OnboardingState, OnboardingContext } from './stateMachine';
import { navigationController } from './navigationController';
import { enhancedAnalytics } from './analytics-enhanced';
import { supabase } from '../../../../lib/supabaseClient';
import { getAuthUtils } from '../../../auth/services/auth/getAuthSnapshot';

interface RecoveryPoint {
  timestamp: number;
  state: OnboardingState;
  context: Partial<OnboardingContext>;
  formData?: Record<string, any>;
  screenData?: Record<string, any>;
  attempt: number;
}

interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  autoRecover?: boolean;
  preserveProgress?: boolean;
  clearCorruptedData?: boolean;
}

interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  state?: OnboardingState;
  error?: Error;
  dataLoss?: string[];
}

export class RecoveryManager {
  private static instance: RecoveryManager;
  private readonly RECOVERY_KEY = 'onboarding_recovery_points';
  private readonly MAX_RECOVERY_POINTS = 5;
  private isRecovering = false;
  private recoveryQueue: (() => Promise<void>)[] = [];
  
  private constructor() {}
  
  static getInstance(): RecoveryManager {
    if (!RecoveryManager.instance) {
      RecoveryManager.instance = new RecoveryManager();
    }
    return RecoveryManager.instance;
  }
  
  /**
   * Create a recovery point at critical stages
   */
  async createRecoveryPoint(
    state: OnboardingState,
    context: Partial<OnboardingContext>,
    additionalData?: {
      formData?: Record<string, any>;
      screenData?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const recoveryPoint: RecoveryPoint = {
        timestamp: Date.now(),
        state,
        context,
        formData: additionalData?.formData,
        screenData: additionalData?.screenData,
        attempt: 0,
      };
      
      // Get existing recovery points
      const points = await this.getRecoveryPoints();
      
      // Add new point and maintain max limit
      points.unshift(recoveryPoint);
      if (points.length > this.MAX_RECOVERY_POINTS) {
        points.pop();
      }
      
      // Save recovery points
      await AsyncStorage.setItem(this.RECOVERY_KEY, JSON.stringify(points));
      
      enhancedAnalytics.trackUserAction('recovery_point_created', {
        state,
        hasFormData: !!additionalData?.formData,
        pointCount: points.length,
      });
    } catch (error) {
      console.error('[RecoveryManager] Failed to create recovery point:', error);
    }
  }
  
  /**
   * Attempt automatic recovery from various failure scenarios
   */
  async attemptRecovery(options: RecoveryOptions = {}): Promise<RecoveryResult> {
    const {
      maxRetries = 3,
      preserveProgress = true,
      clearCorruptedData = false,
    } = options;
    
    if (this.isRecovering) {
      return {
        success: false,
        recovered: false,
        error: new Error('Recovery already in progress'),
      };
    }
    
    this.isRecovering = true;
    
    try {
      console.log('[RecoveryManager] Starting recovery process...');
      
      // 1. Check auth status first
      const authResult = await this.recoverAuthState();
      if (!authResult.success) {
        return authResult;
      }
      
      // 2. Try to recover from interruption
      const interruptionResult = await this.recoverFromInterruption();
      if (interruptionResult.recovered) {
        return interruptionResult;
      }
      
      // 3. Try to recover from recovery points
      const recoveryPointResult = await this.recoverFromRecoveryPoints(maxRetries);
      if (recoveryPointResult.recovered) {
        return recoveryPointResult;
      }
      
      // 4. Try to recover from atomic data store
      const atomicResult = await this.recoverFromAtomicStore(preserveProgress);
      if (atomicResult.recovered) {
        return atomicResult;
      }
      
      // 5. Try to recover from Supabase
      const supabaseResult = await this.recoverFromSupabase();
      if (supabaseResult.recovered) {
        return supabaseResult;
      }
      
      // 6. If all else fails, handle corrupted data
      if (clearCorruptedData) {
        return await this.clearAndRestart();
      }
      
      return {
        success: false,
        recovered: false,
        error: new Error('All recovery attempts failed'),
      };
      
    } catch (error) {
      enhancedAnalytics.trackError(error as Error, {
        screen: 'RecoveryManager',
        action: 'attempt_recovery',
        recoverable: false,
        userImpact: 'major',
      });
      
      return {
        success: false,
        recovered: false,
        error: error as Error,
      };
    } finally {
      this.isRecovering = false;
      
      // Process any queued recovery operations
      await this.processRecoveryQueue();
    }
  }
  
  /**
   * Recover auth state using the auth store
   */
  private async recoverAuthState(): Promise<RecoveryResult> {
    try {
      // Get current auth state
      const authData = getAuthUtils();
      
      // Check if we have a valid session
      if (!authData.session || !authData.isAuthenticated) {
        console.log('[RecoveryManager] No valid session, attempting to refresh...');
        
        // Try to refresh the session
        try {
          await authData.refreshSession();
        } catch {
          // If refresh fails, try to sign in anonymously
          console.log('[RecoveryManager] Session refresh failed, attempting anonymous sign-in...');
          try {
            await authData.signInAnonymously();
          } catch {
            return {
              success: false,
              recovered: false,
              error: new Error('Failed to recover auth state'),
            };
          }
        }
      }
      
      // Re-check auth state after potential refresh/anon sign-in
      const updatedAuthData = getAuthUtils();
      if (!updatedAuthData.isAuthenticated) {
        return {
          success: false,
          recovered: false,
          error: new Error('User is not authenticated'),
        };
      }
      
      return {
        success: true,
        recovered: false, // Auth recovered but not onboarding state
      };
    } catch (error) {
      return {
        success: false,
        recovered: false,
        error: error as Error,
      };
    }
  }
  
  /**
   * Recover from interruption handler
   */
  private async recoverFromInterruption(): Promise<RecoveryResult> {
    try {
      const interruptedState = await interruptionHandler.getInterruptionState();
      
      if (!interruptedState) {
        return { success: true, recovered: false };
      }
      
      console.log('[RecoveryManager] Found interrupted state:', interruptedState.screen);
      
      // Restore state machine context
      const loadResult = await onboardingDataRepository.loadOnboardingState();
      if (loadResult.success && loadResult.data) {
        onboardingStateMachine.updateContext(loadResult.data);
        
        // Navigate to interrupted screen
        const navSuccess = await navigationController.navigateToState(
          interruptedState.screen as OnboardingState,
          {
            skipValidation: true,
            params: interruptedState.formData, // Use params instead of formData
          }
        );
        
        if (navSuccess) {
          enhancedAnalytics.trackUserAction('recovery_from_interruption', {
            screen: interruptedState.screen,
            timeSinceInterruption: Date.now() - interruptedState.timestamp,
          });
          
          return {
            success: true,
            recovered: true,
            state: interruptedState.screen as OnboardingState,
          };
        }
      }
    } catch (error) {
      console.error('[RecoveryManager] Interruption recovery failed:', error);
    }
    
    return { success: true, recovered: false };
  }
  
  /**
   * Recover from saved recovery points
   */
  private async recoverFromRecoveryPoints(maxRetries: number): Promise<RecoveryResult> {
    try {
      const points = await this.getRecoveryPoints();
      
      if (points.length === 0) {
        return { success: true, recovered: false };
      }
      
      // Try each recovery point
      for (const point of points) {
        if (point.attempt >= maxRetries) {
          continue;
        }
        
        console.log(`[RecoveryManager] Trying recovery point from ${new Date(point.timestamp).toISOString()}`);
        
        // Update attempt count
        point.attempt++;
        await this.updateRecoveryPoint(point);
        
        try {
          // Restore context
          onboardingStateMachine.updateContext(point.context as OnboardingContext);
          
          // Navigate to saved state
          const navSuccess = await navigationController.navigateToState(
            point.state,
            {
              skipValidation: true,
              params: point.formData, // Use params instead of formData
              replaceHistory: true,
            }
          );
          
          if (navSuccess) {
            enhancedAnalytics.trackUserAction('recovery_from_point', {
              state: point.state,
              attempt: point.attempt,
              age: Date.now() - point.timestamp,
            });
            
            return {
              success: true,
              recovered: true,
              state: point.state,
            };
          }
        } catch (error) {
          console.error('[RecoveryManager] Recovery point failed:', error);
        }
      }
    } catch (error) {
      console.error('[RecoveryManager] Recovery points access failed:', error);
    }
    
    return { success: true, recovered: false };
  }
  
  /**
   * Recover from atomic data store
   */
  private async recoverFromAtomicStore(preserveProgress: boolean): Promise<RecoveryResult> {
    try {
      const data = await AtomicDataStore.getData();
      
      if (!data || Object.keys(data).length === 0) {
        return { success: true, recovered: false };
      }
      
      console.log('[RecoveryManager] Recovering from atomic store...');
      
      // Build context from atomic data
      const context: Partial<OnboardingContext> = {
        currentState: data.currentStepIndex > 0 ? 'in_progress' as OnboardingState : 'welcome',
        completedSteps: (data.completedSteps || []) as OnboardingState[],
        firstName: data.firstName || null,
        prayerPeople: data.prayerPeople || [],
        mood: data.mood ? {
          id: data.mood.id,
          emoji: data.mood.emoji,
          label: data.mood.label,
        } : null,
        moodContext: data.moodContext || null,
        prayerNeeds: data.prayerNeeds || [],
      };
      
      // Update state machine
      onboardingStateMachine.updateContext(context as OnboardingContext);
      
      // Determine target state
      let targetState: OnboardingState = 'welcome';
      if (preserveProgress && data.completedSteps && data.completedSteps.length > 0) {
        // Find the last incomplete step
        const lastCompleted = data.completedSteps[data.completedSteps.length - 1];
        targetState = this.getNextState(lastCompleted as OnboardingState);
      }
      
      // Navigate
      const navSuccess = await navigationController.navigateToState(
        targetState,
        { skipValidation: true }
      );
      
      if (navSuccess) {
        enhancedAnalytics.trackUserAction('recovery_from_atomic_store', {
          targetState,
          dataPoints: Object.keys(data).length,
          preservedProgress: preserveProgress,
        });
        
        return {
          success: true,
          recovered: true,
          state: targetState,
        };
      }
    } catch (error) {
      console.error('[RecoveryManager] Atomic store recovery failed:', error);
    }
    
    return { success: true, recovered: false };
  }
  
  /**
   * Recover from Supabase
   */
  private async recoverFromSupabase(): Promise<RecoveryResult> {
    try {
      // Get user from auth data
      const { user } = getAuthUtils();
      
      if (!user) {
        return { success: true, recovered: false };
      }
      
      console.log('[RecoveryManager] Attempting Supabase recovery...');
      
      // Load any saved onboarding progress
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (!profile) {
        return { success: true, recovered: false };
      }
      
      // Check if onboarding was completed
      if (profile.has_completed_onboarding) {
        return {
          success: true,
          recovered: true,
          state: 'complete' as OnboardingState,
        };
      }
      
      // Load any saved prayer people and intentions
      const { data: prayerPeople } = await supabase
        .from('prayer_focus_people')
        .select('*')
        .eq('user_id', user.id);
        
      if (prayerPeople && prayerPeople.length > 0) {
        // Update context with recovered data
        const context = onboardingStateMachine.getContext();
        context.prayerPeople = prayerPeople;
        onboardingStateMachine.updateContext(context);
        
        // Navigate to appropriate state
        const targetState = 'prayer_needs' as OnboardingState;
        const navSuccess = await navigationController.navigateToState(
          targetState,
          { skipValidation: true }
        );
        
        if (navSuccess) {
          enhancedAnalytics.trackUserAction('recovery_from_supabase', {
            targetState,
            recoveredPeople: prayerPeople.length,
          });
          
          return {
            success: true,
            recovered: true,
            state: targetState,
          };
        }
      }
    } catch (error) {
      console.error('[RecoveryManager] Supabase recovery failed:', error);
    }
    
    return { success: true, recovered: false };
  }
  
  /**
   * Clear all data and restart
   */
  private async clearAndRestart(): Promise<RecoveryResult> {
    try {
      console.log('[RecoveryManager] Clearing corrupted data and restarting...');
      
      // Clear all stored data
      await AsyncStorage.multiRemove([
        this.RECOVERY_KEY,
        await AtomicDataStore.clearData(),
        await interruptionHandler.clearInterruptionState(),
        await offlineManager.clearPendingOperations(),
      ].filter(key => !!key) as string[]);
      
      // Reset state machine
      await navigationController.restartOnboarding();
      
      enhancedAnalytics.trackUserAction('recovery_clear_and_restart', {
        reason: 'corrupted_data',
      });
      
      return {
        success: true,
        recovered: true,
        state: 'welcome' as OnboardingState,
        dataLoss: ['all_progress'],
      };
    } catch (error) {
      return {
        success: false,
        recovered: false,
        error: error as Error,
      };
    }
  }
  
  /**
   * Get next state after a completed state
   */
  private getNextState(completedState: OnboardingState): OnboardingState {
    const stateFlow: Record<OnboardingState, OnboardingState> = {
      welcome: 'first_name',
      first_name: 'add_intention_1',
      add_intention_1: 'prayer_people',
      prayer_people: 'mood',
      mood: 'mood_context',
      mood_context: 'prayer_needs',
      prayer_needs: 'faith_tradition',
      faith_tradition: 'prayer_schedule',
      prayer_schedule: 'consent',
      consent: 'creating_profile',
      creating_profile: 'prayer_generation',
      prayer_generation: 'first_prayer',
      first_prayer: 'paywall',
      paywall: 'summary',
      summary: 'complete',
      complete: 'complete',
      error: 'welcome',
      // Add other mappings as needed
    } as any;
    
    return stateFlow[completedState] || 'welcome';
  }
  
  /**
   * Get recovery points
   */
  private async getRecoveryPoints(): Promise<RecoveryPoint[]> {
    try {
      const pointsStr = await AsyncStorage.getItem(this.RECOVERY_KEY);
      return pointsStr ? JSON.parse(pointsStr) : [];
    } catch {
      return [];
    }
  }
  
  /**
   * Update a recovery point
   */
  private async updateRecoveryPoint(point: RecoveryPoint): Promise<void> {
    const points = await this.getRecoveryPoints();
    let index = -1;
    for (let i = 0; i < points.length; i++) {
      if (points[i].timestamp === point.timestamp) {
        index = i;
        break;
      }
    }
    
    if (index >= 0) {
      points[index] = point;
      await AsyncStorage.setItem(this.RECOVERY_KEY, JSON.stringify(points));
    }
  }
  
  /**
   * Process recovery queue
   */
  private async processRecoveryQueue(): Promise<void> {
    while (this.recoveryQueue.length > 0) {
      const operation = this.recoveryQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('[RecoveryManager] Queue operation failed:', error);
        }
      }
    }
  }
  
  /**
   * Queue a recovery operation
   */
  queueRecoveryOperation(operation: () => Promise<void>): void {
    this.recoveryQueue.push(operation);
    
    if (!this.isRecovering) {
      this.processRecoveryQueue();
    }
  }
  
  /**
   * Clear all recovery points
   */
  async clearRecoveryPoints(): Promise<void> {
    await AsyncStorage.removeItem(this.RECOVERY_KEY);
  }
}

// Export singleton instance
export const recoveryManager = RecoveryManager.getInstance(); 