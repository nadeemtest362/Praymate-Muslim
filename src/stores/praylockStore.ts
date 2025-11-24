import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabaseClient';
import { getDeviceActivityModule } from '../lib/deviceActivity';
import { useSessionStore } from './authSlices/sessionSlice';
import { getAuthSnapshot } from '../features/auth/services/auth/getAuthSnapshot';
import { getPrayerCompletionStatus } from '../features/praylock/hooks/usePraylockData';
import { isInPrayerWindow } from '../lib/time/Clock';
import { trackEvent } from '../lib/analytics';

const obtainDeviceActivity = () => {
  const module = getDeviceActivityModule();
  // No console output; callers handle absence gracefully
  return module;
};

// Types for PRAYLOCK settings
export interface PraylockSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  schedule: 'morning' | 'evening' | 'both';
  morning_completed: boolean;
  evening_completed: boolean;
  family_activity_selection: string;
  blocked_apps: string[];
  created_at: string;
  updated_at: string;
}

interface PraylockState {
  // State
  settings: PraylockSettings | null;
  isLoading: boolean;
  error: string | null;
  isNativeMonitoringActive: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  enable: (schedule: 'morning' | 'evening' | 'both', familyActivitySelection: string) => Promise<void>;
  disable: () => Promise<void>;
  markPrayerCompleted: (period: 'morning' | 'evening') => Promise<void>;
  refetch: () => Promise<void>;
  
  // Internal actions
  _updateSettings: (settings: PraylockSettings | null) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
  _setNativeMonitoringActive: (active: boolean) => void;
  _startNativeMonitoring: (settings: PraylockSettings, shouldStartMonitoring?: boolean, force?: boolean) => Promise<void>;
  _stopNativeMonitoring: () => Promise<void>;
  _shouldStartMonitoring: () => Promise<boolean>;
  _isCurrentlyInPrayerWindow: () => boolean;
  _scheduleBackupNotifications: (schedule: 'morning' | 'evening' | 'both') => Promise<void>;
  _cancelBackupNotifications: () => Promise<void>;
  
  // Test functions
  testBackgroundTask: () => Promise<void>;
  testPrayerWindowStatus: () => Promise<{ isInWindow: boolean; currentPeriod: string }>;
  emergencyUnblock: () => Promise<void>;
}

