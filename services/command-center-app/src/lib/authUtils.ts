/**
 * Auth utilities for Command Center app
 * Provides synchronous access to auth state for route guards and other non-React contexts
 */

import { supabase } from '@/lib/supabaseClient'
import { authRepository } from '@/repositories/authRepository'

export interface AuthSnapshot {
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  user: any
  session: any
}

/**
 * Get current auth state synchronously for route guards
 * This bypasses React Query and goes directly to Supabase
 */
export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  try {
    console.log('[AuthUtils] Getting auth snapshot...')
    
    // Get current session from Supabase
    const session = await authRepository.getSession()
    const user = session?.user || null
    const isAuthenticated = !!user
    
    // Check admin status if authenticated
    let isAdmin = false
    if (user) {
      isAdmin = await authRepository.checkAdminStatus(user.id)
    }
    
    console.log('[AuthUtils] Auth snapshot:', {
      isAuthenticated,
      isAdmin,
      hasUser: !!user,
      hasSession: !!session,
    })
    
    return {
      isAuthenticated,
      isAdmin,
      isLoading: false,
      user,
      session,
    }
  } catch (error) {
    console.error('[AuthUtils] Error getting auth snapshot:', error)
    return {
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
      user: null,
      session: null,
    }
  }
}

/**
 * Initialize auth for route guards
 * Waits for auth to be ready before proceeding
 */
export async function initializeAuth(): Promise<void> {
  try {
    console.log('[AuthUtils] Initializing auth...')
    
    // Get session to trigger auth state initialization
    await authRepository.getSession()
    
    console.log('[AuthUtils] Auth initialization complete')
  } catch (error) {
    console.error('[AuthUtils] Auth initialization failed:', error)
    throw error
  }
}
