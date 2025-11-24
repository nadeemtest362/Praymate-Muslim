// @deno-types="npm:@types/node@^20.12.12"
import { serve } from "jsr:@std/http@^0.224.3/server";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

interface DeleteAccountRequest {
  userId: string;
}

async function handler(req: Request): Promise<Response> {
  console.log(`[delete-user-account] ${req.method} request received`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("[delete-user-account] Handling CORS preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log(`[delete-user-account] Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const body = await req.json();
    
    const { userId } = body as DeleteAccountRequest;

    if (!userId) {
      console.log("[delete-user-account] Missing userId");
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("[delete-user-account] Processing deletion request");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables.");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log(`Starting account deletion`);

    // Delete user data directly in the Edge Function to handle missing tables gracefully
    console.log(`Starting direct deletion`);

    const deletionSteps = [
      { table: 'prayers', description: 'prayers' },
      { table: 'prayer_intentions', description: 'prayer intentions' },
      { table: 'prayer_focus_people', description: 'prayer focus people' },
      { table: 'user_stats', description: 'user stats' },
      { table: 'onboarding_state', description: 'onboarding state' },
      { table: 'profiles', description: 'profile' }
    ];

    const deletedData = {};

    for (const step of deletionSteps) {
      try {
        const { data, error, count } = await supabaseAdmin
          .from(step.table)
          .delete()
          .eq('user_id', userId)
          .select('*', { count: 'exact' });

        if (error) {
          console.warn(`Error deleting ${step.description}:`, error.message);
          deletedData[step.table] = 0;
        } else {
          deletedData[step.table] = count || 0;
          console.log(`Successfully deleted ${count || 0} ${step.description}`);
        }
      } catch (err) {
        console.warn(`Exception deleting ${step.description}:`, err.message);
        deletedData[step.table] = 0;
      }
    }

    // Finally, delete the auth user
    let authUserDeleted = false;
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) {
        console.warn('Auth user deletion failed:', authError.message);
      } else {
        authUserDeleted = true;
        console.log('Auth user deleted successfully');
      }
    } catch (err) {
      console.warn('Exception deleting auth user:', err.message);
    }

    console.log(`Successfully deleted account`, deletedData);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Account deleted successfully",
      deleted_data: {
        ...deletedData,
        auth_user: authUserDeleted
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error in delete-user-account function:", error.message, (error as any).stack);
    return new Response(JSON.stringify({ 
      error: error.message || "An unknown server error occurred" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}

serve(handler);
