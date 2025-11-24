import { queryClient, queryKeys } from '../../../../lib/queryClient';
import { useSessionStore } from '../../../../stores/authSlices/sessionSlice';

import type { Profile } from '../../../../types/auth';

/**
 * Get current auth state synchronously from session store + profile cache
 * For use in non-React contexts like utility functions, stores, etc.
 */
export const getAuthSnapshot = () => {
  // Get session data from source of truth (session store)
  const sessionState = useSessionStore.getState();
  
  // Get profile from React Query cache (if available)
  const profile = sessionState.user
    ? queryClient.getQueryData<Profile>(queryKeys.profile(sessionState.user.id))
    : null;
  
  return { 
    session: sessionState.session, 
    user: sessionState.user, 
    profile,
    isAuthenticated: sessionState.isAuthenticated,
    isAnonymous: sessionState.isAnonymous,
  };
};

/**
 * Get auth methods for imperative use outside React components
 */
export const getAuthMethods = () => {
  const sessionStore = useSessionStore.getState();
  
  return {
    refreshSession: sessionStore.refreshSession,
    signInAnonymously: sessionStore.signInAnonymously,
    signIn: sessionStore.signIn,
    signUp: sessionStore.signUp,
    signOut: sessionStore.signOut,
    resetPassword: sessionStore.resetPassword,
  };
};

/**
 * Combined auth snapshot with methods - convenience for utility functions
 */
export const getAuthUtils = () => {
  return {
    ...getAuthSnapshot(),
    ...getAuthMethods(),
  };
};
