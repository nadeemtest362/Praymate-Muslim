/**
 * Bulletproof onboarding system - Main export file
 * 
 * This module provides resilient components and utilities for building
 * server-driven UI (SDUI) onboarding flows that can handle errors,
 * network issues, and edge cases gracefully.
 */

console.log('[onboarding/index.ts] Module loading...');

/**
 * Onboarding Infrastructure Exports
 * Only export what's commonly used to improve tree-shaking
 */

// Core wrapper and HOC
export { withResilience, ResilientWrapper } from './resilient-wrapper';

// Hooks
export { useInterruptionHandler } from './interruption-handler';
export { useOnboardingDeepLinks } from './deep-link-handler';
export { useFallbackUI, withFallbackUI } from './use-fallback-ui';

// Fallback UI Components
export {
  MissingStateFallback,
  LoadingStateFallback,
  PermissionDeniedFallback,
  OfflineStateFallback,
  ErrorStateFallback,
  EmptyStateFallback,
  TimeoutFallback,
  AuthErrorFallback,
} from './fallback-components';

// For screens that need offline operations
export {
  savePrayerFocusPersonOffline,
  savePrayerIntentionOffline,
  updateUserProfileOffline,
  batchSaveIntentionsOffline,
} from './offline-operations';

// Main exports for onboarding infrastructure

// Core state management
export { onboardingStateMachine } from './stateMachine';
export type { OnboardingState, OnboardingContext } from './stateMachine';

// Data persistence
export { onboardingDataRepository } from './dataRepository';
export { AtomicDataStore } from './atomic-data-store';

// Navigation
export { navigationController, useOnboardingNavigation } from './navigationController';
export type { NavigationOptions } from './navigationController';

// Deep linking and interruption handling
export { deepLinkHandler } from './deep-link-handler';
export { interruptionHandler } from './interruption-handler';

// Recovery management
export { recoveryManager } from './recovery-manager';
export { useCrashRecovery, withCrashRecovery, OnboardingCrashRecovery } from './crash-recovery';

// Network management (lazy loaded in _layout.tsx)
// export { offlineManager } from './offline-manager';

// Analytics (essential)
export { enhancedAnalytics } from './analytics-enhanced';

// State validators - will be implemented in Subtask 18
// export { onboardingStateValidator } from './state-validators';

// Error handling (lazy loaded in _layout.tsx)
// export { OnboardingErrorBoundary } from './error-boundary';

// Testing utilities (only for development)
// TODO: Uncomment when testing-utils.ts is implemented
// if (__DEV__) {
//   exports.testingUtils = require('./testing-utils').testingUtils;
// }

// Note: Don't export internal infrastructure like:
// - AtomicDataStore (internal implementation)
// - offlineManager (internal singleton)
// - enhancedAnalytics (used internally)
// - navigationController (used internally)
// These can still be imported directly if needed for specific cases 

console.log('[onboarding/index.ts] Module exports complete'); 