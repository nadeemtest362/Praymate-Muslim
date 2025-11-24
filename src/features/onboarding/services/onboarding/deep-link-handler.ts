import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';

import { navigationController } from './navigationController';
import { onboardingStateMachine, OnboardingState } from './stateMachine';
import { onboardingDataRepository } from './dataRepository';
import { enhancedAnalytics } from './analytics-enhanced';
import { interruptionHandler } from './interruption-handler';

interface DeepLinkContext {
  url: string;
  path: string;
  params: Record<string, string>;
  source?: 'external' | 'notification' | 'qr_code' | 'email';
}

interface DeepLinkResult {
  success: boolean;
  handled: boolean;
  error?: string;
  targetState?: OnboardingState;
  recoveredFromInterruption?: boolean;
}

// Map URL paths to onboarding states
const PATH_TO_STATE: Record<string, OnboardingState> = {
  '/onboarding/welcome': 'welcome',
  '/onboarding/first-name': 'first_name',
  '/onboarding/add-intention': 'add_intention_1',
  '/onboarding/prayer-people': 'prayer_people',
  '/onboarding/mood': 'mood',
  '/onboarding/mood-context': 'mood_context',
  '/onboarding/summary': 'summary',
  '/onboarding/times': 'prayer_schedule',
  '/onboarding/prayer-needs': 'prayer_needs',
  '/onboarding/faith-tradition': 'faith_tradition',
  '/onboarding/first-prayer': 'first_prayer',
  '/onboarding/paywall': 'paywall',
};

// Special deep link handlers for specific actions
const SPECIAL_HANDLERS: Record<string, (context: DeepLinkContext) => Promise<DeepLinkResult>> = {
  '/onboarding/resume': async (context) => resumeOnboarding(context),
  '/onboarding/restart': async (context) => restartOnboarding(context),
  '/onboarding/skip-to': async (context) => skipToStep(context),
};

export class OnboardingDeepLinkHandler {
  private static instance: OnboardingDeepLinkHandler;
  private isHandlingLink = false;
  
  private constructor() {
    this.setupLinkingListener();
  }
  
  static getInstance(): OnboardingDeepLinkHandler {
    if (!OnboardingDeepLinkHandler.instance) {
      OnboardingDeepLinkHandler.instance = new OnboardingDeepLinkHandler();
    }
    return OnboardingDeepLinkHandler.instance;
  }
  
