import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface MigrationRequest {
  fromUserId: string;
  toUserId: string;
}

interface CrmMergeResult {
  status: "ok" | "failed" | "skipped";
  error?: string;
  attemptCount?: number;
  fromId?: string;
  toId?: string;
  timestamp?: string;
}

async function callCrmMerge(
  fromUserId: string,
  toUserId: string,
  provider: "apple" | "email" | "unknown" = "unknown",
): Promise<CrmMergeResult> {
  const CRM_BASE = Deno.env.get("CRM_FUNCTIONS_BASE_URL") ?? "";
  const CRM_SECRET = Deno.env.get("CRM_MERGE_SECRET") ?? "";
  const CRM_ANON = Deno.env.get("CRM_SUPABASE_ANON_KEY") ?? "";

  if (!CRM_BASE || !CRM_SECRET || !CRM_ANON) {
    console.error(
      "[migrate-anonymous-data] Missing CRM envs (CRM_FUNCTIONS_BASE_URL / CRM_MERGE_SECRET / CRM_SUPABASE_ANON_KEY)",
    );
    return { status: "skipped", error: "Missing CRM environment variables" };
  }

  const url = `${CRM_BASE}/merge-identities-pair`;
  const payload = {
    fromId: fromUserId,
    toId: toUserId,
    provider,
    isAnonymousFrom: true,
  };

  let lastError = "";
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CRM_ANON}`,
          "apikey": CRM_ANON,
          "X-CRM-Secret": CRM_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 202 || res.status === 200) {
        console.log("[migrate-anonymous-data] CRM merge queued", {
          status: res.status,
        });
        return { status: "ok" };
      } else {
        const txt = await res.text().catch(() => "");
        lastError = `HTTP ${res.status}: ${txt}`;
        console.warn("[migrate-anonymous-data] CRM merge non-2xx", {
          status: res.status,
          txt,
          attempt: attempt + 1,
        });
      }
    } catch (e) {
      lastError = String(e);
      console.warn("[migrate-anonymous-data] CRM merge failed", {
        attempt: attempt + 1,
        message: lastError,
      });
    }

    if (attempt < maxAttempts - 1) {
      const backoff = Math.min(1000 * 2 ** attempt, 4000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  console.error(
    "[migrate-anonymous-data] CRM merge ultimately failed (will rely on CRM backstop)",
    { lastError },
  );

  return {
    status: "failed",
    error: lastError,
    attemptCount: maxAttempts,
    fromId: fromUserId,
    toId: toUserId,
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { fromUserId, toUserId }: MigrationRequest = await req.json();

    if (!fromUserId || !toUserId) {
      throw new Error("Both fromUserId and toUserId are required");
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Begin migration process
    console.log(
      `[migrate-anonymous-data] Starting migration from ${fromUserId} to ${toUserId}`,
    );

    // Track CRM merge result throughout the function
    let crmMergeResult: CrmMergeResult = {
      status: "skipped",
      error: "Profile migration did not complete",
    };

    // 1. Copy profile data
    const { data: anonProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", fromUserId)
      .single();

    if (profileError) {
      console.error(
        "[migrate-anonymous-data] Error fetching anonymous profile:",
        profileError,
      );
      // Continue anyway - the user might not have a profile yet
    }

    if (anonProfile) {
      // Update the authenticated user's profile with onboarding data
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: toUserId,
          first_name: anonProfile.first_name,
          created_at: anonProfile.created_at,
          timezone: anonProfile.timezone,
          // Preserve onboarding-related fields
          has_completed_onboarding: anonProfile.has_completed_onboarding,
          onboarding_completed_at: anonProfile.onboarding_completed_at,
          initial_motivation: anonProfile.initial_motivation,
          relationship_with_god: anonProfile.relationship_with_god,
          prayer_frequency: anonProfile.prayer_frequency,
          faith_tradition: anonProfile.faith_tradition,
          commitment_level: anonProfile.commitment_level,
          streak_goal_days: anonProfile.streak_goal_days,
          mood: anonProfile.mood,
          mood_context: anonProfile.mood_context,
          prayer_needs: anonProfile.prayer_needs,
          custom_prayer_need: anonProfile.custom_prayer_need,
          prayer_times: anonProfile.prayer_times,
          onboarding_flow_id: anonProfile.onboarding_flow_id,
          onboarding_started_at: anonProfile.onboarding_started_at,
          onboarding_current_step: anonProfile.onboarding_current_step,
          // Prayer generation conversation history
          last_openai_response_id: anonProfile.last_openai_response_id,
          // Track migration source
          migrated_from_user_id: fromUserId,
          // Update metadata to show this was migrated
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        console.error(
          "[migrate-anonymous-data] Error updating profile:",
          updateError,
        );
        throw updateError;
      }

      // Profile migration succeeded - call CRM merge
      // This call is non-blocking and will not fail the migration if it fails
      try {
        console.log(
          "[migrate-anonymous-data] Profile migration succeeded, calling CRM merge",
        );
        crmMergeResult = await callCrmMerge(fromUserId, toUserId, "unknown");
      } catch (e) {
        console.error("[migrate-anonymous-data] CRM merge threw exception", {
          error: String(e),
        });
        crmMergeResult = {
          status: "failed",
          error: String(e),
          attemptCount: 0,
          fromId: fromUserId,
          toId: toUserId,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // 2. Migrate prayer_people
    const { data: prayerPeople, error: peopleError } = await supabaseAdmin
      .from("prayer_focus_people")
      .select("*")
      .eq("user_id", fromUserId);

    if (peopleError) {
      console.error(
        "[migrate-anonymous-data] Error fetching prayer people:",
        peopleError,
      );
    }

    if (prayerPeople && prayerPeople.length > 0) {
      // Update user_id for all prayer people
      for (const person of prayerPeople) {
        const { error: updatePersonError } = await supabaseAdmin
          .from("prayer_focus_people")
          .update({ user_id: toUserId })
          .eq("id", person.id);

        if (updatePersonError) {
          console.error(
            "[migrate-anonymous-data] Error updating prayer person:",
            updatePersonError,
          );
        }
      }
    }

    // 3. Migrate prayer_intentions
    const { data: intentions, error: intentionsError } = await supabaseAdmin
      .from("prayer_intentions")
      .select("*")
      .eq("user_id", fromUserId);

    if (intentionsError) {
      console.error(
        "[migrate-anonymous-data] Error fetching intentions:",
        intentionsError,
      );
    }

    if (intentions && intentions.length > 0) {
      // Update user_id for all intentions
      for (const intention of intentions) {
        const { error: updateIntentionError } = await supabaseAdmin
          .from("prayer_intentions")
          .update({ user_id: toUserId })
          .eq("id", intention.id);

        if (updateIntentionError) {
          console.error(
            "[migrate-anonymous-data] Error updating intention:",
            updateIntentionError,
          );
        }
      }
    }

    // 4. Migrate prayers (if any were generated during onboarding)
    const { data: prayers, error: prayersError } = await supabaseAdmin
      .from("prayers")
      .select("*")
      .eq("user_id", fromUserId);

    if (prayersError) {
      console.error(
        "[migrate-anonymous-data] Error fetching prayers:",
        prayersError,
      );
    }

    if (prayers && prayers.length > 0) {
      // Update user_id for all prayers
      for (const prayer of prayers) {
        const { error: updatePrayerError } = await supabaseAdmin
          .from("prayers")
          .update({ user_id: toUserId })
          .eq("id", prayer.id);

        if (updatePrayerError) {
          console.error(
            "[migrate-anonymous-data] Error updating prayer:",
            updatePrayerError,
          );
        }
      }
    }

    // 5. Clean up anonymous user data (optional)
    // For now, we'll keep the anonymous user data for debugging
    // In production, you might want to delete it after successful migration

    console.log(`[migrate-anonymous-data] Migration completed successfully`);

    // Build response with CRM merge status
    const responseBody: any = {
      success: true,
      message: "Data migrated successfully",
      migrated: {
        profile: !!anonProfile,
        prayerPeople: prayerPeople?.length || 0,
        intentions: intentions?.length || 0,
        prayers: prayers?.length || 0,
      },
      crmMerge: crmMergeResult.status,
    };

    // Include detailed error info if CRM merge failed
    if (crmMergeResult.status === "failed" && crmMergeResult.error) {
      responseBody.crmMergeDetails = {
        error: crmMergeResult.error,
        attemptCount: crmMergeResult.attemptCount,
        fromId: crmMergeResult.fromId,
        toId: crmMergeResult.toId,
        timestamp: crmMergeResult.timestamp,
      };
    }

    return new Response(
      JSON.stringify(responseBody),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("[migrate-anonymous-data] Error:", error);

    // If we have a crmMergeResult in scope, include it in error response
    // Note: crmMergeResult will be undefined if error happened before profile migration
    const errorBody: any = {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };

    return new Response(
      JSON.stringify(errorBody),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
