import { serve } from "jsr:@std/http@^0.224.3/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// Interfaces
interface StepPayload {
  step_order?: number; // Required for POST, optional for PUT/PATCH
  screen_type?: string; // Required for POST, optional for PUT/PATCH
  config?: Record<string, any>; // Required for POST, optional for PUT/PATCH
  tracking_event_name?: string;
}

// Helper to get Supabase clients and authenticate (similar to admin-onboarding-flows)
async function getSupabaseClients(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw { status: 500, message: "Server configuration error: Missing Supabase environment variables." };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw { status: 401, message: "Unauthorized: Missing Authorization header." };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    throw { status: 401, message: "Unauthorized: Invalid or missing admin token." };
  }

  const serviceClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { user, serviceClient };
}

// POST /admin-onboarding-flow-steps/:flowId/steps - Add a new step to a flow
async function handlePostAddStep(serviceClient: SupabaseClient, flowId: string, req: Request): Promise<Response> {
  const payload: StepPayload = await req.json();
  if (payload.step_order === undefined || !payload.screen_type || !payload.config) {
    throw { status: 400, message: "Missing required fields: step_order, screen_type, and config are required." };
  }

  // Verify flowId exists
  const { data: existingFlow, error: flowCheckError } = await serviceClient
    .from('onboarding_flows').select('id').eq('id', flowId).maybeSingle();
  if (flowCheckError && flowCheckError.code !== 'PGRST116') throw flowCheckError;
  if (!existingFlow) throw { status: 404, message: `Parent flow with id ${flowId} not found.` };

  const { data: newStep, error } = await serviceClient
    .from('onboarding_flow_steps')
    .insert({ flow_id: flowId, step_order: payload.step_order, screen_type: payload.screen_type, config: payload.config, tracking_event_name: payload.tracking_event_name })
    .select().single();

  if (error) {
    if (error.code === '23505') throw { status: 409, message: "Conflict: Step with this order already exists for this flow.", details: error.message };
    throw error;
  }
  return new Response(JSON.stringify(newStep), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 });
}

// PUT /admin-onboarding-flow-steps/:flowId/steps/:stepId - Update a step
async function handlePutUpdateStep(serviceClient: SupabaseClient, flowId: string, stepId: string, req: Request): Promise<Response> {
  const payload: StepPayload = await req.json();
  if (Object.keys(payload).length === 0) {
    throw { status: 400, message: "Request body cannot be empty for update." };
  }

  const { data: updatedStep, error } = await serviceClient
    .from('onboarding_flow_steps')
    .update(payload).eq('id', stepId).eq('flow_id', flowId).select().single();

  if (error) {
    if (error.code === 'PGRST116') throw { status: 404, message: "Onboarding flow step not found or not part of the specified flow." };
    if (error.code === '23505') throw { status: 409, message: "Conflict: Update would cause a duplicate step_order for this flow.", details: error.message };
    throw error;
  }
  return new Response(JSON.stringify(updatedStep), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
}

// DELETE /admin-onboarding-flow-steps/:flowId/steps/:stepId - Delete a step
async function handleDeleteStep(serviceClient: SupabaseClient, flowId: string, stepId: string): Promise<Response> {
  const { error, count } = await serviceClient
    .from('onboarding_flow_steps').delete({ count: 'exact' }).eq('id', stepId).eq('flow_id', flowId);

  if (error) throw error;
  if (count === 0) throw { status: 404, message: "Onboarding flow step not found or not part of the specified flow." };

  return new Response(null, { headers: corsHeaders, status: 204 });
}


serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { serviceClient } = await getSupabaseClients(req);
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment); // Remove empty segments
    // Expected paths:
    // POST   /admin-onboarding-flow-steps/:flowId/steps
    // PUT    /admin-onboarding-flow-steps/:flowId/steps/:stepId
    // DELETE /admin-onboarding-flow-steps/:flowId/steps/:stepId
    
    // Check if the base path matches
    if (pathSegments.length >= 3 && pathSegments[0] === 'admin-onboarding-flow-steps' && pathSegments[2] === 'steps') {
      const flowId = pathSegments[1];
      
      if (req.method === "POST" && pathSegments.length === 3) {
        return await handlePostAddStep(serviceClient, flowId, req);
      }
      
      if (pathSegments.length === 4) { // Operations requiring a stepId
        const stepId = pathSegments[3];
        if (req.method === "PUT" || req.method === "PATCH") {
          return await handlePutUpdateStep(serviceClient, flowId, stepId, req);
        }
        if (req.method === "DELETE") {
          return await handleDeleteStep(serviceClient, flowId, stepId);
        }
      }
    }
    
    return new Response(JSON.stringify({ error: "Not Found: Invalid path or method for steps API." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 });

  } catch (e: any) {
    console.error("Error in admin-onboarding-flow-steps main handler:", e.message, e.details, e.stack);
    const status = typeof e.status === 'number' ? e.status : 500;
    const message = typeof e.message === 'string' ? e.message : "An unknown server error occurred";
    const details = typeof e.details === 'string' ? e.details : undefined;
    return new Response(JSON.stringify({ error: message, details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
}); 