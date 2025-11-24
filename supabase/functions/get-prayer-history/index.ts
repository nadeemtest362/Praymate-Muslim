// @deno-types="npm:@types/node@^20.12.12"
import { serve } from "jsr:@std/http@^0.224.3/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// Interface for data coming from openai_prayer_logs JOINED with profiles
interface PrayerLogFromDB {
  id: string; // Log ID
  user_id: string;
  created_at: string; // Log creation timestamp
  slot: string; // "morning", "evening", etc.
  was_successful: boolean;
  error_message: string | null;
  openai_response_id: string | null;
  openai_model_used: string | null;
  openai_call_duration_ms: number | null;
  openai_usage_input_tokens: number | null;
  openai_usage_output_tokens: number | null;
  openai_usage_total_tokens: number | null;
  openai_usage_cached_tokens: number | null; // Added to see if we can use it
  raw_prayer_output: string | null; // Added
  openai_input_prompt: string | null; // Added
  session_changes_payload: Record<string, any> | null; // Added
  openai_instructions: string | null; // Added
  openai_previous_response_id: string | null; // Added
  profiles: { display_name: string | null } | null; // For joined data
  // Add other relevant fields from openai_prayer_logs if needed for display
}

// Interface expected by the Command Center frontend
interface PrayerHistoryEntry {
  id: string; // Will use the log ID
  userId: string;
  userName: string;
  slot: string; // Will be formatted to YYYY-MM-DD-am/pm
  generatedAt: string; // Will be the log's created_at
  status: "success" | "error" | "pending";
  liked: boolean | null; // Will be null from logs
  categories: string[]; // Will be empty or derived if possible in future
  openaiResponseId: string | null;
  openaiModelUsed: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cachedTokens: number | null;
  estimatedCost?: number | null; // Added for cost
  rawPrayerOutput: string | null; // Now mandatory from this function for details
  inputPrompt: string | null; // Now mandatory from this function for details
  sessionChangesPayload: Record<string, any> | null; // Now mandatory
  openaiInstructions: string | null;
  openaiPreviousResponseId: string | null;
}

// Pricing (per million tokens)
const GPT4O_INPUT_COST_PER_MILLION_TOKENS = 5.00;
const GPT4O_CACHED_INPUT_COST_PER_MILLION_TOKENS = 2.50;
const GPT4O_OUTPUT_COST_PER_MILLION_TOKENS = 20.00;

// GPT-4.1 pricing (per million tokens)
const GPT41_INPUT_COST_PER_MILLION_TOKENS = 2.00;
const GPT41_OUTPUT_COST_PER_MILLION_TOKENS = 8.00;

// Fallback for gpt-4o-mini or other models if needed - keeping previous values as example
const GPT4O_MINI_INPUT_COST_PER_MILLION_TOKENS = 0.15;
const GPT4O_MINI_OUTPUT_COST_PER_MILLION_TOKENS = 0.60;

