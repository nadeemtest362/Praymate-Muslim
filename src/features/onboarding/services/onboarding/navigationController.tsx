/**
 * Navigation Controller for Onboarding
 * Manages navigation flow, validates transitions, and handles deep links
 */

import React from 'react';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { onboardingStateMachine, OnboardingState } from './stateMachine';
import { onboardingDataRepository } from './dataRepository';

// Map screen types to routes
const SCREEN_ROUTES: Record<string, string> = {
  // Onboarding screens
  WelcomeScreen: '/onboarding/welcome',
  ValidationMessageScreen: '/onboarding/validation-message',
  FirstNameScreen: '/onboarding/first-name',
  GeneralQuestionScreen: '/onboarding/general-question',
  InterstitialScreen: '/onboarding/interstitial',
  AddIntentionScreen: '/onboarding/add-intention',
  OnboardingIntentionsSetConfirmationScreen: '/onboarding/intentions-confirmation',
  PrayerPeopleCollectionScreen: '/onboarding/prayer-people',
  MoodSelectionScreen: '/onboarding/mood',
  MoodContextScreen: '/onboarding/mood-context',
  CreatingProfileLoaderScreen: '/onboarding/creating-profile',
  OnboardingSummaryScreen: '/onboarding/summary',
  CommitmentQuestionScreen: '/onboarding/commitment-question',
  StreakGoalScreen: '/onboarding/streak-goal',
  PrayerScheduleScreen: '/onboarding/times',
  PrayerNeedsSelectionScreen: '/onboarding/prayer-needs',
  FaithTraditionScreen: '/onboarding/faith-tradition',
  PrayerGenerationLoadingScreen: '/onboarding/prayer-generation-loading',
  PrayerJourneyReadyScreen: '/onboarding/prayer-journey-ready',
  FirstPaywallScreen: '/onboarding/first-paywall',
  FirstPrayerDisplayScreen: '/onboarding/first-prayer',
  ValuePaywallScreen: '/onboarding/value-paywall',
  BenefitsHighlightScreen: '/onboarding/benefits-highlight',
  PaywallScreen: '/onboarding/paywall',
};

// Map states to screen types
const STATE_TO_SCREEN: Record<OnboardingState, string> = {
  welcome: 'WelcomeScreen',
  validation_message: 'ValidationMessageScreen',
  first_name: 'FirstNameScreen',
  general_question_1: 'GeneralQuestionScreen',
  general_question_2: 'GeneralQuestionScreen',
  interstitial_1: 'InterstitialScreen',
  add_intention_1: 'AddIntentionScreen',
  intentions_confirmation_1: 'OnboardingIntentionsSetConfirmationScreen',
  interstitial_2: 'InterstitialScreen',
  prayer_people: 'PrayerPeopleCollectionScreen',
  add_intention_2: 'AddIntentionScreen',
  intentions_confirmation_2: 'OnboardingIntentionsSetConfirmationScreen',
  mood: 'MoodSelectionScreen',
  mood_context: 'MoodContextScreen',
  creating_profile: 'CreatingProfileLoaderScreen',
  summary: 'OnboardingSummaryScreen',
  commitment_question: 'CommitmentQuestionScreen',
  streak_goal: 'StreakGoalScreen',
  prayer_schedule: 'PrayerScheduleScreen',
  prayer_needs: 'PrayerNeedsSelectionScreen',
  faith_tradition: 'FaithTraditionScreen',
  prayer_generation: 'PrayerGenerationLoadingScreen',
  prayer_journey_ready: 'PrayerJourneyReadyScreen',
  first_paywall: 'FirstPaywallScreen',
  first_prayer: 'FirstPrayerDisplayScreen',
  value_paywall: 'ValuePaywallScreen',
  benefits_highlight: 'BenefitsHighlightScreen',
  paywall: 'PaywallScreen',
  complete: 'complete',
  error: 'error',
};

export interface NavigationOptions {
  skipValidation?: boolean;
  replaceHistory?: boolean;
  saveState?: boolean;
  params?: Record<string, any>;
}

export class OnboardingNavigationController {
  private navigationHistory: OnboardingState[] = [];
  private isNavigating = false;
  private navigationTimeout: number | null = null;
  private navigationListeners: ((state: OnboardingState) => void)[] = [];

  constructor() {
    // Subscribe to state machine changes
    onboardingStateMachine.subscribe(context => {
      if (context.errorState && context.currentState === 'error') {
        this.handleErrorNavigation(context.errorState);
      }
    });
  }

