import { BaseRepository } from './baseRepository';
import { supabase } from '../lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

import type { Profile } from '../types/auth';

export class AuthRepository extends BaseRepository {
  protected tableName = 'profiles';
  protected eventPrefix = 'profiles' as const;

  // Get current session
  async getCurrentSession(): Promise<{ session: Session | null; user: User | null }> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw this.handleError(error, 'Get session');
      
      return {
        session: data.session,
        user: data.session?.user || null
      };
    } catch (error) {
      throw this.handleError(error, 'Get session');
    }
  }

  // Send magic link
  async sendMagicLink(email: string): Promise<{ success: boolean; error?: string; cooldownSeconds?: number }> {
    try {
      console.log('[AuthRepository] Attempting to send magic link to:', email);
      
      // Use universal link so webviews (e.g., Gmail) hand off to our callback page
      const redirectUrl = 'https://trypraymate.com/auth/callback';
      
      console.log('[AuthRepository] Using redirect URL:', redirectUrl);
      
      // Use standard Supabase magic link - works for both new and existing users
      const { error, data } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      console.log('[AuthRepository] Supabase magic link data:', data);
      if (error) {
        console.error('[AuthRepository] Supabase magic link error:', error);
        
        // Handle specific Supabase error messages
        let userFriendlyError = 'Failed to send magic link';
        let cooldownSeconds = 0;
        
        if (error.message.includes('Email not confirmed')) {
          userFriendlyError = 'Please confirm your email address before requesting a magic link.';
        } else if (error.message.includes('Too many requests')) {
          userFriendlyError = 'Too many requests. Please wait a moment before trying again.';
        } else if (error.message.includes('Signup is disabled')) {
          userFriendlyError = 'Account creation is currently disabled. Please contact support.';
        } else if (error.message.includes('For security purposes, you can only request this after')) {
          // Extract cooldown time from error message
          const match = error.message.match(/after (\d+) seconds/);
          cooldownSeconds = match ? parseInt(match[1]) : 60;
          userFriendlyError = `Please wait ${cooldownSeconds} seconds before requesting another magic link.`;
        } else {
          userFriendlyError = error.message;
        }
        
        const errorObj = new Error(userFriendlyError) as Error & { cooldownSeconds?: number };
        errorObj.cooldownSeconds = cooldownSeconds;
        throw errorObj;
      }
      
      console.log('[AuthRepository] Magic link sent successfully to:', email);
      return { success: true };
    } catch (error) {
      console.error('[AuthRepository] Magic link error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send magic link',
        cooldownSeconds: (error as any)?.cooldownSeconds
      };
    }
  }

  // Get user profile
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw this.handleError(error, 'Get profile');
      }
      
      return data as Profile;
    } catch (error) {
      throw this.handleError(error, 'Get profile');
    }
  }

  // Update profile
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          ...this.getAuditFields()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw this.handleError(error, 'Update profile');
      
      // Emit profile updated event
      this.emitDataEvent('updated', userId, userId);
      
      return data as Profile;
    } catch (error) {
      throw this.handleError(error, 'Update profile');
    }
  }

  // Update UI flags (non-breaking helper)
  async updateUIFlags(
    userId: string, 
    flags: Pick<Profile, 'has_seen_streak_start_popup' | 'has_seen_praylock_intro'>
  ): Promise<void> {
    try {
      await this.updateProfile(userId, flags);
    } catch (error) {
      // Don't throw for UI flag updates - they're not critical
      console.warn('[AuthRepository] Failed to update UI flags:', error);
    }
  }

  // Update timezone
  async updateTimezone(userId: string, timezone: string): Promise<void> {
    try {
      await this.updateProfile(userId, { timezone });
    } catch (error) {
      throw this.handleError(error, 'Update timezone');
    }
  }
}

// Singleton instance
export const authRepository = new AuthRepository();