function calculateEstimatedCost(
  model: string | null, 
  inputTokens: number | null, 
  outputTokens: number | null,
  cachedTokens: number | null // Added cachedTokens parameter
): number | null {
  if (!model || inputTokens === null || outputTokens === null || inputTokens < 0 || outputTokens < 0) {
    return null;
  }

  let inputCostPerMillion: number;
  let outputCostPerMillion: number;
  let cachedInputCostPerMillion: number | null = null;

  // Normalize model name for comparison
  const normalizedModel = model.toLowerCase();

  if (normalizedModel.includes("gpt-4o-mini")) {
    inputCostPerMillion = GPT4O_MINI_INPUT_COST_PER_MILLION_TOKENS;
    outputCostPerMillion = GPT4O_MINI_OUTPUT_COST_PER_MILLION_TOKENS;
  } else if (normalizedModel.includes("gpt-4.1")) { // Catches gpt-4.1-2025-04-14 and variants
    inputCostPerMillion = GPT41_INPUT_COST_PER_MILLION_TOKENS;
    outputCostPerMillion = GPT41_OUTPUT_COST_PER_MILLION_TOKENS;
  } else if (normalizedModel.includes("gpt-4o")) { // Catches variants like gpt-4o-2024-05-13 etc.
    inputCostPerMillion = GPT4O_INPUT_COST_PER_MILLION_TOKENS;
    outputCostPerMillion = GPT4O_OUTPUT_COST_PER_MILLION_TOKENS;
    cachedInputCostPerMillion = GPT4O_CACHED_INPUT_COST_PER_MILLION_TOKENS;
  } else {
    console.warn(`Unknown model for pricing: ${model}`);
    return null; 
  }

  let cost = 0;
  // Calculate cost for non-cached input tokens
  // If cachedTokens field is present and reliable, adjust inputTokens calculation.
  // For now, assuming inputTokens is the total prompt tokens if cachedTokens isn't distinctly used.
  let nonCachedInputTokens = inputTokens;
  if (cachedInputCostPerMillion !== null && cachedTokens !== null && cachedTokens > 0) {
    cost += (cachedTokens / 1000000) * cachedInputCostPerMillion;
    nonCachedInputTokens = Math.max(0, inputTokens - cachedTokens); // Avoid negative
  }
  cost += (nonCachedInputTokens / 1000000) * inputCostPerMillion;
  cost += (outputTokens / 1000000) * outputCostPerMillion;
  
  return cost;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY"); // Use ANON key for user auth
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables.");
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const incomingToken = authHeader.replace("Bearer", "").trim();

    if (incomingToken !== supabaseServiceRoleKey) {
      // Create a Supabase client with the ANON key to check user authentication
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: {
          persistSession: false,
        },
      });

      const { data: { user }, error: authError } = await authClient.auth.getUser();

      if (authError || !user) {
        console.error("Authentication error:", authError?.message);
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid or missing token." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          }
        );
      }
    }
    
    // If authentication is successful, create a client with SERVICE_ROLE_KEY for data fetching
    const serviceClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Select from openai_prayer_logs and join with profiles
    const selectQuery = `
      id,
      user_id,
      created_at,
      slot,
      was_successful,
      error_message,
      openai_response_id,
      openai_model_used,
      openai_call_duration_ms,
      openai_usage_input_tokens,
      openai_usage_output_tokens,
      openai_usage_total_tokens,
      openai_usage_cached_tokens,
      raw_prayer_output,
      openai_input_prompt,
      session_changes_payload,
      openai_instructions,
      openai_previous_response_id,
      profiles ( display_name )
    `;

    const { data, error } = await serviceClient
      .from("openai_prayer_logs") // Querying the correct table now
      .select(selectQuery)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<PrayerLogFromDB[]>();

    if (error) {
      console.error("Supabase query error:", error.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch prayer logs.", details: error.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const prayerHistory: PrayerHistoryEntry[] = (data || []).map((log) => {
      const datePart = new Date(log.created_at).toISOString().split('T')[0];
      const slotSuffix = log.slot === 'morning' ? 'am' : (log.slot === 'evening' ? 'pm' : log.slot);
      const formattedSlot = `${datePart}-${slotSuffix}`;

      let status: PrayerHistoryEntry["status"] = "pending";
      if (log.was_successful) {
        status = "success";
      } else if (log.error_message) {
        status = "error";
      }
      // Note: 'pending' status might not be directly inferable from this table 
      // if it only logs completed (success/failure) attempts.

      const estimatedCost = calculateEstimatedCost(
        log.openai_model_used,
        log.openai_usage_input_tokens,
        log.openai_usage_output_tokens,
        log.openai_usage_cached_tokens
      );

      return {
        id: log.id, // Using log ID
        userId: log.user_id,
        userName: log.profiles?.display_name || "Unknown User",
        slot: formattedSlot, // Formatted slot
        generatedAt: log.created_at,
        status: status,
        liked: null, // 'liked' status is not in openai_prayer_logs
        categories: [], // 'categories' are not directly in openai_prayer_logs
        openaiResponseId: log.openai_response_id,
        openaiModelUsed: log.openai_model_used,
        errorMessage: log.error_message,
        durationMs: log.openai_call_duration_ms,
        inputTokens: log.openai_usage_input_tokens,
        outputTokens: log.openai_usage_output_tokens,
        totalTokens: log.openai_usage_total_tokens,
        cachedTokens: log.openai_usage_cached_tokens,
        estimatedCost: estimatedCost,
        rawPrayerOutput: log.raw_prayer_output !== undefined ? log.raw_prayer_output : null,
        inputPrompt: log.openai_input_prompt !== undefined ? log.openai_input_prompt : null,
        sessionChangesPayload: log.session_changes_payload !== undefined ? log.session_changes_payload : null,
        openaiInstructions: log.openai_instructions !== undefined ? log.openai_instructions : null,
        openaiPreviousResponseId: log.openai_previous_response_id !== undefined ? log.openai_previous_response_id : null,
      };
    });

    return new Response(JSON.stringify(prayerHistory), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Unhandled error in get-prayer-history function:", error.message || err);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown server error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

serve(handler); 