  /**
   * Navigate to a specific onboarding state
   */
  async navigateToState(
    targetState: OnboardingState,
    options: NavigationOptions = {}
  ): Promise<boolean> {
    // Prevent concurrent navigation
    if (this.isNavigating) {
      console.warn('Navigation already in progress');
      return false;
    }

    this.isNavigating = true;

    try {
      const {
        skipValidation = false,
        replaceHistory = false,
        saveState = true,
        params = {},
      } = options;

      // Get current context
      const context = onboardingStateMachine.getContext();

      // Validate transition unless explicitly skipped
      if (!skipValidation) {
        const canTransition = onboardingStateMachine.canTransitionTo(targetState);
        if (!canTransition) {
          this.showInvalidTransitionAlert(context.currentState, targetState);
          return false;
        }
      }

      // Check for navigation loops
      if (this.detectNavigationLoop(targetState)) {
        console.error('Navigation loop detected');
        Alert.alert(
          'Navigation Error',
          'A navigation loop was detected. Please restart the onboarding.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Save current state before navigation
      if (saveState) {
        await this.saveNavigationState();
      }

      // Update navigation params in state machine
      if (Object.keys(params).length > 0) {
        onboardingStateMachine.updateContext({
          navigationParams: params,
        });
      }

      // Perform state transition
      const result = await onboardingStateMachine.transitionTo(targetState);
      if (!result.valid) {
        this.showValidationErrors(result.errors || []);
        return false;
      }

      // Get the route for the target state
      const screenType = STATE_TO_SCREEN[targetState];
      const route = SCREEN_ROUTES[screenType];

      if (!route) {
        console.error(`No route found for state: ${targetState}`);
        return false;
      }

      // Update navigation history
      if (!replaceHistory) {
        this.navigationHistory.push(targetState);
      } else {
        this.navigationHistory[this.navigationHistory.length - 1] = targetState;
      }

      // Navigate using expo-router
      if (replaceHistory) {
        router.replace(route as any);
      } else {
        router.push(route as any);
      }

      // Notify listeners
      this.notifyNavigationListeners(targetState);

      // Set timeout to prevent stuck navigation
      this.setNavigationTimeout();

      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert(
        'Navigation Error',
        'Failed to navigate to the next screen. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      this.isNavigating = false;
      this.clearNavigationTimeout();
    }
  }

  /**
   * Navigate to the next state in the flow
   */
  async navigateNext(params?: Record<string, any>): Promise<boolean> {
    const context = onboardingStateMachine.getContext();
    const currentState = context.currentState;

    // Find the next state based on current state
    const nextState = this.getNextState(currentState);
    
    if (!nextState) {
      console.error('No next state found');
      return false;
    }

    return this.navigateToState(nextState, { params });
  }

  /**
   * Navigate back to the previous state
   */
  async navigateBack(): Promise<boolean> {
    const canGoBack = onboardingStateMachine.canGoBack();
    
    if (!canGoBack) {
      console.warn('Cannot go back from current state');
      return false;
    }

    const result = await onboardingStateMachine.goBack();
    if (!result.valid) {
      return false;
    }

    // Remove last item from history
    this.navigationHistory.pop();

    // Navigate back in router
    if (router.canGoBack()) {
      router.back();
    }

    return true;
  }

  /**
   * Restart onboarding from the beginning
   */
  async restartOnboarding(): Promise<void> {
    try {
      // Reset state machine
      onboardingStateMachine.reset();

      // Clear all data
      await onboardingDataRepository.clearAllData();

      // Clear navigation history
      this.navigationHistory = [];

      // Navigate to welcome screen
      router.replace('/onboarding/welcome' as any);
    } catch (error) {
      console.error('Failed to restart onboarding:', error);
      Alert.alert(
        'Error',
        'Failed to restart onboarding. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Handle deep linking to a specific onboarding state
   */
  async handleDeepLink(targetState: OnboardingState): Promise<boolean> {
    const context = onboardingStateMachine.getContext();

    // Check if the user has completed prerequisite steps
    if (!this.canDeepLinkToState(targetState, context.completedSteps)) {
      Alert.alert(
        'Cannot Navigate',
        'Please complete the previous steps first.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Navigate with validation
    return this.navigateToState(targetState, {
      skipValidation: false,
      replaceHistory: true,
    });
  }

  /**
   * Get the next state based on current state
   */
  private getNextState(currentState: OnboardingState): OnboardingState | null {
    const stateOrder: OnboardingState[] = [
      'welcome',
      'validation_message',
      'first_name',
      'general_question_1',
      'general_question_2',
      'interstitial_1',
      'add_intention_1',
      'intentions_confirmation_1',
      'interstitial_2',
      'prayer_people',
      'add_intention_2',
      'intentions_confirmation_2',
      'mood',
      'mood_context',
      'creating_profile',
      'summary',
      'commitment_question',
      'streak_goal',
      'prayer_schedule',
      'prayer_needs',
      'faith_tradition',
      'prayer_generation',
      'prayer_journey_ready',
      'first_paywall',
      'first_prayer',
      'value_paywall',
      'benefits_highlight',
      'paywall',
      'complete',
    ];

    const currentIndex = stateOrder.indexOf(currentState);
    if (currentIndex === -1 || currentIndex >= stateOrder.length - 1) {
      return null;
    }

    return stateOrder[currentIndex + 1];
  }

  /**
   * Detect navigation loops
   */
  private detectNavigationLoop(targetState: OnboardingState): boolean {
    // Check if we've visited this state too many times recently
    const recentHistory = this.navigationHistory.slice(-10);
    const visitCount = recentHistory.filter(state => state === targetState).length;
    
    return visitCount >= 3;
  }

  /**
   * Check if deep linking to a state is allowed
   */
  private canDeepLinkToState(
    targetState: OnboardingState,
    completedSteps: OnboardingState[]
  ): boolean {
    // Define required steps for each state
    const prerequisites: Partial<Record<OnboardingState, OnboardingState[]>> = {
      mood_context: ['mood'],
      intentions_confirmation_1: ['add_intention_1'],
      intentions_confirmation_2: ['add_intention_2'],
      prayer_generation: ['faith_tradition', 'prayer_needs', 'mood'],
      first_prayer: ['prayer_generation'],
    };

    const required = prerequisites[targetState] || [];
    return required.every(step => completedSteps.includes(step));
  }

  /**
   * Save navigation state
   */
  private async saveNavigationState(): Promise<void> {
    try {
      const context = onboardingStateMachine.getContext();
      await onboardingDataRepository.saveOnboardingState(context);
    } catch (error) {
      console.error('Failed to save navigation state:', error);
    }
  }

  /**
   * Handle error navigation
   */
  private handleErrorNavigation(errorState: any): void {
    // Navigate to error screen or show error UI
    if (errorState.recoverable) {
      // Show recovery options
      Alert.alert(
        'Error Occurred',
        errorState.message,
        [
          { text: 'Retry', onPress: () => this.retryLastNavigation() },
          { text: 'Start Over', onPress: () => this.restartOnboarding() },
        ]
      );
    } else {
      // Non-recoverable error
      Alert.alert(
        'Fatal Error',
        'A critical error occurred. Please restart the app.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Retry the last navigation
   */
  private async retryLastNavigation(): Promise<void> {
    const result = await onboardingStateMachine.recoverFromError();
    if (result.valid) {
      const context = onboardingStateMachine.getContext();
      await this.navigateToState(context.currentState, {
        skipValidation: true,
        replaceHistory: true,
      });
    }
  }

  /**
   * Show invalid transition alert
   */
  private showInvalidTransitionAlert(
    currentState: OnboardingState,
    targetState: OnboardingState
  ): void {
    Alert.alert(
      'Invalid Navigation',
      `Cannot navigate from ${currentState} to ${targetState}. Please complete the current step first.`,
      [{ text: 'OK' }]
    );
  }

  /**
   * Show validation errors
   */
  private showValidationErrors(errors: string[]): void {
    Alert.alert(
      'Validation Error',
      errors.join('\n'),
      [{ text: 'OK' }]
    );
  }

  /**
   * Set navigation timeout
   */
  private setNavigationTimeout(): void {
    this.navigationTimeout = setTimeout(() => {
      console.warn('Navigation timeout - clearing navigation flag');
      this.isNavigating = false;
    }, 5000);
  }

  /**
   * Clear navigation timeout
   */
  private clearNavigationTimeout(): void {
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }
  }

  /**
   * Subscribe to navigation events
   */
  subscribeToNavigation(listener: (state: OnboardingState) => void): () => void {
    this.navigationListeners.push(listener);
    return () => {
      this.navigationListeners = this.navigationListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify navigation listeners
   */
  private notifyNavigationListeners(state: OnboardingState): void {
    this.navigationListeners.forEach(listener => listener(state));
  }

  /**
   * Get navigation history
   */
  getNavigationHistory(): OnboardingState[] {
    return [...this.navigationHistory];
  }

  /**
   * Check if currently navigating
   */
  isCurrentlyNavigating(): boolean {
    return this.isNavigating;
  }
}

// Export singleton instance
export const navigationController = new OnboardingNavigationController();

// Export hooks for React components
export function useOnboardingNavigation() {
  const navigateNext = React.useCallback(
    async (params?: Record<string, any>) => {
      return navigationController.navigateNext(params);
    },
    []
  );

  const navigateBack = React.useCallback(async () => {
    return navigationController.navigateBack();
  }, []);

  const navigateToState = React.useCallback(
    async (state: OnboardingState, options?: NavigationOptions) => {
      return navigationController.navigateToState(state, options);
    },
    []
  );

  const restartOnboarding = React.useCallback(async () => {
    return navigationController.restartOnboarding();
  }, []);

  return {
    navigateNext,
    navigateBack,
    navigateToState,
    restartOnboarding,
    isNavigating: navigationController.isCurrentlyNavigating(),
  };
} 