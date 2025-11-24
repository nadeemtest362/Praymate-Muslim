/**
 * Onboarding Completion Service
 * 
 * Handles the final steps of onboarding completion including:
 * - Atomic save of onboarding data
 * - Profile update in database
 * - User stats initialization
 * - Query cache updates
 * - Navigation to home screen
 * 
 * This service is called from both prayer-share-screen and benefits-highlight screen
 * depending on user subscription status.
 */

import { supabase } from "../lib/supabaseClient";
import { useOnboardingStore } from "../stores/onboardingStore";
import { queryKeys } from "../lib/queryClient";
import { safeAllSettled } from "../utils/safeArrayMethods";
import { router } from "expo-router";
import type { QueryClient } from "@tanstack/react-query";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface CompleteOnboardingParams {
  userId: string;
  queryClient: QueryClient;
  logEvent?: (name: string, payload?: any) => void;
  eventPrefix: string; // 'prayer_share' or 'benefits_highlight'
}

/**
 * Complete the onboarding process for a user
 * 
 * @param params - Configuration object with userId, queryClient, logEvent, and eventPrefix
 * @throws Error if userId is missing or profile update fails
 */
export async function completeOnboarding({
  userId,
  queryClient,
  logEvent,
  eventPrefix,
}: CompleteOnboardingParams): Promise<void> {
  if (!userId) {
    const error = new Error("No user ID available");
    if (logEvent) {
      logEvent(`${eventPrefix}_bypass_failed`, {
        reason: "missing_user_after_save",
      });
    }
    throw error;
  }

  // Start event
  if (logEvent) {
    logEvent(`${eventPrefix}_bypass_started`);
  }

  // Step 1: Save onboarding data to AsyncStorage atomically
  try {
    await useOnboardingStore.getState().saveStateAtomically();
    if (logEvent) {
      logEvent(`${eventPrefix}_bypass_atomic_saved`);
    }
  } catch (atomicError) {
    // Non-fatal error - log and continue
    if (logEvent) {
      logEvent(`${eventPrefix}_bypass_atomic_failed`, {
        error:
          atomicError instanceof Error
            ? atomicError.message
            : String(atomicError),
      });
    }
  }

  // Small delay to ensure write completes
  await sleep(500);

  // Step 2: Get onboarding data from store
  const onboardingData = useOnboardingStore.getState();

  // Step 3: Build profile update data
  const profileUpdateData: any = {
    display_name: onboardingData.firstName,
    first_name: onboardingData.firstName,
    initial_motivation: onboardingData.initialMotivation,
    relationship_with_god: onboardingData.relationshipWithGod || null,
    prayer_frequency: onboardingData.prayerFrequency || null,
    faith_tradition: onboardingData.faithTradition || null,
    commitment_level:
      onboardingData.commitmentLevel &&
      ["very_committed", "ready_to_start", "want_to_try"].includes(
        onboardingData.commitmentLevel
      )
        ? onboardingData.commitmentLevel
        : null,
    streak_goal_days: onboardingData.streakGoalDays || 7,
    mood: onboardingData.mood?.id || null,
    mood_context: onboardingData.moodContext || null,
    prayer_times: onboardingData.prayerTimes || [],
    prayer_needs: onboardingData.prayerNeeds || [],
    custom_prayer_need: onboardingData.customPrayerNeed || null,
    has_completed_onboarding: true,
    onboarding_completed_at: new Date().toISOString(),
    current_access_level: "premium",
    premium_access_expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(), // 30 days
    updated_at: new Date().toISOString(),
  };

  // Remove undefined values
  Object.keys(profileUpdateData).forEach((key) => {
    if (profileUpdateData[key] === undefined) {
      delete profileUpdateData[key];
    }
  });

  // Step 4: Update profile in database
  const { data: updatedProfile, error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdateData)
    .eq("id", userId)
    .select("*")
    .single();

  if (profileError) {
    if (logEvent) {
      logEvent(`${eventPrefix}_profile_update_failed`, {
        error: profileError.message,
      });
    }
    throw profileError;
  }

  if (logEvent) {
    logEvent(`${eventPrefix}_profile_updated`);
  }

  // Step 5: user_stats initialization removed
  // The database trigger (update_prayer_streak_trigger) automatically manages all
  // streak data when prayers.completed_at transitions from NULL to non-NULL.
  // Manual initialization was causing a race condition that reset streaks to 0.

  // Step 6: Update React Query cache with new profile
  if (updatedProfile) {
    queryClient.setQueryData(queryKeys.profile(userId), updatedProfile);
  }

  // Small delay to ensure all updates propagate
  await sleep(500);

  // Step 7: Reset onboarding store
  useOnboardingStore.getState().resetOnboarding();

  // Step 8: Prefetch all home screen data
  await safeAllSettled([
    queryClient.prefetchQuery({
      queryKey: ["profile", userId],
      staleTime: 0,
    }),
    queryClient.prefetchQuery({
      queryKey: ["people", userId, "all"],
      staleTime: 0,
    }),
    queryClient.prefetchQuery({
      queryKey: ["people", userId, "active"],
      staleTime: 0,
    }),
    queryClient.prefetchQuery({
      queryKey: ["intentions", userId],
      staleTime: 0,
    }),
    queryClient.prefetchQuery({
      queryKey: ["prayers", userId, "today"],
      staleTime: 0,
    }),
    queryClient.prefetchQuery({
      queryKey: ["prayers", userId, "infinite", "all"],
      staleTime: 0,
    }),
  ]);

  // Completion event
  if (logEvent) {
    logEvent('onboarding_completed');
  }

  // Step 9: Navigate to home
  router.replace("/(app)/(tabs)/home");
}
