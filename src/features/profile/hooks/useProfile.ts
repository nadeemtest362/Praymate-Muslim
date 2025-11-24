import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { router } from 'expo-router';
import { format } from 'date-fns';

interface UseProfileReturn {
  // User data
  user: any | null;
  profile: any | null;
  displayName: string;
  joinDate: string;
  
  // Loading states
  isLoading: boolean;
  isInitialLoad: boolean;
  
  // Actions
  refreshProfile: (force?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const { user, profile, isLoading: authLoading, signOut: authSignOut } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Computed values
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Friend';
  const joinDate = user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : 'Recently';

  // Profile data loaded automatically by React Query
  useEffect(() => {
    if (user?.id) {
      setIsLoading(authLoading);
      setIsInitialLoad(false);
    }
  }, [user?.id, authLoading]);

  const refreshProfile = useCallback(async (force = false) => {
    // React Query handles profile refreshing automatically
    console.log('Profile refresh requested, React Query handles this automatically');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authSignOut();
      router.replace('/welcome');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, [authSignOut]);

  return {
    user,
    profile,
    displayName,
    joinDate,
    isLoading,
    isInitialLoad,
    refreshProfile,
    signOut,
  };
} 