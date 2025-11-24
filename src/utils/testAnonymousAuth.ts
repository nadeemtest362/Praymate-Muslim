import { supabase } from '../lib/supabaseClient';
import { secureLog } from './secureLogger';

/**
 * Utility function to directly test anonymous sign-in
 * This bypasses all the store and component logic to test the raw API call
 */
export const testAnonymousAuth = async () => {
  // Log that we're starting the test
  secureLog.debug('Starting anonymous auth test');
  
  secureLog.debug('Supabase client initialized', {
    hasAuthModule: !!supabase?.auth,
    hasSignInAnonymously: typeof supabase?.auth?.signInAnonymously === 'function',
  });

  try {
    secureLog.debug('Attempting anonymous sign-in');
    
    if (!supabase?.auth?.signInAnonymously) {
      secureLog.error('signInAnonymously method not available');
      return {
        success: false,
        error: 'Method not available - update Supabase client or check if feature is enabled'
      };
    }
    
    // Direct API call
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      secureLog.error('Sign-in failed with error', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    // Success!
    secureLog.debug('Anonymous auth success', {
      hasUser: !!data.user,
      isAnonymous: data.user?.app_metadata?.provider === 'anonymous',
      hasSession: !!data.session
    });
    
    return {
      success: true,
      hasUser: !!data.user,
      isAnonymous: data.user?.app_metadata?.provider === 'anonymous'
    };
  } catch (e) {
    secureLog.error('Critical error in testAnonymousAuth', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error'
    };
  }
}; 