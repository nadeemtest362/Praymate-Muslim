import { serve } from "jsr:@std/http@^0.224.3/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

interface OnboardingStepFromDB {
  id: string;
  step_order: number;
  screen_type: string;
  config: Record<string, any>; // JSONB comes as an object
  tracking_event_name?: string;
}

interface OnboardingFlowResponse {
  flow_id: string;
  flow_name: string;
  flow_version: string;
  steps: OnboardingStepFromDB[];
  current_step: number;
  is_continuing: boolean;
}

async function getActiveOnboardingFlows(client: SupabaseClient): Promise<any[]> {
  const { data, error } = await client
    .from('onboarding_flows')
    .select('id, name, version, traffic_percentage')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching active onboarding flows:", error);
    throw error;
  }
  return data || [];
}

function selectFlowForUser(flows: any[], userId: string): any {
  if (flows.length === 0) return null;
  if (flows.length === 1) {
    // Single flow always gets 100% traffic (per product team: no user exclusion)
    console.log(`Single Flow: User ${userId} assigned to flow ${flows[0].name}`);
    return flows[0];
  }
  
  // Multiple flows: Weighted A/B test selection based on traffic percentage
  const userIdHash = userId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const userPercentile = (userIdHash % 100) + 1; // 1-100
  
  // Create cumulative distribution based on traffic percentages
  let cumulativeWeight = 0;
  const weightedFlows = flows.map(flow => {
    const weight = flow.traffic_percentage || 100;
    cumulativeWeight += weight;
    return { flow, cumulativeWeight };
  });
  
  // Normalize to 100% if total exceeds 100 (ensure all users get a flow)
  const totalWeight = cumulativeWeight;
  if (totalWeight !== 100) {
    console.log(`Info: Total traffic percentage is ${totalWeight}%. Normalizing to ensure 100% coverage.`);
    weightedFlows.forEach(item => {
      item.cumulativeWeight = (item.cumulativeWeight / totalWeight) * 100;
    });
  }
  
  // Select flow based on user percentile - guaranteed to find a match
  for (const { flow, cumulativeWeight } of weightedFlows) {
    if (userPercentile <= cumulativeWeight) {
      console.log(`A/B Test: User ${userId} assigned to flow ${flow.name} (${userPercentile}% <= ${cumulativeWeight}%)`);
      return flow;
    }
  }
  
  // Fallback: always return first flow to ensure 100% coverage
  console.log(`A/B Test: User ${userId} assigned to fallback flow ${flows[0].name}`);
  return flows[0];
}

async function getFlowSteps(client: SupabaseClient, flowId: string): Promise<OnboardingStepFromDB[]> {
  const { data, error } = await client
    .from('onboarding_flow_steps')
    .select('id, step_order, screen_type, config, tracking_event_name')
    .eq('flow_id', flowId)
    .order('step_order', { ascending: true })
    .returns<OnboardingStepFromDB[]>();

  if (error) {
    console.error(`Error fetching steps for flow_id ${flowId}:`, error);
    throw error;
  }
  return data || [];
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables for get-onboarding-flow.");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Authenticate the user making the request (e.g., mobile client)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error in get-onboarding-flow:", authError?.message);
      // Return a more specific error for missing sub claim
      const errorMessage = authError?.message?.includes('missing sub claim') 
        ? "Authentication in progress. Please try again."
        : "Unauthorized: Invalid or missing token.";
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Use service role client for fetching flow definitions
    const serviceClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Check if user has already started onboarding with a specific flow
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('onboarding_flow_id, onboarding_current_step, has_completed_onboarding')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      throw profileError;
    }

    let flowToUse;
    
    // If user has already started onboarding, use their specific flow version
    if (profile?.onboarding_flow_id) {
      console.log(`User ${user.id} continuing with flow ${profile.onboarding_flow_id}`);
      
      const { data: existingFlow, error: flowError } = await serviceClient
        .from('onboarding_flows')
        .select('id, name, version, status, traffic_percentage')
        .eq('id', profile.onboarding_flow_id)
        .single();

      if (flowError || !existingFlow) {
        console.error("User's assigned flow not found, falling back to active flow");
        // Fall back to first active flow if their flow is somehow missing
        const activeFlows = await getActiveOnboardingFlows(serviceClient);
        flowToUse = activeFlows.length > 0 ? activeFlows[0] : null;
      } else {
        flowToUse = existingFlow;
      }
    } else {
      // New user - select from active flows (enables A/B testing)
      console.log(`User ${user.id} starting fresh onboarding`);
      
      // Get all active flows for A/B testing
      const activeFlows = await getActiveOnboardingFlows(serviceClient);
      
      if (activeFlows.length === 0) {
        return new Response(JSON.stringify({ error: "No active onboarding flows available." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }
      
      // Select a flow for this user (A/B test assignment)
      flowToUse = selectFlowForUser(activeFlows, user.id);

      if (flowToUse) {
        // Record that this user has started with this flow version
        const { error: updateError } = await serviceClient
          .from('profiles')
          .update({ 
            onboarding_flow_id: flowToUse.id,
            onboarding_started_at: new Date().toISOString(),
            onboarding_current_step: 1
          })
          .eq('id', user.id);

        if (updateError) {
          console.error("Failed to record user's flow assignment:", updateError);
          // Continue anyway - better to let them start than block
        }
        
        // Track A/B test assignment
        await serviceClient
          .from('onboarding_analytics_events')
          .insert({
            user_id: user.id,
            flow_id: flowToUse.id,
            event_type: 'ab_test_assigned',
            event_data: {
              flow_name: flowToUse.name,
              flow_version: flowToUse.version,
              total_active_flows: activeFlows.length
            }
          });
      }
    }

    if (!flowToUse) {
      return new Response(JSON.stringify({ error: "No onboarding flow available." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const steps = await getFlowSteps(serviceClient, flowToUse.id);

    const responsePayload: OnboardingFlowResponse = {
      flow_id: flowToUse.id,
      flow_name: flowToUse.name,
      flow_version: flowToUse.version,
      steps: steps,
      current_step: profile?.onboarding_current_step || 1,
      is_continuing: !!profile?.onboarding_flow_id
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error in get-onboarding-flow function:", error.message, (error as any).stack);
    return new Response(JSON.stringify({ error: error.message || "An unknown server error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}

serve(handler); 