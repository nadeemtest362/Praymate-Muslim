/**
 * Onboarding State Machine
 * Manages all states, transitions, and validations for the onboarding flow
 */

export type OnboardingState = 
  | 'welcome'
  | 'validation_message'
  | 'first_name'
  | 'general_question_1'
  | 'general_question_2'
  | 'interstitial_1'
  | 'add_intention_1'
  | 'intentions_confirmation_1'
  | 'interstitial_2'
  | 'prayer_people'
  | 'add_intention_2'
  | 'intentions_confirmation_2'
  | 'mood'
  | 'mood_context'
  | 'creating_profile'
  | 'summary'
  | 'commitment_question'
  | 'streak_goal'
  | 'prayer_schedule'
  | 'prayer_needs'
  | 'faith_tradition'
  | 'prayer_generation'
  | 'prayer_journey_ready'
  | 'first_paywall'
  | 'first_prayer'
  | 'value_paywall'
  | 'benefits_highlight'
  | 'paywall'
  | 'complete'
  | 'error';

export interface OnboardingContext {
  currentState: OnboardingState;
  previousState: OnboardingState | null;
  errorState: ErrorContext | null;
  
  // User data
  faithTradition: string | null;
  firstName: string | null;
  prayerPeople: {
    id: string;
    name: string;
    relationship?: string;
    image_uri?: string;
    gender?: string;
    device_contact_id?: string | null;
  }[];
  intentions: {
    personId: string;
    personName: string;
    category: string;
    details?: string;
  }[];
  mood: {
    id: string;
    emoji: string;
    label: string;
  } | null;
  moodContext: string | null;
  prayerNeeds: string[];
  customPrayerNeed: string | null;
  prayerTimes: string[];
  streakGoalDays: number | null;
  
  // Additional onboarding data
  generalQuestionResponses: {
    question: string;
    answer: string;
  }[];
  commitmentResponse: string | null;
  firstPrayerContent: string | null;
  
  // Session data
  sessionId: string;
  startedAt: Date;
  lastActivity: Date;
  completedSteps: OnboardingState[];
  
  // Navigation params for state transitions
  navigationParams: Record<string, any>;
  
  // Temporary data for passing between screens
  tempNavParams: Record<string, any> | null;
  currentBatchOfIntentions: any[];
}

export interface ErrorContext {
  code: string;
  message: string;
  recoverable: boolean;
  retryCount: number;
  previousState: OnboardingState;
  timestamp: Date;
}

