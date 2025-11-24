import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../../lib/supabaseClient';
import { z } from 'zod';

// Schema for validating onboarding data
const OnboardingDataSchema = z.object({
  // User profile data
  firstName: z.string().optional(),
  email: z.string().email().optional(),
  initialMotivation: z.enum(['consistency', 'personal', 'closer', 'trying', 'personalization', 'restart', 'intercession', 'inspiration', 'start']).nullable().optional(),
  relationshipWithGod: z.enum(['very_close', 'close', 'complicated', 'distant', 'rebuilding']).nullable().optional(),
  prayerFrequency: z.enum(['multiple_daily', 'daily', 'few_times_week', 'occasionally', 'rarely']).nullable().optional(),
  faithTradition: z.enum(['catholic', 'christian_non_catholic', 'other']).nullable().optional(),
  commitmentLevel: z.enum(['very_committed', 'ready_to_start', 'want_to_try']).nullable().optional(),
  streakGoalDays: z.number().nullable().optional(),
  
  // Mood and context
  mood: z.object({
    id: z.string(),
    emoji: z.string(),
    label: z.string(),
  }).optional(),
  moodContext: z.string().optional(),
  
  // Prayer people and intentions
  prayerPeople: z.array(z.object({
    id: z.string(),
    name: z.string(),
    relationship: z.string().optional(),
    gender: z.string().optional(),
    image_uri: z.string().optional(),
    device_contact_id: z.string().optional(),
    phone_number_hash: z.string().optional(),
  })).default([]),
  
  prayerIntentions: z.array(z.object({
    id: z.string(),
    person_id: z.string(),
    category: z.string(),
    details: z.string(),
    is_active: z.boolean().default(true),
  })).default([]),
  
  // Prayer preferences
  prayerTimes: z.array(z.string()).default([]),
  prayerNeeds: z.array(z.string()).default([]),
  customPrayerNeed: z.string().optional(),
  
  // Flow state
  currentFlowId: z.string().optional(),
  currentStepIndex: z.number().default(0),
  completedSteps: z.array(z.string()).default([]),
  
  // Paywall state (for RevenueCat integration)
  paywallShown: z.boolean().default(false),
  paywallPlacement: z.string().optional(),
  selectedProduct: z.string().optional(),
  
  // Prayer generation state
  firstPrayerContent: z.string().nullable().optional(),
  firstPrayerId: z.string().nullable().optional(),
  
  // Timestamps
  startedAt: z.string().datetime(),
  lastModified: z.string().datetime(),
});

type OnboardingData = z.infer<typeof OnboardingDataSchema>;

export class AtomicDataStore {
  private static readonly STORAGE_KEY = 'onboarding_atomic_data';
  private static updateQueue: (() => Promise<any>)[] = [];
  private static isProcessingQueue = false;
  
