import { supabase } from '../lib/supabaseClient'; // Adjust path as needed

const GET_ONBOARDING_FLOW_FUNCTION = 'get-onboarding-flow';
const LOG_ONBOARDING_EVENT_FUNCTION = 'log-onboarding-event';

export interface OnboardingStepConfig {
  id: string;
  step_order: number;
  screen_type: string;
  config: Record<string, any>;
  tracking_event_name?: string;
}

export interface OnboardingFlowResponse {
  flow_id: string;
  flow_name: string;
  flow_version: string;
  steps: OnboardingStepConfig[];
  current_step: number;
  is_continuing: boolean;
}

export interface LogEventArgs {
  flow_id: string;
  step_id?: string;
  event_name: string;
  session_id?: string; // Optional client-generated session ID
  event_data?: Record<string, any>;
}

class OnboardingApiService {
  async getOnboardingFlow(): Promise<OnboardingFlowResponse> {
    // Retry logic for transient auth errors
    let retries = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    while (retries < maxRetries) {
      const { data, error } = await supabase.functions.invoke(
        GET_ONBOARDING_FLOW_FUNCTION,
        {
          // We don't need to pass a body for a GET request typically,
          // but if the Edge Function expects JWT via body or specific headers not auto-added by functions.invoke,
          // this might need adjustment. Supabase client usually handles Authorization header.
        }
      );

      if (error) {
        // Check if it's a transient auth error
        if (error.message?.includes('Authentication in progress') && retries < maxRetries - 1) {
          console.log(`[OnboardingApiService] Auth in progress, retrying in ${retryDelay}ms... (attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retries++;
          continue;
        }
        
        console.error('[OnboardingApiService] Error fetching onboarding flow:', error);
        throw error;
      }
      
      if (!data) {
        console.error('[OnboardingApiService] No data received for onboarding flow.');
        throw new Error('No data received for onboarding flow');
      }
      
      return data as OnboardingFlowResponse;
    }
    
    // Should never reach here, but just in case
    throw new Error('Failed to fetch onboarding flow after retries');
  }

  async logOnboardingEvent(args: LogEventArgs): Promise<void> {
    const { error } = await supabase.functions.invoke(LOG_ONBOARDING_EVENT_FUNCTION, {
      body: args,
    });

    if (error) {
      console.error('[OnboardingApiService] Error logging onboarding event:', error);
      // Depending on strategy, you might not want to throw an error here to avoid blocking UI
      // For now, we log it. Consider silent failure or a different error handling strategy.
    }
  }
}

export const onboardingApiService = new OnboardingApiService(); 