export interface StateTransition {
  from: OnboardingState;
  to: OnboardingState;
  condition?: (context: OnboardingContext) => boolean;
  validation?: (context: OnboardingContext) => ValidationResult;
  action?: (context: OnboardingContext) => Promise<void>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Define all valid state transitions matching the actual flow
export const STATE_TRANSITIONS: StateTransition[] = [
  // 1. Welcome to Validation Message
  {
    from: 'welcome',
    to: 'validation_message',
  },
  
  // 2. Validation Message to First Name
  {
    from: 'validation_message',
    to: 'first_name',
  },
  
  // 3. First Name to General Question 1
  {
    from: 'first_name',
    to: 'general_question_1',
    validation: (ctx) => ({
      valid: ctx.firstName !== null && ctx.firstName.trim().length > 0,
      errors: !ctx.firstName || ctx.firstName.trim().length === 0 
        ? ['First name is required'] 
        : undefined
    })
  },
  
  // 4. General Question 1 to General Question 2
  {
    from: 'general_question_1',
    to: 'general_question_2',
  },
  
  // 5. General Question 2 to Interstitial 1
  {
    from: 'general_question_2',
    to: 'interstitial_1',
  },
  
  // 6. Interstitial 1 to Add Intention 1
  {
    from: 'interstitial_1',
    to: 'add_intention_1',
  },
  
  // 7. Add Intention 1 to Intentions Confirmation 1
  {
    from: 'add_intention_1',
    to: 'intentions_confirmation_1',
    validation: (ctx) => ({
      valid: ctx.intentions.length > 0,
      errors: ctx.intentions.length === 0 
        ? ['At least one intention must be added'] 
        : undefined
    })
  },
  
  // 8. Intentions Confirmation 1 to Interstitial 2
  {
    from: 'intentions_confirmation_1',
    to: 'interstitial_2',
  },
  
  // 9. Interstitial 2 to Prayer People
  {
    from: 'interstitial_2',
    to: 'prayer_people',
  },
  
  // 10. Prayer People to Add Intention 2
  {
    from: 'prayer_people',
    to: 'add_intention_2',
    validation: (ctx) => ({
      valid: ctx.prayerPeople.length > 0,
      errors: ctx.prayerPeople.length === 0 
        ? ['At least one person must be added'] 
        : undefined
    })
  },
  
  // 11. Add Intention 2 to Intentions Confirmation 2
  {
    from: 'add_intention_2',
    to: 'intentions_confirmation_2',
  },
  
  // 12. Intentions Confirmation 2 to Mood
  {
    from: 'intentions_confirmation_2',
    to: 'mood',
  },
  
  // 13. Mood to Mood Context
  {
    from: 'mood',
    to: 'mood_context',
    validation: (ctx) => ({
      valid: ctx.mood !== null,
      errors: ctx.mood === null ? ['Mood must be selected'] : undefined
    }),
    action: async (ctx) => {
      // Pass mood data to next screen via navigation params
      ctx.navigationParams = {
        id: ctx.mood?.id,
        emoji: ctx.mood?.emoji,
        label: ctx.mood?.label
      };
    }
  },
  
  // 14. Mood Context to Creating Profile
  {
    from: 'mood_context',
    to: 'creating_profile',
    // No validation required - context is optional
  },
  
  // 15. Creating Profile to Summary
  {
    from: 'creating_profile',
    to: 'summary',
  },
  
  // 16. Summary to Commitment Question
  {
    from: 'summary',
    to: 'commitment_question',
  },
  
  // 17. Commitment Question to Streak Goal
  {
    from: 'commitment_question',
    to: 'streak_goal',
  },
  
  // 18. Streak Goal to Prayer Schedule
  {
    from: 'streak_goal',
    to: 'prayer_schedule',
    validation: (ctx) => ({
      valid: ctx.streakGoalDays !== null && ctx.streakGoalDays > 0,
      errors: !ctx.streakGoalDays || ctx.streakGoalDays <= 0
        ? ['Streak goal must be selected']
        : undefined
    })
  },
  
  // 19. Prayer Schedule to Prayer Needs
  {
    from: 'prayer_schedule',
    to: 'prayer_needs',
    // Times are optional
  },
  
  // 20. Prayer Needs to Faith Tradition
  {
    from: 'prayer_needs',
    to: 'faith_tradition',
    validation: (ctx) => ({
      valid: ctx.prayerNeeds.length > 0 || (ctx.customPrayerNeed !== null && ctx.customPrayerNeed.trim().length > 0),
      errors: ctx.prayerNeeds.length === 0 && (!ctx.customPrayerNeed || ctx.customPrayerNeed.trim().length === 0)
        ? ['At least one prayer need must be selected or entered']
        : undefined
    })
  },
  
  // 21. Faith Tradition to Prayer Generation
  {
    from: 'faith_tradition',
    to: 'prayer_generation',
    validation: (ctx) => ({
      valid: ctx.faithTradition !== null,
      errors: ctx.faithTradition === null ? ['Faith tradition must be selected'] : undefined
    })
  },
  
  // 22. Prayer Generation to Prayer Journey Ready
  {
    from: 'prayer_generation',
    to: 'prayer_journey_ready',
  },
  
  // 23. Prayer Journey Ready to First Paywall
  {
    from: 'prayer_journey_ready',
    to: 'first_paywall',
  },
  
  // 24. First Paywall to First Prayer
  {
    from: 'first_paywall',
    to: 'first_prayer',
    // No validation - user can subscribe or continue with limitations
  },
  
  // 25. First Prayer to Value Paywall
  {
    from: 'first_prayer',
    to: 'value_paywall',
  },
  
  // 26. Value Paywall to Benefits Highlight
  {
    from: 'value_paywall',
    to: 'benefits_highlight',
  },
  
  // 27. Benefits Highlight to Paywall
  {
    from: 'benefits_highlight',
    to: 'paywall',
  },
  
  // 28. Paywall to Complete
  {
    from: 'paywall',
    to: 'complete',
  },
  
  // Error state transitions - any state can go to error
  ...([
    'welcome', 'validation_message', 'first_name', 'general_question_1', 'general_question_2',
    'interstitial_1', 'add_intention_1', 'intentions_confirmation_1', 'interstitial_2',
    'prayer_people', 'add_intention_2', 'intentions_confirmation_2', 'mood', 'mood_context',
    'creating_profile', 'summary', 'commitment_question', 'streak_goal', 'prayer_schedule',
    'prayer_needs', 'faith_tradition', 'prayer_generation', 'prayer_journey_ready',
    'first_paywall', 'first_prayer', 'value_paywall', 'benefits_highlight', 'paywall'
  ] as OnboardingState[])
    .map(state => ({
      from: state,
      to: 'error' as OnboardingState,
      condition: (ctx: OnboardingContext) => ctx.errorState !== null
    })),
  
  // Recovery from error - go back to previous state
  {
    from: 'error',
    to: 'welcome', // This will be dynamically set based on errorState.previousState
    condition: (ctx) => ctx.errorState?.recoverable === true
  }
];

export class OnboardingStateMachine {
  private context: OnboardingContext;
  private listeners: ((context: OnboardingContext) => void)[] = [];
  
