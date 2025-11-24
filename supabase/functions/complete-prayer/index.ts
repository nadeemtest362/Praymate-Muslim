import { serve } from "jsr:@std/http@^0.224.3";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

interface CompletePrayerRequest {
  prayerId: string;
  userId: string;
}

async function handleCompletePrayer(req: Request): Promise<Response> {
  try {
    const { prayerId, userId } = await req.json() as CompletePrayerRequest;

    if (!prayerId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Mark prayer as completed (use COALESCE to preserve auto-completion if it happened first)
    const { error: prayerUpdateError } = await supabaseAdmin
      .rpc('complete_prayer_with_coalesce', {
        prayer_id: prayerId,
        user_id: userId,
        completion_time: new Date().toISOString()
      });

    if (prayerUpdateError) {
      console.error("Error updating prayer:", prayerUpdateError);
      return new Response(JSON.stringify({ error: "Failed to mark prayer as completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // 2. The database trigger on prayers table will automatically update user_stats
    // No need to manually update streak here anymore
    
    // 3. Get updated streak values from user_stats for response
    const { data: userStats } = await supabaseAdmin
      .from("user_stats")
      .select("current_streak, total_prayers_completed")
      .eq("user_id", userId)
      .single();
      
    const newStreak = userStats?.current_streak ?? 0; // DB is authoritative; fallback to 0
    const totalCompleted = userStats?.total_prayers_completed || 1;

    // 4. Handle daily challenge unlocks
    // Get user's profile with timezone and start date
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("created_at, onboarding_completed_at, timezone")
      .eq("id", userId)
      .single();

    let unlockedDays: string[] = [];
    
    if (userProfile) {
      // Use onboarding_completed_at if available, otherwise created_at
      const startDate = userProfile.onboarding_completed_at || userProfile.created_at;
      const userTimezone = userProfile.timezone || 'America/New_York';
      
      // Get current time in user's timezone
      const now = new Date();
      const userCurrentTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
      const currentHour = userCurrentTime.getHours();
      
      // Calculate "today" with 4 AM boundary
      let adjustedToday: Date;
      if (currentHour < 4) {
        // If it's before 4 AM, we're still in yesterday for challenge purposes
        adjustedToday = new Date(userCurrentTime);
        adjustedToday.setDate(adjustedToday.getDate() - 1);
      } else {
        adjustedToday = new Date(userCurrentTime);
      }
      adjustedToday.setHours(0, 0, 0, 0); // Reset to start of day
      
      // Calculate the adjusted start date (also considering 4 AM boundary)
      const startDateTime = new Date(startDate);
      const startInUserTz = new Date(startDateTime.toLocaleString("en-US", { timeZone: userTimezone }));
      const startHour = startInUserTz.getHours();
      
      let adjustedStartDate: Date;
      if (startHour < 4) {
        // User started before 4 AM, that counts as the previous day
        adjustedStartDate = new Date(startInUserTz);
        adjustedStartDate.setDate(adjustedStartDate.getDate() - 1);
      } else {
        adjustedStartDate = new Date(startInUserTz);
      }
      adjustedStartDate.setHours(0, 0, 0, 0); // Reset to start of day
      
      // Calculate current day based on adjusted dates
      const daysSinceStart = Math.floor((adjustedToday.getTime() - adjustedStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentChallengeDay = Math.min(daysSinceStart + 1, 30); // Cap at 30 days
      
      console.log(`User ${userId} - Start: ${adjustedStartDate.toISOString()}, Today: ${adjustedToday.toISOString()}, Current Day: ${currentChallengeDay}`);
      
      // Unlock all days from day 1 up to the current day
      const unlockPromises = [];
      for (let i = 0; i < currentChallengeDay && i < 30; i++) {
        const challengeDate = new Date(adjustedStartDate);
        challengeDate.setDate(challengeDate.getDate() + i);
        const dateStr = challengeDate.toISOString().split('T')[0];
        
        unlockPromises.push(
          supabaseAdmin
            .from("daily_challenge_progress")
            .upsert({
              user_id: userId,
              challenge_date: dateStr,
              day_number: i + 1,  // Add day_number for the challenge day
              unlocked_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,challenge_date'
            })
            .then(() => dateStr)
        );
      }
      
      // Execute all unlocks in parallel
      try {
        unlockedDays = await Promise.all(unlockPromises);
        console.log(`Unlocked challenge days 1 through ${currentChallengeDay} for dates: ${unlockedDays.join(', ')}`);
      } catch (error) {
        console.error("Error unlocking challenge days:", error);
        // Don't fail the prayer completion if challenge unlock fails
      }
    }

    // 5. Update PRAYLOCK completion status if enabled
    if (userProfile) {
      const userTimezone = userProfile.timezone || 'America/New_York';
      const now = new Date();
      const userCurrentTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
      const currentHour = userCurrentTime.getHours();
      
      // Determine which prayer window we're in
      // Morning window: 4 AM - 4 PM (hour 4-15)
      // Evening window: 4 PM - 4 AM (hour 16-3)
      const isMorningWindow = currentHour >= 4 && currentHour < 16;
      
      // Check if user has PRAYLOCK enabled
      const { data: praylockSettings } = await supabaseAdmin
        .from("praylock_settings")
        .select("enabled, schedule")
        .eq("user_id", userId)
        .single();
      
      if (praylockSettings?.enabled) {
        const updateField = isMorningWindow ? 'morning_completed' : 'evening_completed';
        const shouldUpdate = 
          (isMorningWindow && ['morning', 'both'].includes(praylockSettings.schedule)) ||
          (!isMorningWindow && ['evening', 'both'].includes(praylockSettings.schedule));
        
        if (shouldUpdate) {
          const { error: praylockError } = await supabaseAdmin
            .from("praylock_settings")
            .update({ [updateField]: true })
            .eq("user_id", userId);
          
          if (praylockError) {
            console.error("Error updating PRAYLOCK status:", praylockError);
            // Don't fail the prayer completion if PRAYLOCK update fails
          }
        }
      }
    }

    // 6. Check for Perfect Day achievement
    let isPerfectDay = false;
    try {
      const { data: perfectDayData } = await supabaseAdmin
        .rpc('check_perfect_day_today', { p_user_id: userId });
      
      if (perfectDayData && perfectDayData.length > 0) {
        isPerfectDay = perfectDayData[0].is_perfect || false;
      }
    } catch (error) {
      console.error("Error checking perfect day:", error);
      // Don't fail the prayer completion if perfect day check fails
    }

    // 7. Determine which prayer period this completion is for
    let prayerTimeOfDay: 'morning' | 'evening' | null = null;
    if (userProfile) {
      const userTimezone = userProfile.timezone || 'America/New_York';
      const now = new Date();
      const userCurrentTime = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
      const currentHour = userCurrentTime.getHours();
      
      // Morning window: 4 AM - 4 PM (hour 4-15)
      // Evening window: 4 PM - 4 AM (hour 16-3)
      prayerTimeOfDay = (currentHour >= 4 && currentHour < 16) ? 'morning' : 'evening';
    }

    // 8. Tag OneSignal on the server (authoritative) for conditional reminders
    try {
      if (userProfile && prayerTimeOfDay) {
        const tz = userProfile.timezone || 'UTC';
        const now = new Date();
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false });
        const parts = fmt.formatToParts(now);
        const get = (t: string) => parts.find(p => p.type === t)?.value || '';
        const hour = parseInt(get('hour') || '0', 10);
        const y = get('year');
        const m = get('month');
        const d = get('day');
        let serviceDay = `${y}-${m}-${d}`;
        if (hour < 4) {
          // roll back one day in user's tz
          const onlyDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
          const dt = new Date(`${onlyDate}T00:00:00`);
          dt.setDate(dt.getDate() - 1);
          serviceDay = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
        }

        const appId = Deno.env.get('ONESIGNAL_APP_ID');
        const apiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
        if (appId && apiKey) {
          const url = `https://api.onesignal.com/apps/${appId}/users/by/external_id/${userId}`;
          const body = { tags: { [`completed_${prayerTimeOfDay}_service_day`]: serviceDay } } as any;
          const resp = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Basic ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          if (!resp.ok) {
            console.error('OneSignal tag update failed', resp.status, await resp.text());
          }
        } else {
          console.warn('OneSignal env vars not set; skipping tag update');
        }
      }
    } catch (e) {
      console.error('Error tagging OneSignal:', e);
    }

    // 9. Return success with unlock status
    return new Response(JSON.stringify({ 
      success: true,
      completedAt: new Date().toISOString(),
      dailyChallengeUnlocked: true,
      currentChallengeDay: unlockedDays.length,
      unlockedDays: unlockedDays,
      streak: newStreak,
      totalCompleted: totalCompleted,
      prayerTimeOfDay: prayerTimeOfDay,
      isPerfectDay: isPerfectDay
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Unhandled error in complete-prayer:", error);
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
    return await handleCompletePrayer(req);
  });
} 