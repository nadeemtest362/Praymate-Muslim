import React, { createContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { Image } from 'expo-image';
import { useQueryClient } from '@tanstack/react-query';
import { onboardingApiService, OnboardingFlowResponse, OnboardingStepConfig } from '../services/OnboardingApiService';
import { useAuth } from '../hooks/useAuth';

import { supabase } from '../lib/supabaseClient';
import { useOnboardingStore, Mood } from '../stores/onboardingStore';
import { AtomicDataStore } from '../features/onboarding/services/onboarding/atomic-data-store';
import { queryKeys } from '../lib/queryClient';
import {
  mergeAnalyticsProperties,
  setAnalyticsContext,
  trackOnboardingEvent,
  trackOnboardingScreen,
  OnboardingFlowMetadataInput,
  OnboardingStepMetadataInput,
} from '../lib/analytics';

const ONBOARDING_EVENT_PREFIX = 'onboarding_';

const toSnakeCase = (value: string): string => {
  if (!value) {
    return '';
  }

  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index);
    const lower = character.toLowerCase();
    const isLetter = lower !== character.toUpperCase();
    const shouldInsertDelimiter = character === character.toUpperCase() && index !== 0 && isLetter;

    if (shouldInsertDelimiter && result.charAt(result.length - 1) !== '_') {
      result += '_';
    }

    if (character === '-') {
      if (result.charAt(result.length - 1) !== '_') {
        result += '_';
      }
    } else if (character === ' ') {
      if (result.charAt(result.length - 1) !== '_') {
        result += '_';
      }
    } else {
      result += lower;
    }
  }

  return result;
};

const extractScreenViewEvent = (config: Record<string, any> | undefined): string | null => {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const trackingConfig = (config.tracking && typeof config.tracking === 'object') ? config.tracking : null;
  if (trackingConfig && typeof trackingConfig.screenViewEvent === 'string' && trackingConfig.screenViewEvent.length > 0) {
    return trackingConfig.screenViewEvent;
  }

  const analyticsConfig = (config.analytics && typeof config.analytics === 'object') ? config.analytics : null;
  if (analyticsConfig && typeof analyticsConfig.screenViewEvent === 'string' && analyticsConfig.screenViewEvent.length > 0) {
    return analyticsConfig.screenViewEvent;
  }

  return null;
};

const buildDefaultTrackingEventName = (screenType: string): string => {
  const snakeCase = toSnakeCase(screenType || 'screen');
  return `${ONBOARDING_EVENT_PREFIX}${snakeCase}_viewed`;
};

const resolveTrackingEventName = (
  screenType: string,
  trackingEventName: string | undefined,
  config: Record<string, any> | undefined,
  stepIndex: number
): string => {
  const screenViewEvent = extractScreenViewEvent(config);

  let resolvedName = trackingEventName;

    if (screenViewEvent && screenViewEvent !== trackingEventName) {
      resolvedName = screenViewEvent;
  }

  if (!resolvedName || resolvedName.length === 0) {
    resolvedName = buildDefaultTrackingEventName(screenType);
  }

  if (resolvedName.indexOf(ONBOARDING_EVENT_PREFIX) !== 0) {
    resolvedName = `${ONBOARDING_EVENT_PREFIX}${resolvedName}`;
  }

  return resolvedName;
};

interface OnboardingFlowContextType {
  currentFlow: OnboardingFlowResponse | null;
  currentStep: OnboardingStepConfig | null;
  currentStepIndex: number;
  isLoadingFlow: boolean;
  flowError: string | null;
  isFlowActiveInSession: boolean; // Renamed from isFirstTimeUser for clarity
  hasLoadedSavedState: boolean; // To track when saved state is loaded
  startOnboardingFlow: () => void; // This will become mostly internal
  forceStartOnboardingFlow: () => void; // This is the main entry point from UI
  proceedToNextStep: (data?: any) => void; // Modified to accept optional data
  proceedToPreviousStep: () => void;
  logEvent: (eventName: string, eventData?: Record<string, any>) => void;
  logScreen: (screenName: string, eventData?: Record<string, any>) => void;
  logSduiEvent: (eventName: string, eventData?: Record<string, any>) => void;  // NEW - Bound version (no flowId/stepId needed)
  logProductEvent: (eventName: string, properties?: Record<string, any>) => void;  // NEW
  markOnboardingComplete: () => Promise<void>;
  saveDisplayAndUpdateProfile: (displayName: string) => Promise<{ success: boolean; error?: any }>;
  saveMoodAndContextToProfile: (moodId: string, moodEmoji: string | null, moodContext: string | null) => Promise<{ success: boolean; error?: any }>;
  saveGeneralQuestionResponse: (questionType: 'relationshipWithGod' | 'prayerFrequency', responseValue: string) => Promise<{ success: boolean; error?: any }>; // New
  saveFaithTradition: (faithTradition: string) => Promise<{ success: boolean; error?: any }>; // New
  setSessionInactive: () => void;
}

