import { supabase } from './supabaseClient';

/**
 * Safe wrapper for Supabase RPC calls that handles production build issues
 * where the RPC method might not be available due to hoisting/optimization issues
 */
export async function safeRpc<T = any>(
  functionName: string,
  params?: any
): Promise<{ data: T | null; error: any }> {
  try {
    // Check if supabase client is properly initialized
    if (!supabase) {
      console.error('[SafeRPC] Supabase client not initialized');
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    // Check if RPC method exists
    if (typeof supabase.rpc !== 'function') {
      console.error('[SafeRPC] Supabase RPC method not available', {
        supabase: !!supabase,
        rpcType: typeof supabase.rpc,
        keys: supabase ? Object.keys(supabase) : []
      });
      
      // Try to access RPC through the client's prototype chain
      const rpcMethod = (supabase as any)?.rpc || (supabase as any)?.__proto__?.rpc;
      if (typeof rpcMethod === 'function') {
        console.log('[SafeRPC] Found RPC method through prototype chain');
        return await rpcMethod.call(supabase, functionName, params);
      }
      
      return { data: null, error: new Error('Supabase RPC method not available') };
    }

    // Normal RPC call
    return await supabase.rpc(functionName, params);
  } catch (error) {
    console.error(`[SafeRPC] Error calling ${functionName}:`, error);
    return { data: null, error };
  }
}

// Export specific RPC functions for type safety
export const rpcFunctions = {
  getUserChallengeInfo: (userId: string) => 
    safeRpc<{
      current_day: number;
      account_created_at: string;
      unlocked_days: number[];
      completed_days: number[];
    }[]>('get_user_challenge_info', { p_user_id: userId }),
    
  upsertChallengeProgress: (userId: string, dayNumber: number, completed: boolean) =>
    safeRpc<void>('upsert_challenge_progress', {
      p_user_id: userId,
      p_day_number: dayNumber,
      p_completed: completed
    }),
    
  getCurrentPrayerState: (userId: string) =>
    safeRpc<{
      server_now_epoch_ms?: number;
      user_timezone?: string;
      current_period: 'morning' | 'evening';
      current_window_available: boolean;
      prayers: {
        morning: any | null;
        evening: any | null;
      };
      morning_available?: boolean;
      evening_available?: boolean;
      effective_streak?: number;
      debug?: {
        current_hour: number;
        morning_available: boolean;
        evening_available: boolean;
        has_morning_prayer?: boolean;
        has_evening_prayer?: boolean;
      };
    }>('get_current_prayer_state', { user_id_param: userId })
};