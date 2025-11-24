/**
 * React Query Auth Hook for Command Center
 * Replaces the Zustand authStore with React Query-based auth management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { queryKeys } from '@/lib/queryKeys'
import { authRepository, type Profile, type SignInCredentials } from '@/repositories/authRepository'

export interface UseAuthReturn {
  // State
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  
  // Actions
  initialize: () => Promise<void>
  signIn: (credentials: SignInCredentials) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  checkAdminStatus: () => Promise<boolean>
  
  // Loading states
  isSigningIn: boolean
  isSigningOut: boolean
  
  // Utilities
  setLoading: (loading: boolean) => void
}

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient()
  
  // Session query
  const { 
    data: session, 
    isLoading: isSessionLoading,
    refetch: refetchSession 
  } = useQuery({
    queryKey: queryKeys.session(),
    queryFn: () => authRepository.getSession(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  // Profile query
  const { 
    data: profile,
    isLoading: isProfileLoading 
  } = useQuery({
    queryKey: queryKeys.profile(session?.user?.id || ''),
    queryFn: () => authRepository.getProfile(session!.user.id),
    enabled: !!session?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Auth mutations
  const signInMutation = useMutation({
    mutationFn: authRepository.signIn,
    onSuccess: () => {
      // Invalidate session to refetch user data
      queryClient.invalidateQueries({ queryKey: queryKeys.session() })
    },
  })

  const signOutMutation = useMutation({
    mutationFn: authRepository.signOut,
    onSuccess: () => {
      // Clear all cache on sign out
      queryClient.clear()
    },
  })

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] Auth state change:', event, session?.user?.id)
        
        // Update session cache
        queryClient.setQueryData(queryKeys.session(), session)
        
        if (event === 'SIGNED_OUT') {
          // Clear all cached data on sign out
          queryClient.clear()
        } else if (event === 'SIGNED_IN' && session) {
          // Invalidate profile to fetch fresh data
          queryClient.invalidateQueries({ 
            queryKey: queryKeys.profile(session.user.id) 
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [queryClient])

  // Computed values
  const user = session?.user || null
  const isAuthenticated = !!user
  const isAdmin = profile?.is_admin ?? false
  const isLoading = isSessionLoading || (isAuthenticated && isProfileLoading)

  // Actions
  const initialize = async () => {
    try {
      await refetchSession()
    } catch (error) {
      console.error('[useAuth] Failed to initialize:', error)
    }
  }

  const signIn = async (credentials: SignInCredentials) => {
    try {
      await signInMutation.mutateAsync(credentials)
      return { error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      console.error('[useAuth] Sign in error:', errorMessage)
      return { error: errorMessage }
    }
  }

  const signOut = async () => {
    try {
      await signOutMutation.mutateAsync()
    } catch (error) {
      console.error('[useAuth] Sign out error:', error)
      throw error
    }
  }

  const checkAdminStatus = async () => {
    if (!user) return false
    try {
      return await authRepository.checkAdminStatus(user.id)
    } catch (error) {
      console.error('[useAuth] Check admin status error:', error)
      return false
    }
  }

  // Legacy compatibility - setLoading doesn't make sense with React Query
  // but keeping for compatibility during migration
  const setLoading = (loading: boolean) => {
    console.warn('[useAuth] setLoading is deprecated with React Query')
  }

  return {
    // State
    user,
    session,
    profile,
    isLoading,
    isAuthenticated,
    isAdmin,
    
    // Actions
    initialize,
    signIn,
    signOut,
    checkAdminStatus,
    
    // Loading states
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    
    // Utilities
    setLoading,
  }
}

/**
 * Utility function to get auth state synchronously from React Query cache
 * Use this sparingly and prefer the useAuth hook in components
 */
export function getAuthSnapshot() {
  // This would need access to queryClient - implement if needed
  console.warn('[useAuth] getAuthSnapshot not implemented - use useAuth hook instead')
  return {
    user: null,
    session: null,
    profile: null,
    isAuthenticated: false,
    isAdmin: false,
  }
}
