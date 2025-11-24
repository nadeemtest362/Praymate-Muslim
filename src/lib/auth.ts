import { supabase, supabaseReady } from './supabaseClient';
import { AuthResponse } from '../types/auth';
import { User } from '@supabase/supabase-js';
import { secureLog } from '../utils/secureLogger';
import { revenueCatService } from './revenueCatService';

// Add at top level outside of function
let refreshAttempts = 0;
const maxRefreshAttempts = 5;
const getBackoffTime = (attempt: number) => Math.min(30000, 1000 * Math.pow(2, attempt)); // Exponential backoff, max 30 sec

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    secureLog.error('Sign up error', error);
    return { 
      data: null, 
      error: { 
        message: error.message, 
        status: error.status 
      } 
    };
  }
}

/**
 * Sign up a new user with email and password, with optional data migration
 * @param email User's email address
 * @param password User's password
 * @param previousUserId Optional: The previous anonymous user ID for data migration
 */
export async function signUpWithMigration(
  email: string, 
  password: string, 
  previousUserId?: string
): Promise<AuthResponse> {
  try {
    secureLog.debug('Attempting email sign up with migration', { hasPreviousUser: !!previousUserId });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (!data?.user) {
      throw new Error('No user data returned from sign up');
    }
    
    // If we have a previous anonymous user ID, trigger data migration
    if (previousUserId && data.user.id !== previousUserId) {
      secureLog.debug('Triggering data migration from anonymous user', {
        fromUserId: previousUserId,
        toUserId: data.user.id
      });
      
      // Call the edge function to migrate data
      const { error: migrationError } = await supabase.functions.invoke('migrate-anonymous-data', {
        body: {
          fromUserId: previousUserId,
          toUserId: data.user.id
        }
      });
      
      if (migrationError) {
        secureLog.error('Data migration failed', migrationError);
        // Don't fail the sign up, just log the error
        // The user can still use the app, they just lost their onboarding data
      } else {
        // Link PostHog identities - tell PostHog that the new authenticated user
        // is the same person as the previous anonymous user
        try {
          const { aliasPostHogUser } = await import('./posthog');
          aliasPostHogUser(data.user.id);
          secureLog.debug('PostHog alias created', {
            fromUserId: previousUserId,
            toUserId: data.user.id
          });
        } catch (error) {
          secureLog.error('PostHog alias failed', error);
          // Analytics failure should not block user flow
        }
      }
    }

    // Identify user in RevenueCat for subscription management
    try {
      await revenueCatService.logIn(data.user.id);
      secureLog.debug('RevenueCat user identified', { userId: data.user.id });
    } catch (error) {
      secureLog.error('RevenueCat user identification failed', error);
      // Don't fail the sign up, just log the error
    }
    
    return { data, error: null };
  } catch (error: any) {
    secureLog.error('Sign up error', error);
    return { 
      data: null, 
      error: { 
        message: error.message, 
        status: error.status 
      } 
    };
  }
}

/**
 * Sign in a user with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data?.user) {
      // Identify user in RevenueCat for subscription management
      try {
        await revenueCatService.logIn(data.user.id);
        secureLog.debug('RevenueCat user identified', { userId: data.user.id });
      } catch (error) {
        secureLog.error('RevenueCat user identification failed', error);
        // Don't fail the sign in, just log the error
      }
    }
    
    return { data, error: null };
  } catch (error: any) {
    secureLog.error('Sign in error', error);
    return { 
      data: null, 
      error: { 
        message: error.message, 
        status: error.status 
      } 
    };
  }
}

/**
 * Sign in anonymously (no credentials required)
 */
