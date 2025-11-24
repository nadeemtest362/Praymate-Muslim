import { serve } from "jsr:@std/http@^0.224.3";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

interface RetroactiveUnlockRequest {
  userId: string;
}

async function handleRetroactiveUnlock(req: Request): Promise<Response> {
  try {
    const { userId } = await req.json() as RetroactiveUnlockRequest;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Find all completed prayers for this user
    const { data: completedPrayers, error: prayersError } = await supabaseAdmin
      .from("prayers")
      .select("id, completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null);

    if (prayersError) {
      console.error("Error fetching completed prayers:", prayersError);
      return new Response(JSON.stringify({ error: "Failed to fetch completed prayers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!completedPrayers || completedPrayers.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No completed prayers found",
        unlocked: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Extract unique dates from completed prayers
    const uniqueDates = new Set<string>();
    completedPrayers.forEach(prayer => {
      if (prayer.completed_at) {
        const date = new Date(prayer.completed_at).toISOString().split('T')[0];
        uniqueDates.add(date);
      }
    });

    // 3. Create challenge unlock records for each unique date
    const unlockPromises = Array.from(uniqueDates).map(date => 
      supabaseAdmin
        .from("daily_challenge_progress")
        .upsert({
          user_id: userId,
          challenge_date: date,
          unlocked_at: completedPrayers.find(p => 
            p.completed_at && new Date(p.completed_at).toISOString().split('T')[0] === date
          )?.completed_at || new Date().toISOString()
        }, {
          onConflict: 'user_id,challenge_date'
        })
    );

    await Promise.all(unlockPromises);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Retroactively unlocked ${uniqueDates.size} challenge days`,
      unlockedDates: Array.from(uniqueDates)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Unhandled error in retroactive-unlock:", error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}

if (import.meta.main) {
  serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    return await handleRetroactiveUnlock(req);
  });
} 