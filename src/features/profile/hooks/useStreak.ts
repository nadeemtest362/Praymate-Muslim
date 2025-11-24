import { useQuery } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../../../lib/queryClient';
import { supabase } from '../../../lib/supabaseClient';
import { rpcFunctions } from '../../../lib/supabaseRpc';
import { useAuth } from '../../../hooks/useAuth';

interface UseStreakReturn {
  streak: number;
  isLoading: boolean;
  refreshStreak: () => Promise<void>;
}

export function useStreak(): UseStreakReturn {
  const { user } = useAuth();

  // Raw (stored) streak
  const rawQuery = useQuery({
  queryKey: queryKeys.userStats(user?.id || ''),
  queryFn: async () => {
  const { data, error } = await supabase
  .from('user_stats')
  .select('current_streak')
  .eq('user_id', user!.id)
    .single();
  if (error) throw error;
  return data as { current_streak: number } | null;
  },
  enabled: !!user?.id,
  ...cacheConfig.userControlled,
  });

  // Effective (display) streak via RPC
  const rpcQuery = useQuery({
  queryKey: queryKeys.prayerState(user?.id || ''),
  queryFn: async () => {
      const result = await rpcFunctions.getCurrentPrayerState(user!.id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
 
  return {
    streak: (rpcQuery.data?.effective_streak ?? rawQuery.data?.current_streak ?? 0),
    isLoading: rawQuery.isLoading || rpcQuery.isLoading,
    refreshStreak: async () => { await Promise.all([rawQuery.refetch(), rpcQuery.refetch()]); },
  };
} 