export const usePraylockStore = create<PraylockState>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: null,
      isLoading: false,
      error: null,
      isNativeMonitoringActive: false,

      // Initialize PRAYLOCK - fetch settings and start monitoring if enabled
      initialize: async () => {
        const { user } = useSessionStore.getState();
        if (!user?.id) {
          // No user; nothing to initialize
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const previousSettings = get().settings;

          // Fetch settings from database
          const { data, error } = await supabase
            .from('praylock_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          const settings = data as PraylockSettings | null;
          set({ settings, isLoading: false });

          // Start monitoring if enabled and prayer not completed
          if (settings?.enabled) {
            const shouldStart = await get()._shouldStartMonitoring();
            const restartNeeded =
              !get().isNativeMonitoringActive ||
              !previousSettings ||
              previousSettings.schedule !== settings.schedule ||
              previousSettings.family_activity_selection !== settings.family_activity_selection;
            await get()._startNativeMonitoring(settings, shouldStart, restartNeeded);
          }
        } catch (error) {
          console.error('[PRAYLOCK] Error initializing:', error instanceof Error ? error.message : String(error));
          set({ 
            error: error instanceof Error ? error.message : 'Failed to initialize',
            isLoading: false
          });
        }
      },

      // Enable PRAYLOCK
      enable: async (schedule, familyActivitySelection) => {
        const { user } = useSessionStore.getState();
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        set({ isLoading: true, error: null });

        try {
          // Check current prayer completion status from user's daily state
          let morningCompleted = false;
          let eveningCompleted = false;
          let shouldStartMonitoring = true;
          
          try {
            // Use React Query compatible helper
            const prayerState = await getPrayerCompletionStatus(user.id);
            
            if (prayerState) {
              morningCompleted = prayerState.morningCompleted;
              eveningCompleted = prayerState.eveningCompleted;
              
              
              
              // Don't start monitoring if the current period's prayer is already completed
              if ((prayerState.currentPeriod === 'morning' && morningCompleted) || 
                  (prayerState.currentPeriod === 'evening' && eveningCompleted)) {
                shouldStartMonitoring = false;
                
              } else {
                
              }
            } else {
              // use defaults
            }
          } catch {
            // non-fatal; use defaults
          }

          // Optimistic update
          const optimisticSettings: PraylockSettings = {
            id: get().settings?.id || 'temp-id',
            user_id: user.id,
            enabled: true,
            schedule,
            morning_completed: morningCompleted,
            evening_completed: eveningCompleted,
            family_activity_selection: familyActivitySelection,
            blocked_apps: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          set({ settings: optimisticSettings });

          // Start native monitoring only if the current prayer window hasn't been completed
          
          

          
          
          await get()._startNativeMonitoring(optimisticSettings, shouldStartMonitoring);

          // Update database - try UPDATE first, then INSERT if no record exists
          let data, error;

          // Persist enablement to Supabase
          
          // First try UPDATE
          const { data: updateData, error: updateError } = await supabase
            .from('praylock_settings')
            .update({
              enabled: true,
              schedule,
              family_activity_selection: familyActivitySelection,
              morning_completed: morningCompleted,
              evening_completed: eveningCompleted,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .select('*')
            .single();

          if (updateError && updateError.code === 'PGRST116') {
            // No rows updated, record doesn't exist, so INSERT
            const { data: insertData, error: insertError } = await supabase
              .from('praylock_settings')
              .insert({
                user_id: user.id,
                enabled: true,
                schedule,
                family_activity_selection: familyActivitySelection,
                morning_completed: morningCompleted,
                evening_completed: eveningCompleted,
                updated_at: new Date().toISOString(),
              })
              .select('*')
              .single();
            
            data = insertData;
            error = insertError;
          } else {
            // UPDATE worked or failed for other reason
            data = updateData;
            error = updateError;
          }

          if (error) {
            console.error('[PRAYLOCK] Supabase enable write error:', (error as any)?.message || String(error));
            throw error;
          }

          // Schedule backup notifications as fallback for DeviceActivity
          await get()._scheduleBackupNotifications(schedule);

          set({ settings: data, isLoading: false });

        } catch (error) {
          console.error('[PRAYLOCK] Error enabling:', error instanceof Error ? error.message : String(error));
          // Revert optimistic update
          set({ 
            settings: null,
            isNativeMonitoringActive: false,
            error: error instanceof Error ? error.message : 'Failed to enable',
            isLoading: false
          });
          throw error;
        }
      },

      // Disable PRAYLOCK
      disable: async () => {
        const { user } = useSessionStore.getState();
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        set({ isLoading: true, error: null });

        try {
          // Optimistic update
          const currentSettings = get().settings;
          if (currentSettings) {
            set({ 
              settings: { ...currentSettings, enabled: false },
              isNativeMonitoringActive: false
            });
          }

          // First unblock apps before stopping monitoring to avoid race conditions
          if (currentSettings?.family_activity_selection) {
            const deviceActivity = obtainDeviceActivity();
            if (!deviceActivity) {
              // DeviceActivity unavailable; skip unblock
            } else {
              try {
                await deviceActivity.unblockSelection({
                  activitySelectionId: 'praylock_selection'
                });
              } catch (unblockError) {
                console.error('[PRAYLOCK] Failed to unblock apps:', unblockError instanceof Error ? unblockError.message : String(unblockError));
                try {
                  await deviceActivity.unblockSelection({
                    activitySelectionId: 'praylock_selection'
                  });
                } catch (idError) {
                  console.error('[PRAYLOCK] Failed all unblock attempts:', idError instanceof Error ? idError.message : String(idError));
                  // Continue with disable even if unblock fails
                }
              }
            }
          }

          // Stop native monitoring after unblocking
          await get()._stopNativeMonitoring();
          
          // Cancel backup notifications
          await get()._cancelBackupNotifications();

          // Update database
          const { data, error } = await supabase
            .from('praylock_settings')
            .update({
              enabled: false,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .select('*')
            .single();

          if (error) {
            console.error('[PRAYLOCK] Database update error:', error instanceof Error ? error.message : String(error));
            throw error;
          }
          set({ settings: data, isLoading: false });

        } catch (error) {
          console.error('[PRAYLOCK] Error disabling:', error instanceof Error ? error.message : String(error));
          // Revert optimistic update
          const currentSettings = get().settings;
          if (currentSettings) {
            set({ 
              settings: { ...currentSettings, enabled: true },
              isNativeMonitoringActive: true
            });
          }
          set({ 
            error: error instanceof Error ? error.message : 'Failed to disable',
            isLoading: false
          });
          throw error;
        }
      },

      // Mark prayer as completed
      markPrayerCompleted: async (period) => {
        const { user } = useSessionStore.getState();
        const currentSettings = get().settings;
        
        if (!user?.id || !currentSettings?.enabled) {
          return;
        }

        

        try {
          // Update database first to mark completion
          const updateData = period === 'morning' 
            ? { morning_completed: true } 
            : { evening_completed: true };

          const { data, error } = await supabase
            .from('praylock_settings')
            .update({
              ...updateData,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .select('*')
            .single();

          if (error) throw error;

          // Update state with database response
          set({ settings: data });
          try { trackEvent('praylock_session_completed', { period }); } catch {}

          // Unblock apps when prayer is completed
          if (data && data.family_activity_selection) {
            const deviceActivity = obtainDeviceActivity();
            if (!deviceActivity) {
              // DeviceActivity unavailable; skip unblock
            } else {
              try {
                await deviceActivity.unblockSelection({
                  activitySelectionId: 'praylock_selection'
                });
              } catch (unblockError) {
                console.error('[PRAYLOCK] Failed to unblock apps:', unblockError instanceof Error ? unblockError.message : String(unblockError));
                try {
                  await deviceActivity.unblockSelection({
                    activitySelectionId: 'praylock_selection'
                  });
                } catch (idError) {
                  console.error('[PRAYLOCK] Failed all unblock attempts:', idError instanceof Error ? idError.message : String(idError));
                }
              }
            }
          }
          return data;

        } catch (error) {
          console.error('[PRAYLOCK] Error marking prayer completed:', error instanceof Error ? error.message : String(error));
          // Revert optimistic update
          set({ settings: currentSettings });
          throw error;
        }
      },

      // Refetch settings from database
      refetch: async () => {
        const { user } = useSessionStore.getState();
        if (!user?.id) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const previousSettings = get().settings;
          const { data, error } = await supabase
            .from('praylock_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          const settings = data as PraylockSettings | null;
          set({ settings, isLoading: false });

          // Ensure native monitoring matches database state
          if (settings?.enabled) {
            const shouldStart = await get()._shouldStartMonitoring();
            const restartNeeded =
              !get().isNativeMonitoringActive ||
              !previousSettings ||
              previousSettings.schedule !== settings.schedule ||
              previousSettings.family_activity_selection !== settings.family_activity_selection;
            await get()._startNativeMonitoring(settings, shouldStart, restartNeeded);
          } else if (!settings?.enabled && get().isNativeMonitoringActive) {
            await get()._stopNativeMonitoring();
          }

        } catch (error) {
          console.error('[PRAYLOCK] Error refetching:', error instanceof Error ? error.message : String(error));
          set({ 
            error: error instanceof Error ? error.message : 'Failed to refetch',
            isLoading: false
          });
        }
      },

      // Internal action to start native monitoring
      _startNativeMonitoring: async (
        settings: PraylockSettings,
        shouldStartMonitoring = true,
        force = false
      ) => {
        const state = get();
        
        // Concurrency guard - prevent multiple calls
        if (state.isNativeMonitoringActive && !force) {
          return;
        }
        
        // Platform guard - Android not supported
        if (Platform.OS !== 'ios') {
          return;
        }
        
        try {
          // Begin native monitoring setup

          const deviceActivity = obtainDeviceActivity();
          if (!deviceActivity) {
            set({ isNativeMonitoringActive: false });
            return;
          }
          
          // Activity names for different prayer windows
          const ACTIVITIES = {
            morning: 'PraylockMorningActivity',
            evening: 'PraylockEveningActivity',
          } as const;
          
          const selectionToken = settings.family_activity_selection;
          const selectionId = 'praylock_selection';
          const { schedule } = settings;
          
          // Device-local schedule with explicit timezone
          // DeviceActivity treats DateComponents with no timezone as UTC, so we must specify device timezone
          const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const MORNING_START = 4;           // 4:00 AM 
          const MORNING_START_MINUTE = 0;
          const MORNING_END = 15;            // 3:59 PM
          const EVENING_START = 16;          // 4:00 PM
          const EVENING_START_MINUTE = 0;
          const EVENING_END = 23;            // 11:59 PM
          
          // Configure intervals using device timezone
          
          // Configure family activity selection with error handling
          try {
            deviceActivity.setFamilyActivitySelectionId({
              id: selectionId,
              familyActivitySelection: selectionToken,
            });
          } catch (nativeError) {
            console.error('[PRAYLOCK] Error setting family activity selection:', nativeError instanceof Error ? nativeError.message : String(nativeError));
            throw new Error(`PRAYLOCK Native Configuration Failed: ${nativeError}`);
          }

          // Configure shield UI with personalized greeting
          const getGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) return 'Good morning';
            if (hour < 18) return 'Good afternoon';
            return 'Good evening';
          };

          const getUserDisplayName = () => {
            const { user, profile } = getAuthSnapshot();
            return profile?.display_name || user?.email?.split('@')[0] || 'Friend';
          };

          const greeting = getGreeting();
          const displayName = getUserDisplayName();
          
          deviceActivity.updateShield(
            {
              title: `PRAYBLOCK IS ON 🙏`,
              subtitle: `${greeting}, ${displayName}\n\Complete your current prayer first to unlock {applicationOrDomainDisplayName}`,
              primaryButtonLabel: "Go to Prayer",
              backgroundBlurStyle: 2, // UIBlurEffect.Style.systemMaterial  
              backgroundColor: { red: 20, green: 25, blue: 65, alpha: 0.15 }, // #141941 - welcome screen base
              titleColor: { red: 125, green: 211, blue: 252 }, 
              subtitleColor: { red: 255, green: 255, blue: 255, alpha: 0.9 }, // White for greeting/message
              primaryButtonBackgroundColor: { red: 180, green: 68, blue: 166 }, // #b44da6 - pink from gradient
              primaryButtonLabelColor: { red: 255, green: 255, blue: 255 },
              iconSystemName: 'lock.fill',
              iconTint: { red: 255, green: 215, blue: 0, alpha: 1.0 } // Gold color
            },
            {
              primary: {
                behavior: 'close',
                actions: [{
                  type: 'sendNotification',
                  payload: {
                    title: 'Time to Pray',
                    body: 'Tap to pray and unblock your apps!',
                    userInfo: { deepLink: 'justpray://prayer' }
                  }
                }]
              }
            }
          );

          // Helper function to start individual activity
          const startActivity = async (
            activityName: string,
            start: { hour: number; minute: number },
            end: { hour: number; minute: number }
          ) => {
            // Start activity interval
            
            // Stop existing activity first (native module expects array)
            await deviceActivity.stopMonitoring([activityName]);
            
            // Configure action to block selection when interval starts
            deviceActivity.configureActions({
              activityName,
              callbackName: 'intervalDidStart',
              actions: [
                {
                  type: 'blockSelection',
                  familyActivitySelectionId: selectionId,
                }
              ]
            });
            
            // Start monitoring the specific window with proper configuration
            await deviceActivity.startMonitoring(
              activityName,
              {
                intervalStart: {
                  ...start,
                  timeZoneIdentifier: deviceTimezone,
                },
                intervalEnd: {
                  ...end,
                  timeZoneIdentifier: deviceTimezone,
                },
                repeats: true
              },
              [] // No events needed - blocking is triggered by intervalDidStart
            );
          };

          // Start activities based on schedule with explicit device timezone
          try {
            if (schedule === 'morning' || schedule === 'both') {
              await startActivity(
              ACTIVITIES.morning,
              { hour: MORNING_START, minute: MORNING_START_MINUTE },   // 01:00 AM local
              { hour: MORNING_END, minute: 59 }     // 11:59 PM local
              );
            

            }

            if (schedule === 'evening' || schedule === 'both') {
              // Evening window: 01:00 AM to 11:59 PM (full day for testing)
              await startActivity(
                ACTIVITIES.evening,
                { hour: EVENING_START, minute: EVENING_START_MINUTE },  // 01:00 AM local
                { hour: EVENING_END, minute: 59 }    // 11:59 PM local
              );
            }

          // Check if we're currently in an active prayer window and block immediately if so
          const isCurrentlyInPrayerWindow = get()._isCurrentlyInPrayerWindow();
          if (isCurrentlyInPrayerWindow && shouldStartMonitoring) {
            try {
              // Analytics: attempt immediate schedule-based blocking
              try { trackEvent('praylock_schedule_attempt', { schedule, selection_id: selectionId }); } catch {}
              // Add timeout to prevent hanging - track timeout to allow cleanup
              let timeoutId: ReturnType<typeof setTimeout> | null = null;
              
              const blockingPromise = deviceActivity.blockSelection({
                activitySelectionId: selectionId,
              });
              
              const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                  timeoutId = null;
                  reject(new Error('Blocking timeout'));
                }, 5000);
              });
              
              try {
                await Promise.race([blockingPromise, timeoutPromise]);
                try { trackEvent('praylock_schedule_success', { schedule }); } catch {}
              } finally {
                // Clean up timeout if it's still pending
                if (timeoutId) {
                  clearTimeout(timeoutId);
                  timeoutId = null;
                }
              }
            } catch (blockingError) {
              console.error('[PRAYLOCK] Failed to block apps immediately:', (blockingError as any)?.message || String(blockingError));
              try { trackEvent('praylock_schedule_failure', { schedule, error_message: (blockingError as any)?.message || String(blockingError) }); } catch {}
              // Don't throw - scheduled blocking will still work
            }
          } else if (isCurrentlyInPrayerWindow && !shouldStartMonitoring) {
            // We restarted monitoring during an active window but the current period is already completed.
            // The extension's intervalDidStart may have triggered a block; proactively unblock to honor completion.
            try {
              await deviceActivity.unblockSelection({
                activitySelectionId: selectionId,
              });
              try { trackEvent('praylock_schedule_skip_unblocked', { schedule }); } catch {}
            } catch (unblockErr) {
              console.error('[PRAYLOCK] Failed to unblock after restart in completed window:', (unblockErr as any)?.message || String(unblockErr));
            }
          }
          } catch (monitoringError) {
            console.error('[PRAYLOCK] Error starting monitoring activities:', (monitoringError as any)?.message || String(monitoringError));
            throw new Error('Failed to start monitoring activities. Please try again.');
          }

          // Don't block immediately - let the schedule-based monitoring handle it
          // The ActivityMonitorExtension will trigger blocking at the start of each window
          set({ isNativeMonitoringActive: true });
          
        } catch (error) {
          console.error('[PRAYLOCK] Error starting native monitoring:', (error as any)?.message || String(error));
          throw error;
        }
      },

      // Internal action to stop native monitoring
      _stopNativeMonitoring: async () => {
        try {
          
          // Activity names for different prayer windows
          const ACTIVITIES = {
            morning: 'PraylockMorningActivity',
            evening: 'PraylockEveningActivity',
          } as const;
          
          const deviceActivity = obtainDeviceActivity();
          if (!deviceActivity) {
            set({ isNativeMonitoringActive: false });
            return;
          }
          
          // Stop all activities at once (native module expects string array)
          const activitiesToStop = [ACTIVITIES.morning, ACTIVITIES.evening, 'PraylockNightActivity'];
          
          try {
            await deviceActivity.stopMonitoring(activitiesToStop);
          } catch {
            // Try individual stops as fallback
            for (const activity of activitiesToStop) {
              try {
                await deviceActivity.stopMonitoring([activity]);
              } catch {
                // Ignore individual stop errors
              }
            }
          }
          
          set({ isNativeMonitoringActive: false });
          
        } catch (error) {
          console.error('[PRAYLOCK] Error stopping native monitoring:', (error as any)?.message || String(error));
          throw error;
        }
      },

      // Internal action to check if monitoring should start based on prayer completion
      _shouldStartMonitoring: async () => {
        const { user } = useSessionStore.getState();
        if (!user?.id) {
          return true;
        }

        try {
          // Use React Query compatible helper
          const prayerState = await getPrayerCompletionStatus(user.id);
          
          if (!prayerState) {
            return true;
          }

          const { currentPeriod, morningCompleted, eveningCompleted } = prayerState;
          
          // Don't start monitoring if the current period's prayer is already completed
          if ((currentPeriod === 'morning' && morningCompleted) || 
              (currentPeriod === 'evening' && eveningCompleted)) {
            return false;
          } else {
            return true;
          }
        } catch (error) {
          console.error('[PRAYLOCK] Error in prayer completion check:', error instanceof Error ? error.message : String(error));
          return true; // Default to starting if error
        }
      },

      // Check if we're currently in an active prayer window
      _isCurrentlyInPrayerWindow: () => {
        try {
          const { profile } = getAuthSnapshot();
          const tz = profile?.timezone ?? undefined;
          const inWindow = isInPrayerWindow(tz);
          return inWindow;
        } catch (error) {
          console.error('[PRAYLOCK] Error checking prayer window:', error instanceof Error ? error.message : String(error));
          return false;
        }
      },

      // Schedule backup notifications (local scheduled notifications)
      _scheduleBackupNotifications: async (schedule) => {
        try {
          
          // Cancel any existing notifications first
          await get()._cancelBackupNotifications();
          
          const identifier = `praylock-backup-${schedule}`;
          
          await Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: schedule === 'morning' ? '🙏 Prayer Time - 4:00 AM' : '🙏 Prayer Time - 4:00 PM',
              body: 'Apps are now locked. Complete your prayer to unlock them.',
              data: { deepLink: 'justpray://prayer', source: 'praylock_backup' },
            },
            trigger: {
              type: 'calendar',
              hour: 16,
              minute: 6,
              repeats: true,
            } as any,
          });
          
        } catch (error) {
          console.error('[PRAYLOCK] Error scheduling backup notifications:', error instanceof Error ? error.message : String(error));
        }
      },
      
      // Cancel backup notifications
      _cancelBackupNotifications: async () => {
        try {
          
          // Cancel all praylock backup notifications
          const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
          
          for (const notification of scheduledNotifications) {
            if (notification.identifier.startsWith('praylock-backup-')) {
              await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            }
          }
        } catch (error) {
          console.error('[PRAYLOCK] Error canceling backup notifications:', error instanceof Error ? error.message : String(error));
        }
      },

      // Test functions
      testBackgroundTask: async () => {
        try {
          const { praylockBackgroundManager } = await import("../lib/praylockBackgroundManager");
          await praylockBackgroundManager.triggerBackgroundCheck();
        } catch (error) {
          console.error("[PRAYLOCK] Error testing background task:", error instanceof Error ? error.message : String(error));
        }
      },

      // Emergency unblock function
      emergencyUnblock: async () => {
        try {
          const deviceActivity = obtainDeviceActivity();
          if (!deviceActivity) {
            // DeviceActivity module unavailable
            return;
          }
          await deviceActivity.unblockSelection({
            activitySelectionId: "praylock_selection"
          });
        } catch (error) {
          console.error("[PRAYLOCK] Emergency unblock failed:", error instanceof Error ? error.message : String(error));
        }
      },

      testPrayerWindowStatus: async () => {
        try {
          
          // Test timezone conversion directly
          
          const { praylockBackgroundManager } = await import("../lib/praylockBackgroundManager");
          return await praylockBackgroundManager.testPrayerWindowStatus();
        } catch (error) {
          console.error("[PRAYLOCK] Error testing prayer window status:", error instanceof Error ? error.message : String(error));
          return { isInWindow: false, currentPeriod: "morning" };
        }
      },

      // Internal actions for direct state updates
      _updateSettings: (settings) => set({ settings }),
      _setLoading: (loading) => set({ isLoading: loading }),
      _setError: (error) => set({ error }),
      _setNativeMonitoringActive: (active) => set({ isNativeMonitoringActive: active }),
    }),
    {
      name: 'praylock-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          return await SecureStore.getItemAsync(name);
        },
        setItem: async (name: string, value: string) => {
          // Check size before storing to prevent SecureStore issues
          if (value.length > 2048) {
            // Exceeds SecureStore capacity; skip write
            return;
          }
          await SecureStore.setItemAsync(name, value);
        },
        removeItem: async (name: string) => {
          await SecureStore.deleteItemAsync(name);
        },
      })),
      partialize: (state) => ({
        settings: state.settings,
        isNativeMonitoringActive: state.isNativeMonitoringActive,
      }),
    }
  )
);
