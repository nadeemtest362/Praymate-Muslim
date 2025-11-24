// Simplified version of useAuth to test what's causing the issue
import { useSession, useProfile } from './useAuth';

export const useSimpleAuth = () => {
  console.log('[useSimpleAuth] Starting...');
  
  try {
    const session = useSession();
    console.log('[useSimpleAuth] Session obtained');
    
    const profile = useProfile(session.user?.id);
    console.log('[useSimpleAuth] Profile obtained');
    
    return {
      user: session.user,
      session: session.session,
      isAuthenticated: session.isAuthenticated,
      isLoading: session.isLoading || profile.isLoading,
      profile: profile.profile,
    };
  } catch (error) {
    console.error('[useSimpleAuth] Error:', error);
    throw error;
  }
};