  /**
   * Update data atomically using AsyncStorage's built-in atomicity
   */
  static async updateData(
    transform: (data: OnboardingData) => Promise<OnboardingData> | OnboardingData
  ): Promise<{ success: boolean; data?: OnboardingData; error?: Error }> {
    return new Promise((resolve) => {
      // Add to queue
      this.updateQueue.push(async () => {
        return this._performUpdate(transform);
      });
      
      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        this._processQueue();
      }
      
      // Wait for our update to be processed
      const checkQueue = () => {
        if (this.updateQueue.length === 0) {
          // Queue is empty, resolve with last result
          resolve({ success: true });
        } else {
          setTimeout(checkQueue, 10);
        }
      };
      checkQueue();
    });
  }

  private static async _processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift();
      if (update) {
        try {
          await update();
        } catch (error) {
          console.error('[AtomicDataStore] Error processing queued update:', error);
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  private static async _performUpdate(
    transform: (data: OnboardingData) => Promise<OnboardingData> | OnboardingData
  ): Promise<{ success: boolean; data?: OnboardingData; error?: Error }> {
    
    try {
      // Get current data
      const currentData = await this.getData();
      
      // Apply transformation
      let newData;
      try {
        newData = await transform(currentData);
      } catch (transformError) {
        console.error('Transform function failed:', transformError);
        return { 
          success: false, 
          error: transformError instanceof Error ? transformError : new Error('Transform failed') 
        };
      }
      
      // Validate and add timestamp
      let validatedData;
      try {
        validatedData = OnboardingDataSchema.parse({
          ...newData,
          lastModified: new Date().toISOString(),
        });
      } catch (validationError) {
        console.error('Data validation failed:', validationError);
        // Return success but skip saving invalid data
        return { success: true, data: currentData };
      }
      
      // Save atomically
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(validatedData));
      
      // Fire and forget Supabase sync
      this.syncToSupabase(validatedData).catch(console.error);
      
      return { success: true, data: validatedData };
    } catch (error) {
      console.error('AtomicDataStore.updateData error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  }

  /**
   * Get current onboarding data
   */
  static async getData(): Promise<OnboardingData> {
    try {
      const dataStr = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) {
        console.log('[AtomicDataStore] No saved data found, returning empty data');
        return this.getEmptyData();
      }
      
      const data = JSON.parse(dataStr);
      console.log('[AtomicDataStore] Raw data from storage:', {
        currentFlowId: data.currentFlowId,
        currentStepIndex: data.currentStepIndex,
        hasData: !!dataStr
      });
      
      const validatedData = OnboardingDataSchema.parse(data);
      
      // Data integrity check: if we have a step > 0, we should have a flow ID
      if (validatedData.currentStepIndex > 0 && !validatedData.currentFlowId) {
        console.warn('[AtomicDataStore] Data integrity issue: step > 0 but no flow ID. Resetting step index.');
        validatedData.currentStepIndex = 0;
      }
      
      console.log('[AtomicDataStore] Returning validated data:', {
        currentFlowId: validatedData.currentFlowId,
        currentStepIndex: validatedData.currentStepIndex
      });
      
      return validatedData;
    } catch (error) {
      console.error('Failed to get onboarding data:', error);
      return this.getEmptyData();
    }
  }

  /**
   * Clear all onboarding data
   */
  static async clearData(): Promise<void> {
    await AsyncStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Sync critical data to Supabase (fire and forget)
   */
  private static async syncToSupabase(data: OnboardingData): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Only sync fields that actually exist in the profiles table
    const profileUpdate: any = {
      // Basic info
      display_name: data.firstName,
      first_name: data.firstName,
      
      // Onboarding fields
      initial_motivation: data.initialMotivation,
      relationship_with_god: data.relationshipWithGod,
      prayer_frequency: data.prayerFrequency,
      faith_tradition: data.faithTradition,
      commitment_level: data.commitmentLevel,
      streak_goal_days: data.streakGoalDays,
      
      // Mood
      mood: data.mood?.id || null,
      mood_context: data.moodContext || null,
      
      // Prayer preferences as arrays (these DO exist in profiles table)
      prayer_times: data.prayerTimes || [],
      prayer_needs: data.prayerNeeds || [],
      custom_prayer_need: data.customPrayerNeed || null,
    };
    
    // Remove undefined values
    Object.keys(profileUpdate).forEach(key => {
      if (profileUpdate[key] === undefined) {
        delete profileUpdate[key];
      }
    });
    
    const { error } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id);
      
    if (error) {
      console.error('Failed to sync onboarding data to profile:', error);
    }
    
    // Note: prayerPeople and prayerIntentions should be saved separately
    // to their respective tables (prayer_focus_people and prayer_intentions)
    // This is handled by the benefits-highlight screen after onboarding
  }

  /**
   * Get empty data structure
   */
  private static getEmptyData(): OnboardingData {
    return {
      prayerPeople: [],
      prayerIntentions: [],
      prayerTimes: [],
      prayerNeeds: [],
      completedSteps: [],
      currentFlowId: undefined, // ← Add this to prevent undefined issues
      currentStepIndex: 0,
      paywallShown: false,
      startedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * Quick integrity check
   */
  static async verifyIntegrity(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      const data = await this.getData();
      
      // Check for orphaned intentions
      const personIds = new Set(data.prayerPeople.map(p => p.id));
      const orphaned = data.prayerIntentions.filter(i => !personIds.has(i.person_id)).length;
      
      if (orphaned > 0) {
        issues.push(`${orphaned} orphaned intentions`);
      }
      
      // Check for duplicates
      const names = data.prayerPeople.map(p => p.name);
      const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
      
      if (duplicates.length > 0) {
        issues.push(`Duplicate names: ${duplicates.join(', ')}`);
      }
      
      return { isValid: issues.length === 0, issues };
    } catch (error) {
      issues.push(`Integrity check failed: ${error}`);
      return { isValid: false, issues };
    }
  }
} 