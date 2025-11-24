// @deno-types="npm:@types/node@^20.12.12"
import { serve } from "jsr:@std/http@^0.224.3/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// Define the structure of the data we expect to return
// This should align with ActualUser in the frontend
interface ActualUserForEdge {
  id: string;
  email: string | null;
  displayName: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  lastSignInAt: string | null; // Will be null for now
  hasCompletedOnboarding: boolean | null;
  isAnonymous: boolean | null;
  // New Adapty-related fields
  adapty_customer_user_id: string | null;
  current_access_level: string | null;
  premium_access_expires_at: string | null;
}

// Define the structure of the data as it comes from the DB query from profiles table
interface ProfileFromDB {
  id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  has_completed_onboarding: boolean | null;
  is_anonymous: boolean | null;
  // New Adapty-related fields from profiles table
  adapty_customer_user_id: string | null;
  current_access_level: string | null;
  premium_access_expires_at: string | null;
}

async function getProfiles(supabaseClient: SupabaseClient): Promise<ProfileFromDB[]> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select(`
      id,
      email,
      display_name,
      first_name,
      avatar_url,
      created_at,
      updated_at,
      has_completed_onboarding,
      is_anonymous,
      adapty_customer_user_id,
      current_access_level,
      premium_access_expires_at
    `)
    .order('created_at', { ascending: false })
    .returns<ProfileFromDB[]>();

  if (error) {
    console.error("Error fetching profiles:", error);
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
      console.error("Missing Supabase environment variables.");
      return new Response(JSON.stringify({ error: "Server configuration error." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
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

    const serviceClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const profilesData = await getProfiles(serviceClient);

    const users: ActualUserForEdge[] = profilesData.map((p) => ({
      id: p.id,
      email: p.email,
      displayName: p.display_name,
      firstName: p.first_name,
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      lastSignInAt: null,
      hasCompletedOnboarding: p.has_completed_onboarding,
      isAnonymous: p.is_anonymous,
      adapty_customer_user_id: p.adapty_customer_user_id,
      current_access_level: p.current_access_level,
      premium_access_expires_at: p.premium_access_expires_at,
    }));

    return new Response(JSON.stringify(users), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error in get-users function:", error.message, (error as any).stack);
    return new Response(JSON.stringify({ error: error.message || "An unknown server error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}

serve(handler); 