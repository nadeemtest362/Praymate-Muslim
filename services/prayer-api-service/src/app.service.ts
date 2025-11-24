import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai'; // Import OpenAI Node library
import { createClient, SupabaseClient } from '@supabase/supabase-js'; // Import Supabase types
import { OpenAIError } from 'openai/error'; // Import specific error type

// Type for the expected changes payload from the client (mirrors Edge Function)
interface SessionChanges {
  mood?: { from: string | null; to: string };
  toggledIntentions?: { id: string; toState: boolean }[];
}

// DTO reflects input received from the caller (e.g., Edge Function)
interface GeneratePrayerInput {
  userId: string;
  slot: 'morning' | 'evening';
  instructions?: string; 
  input: string;        
  changes_from_review_screen?: SessionChanges | null; // Use refined type
}

// Define the structure for our log entry
interface PrayerLogEntry {
  user_id: string;
  slot: string;
  openai_model_used?: string;
  openai_input_prompt?: string;
  openai_instructions?: string;
  openai_previous_response_id?: string | null;
  openai_response_id?: string | null;
  raw_prayer_output?: string | null;
  was_successful: boolean;
  error_message?: string | null;
  session_changes_payload?: SessionChanges | null; // Use refined type
  openai_call_duration_ms?: number | null;
  openai_usage_input_tokens?: number | null;   // Corrected name
  openai_usage_output_tokens?: number | null;  // Corrected name
  openai_usage_total_tokens?: number | null;
  openai_usage_cached_tokens?: number | null; // Added cached tokens
}

@Injectable()
export class AppService {
  private openai: OpenAI;
  // Keep a Supabase client instance within the service for DB updates
  // NOTE: This uses SERVICE_ROLE_KEY for admin access to update profiles
  // Ensure this key is securely configured in env vars!
  private supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new InternalServerErrorException('Missing required environment variables.');
    }

    this.openai = new OpenAI({ apiKey });
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false } // Important for server-side clients
    });

    console.log('OpenAI & Supabase Admin clients initialized in AppService.');
  }

  private async _logPrayerGenerationAttempt(logEntry: PrayerLogEntry): Promise<void> {
    try {
      const { error } = await this.supabaseAdmin
        .from('openai_prayer_logs')
        .insert(logEntry);
      if (error) {
        console.error(`[${logEntry.user_id}] Failed to insert prayer log to 'openai_prayer_logs'. Supabase error:`, JSON.stringify(error, null, 2));
      } else {
        console.log(`[${logEntry.user_id}] Prayer log inserted successfully into 'openai_prayer_logs'.`);
      }
    } catch (e) {
      const err = e as Error;
      console.error(`[${logEntry.user_id}] Exception during prayer log insertion into 'openai_prayer_logs':`, err.message, err.stack);
    }
  }

  getHello(): string {
    return 'Hello from Prayer API Service!';
  }

  // Updated to use OpenAI Chat Completions API instead of Responses API
  async generatePrayer(inputData: GeneratePrayerInput): Promise<{ prayer: string, responseId: string }> {
    console.log(`[${inputData.userId}] Service received generatePrayer for slot: ${inputData.slot}`);
    const { userId, slot, instructions, input, changes_from_review_screen } = inputData;

    const logPartial: Partial<PrayerLogEntry> = {
      user_id: userId,
      slot: slot,
      session_changes_payload: changes_from_review_screen || null,
    };

    let openAiCallStartTime = 0;
    let openAiCallEndTime = 0;

    try {
      // For completions API, we don't need to track previous response IDs
      // Remove previous response ID logic since we're not using stateful conversations
      logPartial.openai_previous_response_id = null;

      // Build messages array for chat completions
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      // Add system message with instructions if provided
      if (instructions) {
        messages.push({
          role: "system",
          content: instructions
        });
        logPartial.openai_instructions = instructions;
      }

      // Add user message with the prayer request
      messages.push({
        role: "user", 
        content: input
      });

      const apiParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: "gpt-4.1-2025-04-14",
        messages: messages,
        temperature: 0.7,
        max_tokens: 600, // Reasonable limit for prayer length
      };

      logPartial.openai_model_used = apiParams.model;
      logPartial.openai_input_prompt = input;

      openAiCallStartTime = Date.now();
      const response = await this.openai.chat.completions.create(apiParams);
      openAiCallEndTime = Date.now();
      // OpenAI response received
      logPartial.openai_call_duration_ms = openAiCallEndTime - openAiCallStartTime;

      if (response.usage) {
        logPartial.openai_usage_input_tokens = response.usage.prompt_tokens;
        logPartial.openai_usage_output_tokens = response.usage.completion_tokens;
        logPartial.openai_usage_total_tokens = response.usage.total_tokens;
        // Completions API doesn't have cached_tokens in the same format
        logPartial.openai_usage_cached_tokens = null;
      }

      // Extract prayer content from chat completion response
      const prayerContent = response.choices[0]?.message?.content?.trim();
      
      if (!response.id || !prayerContent) {
        this._logPrayerGenerationAttempt({
          ...logPartial,
          was_successful: false,
          error_message: "Invalid response from OpenAI: Missing id or message content",
          openai_response_id: response.id || null,
          raw_prayer_output: prayerContent || null,
        } as PrayerLogEntry);
        throw new InternalServerErrorException("Prayer generation failed: Invalid response from OpenAI.");
      }

      const responseId = response.id;

      this._logPrayerGenerationAttempt({
        ...logPartial,
        was_successful: true,
        openai_response_id: responseId,
        raw_prayer_output: prayerContent,
      } as PrayerLogEntry);
      
      // No need to update profile with response ID since we're not using stateful conversations
      // Remove this logic to simplify the flow

      return { prayer: prayerContent, responseId: responseId };

    } catch (error) {
      if (openAiCallStartTime && !openAiCallEndTime) {
        openAiCallEndTime = Date.now();
        logPartial.openai_call_duration_ms = openAiCallEndTime - openAiCallStartTime;
      }
      const typedError = error as Error;
      let errorMessage = `Prayer generation failed: ${typedError.message}`;
      if (error instanceof OpenAIError && (error as any).status) { 
        errorMessage = `OpenAI API Error: ${(error as any).status} ${error.name} - ${error.message}`;
      } else if (error instanceof OpenAIError) {
        errorMessage = `OpenAI API Error: ${error.name} - ${error.message}`;
      }
      console.error(`[${userId}] Error in generatePrayer service:`, errorMessage);
      
      this._logPrayerGenerationAttempt({
        ...logPartial,
        was_successful: false,
        error_message: errorMessage,
      } as PrayerLogEntry);

      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(errorMessage);
    }
  }
} 