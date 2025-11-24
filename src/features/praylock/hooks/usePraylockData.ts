import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import { rpcFunctions } from '../../../lib/supabaseRpc';

/**
 * React Query hook for PRAYLOCK prayer state data
 */
export function usePraylockData(userId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.homeData(userId || ''), 'praylock'],
    queryFn: () => rpcFunctions.getCurrentPrayerState(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes - prayer state can change
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Helper to get prayer completion status from React Query cache or direct RPC
 */
export async function getPrayerCompletionStatus(userId: string): Promise<{
  currentPeriod: 'morning' | 'evening';
  morningCompleted: boolean;
  eveningCompleted: boolean;
} | null> {
  // Use React Query cache if available, otherwise fetch directly
  const queryKey = [...queryKeys.homeData(userId), 'praylock'];
  const { queryClient } = await import('../../../lib/queryClient');
  const cachedData = queryClient.getQueryData(queryKey);
  
  if (cachedData) {
    const currentState = cachedData as any;
    return {
      currentPeriod: currentState.current_period,
      morningCompleted: !!(currentState.prayers?.morning?.completed_at),
      eveningCompleted: !!(currentState.prayers?.evening?.completed_at),
    };
  }
  
  // No cached data, fetch directly
  try {
    const result = await rpcFunctions.getCurrentPrayerState(userId);
    if (result.error || !result.data) {
      console.error('[PRAYLOCK] Failed to fetch prayer state:', result.error);
      return null;
    }
    
    const currentState = result.data;
    return {
      currentPeriod: currentState.current_period,
      morningCompleted: !!(currentState.prayers?.morning?.completed_at),
      eveningCompleted: !!(currentState.prayers?.evening?.completed_at),
    };
  } catch (error) {
    console.error('[PRAYLOCK] Failed to fetch prayer state:', error);
    return null;
  }
}
