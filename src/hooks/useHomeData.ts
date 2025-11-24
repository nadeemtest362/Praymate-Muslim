import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { queryClient, queryKeys, cacheConfig } from '../lib/queryClient';
import { useTodaysPrayers } from '../features/prayer-display/hooks/usePrayers';
import { usePeople } from '../features/people/hooks/usePeople';
import { useIntentions } from '../features/prayer-display/hooks/useIntentions';
import { useAuth } from './useAuth';
import type { Prayer } from '../models/prayer';

// Feature flag imports removed - React Query is now the default
import { rpcFunctions } from '../lib/supabaseRpc';
import { supabase } from '../lib/supabaseClient';
import { getUserFriendlyMessage, isNetworkError } from '../utils/errorUtils';
import { initClock, resyncClock, setCanonicalTimezone, getCurrentPeriod, isInPrayerWindow, onMinuteTick, getPrayerDayStart } from '../lib/time/Clock';

const AUTO_REFRESH_MIN_INTERVAL_MS = 1000 * 60 * 10; // 10 minutes
const MINUTE_TICK_DEBOUNCE_MS = 15000; // 15 seconds to let radios settle
const DAY_BOUNDARY_DEBOUNCE_MS = 2000; // quick but not immediate handoff at 4am/4pm

type PrayerStateResult = Awaited<ReturnType<typeof rpcFunctions.getCurrentPrayerState>>['data'];
type TodaysPrayersData = { morning: Prayer | null; evening: Prayer | null } | null;

/**
 * Optimized home data hook that aggregates React Query data
 * This replaces the Zustand homeStore pattern with reactive React Query data
 */
