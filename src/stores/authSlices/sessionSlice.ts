import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { emit } from '../../lib/eventBus';
import { resetPassword as authResetPassword } from '../../lib/auth';
import { resetReactQuery, queryClient, queryKeys } from '../../lib/queryClient';
import { realtimeManager } from '../../lib/realtimeSync';
import { authRepository } from '../../repositories/authRepository';
import { revenueCatService } from '../../lib/revenueCatService';

// Minimal session state - no profile data
interface SessionState {
  // Core auth state
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  
  // Loading states
  isInitializing: boolean;
  isSigningIn: boolean;
  isSigningUp: boolean;
  isSigningOut: boolean;
  isSendingMagicLink: boolean;
  
  // Error state
  lastError: string | null;
  
  // Internal state
  _isInitialized: boolean;
  _initToken: number; // Prevents race conditions
  
  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  refreshSession: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ data: any; error: any }>;
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string; cooldownSeconds?: number }>;
  clearError: () => void;
  cleanup: () => void;
}

// Module-level variables to prevent race conditions
let currentInitToken = 0;
let authSubscription: { unsubscribe: () => void } | null = null;

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isAuthenticated: false,
      isAnonymous: false,
      isInitializing: true, // Start with loading to avoid flicker
      isSigningIn: false,
      isSigningUp: false,
      isSigningOut: false,
      isSendingMagicLink: false,
      lastError: null,
      _isInitialized: false,
      _initToken: 0,

      // Initialize session (race-condition safe)
      // NEW BEHAVIOR: Don't auto-sign in users anonymously on first app open
      // Let them choose from the auth screen: sign in with credentials OR continue anonymously
      initialize: async () => {
        if (get()._isInitialized) {
          console.log('[SessionStore] Already initialized, skipping');
          return;
        }

        // Generate new init token to prevent race conditions
        const initToken = ++currentInitToken;
        console.log('[SessionStore] Initializing with token:', initToken);
        
        set({ isInitializing: true, lastError: null, _initToken: initToken });

        try {
          // Clean up any existing subscription
          if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
          }

          // Set up auth state listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: string, session: any) => {
              // Ignore events from older initialization attempts
              if (initToken !== currentInitToken) {
                console.log('[SessionStore] Ignoring event from old init token');
                return;
              }

              console.log('[SessionStore] Auth state change:', event);
              
              switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                case 'USER_UPDATED':
                  if (session?.user) {
                    set({
                      user: session.user,
                      session,
                      isAuthenticated: true,
                      isAnonymous: session.user.app_metadata?.provider === 'anonymous' || false,
                      lastError: null,
                    });
                    
                    // Update React Query session cache for getAuthSnapshot/compatibility shim
                    queryClient.setQueryData(queryKeys.session, {
                      user: session.user,
                      session,
                      isAuthenticated: true,
                      isAnonymous: session.user.app_metadata?.provider === 'anonymous' || false,
                    });
                    
                    // Setup realtime subscriptions
                    try {
                      await realtimeManager.setup(session.user.id, session.access_token);
                    } catch (error) {
                      console.warn('[SessionStore] Realtime setup failed:', error);
                    }
                    
                    // Update realtime token on refresh
                    if (event === 'TOKEN_REFRESHED' && session.access_token) {
                      realtimeManager.updateToken(session.access_token);
                    }
                    
                    // Emit auth event
                    emit('auth:signedIn', { userId: session.user.id });
                  }
                  break;
                  
                case 'SIGNED_OUT':
                  // Cleanup realtime and cache before updating state
                  try {
                    await realtimeManager.cleanup();
                    await resetReactQuery();
                  } catch (error) {
                    console.warn('[SessionStore] Cleanup failed:', error);
                  }
                  
                  set({
                    user: null,
                    session: null,
                    isAuthenticated: false,
                    isAnonymous: false,
                  });
                  
                  // Clear React Query session cache
                  queryClient.setQueryData(queryKeys.session, {
                    user: null,
                    session: null,
                    isAuthenticated: false,
                    isAnonymous: false,
                  });
                  
                  emit('auth:signedOut', undefined);
                  break;
              }
            }
          );
          
          authSubscription = subscription;

          // Check for existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('[SessionStore] Session check error:', error);
            // Continue with anonymous signin
          }

          if (session?.user) {
            // Verify session is valid
            const { data: { user }, error: verifyError } = await supabase.auth.getUser();
            
            if (verifyError || !user) {
              console.log('[SessionStore] Invalid session, clearing');
              await supabase.auth.signOut();
              // Don't auto-sign in after clearing invalid session
              // Let user choose to sign in again from the auth screen
            } else {
              set({
                user,
                session,
                isAuthenticated: true,
                isAnonymous: user.app_metadata?.provider === 'anonymous' || false,
              });
              
              // Update React Query session cache for existing session
              queryClient.setQueryData(queryKeys.session, {
                user,
                session,
                isAuthenticated: true,
                isAnonymous: user.app_metadata?.provider === 'anonymous' || false,
              });
              
              // Setup realtime subscriptions
              try {
                await realtimeManager.setup(user.id);
              } catch (error) {
                console.warn('[SessionStore] Realtime setup failed:', error);
              }

              // Identify user in RevenueCat for subscription management
              try {
                await revenueCatService.logIn(user.id);
                console.log('[SessionStore] RevenueCat user identified:', user.id);
              } catch (error) {
                console.warn('[SessionStore] RevenueCat user identification failed:', error);
              }
              
              emit('auth:signedIn', { userId: user.id });
            }
          } else {
            console.log('[SessionStore] No session found - user stays unauthenticated');
            // Don't automatically sign in anonymously on first app open
            // Let user choose to sign in or continue anonymously from the auth screen
            // This ensures first-time users see the login/signup screen
          }

        } catch (error) {
          console.error('[SessionStore] Initialize error:', error);
          set({ 
            lastError: error instanceof Error ? error.message : 'Initialization failed',
            user: null,
            session: null,
            isAuthenticated: false,
            isAnonymous: false,
          });
        } finally {
          set({ isInitializing: false, _isInitialized: true });
        }
      },

      // Sign in with email/password
      signIn: async (email: string, password: string) => {
        set({ isSigningIn: true, lastError: null });
        
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) throw error;
          
          // State will be updated by auth listener
          console.log('[SessionStore] Sign in successful');
          
        } catch (error) {
          console.error('[SessionStore] Sign in error:', error);
          set({ lastError: error instanceof Error ? error.message : 'Sign in failed' });
          throw error;
        } finally {
          set({ isSigningIn: false });
        }
      },

      // Sign up with email/password  
      signUp: async (email: string, password: string) => {
        set({ isSigningUp: true, lastError: null });
        
        try {
          const { error } = await supabase.auth.signUp({
            email,
            password,
          });
          
          if (error) throw error;
          
          console.log('[SessionStore] Sign up successful');
          
        } catch (error) {
          console.error('[SessionStore] Sign up error:', error);
          set({ lastError: error instanceof Error ? error.message : 'Sign up failed' });
          throw error;
        } finally {
          set({ isSigningUp: false });
        }
      },

      // Sign out
      signOut: async () => {
        set({ isSigningOut: true, lastError: null });
        
        try {
          const { error } = await supabase.auth.signOut();
          
          if (error) throw error;
          
          // Clean up subscription after signout
          if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
          }
          
          // Clear React Query cache to prevent stale data
          console.log('[SessionStore] Clearing React Query cache on signout...');
          await resetReactQuery();
          
          // Clean up realtime connections
          await realtimeManager.cleanup();

          // Logout from RevenueCat
          try {
            await revenueCatService.logOut();
            console.log('[SessionStore] RevenueCat user logged out');
          } catch (error) {
            console.warn('[SessionStore] RevenueCat logout failed:', error);
          }
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isAnonymous: false,
            _isInitialized: false, // Allow re-initialization
          });

          setTimeout(() => {
            get()
              .initialize()
              .catch(error => {
                console.error('[SessionStore] Reinitialize after signout failed:', error);
              });
          }, 0);
          
          console.log('[SessionStore] Sign out successful - all caches cleared');
          
        } catch (error) {
          console.error('[SessionStore] Sign out error:', error);
          set({ lastError: error instanceof Error ? error.message : 'Sign out failed' });
          throw error;
        } finally {
          set({ isSigningOut: false });
        }
      },

      // Anonymous sign in
      signInAnonymously: async () => {
        try {
          const { error } = await supabase.auth.signInAnonymously();
          
          if (error) throw error;
          
          console.log('[SessionStore] Anonymous sign in successful');
          
        } catch (error) {
          console.error('[SessionStore] Anonymous sign in error:', error);
          set({ lastError: error instanceof Error ? error.message : 'Anonymous sign in failed' });
          throw error;
        }
      },

      // Refresh session
      refreshSession: async () => {
        try {
          const { error } = await supabase.auth.refreshSession();
          
          if (error) throw error;
          
          console.log('[SessionStore] Session refresh successful');
          
        } catch (error) {
          console.error('[SessionStore] Session refresh error:', error);
          // Don't update state on refresh errors - keep existing session
        }
      },

      // Reset password
      resetPassword: async (email: string) => {
        try {
          const response = await authResetPassword(email);
          console.log('[SessionStore] Password reset email sent');
          return response;
        } catch (error) {
          console.error('[SessionStore] Reset password error:', error);
          const errorResponse = { 
            data: null, 
            error: { 
              message: error instanceof Error ? error.message : 'Password reset failed' 
            }
          };
          return errorResponse;
        }
      },

      // Send magic link
      sendMagicLink: async (email: string) => {
        set({ isSendingMagicLink: true, lastError: null });
        try {
          console.log('[SessionStore] Attempting to send magic link to:', email);
          
          const result = await authRepository.sendMagicLink(email);
          
          if (!result.success) {
            const errorObj = new Error(result.error || 'Failed to send magic link') as Error & { cooldownSeconds?: number };
            errorObj.cooldownSeconds = result.cooldownSeconds;
            throw errorObj;
          }

          console.log('[SessionStore] Magic link sent successfully to:', email);
          return { success: true };
        } catch (error) {
          console.error('[SessionStore] Send magic link error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Magic link failed to send';
          const cooldownSeconds = (error as any)?.cooldownSeconds;
          
          // Set error in store for UI feedback
          set({ lastError: errorMessage });
          
          const errorResponse = {
            success: false,
            error: errorMessage,
            cooldownSeconds,
          };
          return errorResponse;
        } finally {
          set({ isSendingMagicLink: false });
        }
      },

      // Cleanup
      cleanup: () => {
        if (authSubscription) {
          authSubscription.unsubscribe();
          authSubscription = null;
        }
      },

      // Clear error
      clearError: () => set({ lastError: null }),
    }),
    {
      name: 'session-v2-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          return await SecureStore.getItemAsync(name);
        },
        setItem: async (name: string, value: string) => {
          if (value.length > 2048) {
            console.warn(`[SessionStore] Value too large for SecureStore: ${value.length} bytes`);
            return;
          }
          await SecureStore.setItemAsync(name, value);
        },
        removeItem: async (name: string) => {
          await SecureStore.deleteItemAsync(name);
        },
      })),
      partialize: () => undefined, // Don't persist anything - Supabase handles session persistence
    }
  )
);