  constructor(initialContext?: Partial<OnboardingContext>) {
    this.context = {
      currentState: 'welcome',
      previousState: null,
      errorState: null,
      faithTradition: null,
      firstName: null,
      prayerPeople: [],
      intentions: [],
      mood: null,
      moodContext: null,
      prayerNeeds: [],
      customPrayerNeed: null,
      prayerTimes: [],
      streakGoalDays: null,
      generalQuestionResponses: [],
      commitmentResponse: null,
      firstPrayerContent: null,
      sessionId: this.generateSessionId(),
      startedAt: new Date(),
      lastActivity: new Date(),
      completedSteps: [],
      navigationParams: {},
      tempNavParams: null,
      currentBatchOfIntentions: [],
      ...initialContext
    };
  }
  
  private generateSessionId(): string {
    return `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getContext(): OnboardingContext {
    return { ...this.context };
  }
  
  subscribe(listener: (context: OnboardingContext) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  private notify() {
    this.listeners.forEach(listener => listener(this.getContext()));
  }
  
  canTransitionTo(targetState: OnboardingState): boolean {
    const transition = STATE_TRANSITIONS.find(
      t => t.from === this.context.currentState && t.to === targetState
    );
    
    if (!transition) return false;
    
    if (transition.condition && !transition.condition(this.context)) {
      return false;
    }
    
    if (transition.validation) {
      const result = transition.validation(this.context);
      return result.valid;
    }
    
    return true;
  }
  
  async transitionTo(targetState: OnboardingState): Promise<ValidationResult> {
    const transition = STATE_TRANSITIONS.find(
      t => t.from === this.context.currentState && t.to === targetState
    );
    
    if (!transition) {
      return {
        valid: false,
        errors: [`Invalid transition from ${this.context.currentState} to ${targetState}`]
      };
    }
    
    if (transition.condition && !transition.condition(this.context)) {
      return {
        valid: false,
        errors: ['Transition condition not met']
      };
    }
    
    if (transition.validation) {
      const validationResult = transition.validation(this.context);
      if (!validationResult.valid) {
        return validationResult;
      }
    }
    
    // Execute transition action if defined
    if (transition.action) {
      try {
        await transition.action(this.context);
      } catch (error) {
        return {
          valid: false,
          errors: [`Transition action failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
      }
    }
    
    // Update state
    this.context.previousState = this.context.currentState;
    this.context.currentState = targetState;
    this.context.lastActivity = new Date();
    
    // Add to completed steps if not already there
    if (!this.context.completedSteps.includes(targetState)) {
      this.context.completedSteps.push(targetState);
    }
    
    // Clear error state on successful transition
    if (this.context.errorState && targetState !== 'error') {
      this.context.errorState = null;
    }
    
    this.notify();
    
    return { valid: true };
  }
  
  setError(error: Omit<ErrorContext, 'previousState' | 'timestamp'>): void {
    this.context.errorState = {
      ...error,
      previousState: this.context.currentState,
      timestamp: new Date()
    };
    this.transitionTo('error');
  }
  
  async recoverFromError(): Promise<ValidationResult> {
    if (!this.context.errorState?.recoverable) {
      return {
        valid: false,
        errors: ['Error is not recoverable']
      };
    }
    
    const targetState = this.context.errorState.previousState;
    this.context.errorState = null;
    
    return this.transitionTo(targetState);
  }
  
  updateContext(updates: Partial<OnboardingContext>): void {
    this.context = {
      ...this.context,
      ...updates,
      lastActivity: new Date()
    };
    this.notify();
  }
  
  reset(): void {
    this.context = {
      currentState: 'welcome',
      previousState: null,
      errorState: null,
      faithTradition: null,
      firstName: null,
      prayerPeople: [],
      intentions: [],
      mood: null,
      moodContext: null,
      prayerNeeds: [],
      customPrayerNeed: null,
      prayerTimes: [],
      streakGoalDays: null,
      generalQuestionResponses: [],
      commitmentResponse: null,
      firstPrayerContent: null,
      sessionId: this.generateSessionId(),
      startedAt: new Date(),
      lastActivity: new Date(),
      completedSteps: [],
      navigationParams: {},
      tempNavParams: null,
      currentBatchOfIntentions: []
    };
    this.notify();
  }
  
  // Helper methods for common operations
  
  isStepCompleted(step: OnboardingState): boolean {
    return this.context.completedSteps.includes(step);
  }
  
  getProgress(): number {
    const totalSteps = 28; // Total unique states excluding error and complete
    return Math.round((this.context.completedSteps.length / totalSteps) * 100);
  }
  
  canGoBack(): boolean {
    return this.context.previousState !== null;
  }
  
  async goBack(): Promise<ValidationResult> {
    if (!this.canGoBack() || !this.context.previousState) {
      return {
        valid: false,
        errors: ['Cannot go back from current state']
      };
    }
    
    return this.transitionTo(this.context.previousState);
  }
}

// Export singleton instance
export const onboardingStateMachine = new OnboardingStateMachine(); 