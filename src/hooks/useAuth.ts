// No React imports needed for this hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'react-native';
import { useSessionStore } from '../stores/authSlices/sessionSlice';
import { authRepository } from '../repositories';
import type { Profile } from '../types/auth';
import { queryKeys, cacheConfig } from '../lib/queryClient';

// Session hook
export const useSession = () => {
  const sessionStore = useSessionStore();
  
  return {
    user: sessionStore.user,
    session: sessionStore.session,
    isAuthenticated: sessionStore.isAuthenticated,
    isAnonymous: sessionStore.isAnonymous,
    isLoading: sessionStore.isInitializing,
    error: sessionStore.lastError,
    signIn: sessionStore.signIn,
    signUp: sessionStore.signUp,
    signOut: sessionStore.signOut,
    signInAnonymously: sessionStore.signInAnonymously,
    refreshSession: sessionStore.refreshSession,
    resetPassword: sessionStore.resetPassword,
    sendMagicLink: sessionStore.sendMagicLink,
    isSendingMagicLink: sessionStore.isSendingMagicLink,
    lastError: sessionStore.lastError,
    initialize: sessionStore.initialize,
    clearError: sessionStore.clearError,
  };
};

// Profile hook with React Query (pure React Query, no Zustand)
export const useProfile = (userId?: string) => {
  const queryClient = useQueryClient();

  // React Query for profile data - single source of truth
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId || 'no-user'),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required for profile fetch');
      const profile = await authRepository.getProfile(userId);
      
      // Prefetch user avatar for better UX on intentions tab
      if (profile?.avatar_url) {
        Image.prefetch(profile.avatar_url).catch(() => {
          // Silently fail - images will still load normally if prefetch fails
        });
      }
      
      return profile;
    },
    enabled: !!userId,
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });

  // Update profile mutation with pure React Query optimistic updates
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!userId) throw new Error('User ID required for profile update');
      return await authRepository.updateProfile(userId, updates);
    },
    onMutate: async (updates) => {
      if (!userId) return { previousProfile: null };
      
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.profile(userId) });
      
      // Snapshot previous value
      const previousProfile = queryClient.getQueryData<Profile>(queryKeys.profile(userId));
      
      // Optimistically update React Query cache only
      queryClient.setQueryData(queryKeys.profile(userId), (old: Profile | undefined) => {
        return old ? { ...old, ...updates, updated_at: new Date().toISOString() } : null;
      });
      
      return { previousProfile };
    },
    onError: async (error, updates, context) => {
      // Rollback optimistic update on error
      if (context?.previousProfile && userId) {
        queryClient.setQueryData(queryKeys.profile(userId), context.previousProfile);
      } else if (userId) {
        // No cached profile - invalidate
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      }
    },
    onSuccess: (data) => {
      if (userId) {
        // Update React Query cache with server response
        queryClient.setQueryData(queryKeys.profile(userId), data);
      }
    },
  });

  return {
    profile: profileQuery.data || null,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error instanceof Error ? profileQuery.error.message : null,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    updateError: updateProfileMutation.error instanceof Error ? updateProfileMutation.error.message : null,
    refetch: profileQuery.refetch,
  };
};

// Combined auth hook for convenience
export const useAuth = () => {
  const session = useSession();
  const profile = useProfile(session.user?.id);
  const uiFlags = useUpdateUIFlags();

  return {
    // Session data
    user: session.user,
    session: session.session,
    isAuthenticated: session.isAuthenticated,
    isAnonymous: session.isAnonymous,
    
    // Profile data
    profile: profile.profile,
    
    // Combined loading state
    isLoading: session.isLoading || profile.isLoading,
    
    // Auth actions
    signIn: session.signIn,
    signUp: session.signUp,
    signOut: async () => {
      // Cache clearing handled by sessionSlice SIGNED_OUT event
      await session.signOut();
    },
    signInAnonymously: session.signInAnonymously,
    resetPassword: session.resetPassword,
    
    // Profile actions
    updateProfile: profile.updateProfile,
    updateProfileAsync: profile.updateProfileAsync,
    isUpdating: profile.isUpdating,
    
    // UI helpers
    updateUIFlag: (key: keyof Pick<Profile, 'has_seen_streak_start_popup' | 'has_seen_praylock_intro'>, value: boolean) => {
      uiFlags.mutate({ [key]: value } as Pick<Profile, 'has_seen_streak_start_popup' | 'has_seen_praylock_intro'>);
    },
    
    // Initialize
    initialize: session.initialize,
    
    // Timezone helper
    updateTimezoneIfNeeded: async () => {
      if (!session.user?.id || !profile.profile) {
        return;
      }

      try {
        const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const storedTimezone = profile.profile.timezone;
        
        if (currentTimezone !== storedTimezone) {
          console.log('Timezone changed, updating profile', { 
            from: storedTimezone, 
            to: currentTimezone 
          });
          
          await profile.updateProfileAsync({ timezone: currentTimezone });
        }
      } catch (error) {
        console.error('Failed to update timezone:', error);
      }
    },
    
    // Errors
    error: session.error || profile.error || profile.updateError,
    clearError: session.clearError,
    
    // Session actions
    refreshSession: session.refreshSession,
  };
};

// Timezone update helper
export const useUpdateTimezone = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timezone: string) => {
      if (!user?.id) throw new Error('User ID required for timezone update');
      await authRepository.updateTimezone(user.id, timezone);
    },
    onSuccess: () => {
      // Invalidate profile query to refetch with new timezone
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
      }
    },
  });
};

// UI flags update helper (non-critical)
export const useUpdateUIFlags = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flags: Pick<Profile, 'has_seen_streak_start_popup' | 'has_seen_praylock_intro'>) => {
      if (!user?.id) throw new Error('User ID required for UI flags update');
      // Use non-throwing repository method
      await authRepository.updateUIFlags(user.id, flags);
    },
    onMutate: (flags) => {
      // Optimistic React Query cache update for UI flags
      if (user?.id) {
        const profileKey = queryKeys.profile(user.id);
        const currentProfile = queryClient.getQueryData<Profile>(profileKey);
        
        if (currentProfile) {
          queryClient.setQueryData(profileKey, {
            ...currentProfile,
            ...flags,
            updated_at: new Date().toISOString()
          });
        }
      }
    },
    onError: (error, variables) => {
      // Revert optimistic update on error
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
      }
      console.warn('[useUpdateUIFlags] Failed to update UI flags:', error);
    },
  });
};
