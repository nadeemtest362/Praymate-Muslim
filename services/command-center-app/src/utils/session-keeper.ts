/**
 * Session Keeper - DEPRECATED
 * 
 * This utility is no longer needed with React Query auth implementation.
 * React Query + Supabase auth automatically handles:
 * - Session refresh
 * - Auth state changes
 * - Token management
 * 
 * This file is kept for compatibility during migration but should be removed.
 */

// import { supabase } from '@/lib/supabaseClient'
// import { useAuthStore } from '@/stores/authStore'

console.warn('[SessionKeeper] This utility is deprecated with React Query auth')

// Session keeper utility to prevent session expiration (DEPRECATED)
export class SessionKeeper {
  private static instance: SessionKeeper | null = null
  private keepAliveInterval: NodeJS.Timeout | null = null
  private visibilityHandler: (() => void) | null = null

  private constructor() {
    this.startKeepAlive()
    this.setupVisibilityHandler()
  }

  static getInstance(): SessionKeeper {
    if (!SessionKeeper.instance) {
      SessionKeeper.instance = new SessionKeeper()
    }
    return SessionKeeper.instance
  }

  private startKeepAlive() {
    // DEPRECATED: React Query auth handles session refresh automatically
    console.log('[SessionKeeper] startKeepAlive disabled - React Query handles this')
    /*
    // Keep session alive by refreshing every 45 minutes
    // (Supabase sessions expire after 1 hour by default)
    this.keepAliveInterval = setInterval(async () => {
      const { session } = useAuthStore.getState()
      
      if (session) {
        console.log('[SessionKeeper] Keeping session alive...')
        
        try {
          // Make a simple authenticated request to keep session active
          const { data, error } = await supabase.auth.getUser()
          
          if (error) {
            console.error('[SessionKeeper] Failed to keep session alive:', error)
            // Try to refresh the session
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            
            if (refreshData?.session) {
              console.log('[SessionKeeper] Session refreshed successfully')
              useAuthStore.setState({ 
                session: refreshData.session, 
                user: refreshData.session.user 
              })
            } else if (refreshError) {
              console.error('[SessionKeeper] Failed to refresh session:', refreshError)
            }
          } else {
            console.log('[SessionKeeper] Session is still active')
          }
        } catch (error) {
          console.error('[SessionKeeper] Error in keep-alive:', error)
        }
      }
    }, 45 * 60 * 1000) // Every 45 minutes
    */
  }

  private setupVisibilityHandler() {
    // DEPRECATED: React Query auth handles visibility change session refresh automatically
    console.log('[SessionKeeper] setupVisibilityHandler disabled - React Query handles this')
    /*
    // Refresh session when tab becomes visible after being hidden
    this.visibilityHandler = async () => {
      if (!document.hidden) {
        const { session } = useAuthStore.getState()
        
        if (session) {
          console.log('[SessionKeeper] Tab became visible, checking session...')
          
          try {
            // Check if session is still valid
            const { data: userData, error: userError } = await supabase.auth.getUser()
            
            if (userError || !userData?.user) {
              console.log('[SessionKeeper] Session invalid, attempting refresh...')
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
              
              if (refreshData?.session) {
                console.log('[SessionKeeper] Session refreshed after tab visibility')
                useAuthStore.setState({ 
                  session: refreshData.session, 
                  user: refreshData.session.user 
                })
              } else if (refreshError) {
                console.error('[SessionKeeper] Failed to refresh session after visibility:', refreshError)
                // Force re-authentication
                useAuthStore.getState().signOut()
              }
            }
          } catch (error) {
            console.error('[SessionKeeper] Error checking session on visibility:', error)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', this.visibilityHandler)
    */
  }

  destroy() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }

    SessionKeeper.instance = null
  }
}

// Auto-start session keeper when module is imported (DISABLED)
// React Query auth handles session management automatically
// if (typeof window !== 'undefined') {
//   SessionKeeper.getInstance()
// }

console.log('[SessionKeeper] Disabled - React Query auth handles session management')