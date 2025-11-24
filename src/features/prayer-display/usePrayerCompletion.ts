import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { usePraylock } from '../praylock/hooks/usePraylockSimple';
import { prayerCompletionQueue } from '../../utils/prayerCompletionQueue';
import { queryKeys } from '../../lib/queryClient';
import { getPrayerDayStart } from '../../lib/time/Clock';

interface UsePrayerCompletionArgs {
  prayerId: string | null | undefined;
  userId: string | null | undefined;
}

/**
 * Shared completion flow used by slideshow and single-page views.
 * Performs EdgeFn call, PRAYLOCK unlock, event bus emit, and query invalidations.
 */
export function usePrayerCompletion({ prayerId, userId }: UsePrayerCompletionArgs) {
  const queryClient = useQueryClient();
  const { markPrayerCompleted } = usePraylock();

  const completePrayer = useCallback(async () => {
    if (!prayerId || !userId) return { ok: false as const };

    // Optimistically mark this specific prayer as completed in cache to avoid
    // flicker on subsequent mounts (e.g., Single view reopening immediately).
    const perPrayerKey = queryKeys.prayer(userId, prayerId);
    const prevPerPrayer = queryClient.getQueryData(perPrayerKey);
    const nowIso = new Date().toISOString();
    if (prevPerPrayer) {
      queryClient.setQueryData(perPrayerKey, (old: any) => {
        if (!old) return old;
        return { ...old, completed_at: old.completed_at ?? nowIso };
      });
    }

    // Also optimistically mark today cache if present (non-blocking best-effort)
    const dayKey = getPrayerDayStart().toISOString();
    const todaysKey = queryKeys.prayersToday(userId, dayKey);
    const prevToday = queryClient.getQueryData(todaysKey);
    if (prevToday) {
      queryClient.setQueryData(todaysKey, (old: any) => {
        if (!old) return old;
        const updatePrayer = (p: any) => (p && p.id === prayerId && !p.completed_at ? { ...p, completed_at: nowIso } : p);
        return { ...old, morning: updatePrayer(old.morning), evening: updatePrayer(old.evening) };
      });
    }

    try {
      const { data, error } = await supabase.functions.invoke('complete-prayer', {
        body: { prayerId, userId },
      });

      if (error) throw error;

      if (data?.prayerTimeOfDay) {
        try {
          await markPrayerCompleted(data.prayerTimeOfDay);
        } catch (praylockError) {
          // Non-fatal: UI will already reflect completion
          console.error('PRAYLOCK unlock failed but prayer completion succeeded:', praylockError);
        }
      }

      try {
        const { emitDataChange } = await import('../../lib/eventBus');
        emitDataChange('prayers', 'completed', { userId, id: prayerId });
      } catch (e) {
        console.warn('[usePrayerCompletion] eventBus emit failed', e);
      }

      if (userId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.prayersToday(userId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.prayerState(userId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.userStats(userId) }),
          // Make sure the exact per-prayer key refetches too
          queryClient.invalidateQueries({ queryKey: perPrayerKey }),
        ]);
      }

      await prayerCompletionQueue.removeCompletedPrayer(prayerId);
      return { ok: true as const, data };
    } catch (error) {
      // Roll back optimistic updates on hard failure
      if (prevPerPrayer !== undefined) {
        queryClient.setQueryData(perPrayerKey, prevPerPrayer);
      }
      if (prevToday !== undefined) {
        queryClient.setQueryData(todaysKey, prevToday);
      }
      try {
        await prayerCompletionQueue.addPendingCompletion(prayerId, userId);
      } catch {}
      throw error;
    }
  }, [markPrayerCompleted, prayerId, queryClient, userId]);

  return { completePrayer };
}