export const useHomeData = (userId: string | null) => {
  // Get profile data for goals and prayer needs
  const { profile } = useAuth();
  const timezone = profile?.timezone ?? undefined;
  const [currentPeriodState, setCurrentPeriodState] = useState(() => getCurrentPeriod(timezone));
  const [currentWindowAvailableState, setCurrentWindowAvailableState] = useState(() => isInPrayerWindow(timezone));
  const [currentDayKey, setCurrentDayKey] = useState(() => getPrayerDayStart(timezone).toISOString());
  const cachedTodaysPrayers = userId
    ? (queryClient.getQueryData(queryKeys.prayersToday(userId, currentDayKey)) as TodaysPrayersData | undefined)
    : null;
  const cachedPrayerState = userId
    ? (queryClient.getQueryData<PrayerStateResult>(queryKeys.prayerState(userId || '')) ?? null)
    : null;
  const todaysPrayersFallbackRef = useRef<TodaysPrayersData>(cachedTodaysPrayers ?? null);
  const prayerStateFallbackRef = useRef<PrayerStateResult | null>(cachedPrayerState ?? null);

  const clockInitializedRef = useRef(false);

  const previousPeriodRef = useRef<string | null>(null);
  const previousDayKeyRef = useRef<string | null>(null);
  const lastAutoRefreshAtRef = useRef(0);
  const scheduledMinuteRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPrayerRefresh = useCallback(
    (
      newDayKey: string,
      previousDayKey?: string | null,
      options?: { force?: boolean; reason?: string }
    ) => {
      if (!userId) {
        return;
      }

      const { force = false, reason = 'auto' } = options || {};
      const resolvedPreviousDayKey =
        typeof previousDayKey === 'undefined' ? previousDayKeyRef.current : previousDayKey;

      const now = Date.now();
      if (!force) {
        const elapsed = now - lastAutoRefreshAtRef.current;
        if (elapsed < AUTO_REFRESH_MIN_INTERVAL_MS) {
          console.debug(
            `[HomeData] Skipping prayer refresh (${reason}) - throttled (${elapsed}ms elapsed)`
          );
          return;
        }
      }

      lastAutoRefreshAtRef.current = now;

      if (resolvedPreviousDayKey && resolvedPreviousDayKey !== newDayKey) {
        queryClient.removeQueries({
          queryKey: queryKeys.prayersToday(userId, resolvedPreviousDayKey),
        });
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.prayersToday(userId, newDayKey),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.prayerState(userId),
      });
    },
    [userId]
  );

  useEffect(() => {
    if (timezone) {
      setCanonicalTimezone(timezone);
    }

    const refreshedPeriod = getCurrentPeriod(timezone);
    const refreshedWindow = isInPrayerWindow(timezone);
    const refreshedDayKey = getPrayerDayStart(timezone).toISOString();
    const previousDayKey = previousDayKeyRef.current;
    const previousPeriod = previousPeriodRef.current;
    const dayKeyChanged = previousDayKey !== refreshedDayKey;
    const periodChanged = previousPeriod !== refreshedPeriod;

    previousPeriodRef.current = refreshedPeriod;
    previousDayKeyRef.current = refreshedDayKey;
    setCurrentPeriodState(refreshedPeriod);
    setCurrentWindowAvailableState(refreshedWindow);
    setCurrentDayKey((prev) => (prev === refreshedDayKey ? prev : refreshedDayKey));

    if (dayKeyChanged || periodChanged) {
      triggerPrayerRefresh(refreshedDayKey, previousDayKey, {
        force: true,
        reason: 'timezone-change',
      });
    }
  }, [timezone, triggerPrayerRefresh]);

  useEffect(() => {
    if (!userId) {
      todaysPrayersFallbackRef.current = null;
      prayerStateFallbackRef.current = null;
      return;
    }

    const cachedToday = queryClient.getQueryData<TodaysPrayersData>(
      queryKeys.prayersToday(userId, currentDayKey)
    );
    if (cachedToday) {
      todaysPrayersFallbackRef.current = cachedToday;
    }

    const cachedState = queryClient.getQueryData<PrayerStateResult>(
      queryKeys.prayerState(userId)
    );
    if (cachedState) {
      prayerStateFallbackRef.current = cachedState;
    }
  }, [userId, currentDayKey]);

  // Get individual data sources with React Query
  const todaysPrayersQuery = useTodaysPrayers(userId, currentDayKey);
  const activePeopleQuery = usePeople(userId, { activeOnly: true });
  const intentionsQuery = useIntentions(userId);
  
  // Get user stats for streak data
  const userStatsQuery = useQuery({
    queryKey: queryKeys.userStats(userId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('current_streak, longest_streak, total_prayers_completed, streak_start_date, last_prayer_date')
        .eq('user_id', userId!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    ...cacheConfig.userControlled, // Never expires or gets garbage collected
  });

  // Fetch onboarding-initial prayer for "today" (timezone-aware window)
  const onboardingTodayQuery = useQuery({
    queryKey: ['onboarding-today', userId || '', currentDayKey],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const dayStart = getPrayerDayStart(timezone);
        const dayEnd = new Date(dayStart.getTime());
        dayEnd.setDate(dayEnd.getDate() + 1);

        const { data, error } = await supabase
          .from('prayers')
          .select('id, slot, completed_at, generated_at, input_snapshot')
          .eq('user_id', userId)
          .eq('slot', 'onboarding-initial')
          .gte('generated_at', dayStart.toISOString())
          .lt('generated_at', dayEnd.toISOString())
          .order('generated_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
      } catch (err) {
        return null; // UI-only enhancement; fail-closed
      }
    },
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 5,
    meta: { silent: true },
  });
  
  const prayerStateQuery = useQuery({
    queryKey: queryKeys.prayerState(userId || ''),
    meta: { silent: true },
    queryFn: async ({ queryKey, meta }) => {
      try {
        const result = await rpcFunctions.getCurrentPrayerState(userId!);
        if (result.error) throw result.error;
        return result.data;
      } catch (error) {
        if (meta?.silent && isNetworkError(error)) {
          const cached = queryClient.getQueryData<PrayerStateResult>(queryKey);

          if (cached) {
            console.debug('[useHomeData] Silent network failure, serving cached prayer state');
            return cached;
          }
        }

        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (todaysPrayersQuery.data) {
      todaysPrayersFallbackRef.current = todaysPrayersQuery.data;
    }
  }, [todaysPrayersQuery.data]);

  useEffect(() => {
    if (prayerStateQuery.data) {
      prayerStateFallbackRef.current = prayerStateQuery.data;
    }
  }, [prayerStateQuery.data]);

  useEffect(() => {
    const serverEpoch = prayerStateQuery.data?.server_now_epoch_ms;
    const tz = prayerStateQuery.data?.user_timezone || timezone;

    if (typeof serverEpoch === 'number') {
      const anchor = {
        serverNowEpochMs: serverEpoch,
        timezone: tz,
      };

      if (!clockInitializedRef.current) {
        initClock(anchor);
        clockInitializedRef.current = true;
      } else {
        resyncClock(anchor);
      }

      const refreshedPeriod = getCurrentPeriod(timezone);
      const refreshedWindow = isInPrayerWindow(timezone);
      const refreshedDayKey = getPrayerDayStart(timezone).toISOString();
      const previousDayKey = previousDayKeyRef.current;
      const previousPeriod = previousPeriodRef.current;
      const dayKeyChanged = previousDayKey !== refreshedDayKey;
      const periodChanged = previousPeriod !== refreshedPeriod;

      previousPeriodRef.current = refreshedPeriod;
      previousDayKeyRef.current = refreshedDayKey;
      setCurrentPeriodState(refreshedPeriod);
      setCurrentWindowAvailableState(refreshedWindow);
      setCurrentDayKey((prev) => (prev === refreshedDayKey ? prev : refreshedDayKey));
      if (dayKeyChanged || periodChanged) {
        triggerPrayerRefresh(refreshedDayKey, previousDayKey, {
          force: dayKeyChanged,
          reason: dayKeyChanged
            ? 'clock-resync-day-boundary'
            : 'clock-resync-period-change',
        });
      }
    }
  }, [prayerStateQuery.data?.server_now_epoch_ms, prayerStateQuery.data?.user_timezone, timezone, triggerPrayerRefresh]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onMinuteTick(() => {
      const newPeriod = getCurrentPeriod(timezone);
      const newWindowAvailable = isInPrayerWindow(timezone);
      const newDayKey = getPrayerDayStart(timezone).toISOString();
      const previousDayKey = previousDayKeyRef.current;
      const previousPeriod = previousPeriodRef.current;

      if (previousPeriodRef.current === null) {
        previousPeriodRef.current = newPeriod;
        previousDayKeyRef.current = newDayKey;
        setCurrentPeriodState(newPeriod);
        setCurrentWindowAvailableState(newWindowAvailable);
        setCurrentDayKey((prev) => (prev === newDayKey ? prev : newDayKey));
        triggerPrayerRefresh(newDayKey, previousDayKey, {
          force: true,
          reason: 'minute-tick-initial',
        });
        return;
      }

      let shouldRefresh = false;
      const boundaryChanged = newDayKey !== previousDayKey;

      if (boundaryChanged) {
        previousDayKeyRef.current = newDayKey;
        setCurrentDayKey((prev) => (prev === newDayKey ? prev : newDayKey));
        setCurrentWindowAvailableState(newWindowAvailable);
        shouldRefresh = true;
      }

      if (newPeriod !== previousPeriod) {
        previousPeriodRef.current = newPeriod;
        setCurrentPeriodState(newPeriod);
        setCurrentWindowAvailableState(newWindowAvailable);
        shouldRefresh = true;
      } else {
        setCurrentPeriodState((prev) => (prev !== newPeriod ? newPeriod : prev));
        setCurrentWindowAvailableState((prev) => (prev !== newWindowAvailable ? newWindowAvailable : prev));
      }

      if (shouldRefresh) {
        if (scheduledMinuteRefreshRef.current) {
          clearTimeout(scheduledMinuteRefreshRef.current);
        }

        const delay = boundaryChanged ? DAY_BOUNDARY_DEBOUNCE_MS : MINUTE_TICK_DEBOUNCE_MS;
        const previousKeyForRemoval = previousDayKey;

        scheduledMinuteRefreshRef.current = setTimeout(() => {
          triggerPrayerRefresh(newDayKey, previousKeyForRemoval, {
            force: boundaryChanged,
            reason: boundaryChanged
              ? 'minute-tick-day-boundary'
              : 'minute-tick-period-change',
          });
          scheduledMinuteRefreshRef.current = null;
        }, delay);
      }
    });

    return () => {
      if (scheduledMinuteRefreshRef.current) {
        clearTimeout(scheduledMinuteRefreshRef.current);
        scheduledMinuteRefreshRef.current = null;
      }
      unsubscribe();
    };
  }, [userId, timezone, triggerPrayerRefresh]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state !== 'active') {
        return;
      }

      const refreshedPeriod = getCurrentPeriod(timezone);
      const refreshedWindow = isInPrayerWindow(timezone);
      const refreshedDayKey = getPrayerDayStart(timezone).toISOString();
      const previousDayKey = previousDayKeyRef.current;
      const previousPeriod = previousPeriodRef.current;
      const dayKeyChanged = previousDayKey !== refreshedDayKey;
      const periodChanged = previousPeriod !== refreshedPeriod;

      previousPeriodRef.current = refreshedPeriod;
      previousDayKeyRef.current = refreshedDayKey;
      setCurrentPeriodState(refreshedPeriod);
      setCurrentWindowAvailableState(refreshedWindow);
      setCurrentDayKey((prev) => (prev === refreshedDayKey ? prev : refreshedDayKey));

      triggerPrayerRefresh(refreshedDayKey, previousDayKey, {
        force: dayKeyChanged,
        reason: periodChanged || dayKeyChanged ? 'app-foreground-boundary' : 'app-foreground-stale',
      });
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [userId, timezone, triggerPrayerRefresh]);

  const isLoading = 
    todaysPrayersQuery.isLoading ||
    activePeopleQuery.isLoading ||
    intentionsQuery.isLoading ||
    prayerStateQuery.isLoading ||
    userStatsQuery.isLoading;

  const error = 
    todaysPrayersQuery.error ||
    activePeopleQuery.error ||
    intentionsQuery.error ||
    prayerStateQuery.error ||
    userStatsQuery.error;

  const todaysPrayersData = todaysPrayersQuery.data ?? todaysPrayersFallbackRef.current;
  const prayerStateData = prayerStateQuery.data ?? prayerStateFallbackRef.current;

  // Memoize derived data to prevent unnecessary recalculations
  const derivedData = useMemo(() => {
    const morningPrayer = todaysPrayersData?.morning || null;
    const eveningPrayer = todaysPrayersData?.evening || null;
    const activePeople = activePeopleQuery.data || [];
    const activeIntentions = intentionsQuery.data?.filter(i => i.is_active) || [];
    const prayerState = prayerStateData;
    const userStats = userStatsQuery.data;

    if (prayerState?.user_timezone) {
      setCanonicalTimezone(prayerState.user_timezone);
    } else if (timezone) {
      setCanonicalTimezone(timezone);
    }

    const currentPeriodDerived = prayerState?.current_period ?? currentPeriodState;
    const morningAvailable =
      typeof prayerState?.morning_available === 'boolean'
        ? prayerState.morning_available
        : currentPeriodDerived === 'morning';
    const eveningAvailable =
      typeof prayerState?.evening_available === 'boolean'
        ? prayerState.evening_available
        : currentPeriodDerived === 'evening';
    const currentWindowAvailable =
      typeof prayerState?.current_window_available === 'boolean'
        ? prayerState.current_window_available
        : currentWindowAvailableState;
    
    // Compute heavy array derivations once
    const activePeopleIds = activePeople.map(p => p.id);
    
    return {
      morningPrayer,
      eveningPrayer,
      activePeople,
      activeIntentions,
      prayerState,
      userStats,
      currentPeriod: currentPeriodDerived,
      morningAvailable,
      eveningAvailable,
      currentWindowAvailable,
      activePeopleIds,
      morningCompleted: Boolean(
        morningPrayer?.completed_at ||
          prayerState?.prayers?.morning?.completed_at
      ),
      eveningCompleted: Boolean(
        eveningPrayer?.completed_at ||
          prayerState?.prayers?.evening?.completed_at
      ),
    };
  }, [
    todaysPrayersData,
    activePeopleQuery.data,
    intentionsQuery.data,
    prayerStateData,
    userStatsQuery.data,
    timezone,
    currentPeriodState,
    currentWindowAvailableState,
  ]);

    // UI enhancement: treat a completed onboarding-initial (today) as completing one slot for chips only
    const onboardingToday: any | null = onboardingTodayQuery.data || null;
    let onboardingSlot: 'morning' | 'evening' | null = null;
    if (onboardingToday) {
      try {
        const raw = (onboardingToday.slot || '').toLowerCase();
        const snapSlot = (onboardingToday.input_snapshot?.slot ||
          onboardingToday.input_snapshot?.inputSnapshotForDB?.slot ||
          onboardingToday.input_snapshot?.clientSnapshot?.slot || '')
          .toLowerCase?.() || '';
        if (snapSlot === 'morning' || raw.indexOf('am') !== -1 || raw === 'morning') {
          onboardingSlot = 'morning';
        } else if (snapSlot === 'evening' || raw.indexOf('pm') !== -1 || raw === 'evening') {
          onboardingSlot = 'evening';
        } else {
          const ts = new Date(onboardingToday.generated_at || onboardingToday.completed_at || Date.now());
          const hour = ts.getHours();
          onboardingSlot = hour < 16 ? 'morning' : 'evening';
        }
      } catch {}
    }

    const uiMorningCompleted = Boolean(
      derivedData.morningCompleted ||
      (onboardingToday && onboardingToday.completed_at && onboardingSlot === 'morning')
    );
    const uiEveningCompleted = Boolean(
      derivedData.eveningCompleted ||
      (onboardingToday && onboardingToday.completed_at && onboardingSlot === 'evening')
    );

    // NEW: Compute todayHasPrayer (any prayer completed today)
    const todayHasPrayer = Boolean(
      derivedData.morningCompleted || 
      derivedData.eveningCompleted || 
      (onboardingToday && onboardingToday.completed_at)
    );

    // NEW: Compute isPerfectDayToday (both morning and evening completed today)
    const isPerfectDayToday = Boolean(
      derivedData.morningCompleted && derivedData.eveningCompleted
    );

    return {
    // Prayer data
    morningPrayer: derivedData.morningPrayer,
    eveningPrayer: derivedData.eveningPrayer,
    currentPeriod: derivedData.currentPeriod,
    
    // Availability
    morningAvailable: derivedData.morningAvailable,
    eveningAvailable: derivedData.eveningAvailable, 
    currentWindowAvailable: derivedData.currentWindowAvailable,
    
    // Completion states
    morningCompleted: uiMorningCompleted,
    eveningCompleted: uiEveningCompleted,
    
    // People and intentions
    activePeople: derivedData.activePeople,
    activeIntentions: derivedData.activeIntentions,
    activePeopleIds: derivedData.activePeopleIds,
    
    // Streak: prefer effective_streak from RPC, fall back to raw user_stats
    currentStreak: (derivedData.prayerState?.effective_streak ?? derivedData.userStats?.current_streak ?? 0),
    streakGoalDays: profile?.streak_goal_days || null,
    prayerNeeds: profile?.prayer_needs || null,
    customPrayerNeed: profile?.custom_prayer_need || null,
    
    // NEW: Perfect day and today status
    todayHasPrayer,
    isPerfectDayToday,
    
    // States
    isLoading,
    error: error ? getUserFriendlyMessage(error) : null,
    
    // Refetch function for pull-to-refresh
    refetch: async () => {
      await Promise.all([
        todaysPrayersQuery.refetch(),
        activePeopleQuery.refetch(),
        intentionsQuery.refetch(),
        prayerStateQuery.refetch(),
        userStatsQuery.refetch(),
      ]);
    },
    
    // Individual query states for granular loading
    queries: {
      prayers: todaysPrayersQuery,
      people: activePeopleQuery,
      intentions: intentionsQuery,
      prayerState: prayerStateQuery,
      userStats: userStatsQuery,
      onboardingToday: onboardingTodayQuery,
    },
  };
};
