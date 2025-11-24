import { serve } from "jsr:@std/http@^0.224.3/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// Interfaces for payloads and responses
interface FlowPayload {
  name?: string; // Required for POST, optional for PUT/PATCH
  version?: string; // Required for POST, optional for PUT/PATCH
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'EXPERIMENT'; // Required for POST, optional for PUT/PATCH
  description?: string;
}

interface OnboardingFlow {
  id: string;
  name: string;
  version: string;
  status: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface OnboardingStep {
  id: string;
  step_order: number;
  screen_type: string;
  config: Record<string, any>;
  tracking_event_name?: string;
  created_at: string;
  updated_at: string;
}

interface OnboardingFlowDetails extends OnboardingFlow {
  steps: OnboardingStep[];
}

// Helper to get Supabase clients and authenticate
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
  // Admin validated by JWT from Command Center

  const serviceClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { user, serviceClient, authClient };
}

async function handleGetList(serviceClient: SupabaseClient, url: URL): Promise<Response> {
  const statusFilter = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let query = serviceClient
    .from('onboarding_flows')
    .select('id, name, version, status, description, created_at, updated_at', { count: 'exact' });

  if (statusFilter) query = query.eq('status', statusFilter);
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query.returns<OnboardingFlow[]>();
  if (error) throw error;
  return new Response(JSON.stringify({ data: data || [], count: count || 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
}

async function handlePostCreate(serviceClient: SupabaseClient, req: Request): Promise<Response> {
  const payload: FlowPayload = await req.json();
  if (!payload.name || !payload.version || !payload.status) {
    throw { status: 400, message: "Missing required fields: name, version, and status are required." };
  }
  const validStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED', 'EXPERIMENT'];
  if (!validStatuses.includes(payload.status)) {
    throw { status: 400, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
  }

  const { data: newFlow, error } = await serviceClient
    .from('onboarding_flows')
    .insert({ name: payload.name, version: payload.version, status: payload.status, description: payload.description })
    .select().single();
  
  if (error) {
    if (error.code === '23505') throw { status: 409, message: "Conflict: Flow with similar properties might already exist.", details: error.message };
    throw error;
  }
  return new Response(JSON.stringify(newFlow), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 });
}

async function handleGetDetails(serviceClient: SupabaseClient, flowId: string): Promise<Response> {
  const { data: flowData, error: flowError } = await serviceClient
    .from('onboarding_flows')
    .select('id, name, version, status, description, created_at, updated_at')
    .eq('id', flowId).single();

  if (flowError) {
    if (flowError.code === 'PGRST116') throw { status: 404, message: "Onboarding flow not found." };
    throw flowError;
  }

  const { data: stepsData, error: stepsError } = await serviceClient
    .from('onboarding_flow_steps')
    .select('id, step_order, screen_type, config, tracking_event_name, created_at, updated_at')
    .eq('flow_id', flowId).order('step_order', { ascending: true }).returns<OnboardingStep[]>();

  if (stepsError) throw stepsError;

  const responsePayload: OnboardingFlowDetails = { ...flowData, steps: stepsData || [] };
  return new Response(JSON.stringify(responsePayload), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
}

async function handlePutUpdate(serviceClient: SupabaseClient, flowId: string, req: Request): Promise<Response> {
  const payload: FlowPayload = await req.json();
  if (Object.keys(payload).length === 0) {
    throw { status: 400, message: "Request body cannot be empty for update." };
  }
  if (payload.status) {
    const validStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED', 'EXPERIMENT'];
    if (!validStatuses.includes(payload.status)) {
      throw { status: 400, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
    }
  }

  const { data: updatedFlow, error } = await serviceClient
    .from('onboarding_flows').update(payload).eq('id', flowId).select().single();

  if (error) {
    if (error.code === 'PGRST116') throw { status: 404, message: "Onboarding flow not found." };
    throw error;
  }
  return new Response(JSON.stringify(updatedFlow), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
}

async function handleDelete(serviceClient: SupabaseClient, flowId: string): Promise<Response> {
  const { data: existingFlow, error: fetchError } = await serviceClient
      .from('onboarding_flows').select('id').eq('id', flowId).maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
  if (!existingFlow) throw { status: 404, message: "Onboarding flow not found." };

  const { error: deleteError, count } = await serviceClient
      .from('onboarding_flows').delete({ count: 'exact' }).eq('id', flowId);

  if (deleteError) throw deleteError;
  if (count === 0) throw { status: 404, message: "Onboarding flow not found during delete attempt (race condition or RLS issue?)." }; 

  return new Response(null, { headers: corsHeaders, status: 204 });
}


serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { serviceClient } = await getSupabaseClients(req);
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    // Expected path: /admin-onboarding-flows  OR /admin-onboarding-flows/:flowId

    if (pathSegments.length === 1 && pathSegments[0] === 'admin-onboarding-flows') {
      if (req.method === "GET") return await handleGetList(serviceClient, url);
      if (req.method === "POST") return await handlePostCreate(serviceClient, req);
    } else if (pathSegments.length === 2 && pathSegments[0] === 'admin-onboarding-flows') {
      const flowId = pathSegments[1];
      if (req.method === "GET") return await handleGetDetails(serviceClient, flowId);
      if (req.method === "PUT" || req.method === "PATCH") return await handlePutUpdate(serviceClient, flowId, req);
      if (req.method === "DELETE") return await handleDelete(serviceClient, flowId);
    }
    
    return new Response(JSON.stringify({ error: "Not Found: Invalid path or method." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 });

  } catch (e: any) {
    console.error("Error in admin-onboarding-flows main handler:", e.message, e.details, e.stack);
    const status = typeof e.status === 'number' ? e.status : 500;
    const message = typeof e.message === 'string' ? e.message : "An unknown server error occurred";
    const details = typeof e.details === 'string' ? e.details : undefined;
    return new Response(JSON.stringify({ error: message, details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
  }
}); 