export async function signInAnonymously(): Promise<AuthResponse> {
  secureLog.debug('Attempting anonymous authentication');
  
  try {
    // Wait for Supabase to be ready
    await supabaseReady;
    
    // Verify that Supabase client is properly initialized
    if (!supabase || !supabase.auth) {
      secureLog.error('Supabase client not properly initialized after waiting');
      return { 
        data: null, 
        error: { 
          message: 'Supabase client not properly initialized', 
          status: 500
        } 
      };
    }
    
    // Check for the existence of the signInAnonymously method
    if (typeof supabase.auth.signInAnonymously !== 'function') {
      secureLog.error('signInAnonymously method not available in Supabase client');
      return { 
        data: null, 
        error: { 
          message: 'Anonymous authentication not supported in this Supabase version', 
          status: 500
        } 
      };
    }
    
    secureLog.debug('Calling Supabase signInAnonymously API');
    const response = await supabase.auth.signInAnonymously();
    
    secureLog.debug('Anonymous authentication response received', {
      hasError: !!response.error,
      hasUser: !!response.data?.user,
      hasSession: !!response.data?.session,
      provider: response.data?.user?.app_metadata?.provider
    });
    
    if (response.error) {
      secureLog.error('Supabase anonymous sign-in error', response.error);
      throw response.error;
    }
    
    if (!response.data?.user) {
      secureLog.error('Anonymous sign-in response missing user data');
      return {
        data: response.data,
        error: {
          message: 'Anonymous sign-in response missing user data',
          status: 500
        }
      };
    }
    
    secureLog.debug('Anonymous authentication successful', {
      provider: response.data.user.app_metadata?.provider,
      isAnonymous: response.data.user.app_metadata?.provider === 'anonymous'
    });
    
    return { data: response.data, error: null };
  } catch (error: any) {
    secureLog.error('Anonymous sign-in critical error', error);
    return { 
      data: null, 
      error: { 
        message: error.message || 'Unknown error during anonymous sign-in', 
        status: error.status || 500
      } 
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { data: true, error: null };
  } catch (error: any) {
    secureLog.error('Sign out error', error);
    return { 
      data: null, 
      error: { 
        message: error.message, 
        status: error.status 
      } 
    };
  }
}

/**
 * Send a password reset email to the specified email address
 */
export async function resetPassword(email: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'justpray://reset-password', // This should match your app's deep link
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    secureLog.error('Reset password error', error);
    return { 
      data: null, 
      error: { 
        message: error.message, 
        status: error.status 
      } 
    };
  }
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(updates: { 
  email?: string; 
  password?: string; 
  data?: any 
}): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.updateUser(updates);
    
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    secureLog.error('Update user error', error);
    return { 
      data: null, 
      error: { 
        message: error.message, 
        status: error.status 
      } 
    };
  }
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  return await supabase.auth.getSession();
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user;
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      // If network error, set up retry with backoff
      if (error.message.includes('network') && refreshAttempts < maxRefreshAttempts) {
        refreshAttempts++;
        const backoffTime = getBackoffTime(refreshAttempts);
        
        // Schedule retry
        setTimeout(() => refreshSession(), backoffTime);
        
        return { 
          data: null, 
          error: { 
            message: `Network error during session refresh. Will retry in ${backoffTime/1000}s.`, 
            status: error.status 
          } 
        };
      }
      
      throw error;
    }
    
    // Success - reset refresh attempts
    refreshAttempts = 0;
    return { data, error: null };
  } catch (error: any) {
    secureLog.error('Session refresh error', error);
    return { 
      data: null, 
      error: { 
        message: error.message, 
        status: error.status 
      } 
    };
  }
}

/**
 * Check if a user is anonymous
 * @param user Supabase user object
 * @returns boolean indicating if the user is anonymous
 */
export const isAnonymousUser = (user: User | null): boolean => {
  if (!user) return false;
  
  // Check both criteria:
  // 1. The provider might be explicitly set to "anonymous" in metadata
  // 2. Anonymous users always have no email and no phone
  const hasAnonymousProvider = user.app_metadata?.provider === 'anonymous';
  const hasNoCredentials = user.email === null && user.phone === null;
  
  // If Supabase dashboard shows user as Anonymous, but API doesn't report provider correctly,
  // the hasNoCredentials check ensures we still identify them properly
  return hasAnonymousProvider || hasNoCredentials;
};

/**
 * Sign in with Apple ID token
 * @param identityToken The identity token from Apple Sign In
 * @param previousUserId Optional: The previous anonymous user ID for data migration
 */
export async function signInWithApple(
  identityToken: string, 
  previousUserId?: string
): Promise<AuthResponse> {
  try {
    secureLog.debug('Attempting Apple Sign In', { hasPreviousUser: !!previousUserId });
    
    // Sign in with the Apple ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    });
    
    if (error) throw error;
    
    if (!data?.user) {
      throw new Error('No user data returned from Apple sign in');
    }
    
    // If we have a previous anonymous user ID, trigger data migration
    if (previousUserId && data.user.id !== previousUserId) {
      secureLog.debug('Triggering data migration from anonymous user', {
        fromUserId: previousUserId,
        toUserId: data.user.id
      });
      
      // Call the edge function to migrate data
      const { error: migrationError } = await supabase.functions.invoke('migrate-anonymous-data', {
        body: {
          fromUserId: previousUserId,
          toUserId: data.user.id
        }
      });
      
      if (migrationError) {
        secureLog.error('Data migration failed', migrationError);
        // Don't fail the sign in, just log the error
        // The user can still use the app, they just lost their onboarding data
      } else {
        // Link PostHog identities - tell PostHog that the new authenticated user
        // is the same person as the previous anonymous user
        try {
          const { aliasPostHogUser } = await import('./posthog');
          aliasPostHogUser(data.user.id);
          secureLog.debug('PostHog alias created', {
            fromUserId: previousUserId,
            toUserId: data.user.id
          });
        } catch (error) {
          secureLog.error('PostHog alias failed', error);
          // Analytics failure should not block user flow
        }
      }
    }

    // Identify user in RevenueCat for subscription management
    try {
      await revenueCatService.logIn(data.user.id);
      secureLog.debug('RevenueCat user identified', { userId: data.user.id });
    } catch (error) {
      secureLog.error('RevenueCat user identification failed', error);
      // Don't fail the sign in, just log the error
    }
    
    return { data, error: null };
  } catch (error: any) {
    secureLog.error('Apple sign in error', error);
    return { 
      data: null, 
      error: { 
        message: error.message || 'Failed to sign in with Apple', 
        status: error.status || 500
      } 
    };
  }
} 