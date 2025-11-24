import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { signInWithApple } from '../lib/auth';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { authRepository } from '../repositories/authRepository';

interface UseAppleSignInOptions {
  onSuccess?: (isNewUser: boolean) => void;
  onError?: (error: string) => void;
}

export const useAppleSignIn = (options: UseAppleSignInOptions = {}) => {
  const { onSuccess, onError } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  // Check if Apple Authentication is available
  useEffect(() => {
    const checkAppleAuthAvailability = async () => {
      if (Platform.OS === 'ios') {
        try {
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          setIsAppleAuthAvailable(isAvailable);
        } catch (error) {
          console.error('[useAppleSignIn] Error checking Apple Auth availability:', error);
          setIsAppleAuthAvailable(false);
        }
      }
    };
    
    checkAppleAuthAvailability();
  }, []);

  const handleAppleSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsAppleLoading(true);
      
      // Double-check availability before attempting sign in
      if (!isAppleAuthAvailable) {
        const errorMessage = __DEV__ 
          ? 'Apple Sign In is not available on iOS Simulator. Test on a real device or use "Continue with email".'
          : 'Apple Sign In is not available on this device.';
        
        onError?.(errorMessage);
        return;
      }
      
      // Save the current anonymous user ID before signing in
      const previousUserId = user?.id;
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Sign in with Apple using our auth helper
      if (credential.identityToken) {
        const { data: authData, error: signInError } = await signInWithApple(
          credential.identityToken,
          previousUserId
        );
        
        if (signInError) {
          onError?.(signInError.message);
        } else if (authData?.user) {
          // Check if user exists in database and determine flow
          try {
            const profile = await authRepository.getProfile(authData.user.id);
            const isNewUser = !profile;
            
            console.log('[useAppleSignIn] User profile check:', {
              userId: authData.user.id,
              hasProfile: !!profile,
              hasCompletedOnboarding: profile?.has_completed_onboarding,
              isNewUser
            });
            
            // Force a profile refresh to ensure latest data is available for routing
            await queryClient.invalidateQueries({ queryKey: queryKeys.profile(authData.user.id) });
            
            // Wait a moment for the profile to be refetched and auth state to update
            // This ensures the routing system has the latest profile data
            setTimeout(() => {
              onSuccess?.(isNewUser);
            }, 100);
            
          } catch (profileError) {
            console.error('[useAppleSignIn] Error checking user profile:', profileError);
            // If we can't check profile, assume new user (safer for onboarding)
            // Still invalidate queries to trigger profile fetch
            await queryClient.invalidateQueries({ queryKey: queryKeys.profile(authData.user.id) });
            setTimeout(() => {
              onSuccess?.(true);
            }, 100);
          }
        }
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // User canceled - do nothing
      } else {
        const errorMessage = 'Unable to sign in with Apple. Please try again.';
        onError?.(errorMessage);
        console.error('Apple Sign In error:', e);
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return {
    handleAppleSignIn,
    isAppleLoading,
    isAppleAuthAvailable,
  };
};
