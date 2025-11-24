import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { usePraylockStore } from './praylockStore';
import { rpcFunctions } from '../lib/supabaseRpc';
import { Prayer } from '../models/prayer';
import { prayerCompletionQueue } from '../utils/prayerCompletionQueue';
import { safeUniqueArray, safeFilterBoolean, safeAllSettled } from '../utils/safeArrayMethods';
import { getAuthSnapshot } from '../features/auth/services/auth/getAuthSnapshot';
import { queryClient, queryKeys } from '../lib/queryClient';
import type { Profile } from '../types/auth';
import { getCurrentPeriod, isInPrayerWindow, setCanonicalTimezone } from '../lib/time/Clock';

// Types for home screen data
interface HomeState {
  // Prayer data
  morningPrayer: Prayer | null;
  eveningPrayer: Prayer | null;
  currentPeriod: 'morning' | 'evening';
  
  // Availability states
  morningAvailable: boolean;
  eveningAvailable: boolean;
  currentWindowAvailable: boolean;
  
  // Completion states
  morningCompleted: boolean;
  eveningCompleted: boolean;
  
  // User streak and focus data
  currentStreak: number;
  streakGoalDays: number | null;
  prayerNeeds: string[] | null;
  customPrayerNeed: string | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  hasLoadedInitially: boolean;
  lastRefreshTime: number;
  
  // Active people IDs (for filtering prayer people)
  activePeopleIds: string[];
  
  // Prayer people data - REMOVED: Now using React Query
  
  // Popup states
  showStreakStartPopup: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  refreshData: () => Promise<void>;
  completePrayer: (prayerId: string, period: 'morning' | 'evening') => Promise<void>;
  dismissStreakPopup: () => void;
  
  // Internal actions
  _updatePrayerData: (data: Partial<HomeState>) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
  _checkStreakPopup: () => Promise<void>;
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      // Initial state
      morningPrayer: null,
      eveningPrayer: null,
      currentPeriod: 'morning',
      morningAvailable: false,
      eveningAvailable: false,
      currentWindowAvailable: false,
      morningCompleted: false,
      eveningCompleted: false,
      currentStreak: 0,
      streakGoalDays: null,
      prayerNeeds: null,
      customPrayerNeed: null,
      isLoading: false,
      error: null,
      hasLoadedInitially: false,
      lastRefreshTime: 0,
      activePeopleIds: [],
      showStreakStartPopup: false,