export const OnboardingFlowContext = createContext<OnboardingFlowContextType | undefined>(undefined);

interface OnboardingFlowProviderProps {
  children: ReactNode;
}

export const OnboardingFlowProvider: React.FC<OnboardingFlowProviderProps> = ({ children }) => {
  const [currentFlow, setCurrentFlow] = useState<OnboardingFlowResponse | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [isLoadingFlow, setIsLoadingFlow] = useState<boolean>(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isFlowActiveInSession, setIsFlowActiveInSession] = useState<boolean>(false);
  const [isForceStarting, setIsForceStarting] = useState<boolean>(false); // Internal flag
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState<boolean>(false); // ← Add this to track when saved state is loaded
  const [isLoadingSavedState, setIsLoadingSavedState] = useState<boolean>(false); // ← Add this to protect state during loading

  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Create a stable ref for the fetch function to avoid infinite re-renders
  const fetchAndSetFlowRef = useRef<() => Promise<void>>(undefined);

  useEffect(() => {
    const context: Record<string, unknown> = {};
    let hasContext = false;

    if (user?.id) {
      context.user_id = user.id;
      hasContext = true;
    }

    if (profile) {
      if (typeof profile.has_completed_onboarding === 'boolean') {
        context.profile_has_completed_onboarding = profile.has_completed_onboarding;
        hasContext = true;
      }

      if (profile.timezone) {
        context.profile_timezone = profile.timezone;
        hasContext = true;
      }
    }

    if (currentFlow) {
      if (currentFlow.flow_id) {
        context.onboarding_flow_id = currentFlow.flow_id;
        hasContext = true;
      }

      if (currentFlow.flow_version) {
        context.onboarding_flow_version = currentFlow.flow_version;
        hasContext = true;
      }

      if (currentFlow.flow_name) {
        context.onboarding_flow_name = currentFlow.flow_name;
        hasContext = true;
      }

      if (currentFlow.steps && typeof currentFlow.steps.length === 'number') {
        context.onboarding_flow_step_count = currentFlow.steps.length;
        hasContext = true;
      }
    }

    if (currentStepIndex >= 0) {
      context.onboarding_current_step_index = currentStepIndex;
      hasContext = true;
    }

    setAnalyticsContext(hasContext ? context : null);
  }, [
    user?.id,
    profile?.has_completed_onboarding,
    profile?.timezone,
    currentFlow?.flow_id,
    currentFlow?.flow_version,
    currentFlow?.flow_name,
    currentFlow?.steps,
    currentStepIndex,
  ]);

  // Load saved state FIRST, before any flow logic runs
  useEffect(() => {
    const loadSavedStateFirst = async () => {
      try {
        console.log('[OnboardingFlowProvider] Loading saved state FIRST...');
        setIsLoadingSavedState(true); // Protect state during loading

        await useOnboardingStore.getState().loadFromAtomicStore();
        setHasLoadedSavedState(true);

        const state = useOnboardingStore.getState();
        console.log('[OnboardingFlowProvider] Loaded saved state:', {
          currentFlowId: state.currentFlowId,
          currentStepIndex: state.currentStepIndex,
          hasData: !!state.currentFlowId
        });

        // Store the saved state in a ref to prevent it from being cleared
        if (state.currentStepIndex > 0 && state.currentFlowId) {
          console.log('[OnboardingFlowProvider] 🎯 Found saved progress - protecting from clearing');

          // Ensure the flow ID is properly set in the store
          if (state.currentFlowId && !state.currentFlowId.includes('undefined')) {
            console.log('[OnboardingFlowProvider] 🔧 Ensuring flow ID is properly set:', state.currentFlowId);
            // The flow ID should already be set from loadFromAtomicStore, but let's verify
          }
        }
      } catch (error) {
        console.error('[OnboardingFlowProvider] Error loading saved state:', error);
        setHasLoadedSavedState(true); // Continue anyway
      } finally {
        setIsLoadingSavedState(false); // Done loading
      }
    };

    loadSavedStateFirst();
  }, []); // Run only once on mount

  // Debug: Monitor state changes
  useEffect(() => {
    if (hasLoadedSavedState) {
      const state = useOnboardingStore.getState();
      console.log('[OnboardingFlowProvider] State monitor - currentStepIndex:', state.currentStepIndex, 'currentFlowId:', state.currentFlowId);

      // Track when state gets cleared unexpectedly
      if (state.currentStepIndex === 0 && state.currentFlowId === null) {
        console.log('[OnboardingFlowProvider] WARNING: State appears to have been cleared unexpectedly!');
      }
    }
  }, [hasLoadedSavedState]);

  console.log('[OnboardingFlowProvider] Auth state:', {
    user: user?.id,
    profileExists: !!profile,
    hasCompletedOnboarding: profile?.has_completed_onboarding
  });

  /**
   * Logs SDUI-internal events to the database for split testing and flow diagnostics.
   * These events are NOT sent to PostHog - they are purely for experiment tracking.
   * 
   * @param eventName - Internal event name (step_viewed, navigated_away_next, etc.)
   * @param flowId - Current onboarding flow ID
   * @param stepId - Current step ID (optional)
   * @param eventData - Additional event metadata (optional)
   */
  const logSduiEvent = useCallback(
    (eventName: string, flowId: string, stepId?: string, eventData?: Record<string, any>) => {
      if (!flowId) {
        console.warn('[OnboardingFlowProvider] logSduiEvent: flowId is missing.');
        return;
      }

      // Fire-and-forget with silent error handling - analytics should never block user flow
      onboardingApiService.logOnboardingEvent({
        flow_id: flowId,
        step_id: stepId,
        event_name: eventName,
        event_data: eventData,
      }).catch((error) => {
        // Silently log to console only - never surface to user
        if (__DEV__) {
          console.warn('[OnboardingFlowProvider] SDUI event failed (silent):', eventName, error);
        }
      });

      // ❌ REMOVED: trackOnboardingEvent() call
      // This function is now DB-only for SDUI tracking
    },
    [] // Removed currentFlow dependency as we don't need it anymore
  );

  /**
   * Logs user interaction events to PostHog for product analytics.
   * These events represent meaningful user actions (selections, completions, CTAs).
   * They are NOT saved to the database - use logSduiEvent for experiment tracking.
   * 
   * @param eventName - Product event name (mood_selected, intention_saved, etc.)
   * @param properties - Event properties (optional)
   */
  const logProductEvent = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      const flowMetadata: OnboardingFlowMetadataInput = {
        flow_id: currentFlow?.flow_id,
        flow_name: currentFlow?.flow_name,
        flow_version: currentFlow?.flow_version,
        steps: currentFlow?.steps,
      };

      // Compute current step inline
      const step = currentFlow && currentStepIndex >= 0 && currentFlow.steps[currentStepIndex]
        ? currentFlow.steps[currentStepIndex]
        : null;

      // Ensure onboarding_ prefix exists, but don't double-prefix
      const normalizedEventName = eventName.indexOf(ONBOARDING_EVENT_PREFIX) === 0
        ? eventName
        : `${ONBOARDING_EVENT_PREFIX}${eventName}`;

      trackOnboardingEvent(normalizedEventName, {
        flow: flowMetadata,
        step,
        stepIndex: currentStepIndex,
        stepCount: currentFlow?.steps?.length,
        properties,
      });
    },
    [currentFlow, currentStepIndex]
  );

  /**
   * Bound version of logSduiEvent for screens to use.
   * Automatically includes current flow/step context - screens don't need to pass those.
   * 
   * @param eventName - SDUI event name
   * @param eventData - Additional event data (optional)
   */
  const logSduiEventBound = useCallback(
    (eventName: string, eventData?: Record<string, any>) => {
      if (currentFlow?.flow_id) {
        // Compute current step inline
        const step = currentFlow && currentStepIndex >= 0 && currentFlow.steps[currentStepIndex]
          ? currentFlow.steps[currentStepIndex]
          : null;
        logSduiEvent(eventName, currentFlow.flow_id, step?.id, eventData);
      }
    },
    [currentFlow, currentStepIndex, logSduiEvent]
  );

  const saveDisplayAndUpdateProfile = useCallback(async (displayName: string): Promise<{ success: boolean; error?: any }> => {
    if (!user?.id) return { success: false, error: "User not authenticated" };
    try {
      const { data, error } = await supabase.from('profiles').update({ display_name: displayName, updated_at: new Date().toISOString() }).eq('id', user.id).select('*').single();
      if (error) throw error;
      
      // Don't update query cache to avoid auth state issues
      // The profile will be refetched naturally when needed
      
      useOnboardingStore.getState().setFirstName(displayName);
      logSduiEvent('display_name_updated', currentFlow?.flow_id || 'unknown_flow');
      return { success: true };
    } catch (error: any) {
      logSduiEvent('display_name_update_failed', currentFlow?.flow_id || 'unknown_flow', undefined, { error: error.message });
      return { success: false, error: error.message || "Failed to save display name" };
    }
  }, [user, currentFlow?.flow_id, logSduiEvent]);

  const saveMoodAndContextToProfile = useCallback(async (moodId: string, moodEmoji: string | null, moodContext: string | null): Promise<{ success: boolean; error?: any }> => {
    try {
      if (!user?.id) {
        console.error("[OnboardingFlowProvider] User not authenticated, cannot save mood.");
        return { success: false, error: "User not authenticated" };
      }

      const dataToUpdate: { mood: string; mood_context?: string | null, updated_at: string } = {
        mood: moodId,
        updated_at: new Date().toISOString(),
      };
      if (moodContext !== null && moodContext !== undefined) { // Allow empty string, but handle null explicitly if desired by DB
        dataToUpdate.mood_context = moodContext;
      } else {
        dataToUpdate.mood_context = null; // Explicitly set to null if no context
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(dataToUpdate)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      if (data && user.id) {
        queryClient.setQueryData(queryKeys.profile(user.id), data);
      }
      // Update onboardingStore with the correct format
      if (moodEmoji) {
        // Construct proper Mood object
        const moodObject: Mood = {
          id: moodId,
          emoji: moodEmoji,
          label: moodId // Using moodId as label since we don't have a separate label
        };
        useOnboardingStore.getState().setMood(moodObject);
      } else {
        // If no emoji, still need to create a Mood object
        const moodObject: Mood = {
          id: moodId,
          emoji: '😐', // Default emoji
          label: moodId
        };
        useOnboardingStore.getState().setMood(moodObject);
      }
      useOnboardingStore.getState().setMoodContext(moodContext || '');

      logSduiEvent('mood_and_context_updated', currentFlow?.flow_id || 'unknown_flow');
      return { success: true };
    } catch (error: any) {
      console.error("[OnboardingFlowProvider] Error saving mood and context to profile:", error);
      logSduiEvent('mood_and_context_update_failed', currentFlow?.flow_id || 'unknown_flow', undefined, { error: error.message });
      return { success: false, error: error.message || "Failed to save mood and context" };
    }
  }, [user, queryClient, currentFlow?.flow_id, logSduiEvent]);

  const saveGeneralQuestionResponse = useCallback(async (questionType: 'relationshipWithGod' | 'prayerFrequency', responseValue: string): Promise<{ success: boolean; error?: any }> => {
    if (!user?.id) {
      console.error("[OnboardingFlowProvider] User not authenticated, cannot save general question response.");
      return { success: false, error: "User not authenticated" };
    }
    try {
      // Save to Zustand store
      if (questionType === 'relationshipWithGod') {
        useOnboardingStore.getState().setRelationshipWithGod(responseValue as 'very_close' | 'close' | 'complicated' | 'distant' | 'rebuilding' | '');
      } else if (questionType === 'prayerFrequency') {
        useOnboardingStore.getState().setPrayerFrequency(responseValue as 'multiple_daily' | 'daily' | 'few_times_week' | 'occasionally' | 'rarely' | '');
      }

      // Save to profiles table (optional, based on whether these are directly stored or inferred later)
      // For now, we assume these are primarily for onboarding experience and might not directly map to profile fields
      // If they do, add supabase.update here.
      // Example: if you have a `relationship_with_god` column on `profiles`:
      // const { data, error } = await supabase
      //   .from('profiles')
      //   .update({ [questionType]: responseValue, updated_at: new Date().toISOString() })
      //   .eq('id', user.id)
      //   .select('*')
      //   .single<Profile>();
      // if (error) throw error;
      // if (data) _setProfileCache(data);

      const stepForLog = currentFlow && currentStepIndex >= 0 ? currentFlow.steps[currentStepIndex] : undefined;
      logSduiEvent(`${questionType}_response_saved`, currentFlow?.flow_id || 'unknown_flow', stepForLog?.id, { response: responseValue });
      return { success: true };
    } catch (error: any) {
      console.error(`[OnboardingFlowProvider] Error saving ${questionType} response:`, error);
      const stepForLogOnError = currentFlow && currentStepIndex >= 0 ? currentFlow.steps[currentStepIndex] : undefined;
      logSduiEvent(`${questionType}_response_save_failed`, currentFlow?.flow_id || 'unknown_flow', stepForLogOnError?.id, { error: error.message, response: responseValue });
      return { success: false, error: error.message || "Failed to save response" };
    }
  }, [user, currentFlow, currentStepIndex, logSduiEvent]);

  const saveFaithTradition = useCallback(async (faithTradition: string): Promise<{ success: boolean; error?: any }> => {
    if (!user?.id) {
      console.error("[OnboardingFlowProvider] User not authenticated, cannot save faith tradition.");
      return { success: false, error: "User not authenticated" };
    }
    try {
      // Save to Zustand store
      useOnboardingStore.getState().setFaithTradition(faithTradition as 'catholic' | 'christian_non_catholic' | 'other' | '');

      const stepForLog = currentFlow && currentStepIndex >= 0 ? currentFlow.steps[currentStepIndex] : undefined;
      logSduiEvent('faith_tradition_response_saved', currentFlow?.flow_id || 'unknown_flow', stepForLog?.id, { response: faithTradition });
      return { success: true };
    } catch (error: any) {
      console.error('[OnboardingFlowProvider] Error saving faith tradition response:', error);
      const stepForLogOnError = currentFlow && currentStepIndex >= 0 ? currentFlow.steps[currentStepIndex] : undefined;
      logSduiEvent('faith_tradition_response_save_failed', currentFlow?.flow_id || 'unknown_flow', stepForLogOnError?.id, { error: error.message, response: faithTradition });
      return { success: false, error: error.message || "Failed to save faith tradition" };
    }
  }, [user, currentFlow, currentStepIndex, logSduiEvent]);

  /**
   * Smart router for analytics events.
   * Routes SDUI internal events to database, product events to PostHog.
   */
  const logEvent = useCallback((eventName: string, eventData?: Record<string, any>) => {
    // SDUI internal events (DB only) - these track flow mechanics for A/B testing
    const sduiInternalEvents = [
      'step_viewed',
      'navigated_away_next',
      'navigated_away_back',
      'flow_started',
      'flow_completed',
      'flow_completed_all_steps',
      'step_skipped',
      'flow_resumed',
      'flow_started_new_version',
    ];

    // Check if this is an SDUI internal event
    for (let index = 0; index < sduiInternalEvents.length; index += 1) {
      if (eventName.indexOf(sduiInternalEvents[index]) !== -1) {
        // Route to SDUI event tracking (DB only)
        if (currentFlow && currentStepIndex >= 0 && currentFlow.steps[currentStepIndex]) {
          logSduiEvent(eventName, currentFlow.flow_id, currentFlow.steps[currentStepIndex].id, eventData);
        } else if (currentFlow) {
          logSduiEvent(eventName, currentFlow.flow_id, undefined, eventData);
        }
        return;
      }
    }

    // All other events are product events (PostHog only)
    logProductEvent(eventName, eventData);
  }, [currentFlow, currentStepIndex, logSduiEvent, logProductEvent]);

  const logScreen = useCallback((screenName: string, eventData?: Record<string, any>) => {
    if (!currentFlow) {
      return;
    }

    const step = currentStepIndex >= 0 ? currentFlow.steps[currentStepIndex] : null;

    trackOnboardingScreen(screenName, {
      flow: {
        flow_id: currentFlow.flow_id,
        flow_name: currentFlow.flow_name,
        flow_version: currentFlow.flow_version,
        steps: currentFlow.steps,
      },
      step,
      stepIndex: currentStepIndex >= 0 ? currentStepIndex : undefined,
      stepCount: currentFlow.steps?.length,
      properties: eventData,
    });
  }, [currentFlow, currentStepIndex]);

  // Renamed for clarity, this is the core fetching logic
  const fetchAndSetFlow = useCallback(async () => {
    console.log("[OnboardingFlowProvider] fetchAndSetFlow: Starting...");

    // Check if we have a valid session before attempting to fetch
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("[OnboardingFlowProvider] fetchAndSetFlow: No valid session, aborting flow fetch");
      setFlowError("Authentication required");
      setIsLoadingFlow(false);
      setIsForceStarting(false);
      return;
    }

    setIsLoadingFlow(true);
    setFlowError(null);
    try {
      const flow = await onboardingApiService.getOnboardingFlow();
      const normalizedSteps = flow?.steps
        ? flow.steps.map((step, index) => ({
            ...step,
            tracking_event_name: resolveTrackingEventName(
              step.screen_type,
              step.tracking_event_name,
              step.config,
              index
            ),
          }))
        : [];

      const resolvedFlow: OnboardingFlowResponse = {
        ...flow,
        steps: normalizedSteps,
      };

      setCurrentFlow(resolvedFlow);
      if (resolvedFlow && resolvedFlow.steps && resolvedFlow.steps.length > 0) {
        // Simple image preloading for the few remote images
        const imagesToPreload = resolvedFlow.steps
          .filter(step => step.config?.image && step.config.image.startsWith('http'))
          .map(step => step.config.image);

        if (imagesToPreload.length > 0) {
          imagesToPreload.forEach(url => {
            Image.prefetch(url).catch(() => {
              // Silently fail - images will still load normally if prefetch fails
            });
          });
        }
        // Check if we have a saved step index to restore
        const savedIndex = useOnboardingStore.getState().currentStepIndex;
        const savedFlowId = useOnboardingStore.getState().currentFlowId;

        console.log(`[OnboardingFlowProvider] Checking saved state:`, {
          savedIndex,
          savedFlowId,
          currentFlowId: resolvedFlow.flow_id,
          willRestore: savedIndex > 0 && savedFlowId === resolvedFlow.flow_id,
          hasLoadedSavedState: true // Confirm this is set
        });

        // Debug: Check if the store values are correct
        if (savedIndex > 0 && !savedFlowId) {
          console.log('[OnboardingFlowProvider] WARNING: savedIndex > 0 but savedFlowId is null/undefined!');
          console.log('[OnboardingFlowProvider] Store state:', useOnboardingStore.getState());
        }

        if (savedIndex > 0 && savedFlowId === resolvedFlow.flow_id) {
          // RESTORE TO SAVED STEP
          console.log(`[OnboardingFlowProvider] RESTORING to saved step ${savedIndex}`);
          await useOnboardingStore.getState().setFlowAndStep(resolvedFlow.flow_id, savedIndex);
          setCurrentStepIndex(savedIndex);
          logSduiEvent(resolvedFlow.steps[savedIndex].tracking_event_name || `step_viewed_${resolvedFlow.steps[savedIndex].screen_type}`, resolvedFlow.flow_id, resolvedFlow.steps[savedIndex].id);
          logSduiEvent('flow_resumed', resolvedFlow.flow_id, undefined, { resumed_at_step: savedIndex });
        } else if (savedIndex > 0 && savedFlowId) {
          // User has saved progress but flow ID doesn't match - this shouldn't happen normally
          console.log(`[OnboardingFlowProvider] Saved progress found but flow ID mismatch. Saved: ${savedFlowId}, Current: ${resolvedFlow.flow_id}`);
          // For now, start from beginning but log this case
          await useOnboardingStore.getState().setFlowAndStep(resolvedFlow.flow_id, 0);
          setCurrentStepIndex(0);
          logSduiEvent(resolvedFlow.steps[0].tracking_event_name || `step_viewed_${resolvedFlow.steps[0].screen_type}`, resolvedFlow.flow_id, resolvedFlow.steps[0].id);
          logSduiEvent('flow_started_new_version', resolvedFlow.flow_id, undefined, { previous_flow_id: savedFlowId, previous_step: savedIndex });
        } else {
          // Start from beginning
          console.log(`[OnboardingFlowProvider] Starting from beginning (savedIndex: ${savedIndex}, flowId match: ${savedFlowId === resolvedFlow.flow_id})`);
          await useOnboardingStore.getState().setFlowAndStep(resolvedFlow.flow_id, 0);
          setCurrentStepIndex(0);
          logSduiEvent(resolvedFlow.steps[0].tracking_event_name || `step_viewed_${resolvedFlow.steps[0].screen_type}`, resolvedFlow.flow_id, resolvedFlow.steps[0].id);
          logSduiEvent('flow_started', resolvedFlow.flow_id);
        }

        // Flow and step already persisted atomically via setFlowAndStep above
      } else {
        setFlowError('No steps found in the onboarding flow.');
        setCurrentFlow(null); // Ensure flow is null if no steps
        setCurrentStepIndex(-1);
      }
    } catch (err: any) {
      console.error("[OnboardingFlowProvider] fetchAndSetFlow: Error fetching flow:", err);
      setFlowError(err.message || 'Failed to load onboarding experience.');
      setCurrentFlow(null);
      setCurrentStepIndex(-1);
    } finally {
      setIsLoadingFlow(false);
      setIsForceStarting(false); // Reset force starting flag
    }
  }, [logSduiEvent]); // logSduiEvent is stable

  // Assign to ref for stable access in useEffect
  fetchAndSetFlowRef.current = fetchAndSetFlow;

  const startOnboardingFlow = useCallback(async () => {
    // This function is now mostly a wrapper around fetchAndSetFlow
    // It's kept for semantic reasons but forceStartOnboardingFlow is the primary entry from UI
    if (isLoadingFlow || currentFlow) {
        console.log("[OnboardingFlowProvider] startOnboardingFlow: Skipped (loading or flow exists).");
        if (currentFlow && !isFlowActiveInSession) {
            // If flow exists but session isn't active (e.g. re-entering app), mark session active
            setIsFlowActiveInSession(true);
        }
        return;
    }
    setIsFlowActiveInSession(true); // Mark session active when starting
    await fetchAndSetFlow();
  }, [isLoadingFlow, currentFlow, fetchAndSetFlow, isFlowActiveInSession]);

  const forceStartOnboardingFlow = useCallback(async () => {
    console.log("[OnboardingFlowProvider] forceStartOnboardingFlow: Called.");
    setIsFlowActiveInSession(true); // Critical: Mark session as active
    setIsForceStarting(true);       // Signal that a force start is happening

    // Check if we need to clear old data with stale IDs
    const currentData = await AtomicDataStore.getData();
    const hasPrayerPeople = currentData.prayerPeople && currentData.prayerPeople.length > 0;

    if (hasPrayerPeople) {
      // Check if any of the cached prayer people actually exist in the database
      const personIds = currentData.prayerPeople.map(p => p.id).filter(id => id);
      if (personIds.length > 0) {
        const { data: existingPeople } = await supabase
          .from('prayer_focus_people')
          .select('id')
          .in('id', personIds);

        // If none of the cached people exist in the database, clear the cache
        if (!existingPeople || existingPeople.length === 0) {
          console.log("[OnboardingFlowProvider] Clearing stale onboarding data - cached people don't exist in database");
          await useOnboardingStore.getState().clearAtomicData();
        }
      }
    }

    // Ensure saved state is loaded before fetching flow
    await useOnboardingStore.getState().loadFromAtomicStore();
    console.log("[OnboardingFlowProvider] Loaded saved state before fetching flow");

    // Don't reset the step index here - let fetchAndSetFlow handle restoration
    setCurrentFlow(null);           // Clear existing flow data to force re-fetch

    await fetchAndSetFlow();        // Fetch and set up the new flow (will restore saved progress)
  }, [fetchAndSetFlow]);

  const setSessionInactive = useCallback(() => {
    console.log("[OnboardingFlowProvider] Setting session inactive.");
    setIsFlowActiveInSession(false);
    // Optionally, could also clear currentFlow and currentStepIndex here if desired upon any exit from onboarding stack
    // setCurrentFlow(null);
    // setCurrentStepIndex(-1);
  }, []);

  useEffect(() => {
    // This effect ONLY handles user logout or a genuine new user in production.
    // It does NOT auto-start flows for dev mode or based on simple navigation.
    console.log(`[OnboardingFlowContext] Auth/Profile Effect | User: ${user?.id}, Profile Onboarded: ${profile?.has_completed_onboarding}, isFlowActive: ${isFlowActiveInSession}`);
    if (!user) {
      // User logged out, clear all onboarding state
      console.log("[OnboardingFlowContext] User logged out. Clearing onboarding states.");
      setIsFlowActiveInSession(false);
      setCurrentFlow(null);
      setCurrentStepIndex(-1);
      setIsLoadingFlow(false);
      setIsForceStarting(false);

      // Only clear cached onboarding data if we're not in the middle of loading saved state
      if (hasLoadedSavedState && !isLoadingSavedState) {
        console.log("[OnboardingFlowContext] Clearing onboarding data after logout");
        useOnboardingStore.getState().clearAtomicData().catch(console.error);
      } else {
        console.log("[OnboardingFlowContext] Skipping data clear - still loading saved state or not loaded yet");
      }
    } else if (user && !profile && !isLoadingFlow && !isForceStarting) {
      // User exists but no profile - CREATE IT IMMEDIATELY
      console.log("[OnboardingFlowContext] User exists but no profile. Creating profile...");
      const createProfile = async () => {
        try {
          // The profile creation trigger should handle this, but just in case...
          console.log('[OnboardingFlowContext] Waiting for profile to be created by trigger...');

          // Wait a bit for the trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Force auth to refetch the profile
          if (user?.id) {
          await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
          }
        } catch (err) {
          console.error('[OnboardingFlowContext] Error in profile fetch:', err);
        }
      };
      createProfile();
    } else if (user && profile && !profile.has_completed_onboarding && !isFlowActiveInSession && !isLoadingFlow && !isForceStarting && hasLoadedSavedState) {
      // Only start flow if we have loaded saved state AND user needs onboarding
      // This prevents the flow from starting before saved state is loaded
      const startFlowWithDelay = async () => {
        // Wait a bit to ensure session is fully established AND saved state is loaded
        await new Promise(resolve => setTimeout(resolve, 1500)); // Increased delay

        // Make sure the onboarding store has loaded its state
        await useOnboardingStore.getState().loadFromAtomicStore();

        console.log("[OnboardingFlowContext] Genuine new user detected. Auto-starting onboarding flow.");
        // Call the function directly since it's not in dependency array anymore
        if (isLoadingFlow || currentFlow) {
          console.log("[OnboardingFlowProvider] startOnboardingFlow: Skipped (loading or flow exists).");
          if (currentFlow && !isFlowActiveInSession) {
            setIsFlowActiveInSession(true);
          }
          return;
        }
        setIsFlowActiveInSession(true);
        await fetchAndSetFlowRef.current?.();
      };
      startFlowWithDelay();
    }
  }, [user?.id, profile?.has_completed_onboarding, isFlowActiveInSession, isLoadingFlow, isForceStarting, hasLoadedSavedState]);

  const proceedToNextStep = useCallback((data?: any) => {
    if (currentFlow && currentStepIndex < currentFlow.steps.length - 1) {
      const oldStep = currentFlow.steps[currentStepIndex];
      const normalizedOldEventName = oldStep.tracking_event_name
        ? oldStep.tracking_event_name.replace('_viewed', '_navigated_away_next')
        : undefined;
      logSduiEvent(normalizedOldEventName || `step_navigated_away_next_${oldStep.screen_type}`, currentFlow.flow_id, oldStep.id);

      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);

      // Save the new step index to the store
      useOnboardingStore.getState().setCurrentStepIndex(nextIndex);

      const newStep = currentFlow.steps[nextIndex];
      logSduiEvent(newStep.tracking_event_name || `step_viewed_${newStep.screen_type}`, currentFlow.flow_id, newStep.id);
    } else if (currentFlow) {
      logSduiEvent('flow_completed_all_steps', currentFlow.flow_id);
      console.log("[OnboardingFlowProvider] Reached end of onboarding steps.");
    }
  }, [currentFlow, currentStepIndex, logSduiEvent]);

  const proceedToPreviousStep = useCallback(() => {
    if (currentFlow && currentStepIndex > 0) {
      const oldStep = currentFlow.steps[currentStepIndex];
      const normalizedOldEventName = oldStep.tracking_event_name
        ? oldStep.tracking_event_name.replace('_viewed', '_navigated_away_back')
        : undefined;
      logSduiEvent(normalizedOldEventName || `step_navigated_away_back_${oldStep.screen_type}`, currentFlow.flow_id, oldStep.id);

      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);

      // Save the new step index to the store
      useOnboardingStore.getState().setCurrentStepIndex(prevIndex);

      const newStep = currentFlow.steps[prevIndex];
      logSduiEvent(newStep.tracking_event_name || `step_viewed_${newStep.screen_type}`, currentFlow.flow_id, newStep.id);
    } else {
      console.log("[OnboardingFlowProvider] Already at the first step or no flow active, cannot go back.");
    }
  }, [currentFlow, currentStepIndex, logSduiEvent]);

  const markOnboardingComplete = useCallback(async () => {
    setIsFlowActiveInSession(false); // Onboarding session ends
    if (user && profile) { // Only proceed if user and profile exist
                 try {
             // Only update fields that actually exist in the profiles table
             const profileUpdateData = {
                 has_completed_onboarding: true,
                 onboarding_completed_at: new Date().toISOString(), // For analytics
             };

            console.log('[OnboardingFlowProvider] Updating profile with onboarding completion:', profileUpdateData);

            const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', user.id)
            .select('*')
            .single();

            if (error) throw error;
            if (updatedProfile && user.id) {
              queryClient.setQueryData(queryKeys.profile(user.id), updatedProfile);
            }

            // user_stats is now managed entirely by the database trigger (update_prayer_streak_trigger)
            // which fires when prayers.completed_at transitions from NULL to non-NULL
            // No manual initialization needed - the trigger handles streak logic

            // Day 1 challenge is now automatically available to all users
            // No need to create a database entry

            // Log SDUI event to database for experiment tracking
            logSduiEvent('onboarding_marked_complete', currentFlow?.flow_id || 'unknown_flow', undefined, { updated_fields: Object.keys(profileUpdateData) });
            
            // Log PostHog product event for funnels and analytics
            logProductEvent('onboarding_completed', {
              completed_at: new Date().toISOString(),
              total_steps: currentFlow?.steps?.length,
            });
            
            console.log('[OnboardingFlowProvider] Onboarding successfully marked as complete in database');
        } catch (error) {
            console.error("[OnboardingFlowProvider] Error marking onboarding complete:", error);
            logSduiEvent('onboarding_completion_failed', currentFlow?.flow_id || 'unknown_flow', undefined, { error: (error as Error).message });
        }
    }
    setCurrentFlow(null);
    setCurrentStepIndex(-1);
    console.log("[OnboardingFlowProvider] Onboarding marked complete. Flow active session: false.");
  }, [user, profile, queryClient, currentFlow?.flow_id, logSduiEvent]);

  const currentStep = useMemo(() => {
    return currentFlow && currentStepIndex >= 0 && currentFlow.steps[currentStepIndex]
      ? currentFlow.steps[currentStepIndex]
      : null;
  }, [currentFlow, currentStepIndex]);

  const contextValue = useMemo(() => ({
    currentFlow,
    currentStep,
    currentStepIndex,
    isLoadingFlow,
    flowError,
    isFlowActiveInSession, // Use renamed state
    hasLoadedSavedState,
    startOnboardingFlow, // Expose for potential genuine new user retry from elsewhere
    forceStartOnboardingFlow,
    proceedToNextStep,
    proceedToPreviousStep,
    logEvent,
    logScreen,
    logSduiEvent: logSduiEventBound,  // NEW - Expose bound version for screens
    logProductEvent,  // NEW - Expose for product analytics
    markOnboardingComplete,
    saveDisplayAndUpdateProfile,
    saveMoodAndContextToProfile,
    saveGeneralQuestionResponse,
    saveFaithTradition,
    setSessionInactive
  }), [
    currentFlow, currentStep, currentStepIndex, isLoadingFlow, flowError, isFlowActiveInSession,
    hasLoadedSavedState,
    startOnboardingFlow, forceStartOnboardingFlow, proceedToNextStep, proceedToPreviousStep, logEvent, logScreen, 
    logSduiEventBound, logProductEvent, markOnboardingComplete,
    saveDisplayAndUpdateProfile, saveMoodAndContextToProfile, saveGeneralQuestionResponse, saveFaithTradition, setSessionInactive
  ]);

  return (
    <OnboardingFlowContext.Provider value={contextValue}>
      {children}
    </OnboardingFlowContext.Provider>
  );
};
