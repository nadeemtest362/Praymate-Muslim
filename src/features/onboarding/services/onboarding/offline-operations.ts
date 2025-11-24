import { offlineManager } from './offline-manager';
import { supabase } from '../../../../lib/supabaseClient';
import { enhancedAnalytics } from './analytics-enhanced';
import { PrayerFocusPerson } from '../../../../stores/onboardingStore';

/**
 * Wrapper for saving prayer focus person with offline support
 */
export async function savePrayerFocusPersonOffline(
  person: PrayerFocusPerson,
  userId: string
): Promise<{ success: boolean; data?: any; queued?: boolean }> {
  const operation = async () => {
    const { data, error } = await supabase
      .from('prayer_focus_people')
      .insert({
        user_id: userId,
        name: person.name,
        relationship: person.relationship,
        gender: person.gender,
        image_uri: person.image_uri,
        phone_number_hash: person.phone_number_hash,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };
  
  return offlineManager.executeOperation(operation, {
    id: `person_${person.id}`,
    type: 'create',
    table: 'prayer_focus_people',
    data: {
      user_id: userId,
      name: person.name,
      relationship: person.relationship,
      gender: person.gender,
      image_uri: person.image_uri,
      phone_number_hash: person.phone_number_hash,
    },
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3,
  });
}

/**
 * Wrapper for saving prayer intention with offline support
 */
export async function savePrayerIntentionOffline(
  intention: {
    person_id: string;
    category: string;
    details: string;
    is_active?: boolean;
  },
  userId: string
): Promise<{ success: boolean; data?: any; queued?: boolean }> {
  const operation = async () => {
    const { data, error } = await supabase
      .from('prayer_intentions')
      .insert({
        user_id: userId,
        person_id: intention.person_id,
        category: intention.category,
        details: intention.details,
        is_active: intention.is_active ?? true,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };
  
  return offlineManager.executeOperation(operation, {
    id: `intention_${Date.now()}`,
    type: 'create',
    table: 'prayer_intentions',
    data: {
      user_id: userId,
      person_id: intention.person_id,
      category: intention.category,
      details: intention.details,
      is_active: intention.is_active ?? true,
    },
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3,
  });
}

/**
 * Wrapper for updating user profile with offline support
 */
export async function updateUserProfileOffline(
  profileData: {
    first_name?: string;
    onboarding_completed?: boolean;
    onboarding_completed_at?: string;
    [key: string]: any;
  },
  userId: string
): Promise<{ success: boolean; data?: any; queued?: boolean }> {
  const operation = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };
  
  return offlineManager.executeOperation(operation, {
    id: `profile_update_${Date.now()}`,
    type: 'update',
    table: 'profiles',
    data: {
      ...profileData,
      id: userId,
    },
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3,
  });
}

/**
 * Batch save multiple prayer intentions with offline support
 */
export async function batchSaveIntentionsOffline(
  intentions: {
    person_id: string;
    category: string;
    details: string;
    is_active?: boolean;
  }[],
  userId: string
): Promise<{ 
  success: boolean; 
  results: { success: boolean; data?: any; queued?: boolean }[];
}> {
  const results = await Promise.all(
    intentions.map((intention) => 
      savePrayerIntentionOffline(intention, userId)
    )
  );
  
  const allSuccess = results.every(r => r.success);
  
  if (!allSuccess) {
    const failedCount = results.filter(r => !r.success).length;
    enhancedAnalytics.trackStateIssue({
      type: 'sync_failure',
      screen: 'batch_intentions',
      expectedState: { totalIntentions: intentions.length },
      actualState: { failedIntentions: failedCount },
      resolved: false,
    });
  }
  
  return {
    success: allSuccess,
    results,
  };
}

/**
 * Save onboarding completion with offline support
 */
export async function saveOnboardingCompletionOffline(
  completionData: {
    mood?: string;
    moodContext?: string;
    prayerTimes?: string[];
    prayerNeeds?: string[];
    customPrayerNeed?: string;
  },
  userId: string
): Promise<{ success: boolean; data?: any; queued?: boolean }> {
  const operation = async () => {
    // Save to profiles
    const profileUpdate = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        mood: completionData.mood,
        mood_context: completionData.moodContext,
        prayer_times: completionData.prayerTimes,
        prayer_needs: completionData.prayerNeeds,
        custom_prayer_need: completionData.customPrayerNeed,
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (profileUpdate.error) throw profileUpdate.error;
    return profileUpdate.data;
  };
  
  return offlineManager.executeOperation(operation, {
    id: `onboarding_completion_${Date.now()}`,
    type: 'update',
    table: 'profiles',
    data: {
      id: userId,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      mood: completionData.mood,
      mood_context: completionData.moodContext,
      prayer_times: completionData.prayerTimes,
      prayer_needs: completionData.prayerNeeds,
      custom_prayer_need: completionData.customPrayerNeed,
    },
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3,
  });
}

/**
 * Check and sync any pending operations
 */
export async function checkAndSyncPendingOperations(): Promise<{
  hadPendingOps: boolean;
  syncResult?: any;
}> {
  const pendingCount = offlineManager.getPendingOperationsCount();
  
  if (pendingCount > 0 && offlineManager.getIsOnline()) {
    console.log(`Found ${pendingCount} pending operations, syncing...`);
    const syncResult = await offlineManager.syncPendingOperations();
    
    return {
      hadPendingOps: true,
      syncResult,
    };
  }
  
  return {
    hadPendingOps: false,
  };
} 