  /**
   * Setup deep linking listener
   */
  private setupLinkingListener(): void {
    // Handle app launch from deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('[DeepLinkHandler] App launched from URL:', url);
        this.handleDeepLink(url, 'external');
      }
    });
    
    // Handle deep links while app is running
    Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLinkHandler] Received URL while running:', url);
      this.handleDeepLink(url, 'external');
    });
  }
  
  /**
   * Main deep link handler
   */
  async handleDeepLink(
    url: string, 
    source: DeepLinkContext['source'] = 'external'
  ): Promise<DeepLinkResult> {
    // Prevent concurrent deep link handling
    if (this.isHandlingLink) {
      console.warn('[DeepLinkHandler] Already handling a deep link');
      return { success: false, handled: false, error: 'Already handling a deep link' };
    }
    
    this.isHandlingLink = true;
    
    try {
      // Parse the URL
      const parsed = Linking.parse(url);
      const path = parsed.path || '';
      const params = (parsed.queryParams || {}) as Record<string, string>;
      
      const context: DeepLinkContext = {
        url,
        path,
        params,
        source,
      };
      
      console.log('[DeepLinkHandler] Processing deep link:', context);
      
      // Track deep link event
      enhancedAnalytics.trackUserAction('deep_link_received', {
        path,
        source,
        hasParams: Object.keys(params).length > 0,
      });
      
      // Check if this is a special handler
      const specialHandler = SPECIAL_HANDLERS[path];
      if (specialHandler) {
        return await specialHandler(context);
      }
      
      // Check if this is an onboarding state link
      const targetState = PATH_TO_STATE[path];
      if (targetState) {
        return await this.handleOnboardingStateLink(targetState, context);
      }
      
      // Not an onboarding link
      console.log('[DeepLinkHandler] Not an onboarding link, passing through');
      return { success: true, handled: false };
      
    } catch (error) {
      console.error('[DeepLinkHandler] Error handling deep link:', error);
      enhancedAnalytics.trackError(error as Error, {
        screen: 'DeepLinkHandler',
        action: 'handle_deep_link',
        recoverable: true,
        userImpact: 'minor',
      });
      
      return {
        success: false,
        handled: true,
        error: (error as Error).message,
      };
    } finally {
      this.isHandlingLink = false;
    }
  }
  
  /**
   * Handle deep link to specific onboarding state
   */
  private async handleOnboardingStateLink(
    targetState: OnboardingState,
    context: DeepLinkContext
  ): Promise<DeepLinkResult> {
    const currentContext = onboardingStateMachine.getContext();
    const currentState = currentContext.currentState;
    
    // Check if we're in the middle of onboarding
    const isOnboardingInProgress = 
      currentState !== 'welcome' && 
      currentState !== 'complete' &&
      currentState !== 'error';
    
    // Save current state if in progress
    if (isOnboardingInProgress) {
      console.log('[DeepLinkHandler] Saving current onboarding state before deep link navigation');
      
      // Save interruption state
      await interruptionHandler.saveInterruptionState(
        currentState,
        currentContext
      );
      
      // Save to repository
      await onboardingDataRepository.saveOnboardingState(currentContext);
      
      enhancedAnalytics.trackUserAction('deep_link_interrupted_onboarding', {
        fromState: currentState,
        toState: targetState,
        source: context.source,
      });
    }
    
    // Validate if we can navigate to target state
    if (!this.canNavigateToState(targetState, currentContext)) {
      const message = `Cannot navigate to ${targetState}. Please complete required steps first.`;
      
      if (context.params.force !== 'true') {
        Alert.alert('Navigation Not Allowed', message);
        return {
          success: false,
          handled: true,
          error: message,
          targetState,
        };
      }
      
      // Force navigation if requested
      console.warn('[DeepLinkHandler] Force navigating to state:', targetState);
    }
    
    // Navigate to target state
    const success = await navigationController.navigateToState(targetState, {
      skipValidation: context.params.force === 'true',
      replaceHistory: true,
      params: context.params,
    });
    
    if (success) {
      enhancedAnalytics.trackUserAction('deep_link_navigation_success', {
        targetState,
        source: context.source,
        wasInterrupted: isOnboardingInProgress,
      });
    }
    
    return {
      success,
      handled: true,
      targetState,
      recoveredFromInterruption: false,
    };
  }
  
  /**
   * Check if navigation to state is allowed
   */
  private canNavigateToState(
    targetState: OnboardingState,
    context: ReturnType<typeof onboardingStateMachine.getContext>
  ): boolean {
    // Use existing validation from navigation controller
    const prerequisites = this.getPrerequisites(targetState);
    return prerequisites.every(step => context.completedSteps.includes(step));
  }
  
  /**
   * Get prerequisites for a state
   */
  private getPrerequisites(state: OnboardingState): OnboardingState[] {
    const prerequisites: Partial<Record<OnboardingState, OnboardingState[]>> = {
      mood_context: ['mood'],
      intentions_confirmation_1: ['add_intention_1'],
      intentions_confirmation_2: ['add_intention_2'],
      prayer_generation: ['faith_tradition', 'prayer_needs', 'mood'],
      first_prayer: ['prayer_generation'],
      summary: ['creating_profile'],
      creating_profile: ['mood_context'],
    };
    
    return prerequisites[state] || [];
  }
}

/**
 * Special handler: Resume onboarding from saved state
 */
