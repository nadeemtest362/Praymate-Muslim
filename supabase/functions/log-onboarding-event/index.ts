import { serve } from "jsr:@std/http@^0.224.3/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

interface EventPayload {
  flow_id: string;
  step_id?: string;
  event_name: string;
  session_id?: string;
  event_data?: Record<string, any>;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    // SERVICE_ROLE_KEY is needed if we want to bypass RLS for some reason,
    // but for inserting with a WITH CHECK policy based on auth.uid(), ANON_KEY + user's JWT is enough.
    // However, to align with other functions that might perform more complex operations or need to read/write other tables,
    // using service_role for the actual DB write after auth is a consistent pattern.
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); 

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables for log-onboarding-event.");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

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
      console.error("Authentication error in log-onboarding-event:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or missing token." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const payload: EventPayload = await req.json();

    if (!payload.flow_id || !payload.event_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: flow_id and event_name are required." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400, // Bad Request
        }
      );
    }

    // Use service role client for the insert, though the RLS policy will use auth.uid() from the user's session
    const serviceClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { 
            persistSession: false, 
            autoRefreshToken: false,
            // We need to ensure the RLS policy can access auth.uid() from the original user's session.
            // This is typically handled by Supabase if the serviceClient makes requests in the context of the user.
            // Alternatively, if using a client just with service_role_key, it bypasses RLS.
            // For INSERT with RLS check on user_id = auth.uid(), it might be simpler to use a client 
            // authenticated as the user (authClient above already is).
            // Let's use authClient for the insert to ensure RLS with `auth.uid()` check works as intended.
        }
    });

    const eventToInsert = {
      user_id: user.id, // Critical: Use the authenticated user's ID
      flow_id: payload.flow_id,
      step_id: payload.step_id,
      event_name: payload.event_name,
      session_id: payload.session_id,
      event_data: payload.event_data,
    };

    // Using authClient for the insert to ensure RLS policy `WITH CHECK (auth.uid() = user_id)` applies correctly.
    const { error: insertError } = await authClient
      .from('onboarding_analytics_events')
      .insert(eventToInsert);

    if (insertError) {
      console.error("Error inserting analytics event:", insertError);
      return new Response(JSON.stringify({ error: "Failed to log event.", details: insertError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: "Event logged successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201, // Created
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error in log-onboarding-event function:", error.message, (error as any).stack);
    const status = (err instanceof SyntaxError) ? 400 : 500; // Handle JSON parsing errors as 400
    return new Response(JSON.stringify({ error: error.message || "An unknown server error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
}

serve(handler); 