      // Initialize home data
      initialize: async () => {
        const { user } = getAuthSnapshot();
        if (!user?.id) {
          console.log('[HomeStore] No user found, skipping initialization');
          return;
        }

        // Always refresh if we don't have essential data
        const hasEssentialData = get().activePeopleIds.length > 0;
        
        // Check if data is stale (prayer period has changed)
        const { profile } = getAuthSnapshot();
        const timezone = profile?.timezone ?? undefined;
        if (timezone) {
          setCanonicalTimezone(timezone);
        }

        const currentPeriodNow = getCurrentPeriod(timezone);
        const storedPeriod = get().currentPeriod;
        const isDataStale = currentPeriodNow !== storedPeriod;

        if (get().hasLoadedInitially && !isDataStale && hasEssentialData) {
          console.log('[HomeStore] Already initialized with fresh data, skipping');
          return;
        }

        if (isDataStale) {
          console.log('[HomeStore] Data is stale, forcing refresh. Stored:', storedPeriod, 'Current:', currentPeriodNow);
        }
        
        if (!hasEssentialData) {
          console.log('[HomeStore] Missing essential data (prayer people), forcing refresh');
        }

        console.log('[HomeStore] Initializing home data for user:', user.id);
        set({ isLoading: true, error: null });

        try {
          await get().refreshData();
          set({ hasLoadedInitially: true });
        } catch (error) {
          console.error('[HomeStore] Error initializing:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to initialize',
            isLoading: false
          });
        }
      },

      // Refresh all home data
      refreshData: async () => {
        const { user } = getAuthSnapshot();
        if (!user?.id) {
          console.log('[HomeStore] No user found, skipping refresh');
          return;
        }

        console.log('[HomeStore] Refreshing home data for user:', user.id);
        set({ isLoading: true, error: null });

        try {
          // Process any pending prayer completions first
          await prayerCompletionQueue.processPendingCompletions();

          // Prayer loading is now handled by React Query at the app level

          // Fetch all data in parallel
          const settledResults = await safeAllSettled([
            // Fetch prayer state
            rpcFunctions.getCurrentPrayerState(user.id),
            
            // Fetch active people IDs
            supabase
              .from('prayer_intentions')
              .select('person_id')
              .eq('user_id', user.id)
              .eq('is_active', true),
            
            // Fetch user stats for streak
            supabase
              .from('user_stats')
              .select('current_streak')
              .eq('user_id', user.id)
              .single(),
            
            // Fetch profile for streak goals and prayer needs
            supabase
              .from('profiles')
              .select('streak_goal_days, prayer_needs, custom_prayer_need')
              .eq('id', user.id)
              .single()
          ]);

          const prayerStateResult = settledResults[0];
          const activePeopleResult = settledResults[1];
          const userStatsResult = settledResults[2];
          const profileResult = settledResults[3];

          // Process prayer state
          let prayerState = null;
          if (prayerStateResult.status === 'fulfilled') {
            prayerState = prayerStateResult.value.data;
          } else {
            console.error('[HomeStore] Error fetching prayer state:', prayerStateResult.reason);
          }

          // Process active people
          let activePeopleIds: string[] = [];
          if (activePeopleResult.status === 'fulfilled') {
            const { data: intentionsData } = activePeopleResult.value;
            const personIds = intentionsData?.map((i: any) => i.person_id) || [];
            const filteredIds = safeFilterBoolean(personIds) as string[];
            activePeopleIds = safeUniqueArray(filteredIds);
          }

          // Prayer people now loaded at app level via React Query
          console.log('[HomeStore] Prayer people data available via React Query');

          // Extract prayers from prayer state (from RPC call)
          let morningPrayer = null;
          let eveningPrayer = null;
          
          if (prayerState?.prayers) {
            morningPrayer = prayerState.prayers.morning;
            eveningPrayer = prayerState.prayers.evening;
          }



          // Process user stats
          let currentStreak = 0;
          if (userStatsResult.status === 'fulfilled') {
            currentStreak = userStatsResult.value.data?.current_streak || 0;
          } else {
            console.error('[HomeStore] Error fetching user stats:', userStatsResult.reason);
          }

          // Process profile data
          let streakGoalDays = null;
          let prayerNeeds = null;
          let customPrayerNeed = null;
          if (profileResult.status === 'fulfilled') {
            const profileData = profileResult.value.data;
            streakGoalDays = profileData?.streak_goal_days || null;
            prayerNeeds = profileData?.prayer_needs || null;
            customPrayerNeed = profileData?.custom_prayer_need || null;
          } else {
            console.error('[HomeStore] Error fetching profile:', profileResult.reason);
          }

          // Determine current period and availability
          let timezone: string | undefined;
          if (profileResult.status === 'fulfilled') {
            const profileData = profileResult.value.data;
            timezone = profileData?.timezone ?? undefined;
            if (timezone) {
              setCanonicalTimezone(timezone);
            }
          }

          const currentPeriod = getCurrentPeriod(timezone);
          const currentWindowAvailable = isInPrayerWindow(timezone);
          const morningAvailable = currentPeriod === 'morning' ? currentWindowAvailable : false;
          const eveningAvailable = currentPeriod === 'evening' ? currentWindowAvailable : false;

          // Update state
          set({
            morningPrayer,
            eveningPrayer,
            currentPeriod,
            morningAvailable,
            eveningAvailable,
            currentWindowAvailable,
            morningCompleted: !!morningPrayer?.completed_at,
            eveningCompleted: !!eveningPrayer?.completed_at,
            currentStreak,
            streakGoalDays,
            prayerNeeds,
            customPrayerNeed,
            activePeopleIds,
            isLoading: false,
            error: null,
            lastRefreshTime: Date.now(),
          });

          // Prayer people are now loaded directly above - no need for separate store call

          // Check for streak popup
          await get()._checkStreakPopup();

          console.log('[HomeStore] Successfully refreshed home data');

        } catch (error) {
          console.error('[HomeStore] Error refreshing data:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to refresh data',
            isLoading: false
          });
        }
      },

      // Complete a prayer
      completePrayer: async (prayerId: string, period: 'morning' | 'evening') => {
        const { user } = getAuthSnapshot();
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        console.log('[HomeStore] Completing prayer:', prayerId, period);

        try {
          // Optimistic update
          set(state => ({
            [`${period}Completed`]: true,
            [`${period}Available`]: false,
            currentWindowAvailable: state.currentPeriod === period ? false : state.currentWindowAvailable,
          }));

          // Mark prayer as completed in PRAYLOCK
          const { markPrayerCompleted } = usePraylockStore.getState();
          await markPrayerCompleted(period);

          // Queue the completion for network sync
          await prayerCompletionQueue.addPendingCompletion(prayerId, user.id);

          console.log('[HomeStore] Successfully completed prayer');

        } catch (error) {
          console.error('[HomeStore] Error completing prayer:', error);
          // Revert optimistic update
          set(state => ({
            [`${period}Completed`]: false,
            [`${period}Available`]: true,
            currentWindowAvailable: state.currentPeriod === period ? true : state.currentWindowAvailable,
          }));
          throw error;
        }
      },

      // Dismiss streak popup
      dismissStreakPopup: () => {
        set({ showStreakStartPopup: false });
        // Save to AsyncStorage (keeping existing functionality)
        AsyncStorage.setItem('has_shown_streak_start_popup', 'true').catch(console.error);
        // Also save to database (new functionality, won't break existing)
        const { user } = getAuthSnapshot();
        if (user?.id) {
          const profile = queryClient.getQueryData<Profile>(queryKeys.profile(user.id));
          if (profile) {
            queryClient.setQueryData(queryKeys.profile(user.id), { ...profile, has_seen_streak_start_popup: true });
          }
        }
      },

      // Helper to determine current period
      _getCurrentPeriod: (): 'morning' | 'evening' => {
        const { profile } = getAuthSnapshot();
        const userTimezone = profile?.timezone || 'UTC';
        
        try {
          const now = new Date();
          const timeInUserTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
          const currentHour = timeInUserTz.getHours();
          
          return currentHour >= 4 && currentHour < 16 ? 'morning' : 'evening';
        } catch (error) {
          console.error('[HomeStore] Error determining current period:', error);
          return 'morning';
        }
      },

      // Helper to calculate availability
      // Helper to check if streak popup should be shown
      _checkStreakPopup: async () => {
        try {
          // Check both AsyncStorage (existing) and database (new) - if either says shown, don't show
          const hasShownInStorage = await AsyncStorage.getItem('has_shown_streak_start_popup');
          const { profile } = getAuthSnapshot();
          const hasShownInDB = profile?.has_seen_streak_start_popup === true;
          
          if (hasShownInStorage !== 'true' && !hasShownInDB) {
            const { morningCompleted, eveningCompleted } = get();
            if (morningCompleted || eveningCompleted) {
              set({ showStreakStartPopup: true });
            }
          }
        } catch (error) {
          console.error('[HomeStore] Error checking streak popup:', error);
        }
      },

      // Internal actions
      _updatePrayerData: (data) => set(data),
      _setLoading: (loading) => set({ isLoading: loading }),
      _setError: (error) => set({ error }),
    }),
    {
      name: 'home-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasLoadedInitially: state.hasLoadedInitially,
        lastRefreshTime: state.lastRefreshTime,
        showStreakStartPopup: state.showStreakStartPopup,
      }),
    }
  )
);