async function resumeOnboarding(context: DeepLinkContext): Promise<DeepLinkResult> {
  try {
    // Check for interrupted state
    const interruptedState = await interruptionHandler.getInterruptionState();
    
    if (interruptedState) {
      console.log('[DeepLinkHandler] Found interrupted state:', interruptedState.screen);
      
      // Restore state machine context
      const loadResult = await onboardingDataRepository.loadOnboardingState();
      if (loadResult.success && loadResult.data) {
        onboardingStateMachine.updateContext(loadResult.data);
      }
      
      // Navigate to interrupted screen
      const success = await navigationController.navigateToState(
        interruptedState.screen as OnboardingState,
        {
          skipValidation: true,
          replaceHistory: true,
        }
      );
      
      if (success) {
        enhancedAnalytics.trackUserAction('deep_link_resumed_onboarding', {
          resumedState: interruptedState.screen,
          source: context.source,
        });
        
        // Show welcome back message
        Alert.alert(
          'Welcome Back!',
          'We\'ve restored your progress. You can continue where you left off.',
          [{ text: 'Continue' }]
        );
      }
      
      return {
        success,
        handled: true,
        targetState: interruptedState.screen as OnboardingState,
        recoveredFromInterruption: true,
      };
    } else {
      // No interrupted state, go to last completed step
      const loadResult = await onboardingDataRepository.loadOnboardingState();
      
      if (loadResult.success && loadResult.data && loadResult.data.currentState !== 'complete') {
        const success = await navigationController.navigateToState(
          loadResult.data.currentState,
          {
            skipValidation: true,
            replaceHistory: true,
          }
        );
        
        return {
          success,
          handled: true,
          targetState: loadResult.data.currentState,
          recoveredFromInterruption: false,
        };
      }
      
      // No saved state, start fresh
      Alert.alert(
        'No Saved Progress',
        'Starting onboarding from the beginning.',
        [{ text: 'OK' }]
      );
      
      return restartOnboarding(context);
    }
  } catch (error) {
    console.error('[DeepLinkHandler] Error resuming onboarding:', error);
    return {
      success: false,
      handled: true,
      error: (error as Error).message,
    };
  }
}

/**
 * Special handler: Restart onboarding
 */
async function restartOnboarding(context: DeepLinkContext): Promise<DeepLinkResult> {
  try {
    // Clear all saved state
    await interruptionHandler.clearInterruptionState();
    await navigationController.restartOnboarding();
    
    enhancedAnalytics.trackUserAction('deep_link_restarted_onboarding', {
      source: context.source,
    });
    
    return {
      success: true,
      handled: true,
      targetState: 'welcome',
    };
  } catch (error) {
    console.error('[DeepLinkHandler] Error restarting onboarding:', error);
    return {
      success: false,
      handled: true,
      error: (error as Error).message,
    };
  }
}

/**
 * Special handler: Skip to specific step
 */
async function skipToStep(context: DeepLinkContext): Promise<DeepLinkResult> {
  const targetStep = context.params.step;
  
  if (!targetStep) {
    Alert.alert('Invalid Link', 'No target step specified');
    return {
      success: false,
      handled: true,
      error: 'No target step specified',
    };
  }
  
  const targetState = targetStep as OnboardingState;
  
  // Validate it's a valid state
  if (!PATH_TO_STATE[`/onboarding/${targetStep}`] && targetState !== targetStep) {
    Alert.alert('Invalid Link', `Unknown onboarding step: ${targetStep}`);
    return {
      success: false,
      handled: true,
      error: `Unknown onboarding step: ${targetStep}`,
    };
  }
  
  // Use the singleton instance to handle the link
  const handler = OnboardingDeepLinkHandler.getInstance();
  return handler.handleDeepLink(`/onboarding/${targetStep}`, context.source);
}

// Export singleton instance
export const deepLinkHandler = OnboardingDeepLinkHandler.getInstance();

// React hook for deep link handling

export function useOnboardingDeepLinks() {
  useEffect(() => {
    // Check for initial URL on mount
    Linking.getInitialURL().then(url => {
      if (url && url.includes('onboarding')) {
        deepLinkHandler.handleDeepLink(url, 'external');
      }
    });
  }, []);
  
  return {
    handleDeepLink: (url: string) => deepLinkHandler.handleDeepLink(url),
  };
} 