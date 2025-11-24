/**
 * Auth Repository - Data access layer for authentication
 * Handles all Supabase auth operations
 */

import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

export interface Profile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface SignInCredentials {
  email: string
  password: string
}

export interface AuthRepository {
  // Session management
  getSession(): Promise<Session | null>
  signIn(credentials: SignInCredentials): Promise<{ user: User; session: Session }>
  signOut(): Promise<void>
  
  // Profile management
  getProfile(userId: string): Promise<Profile | null>
  updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile>
  
  // Admin checks
  checkAdminStatus(userId: string): Promise<boolean>
}

export const authRepository: AuthRepository = {
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[AuthRepository] Error getting session:', error)
      return null
    }
    return session
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      throw new Error(error.message)
    }
    
    if (!data.user || !data.session) {
      throw new Error('No user or session returned from sign in')
    }
    
    return {
      user: data.user,
      session: data.session,
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  },

  async getProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          return null
        }
        throw error
      }
      
      return data as Profile
    } catch (error) {
      console.error('[AuthRepository] Error getting profile:', error)
      return null
    }
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }
    
    return data as Profile
  },

  async checkAdminStatus(userId: string) {
    try {
      const profile = await this.getProfile(userId)
      return profile?.is_admin ?? false
    } catch (error) {
      console.error('[AuthRepository] Error checking admin status:', error)
      return false
    }
  },
}
