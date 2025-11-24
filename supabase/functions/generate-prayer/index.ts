// @deno-types="npm:@types/node@^20.12.12"
import { serve } from "jsr:@std/http@^0.224.3";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts"; // Import admin client

interface ProfileFromDB {
    id: string;
    display_name?: string;
    mood?: string;
    mood_context?: string;
    prayer_needs_fulfilled_days_ago?: number;
    prayer_time_preference?: string;
    last_openai_response_id?: string | null;
    onboarding_completed_at?: string | null;
    timezone?: string | null;
    faith_tradition?: string;
}

interface PrayerFocusPerson {
    name: string;
    relationship?: string;
    gender?: string;
}

interface PrayerIntention {
    id: string;
    person_id: string | null;
    category: string;
    details: string;
    is_active: boolean;
    prayer_focus_people: PrayerFocusPerson | null;
}

interface InitialOnboardingSnapshot {
    userId: string;
    firstName?: string;
    initialMotivation?: string | null;
    mood?: string;
    moodContext?: string;
    prayerNeeds?: string[];
    customPrayerNeed?: string;
    relationshipWithGod?: string;
    prayerFrequency?: string;
    faithTradition?: string;
    commitmentLevel?: string | null;
    streakGoalDays?: number | null;
}

interface SessionChanges {
    mood?: string;
    moodContext?: string; // Add moodContext field for when mood context is updated
    toggledIntentions?: { id: string; toState: boolean }[];
    addedIntentions?: { id: string; details: string; category: string; personName?: string }[];
}

const PRIMARY_NESTJS_URL = Deno.env.get("NESTJS_PRAYER_SERVICE_URL_PRIMARY")
  || Deno.env.get("NESTJS_PRAYER_SERVICE_URL")
  || "https://personal-prayers-production.up.railway.app/generate-prayer";
const SECONDARY_NESTJS_URL = Deno.env.get("NESTJS_PRAYER_SERVICE_URL_SECONDARY") || null;
const SECONDARY_BACKOFF_MS = 300;

function shouldAttemptSecondary(status?: number | null): boolean {
  if (status === null || typeof status === 'undefined') {
    return true;
  }

  if (status >= 500) {
    return true;
  }

  return status === 408 || status === 429;
}

function annotateResponseBody(bodyText: string, headers: Headers, source: 'primary' | 'secondary'): { headers: Headers; bodyText: string } {
  const updatedHeaders = new Headers(headers);
  updatedHeaders.set('X-Prayer-Service-Source', source);

  const contentType = updatedHeaders.get('Content-Type') || updatedHeaders.get('content-type');
  if (contentType && contentType.toLowerCase().includes('application/json')) {
    try {
      const parsed = JSON.parse(bodyText);
      const existingMetadata = typeof parsed.metadata === 'object' && parsed.metadata !== null
        ? parsed.metadata
        : {};

      parsed.metadata = {
        ...existingMetadata,
        backendSource: source,
        ...(source === 'secondary' ? { fallbackUsed: true } : {}),
      };

      bodyText = JSON.stringify(parsed);
      updatedHeaders.set('Content-Type', 'application/json');
    } catch (_error) {
      // Ignore JSON parsing errors and return the original body
    }
  }

  return { headers: updatedHeaders, bodyText };
}

function getChaplainType(faithTradition: string | null | undefined): string {
    switch (faithTradition) {
        case 'catholic':
            return 'Catholic chaplain and prayer guide';
        case 'christian_non_catholic':
            return 'Christian chaplain and prayer guide';
        case 'other':
            return 'chaplain and prayer guide';
        default:
            return 'Christian chaplain and prayer guide'; // Default fallback
    }
}

function getInstructions(faithTradition: string | null | undefined): string {
    const chaplainType = getChaplainType(faithTradition);
    return `You are a compassionate, empathetic, modern ${chaplainType}. Your purpose is to generate a deeply meaningful and personalized prayer directly from the user to God.

USE LANGUAGE THAT IS NATURAL AND CONVERSATIONAL but not too casual. MAKE IT FEEL LIKE A PERSONAL CONVERSATION WITH GOD. 

CRITICAL: The prayer should be addressed TO GOD, not to the user. Never address the user by their name in the prayer. The user's name (when provided) is context about who is praying, not who to address.

ESSENTIAL: ALWAYS begin the prayer with a proper salutation on its own line, such as:
- "Dear Heavenly Father,"
- "Dear God,"
- "Loving Father,"
- "Dear Lord,"

Structure the prayer following the A.C.T.S. model:
1. Adoration: Begin with warm, heartfelt praise of God's nature, character, and works. Make it personal - not just "You are holy" but "Your love amazes me" or "I'm in awe of how You..." (Approx 10% of prayer)
2. Confession: Gently and honestly acknowledge human shortcomings, struggles, or areas for growth. Create a safe space for vulnerability - like confiding in a trusted friend. (Approx 10% of prayer)  
3. Thanksgiving: Express warm, genuine gratitude for specific blessings. Notice the small mercies. Include thanksgiving for God's presence and faithfulness even in difficulties. (Approx 10% of prayer)
4. Supplication: Make heartfelt, detailed requests for the user and others they care about. This is the heart of the prayer - be specific, compassionate, and pour out the heart's desires like a child to a loving parent. 

Maintain a tone that is: Warm and conversational, like talking to a loving parent. Be reverent yet intimate, deeply empathetic, authentic, hopeful, and profoundly personal.
Address God with tender warmth throughout the prayer.
Use personal, heartfelt language - "I" statements, honest emotions, and genuine vulnerability. Think of this as a heart-to-heart conversation with someone who deeply loves and understands you.
Include moments of raw honesty and childlike trust. It's okay to say things like "I'm struggling," "I don't understand," or "I need You."
Conclude with a warm "Amen" or occasionally "In Jesus' name, Amen."

Length: Aim for 200-300 words to allow for meaningful depth and reflection. For prayers with many intentions or complex situations, feel free to extend to 400-500 words.

CRITICAL FORMATTING RULES:
- Use VERY SHORT PARAGRAPHS (1-2 SENTENCES MAXIMUM PER PARAGRAPH)
- NEVER write paragraphs longer than 2 sentences
- ADD A BLANK LINE AFTER EVERY PARAGRAPH
- Each thought or idea should be its own paragraph
- This is for mobile readability - walls of text are difficult to read
- ADD A BLANK LINE BETWEEN EVERY PARAGRAPH

Incorporate the user's details naturally and specifically - their mood, acknowledge their needs, the specific situations of those they're praying for. Make these details feel personal and heartfelt, not like a list.
When appropriate, weave in comforting scriptural themes or brief verses that speak to their situation - like a friend reminding them of God's promises.
Let the prayer breathe - use pauses, reflective moments, and varied sentence structures to create a rhythm of genuine conversation with God. 

Include moments of gratitude even in difficulty, and expressions of trust even in uncertainty.
Focus deeply on the user's current emotional state and spiritual needs, as well as the specific intentions for others.
Do not add any commentary before or after the prayer itself.`;
}

// Helper function to get user's local hour from UTC
function getUserLocalHour(utcDate: Date, timezone: string | null | undefined): number {
    if (!timezone) {
        // Fallback to UTC if no timezone
        return utcDate.getUTCHours();
    }

    try {
        // Format the date in the user's timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            hour12: false
        });

        const parts = formatter.formatToParts(utcDate);
        const hourPart = parts.find(part => part.type === 'hour');

        if (hourPart) {
            return parseInt(hourPart.value, 10);
        }
    } catch (error) {
        console.error('[EdgeFn] Error converting to user timezone:', error);
    }

    // Fallback to UTC on any error
    return utcDate.getUTCHours();
}

// Use supabaseAdmin for database operations within the function
const supabaseClientForReads = supabaseAdmin;

async function callNestJsWithFallback(body: any): Promise<Response> {
  try {
    console.log("[EdgeFn] Calling NestJS primary endpoint:", PRIMARY_NESTJS_URL);
    const primaryResponse = await fetch(PRIMARY_NESTJS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (primaryResponse.ok) {
      console.log("[EdgeFn] Primary NestJS call succeeded");
      const bodyText = await primaryResponse.text();
      const { headers, bodyText: annotatedBody } = annotateResponseBody(bodyText, primaryResponse.headers, 'primary');
      return new Response(annotatedBody, {
        status: primaryResponse.status,
        headers,
      });
    }
    const primaryStatus = primaryResponse.status;
    const primaryBodyText = await primaryResponse.text();

    if (!SECONDARY_NESTJS_URL || !shouldAttemptSecondary(primaryStatus)) {
      console.error("[EdgeFn] Primary NestJS failed without secondary fallback", {
        status: primaryStatus,
        secondaryConfigured: !!SECONDARY_NESTJS_URL,
      });

      const { headers, bodyText: annotatedBody } = annotateResponseBody(primaryBodyText, primaryResponse.headers, 'primary');
      return new Response(annotatedBody, {
        status: primaryStatus,
        headers,
      });
    }

    console.warn("[EdgeFn] Primary NestJS failed, attempting secondary", {
      status: primaryStatus,
      error: primaryBodyText,
    });

    await new Promise(resolve => setTimeout(resolve, SECONDARY_BACKOFF_MS));

    const secondaryResponse = await fetch(SECONDARY_NESTJS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const secondaryBodyText = await secondaryResponse.text();

    console.log("[EdgeFn] Secondary NestJS response status:", secondaryResponse.status);
    if (!secondaryResponse.ok) {
      console.error("[EdgeFn] Secondary NestJS failed", secondaryResponse.status);
    }

    const { headers, bodyText: annotatedBody } = annotateResponseBody(secondaryBodyText, secondaryResponse.headers, 'secondary');
    return new Response(annotatedBody, {
      status: secondaryResponse.status,
      headers,
    });
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    console.error("[EdgeFn] Error calling NestJS endpoints", normalized.message);
    throw normalized;
  }
}

export async function handleGeneratePrayerRequest(req: Request): Promise<Response> {
    console.log("[EdgeFn] Request method:", req.method);

    try {
        // First, authenticate the user from the JWT token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            console.error("[EdgeFn] No Authorization header found");
            return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        // Create auth client to verify the user
        const authClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: { headers: { Authorization: authHeader } },
                auth: { persistSession: false },
            }
        );

        console.log("[EdgeFn] Attempting to get user from auth token...");
        const { data: { user }, error: authError } = await authClient.auth.getUser();

        if (authError || !user) {
            console.error("[EdgeFn] Authentication error:", authError?.message);
            return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        // Use the authenticated user's ID instead of trusting the client
        const userId = user.id;
        console.log("[EdgeFn] Successfully authenticated user ID:", userId);

        // Now parse the request body
        const bodyText = await req.text();

        // Parse the body
        let parsedBody;
        try {
            parsedBody = JSON.parse(bodyText);
        } catch (parseError) {
            console.error("[EdgeFn] Failed to parse request body:", parseError);
            return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        const {
            slot,
            initialOnboardingSnapshot,
            changes_from_review_screen
        } = parsedBody as {
            userId?: string; // Make optional since we'll use authenticated userId
            slot: string;
            initialOnboardingSnapshot?: InitialOnboardingSnapshot;
            changes_from_review_screen?: SessionChanges;
        };

        console.log("[EdgeFn] Using authenticated userId:", userId);
        console.log("[EdgeFn] Extracted slot:", slot);

        if (!slot) {
        return new Response(JSON.stringify({ error: "Missing slot" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        // Will validate time after fetching user profile to get timezone

        console.log("[EdgeFn] About to fetch user profile for userId:", userId);

        let profileQueryResponse;
        try {
            profileQueryResponse = await supabaseClientForReads
                .from("profiles")
                .select("*, last_openai_response_id, timezone")
                .eq("id", userId)
                .single<ProfileFromDB>();

            console.log("[EdgeFn] Profile query completed");
        } catch (profileError) {
            console.error("[EdgeFn] Exception during profile fetch:", profileError);
            return new Response(JSON.stringify({ error: "Database error while fetching profile" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }

        if (profileQueryResponse.error || !profileQueryResponse.data) {
            console.error("[EdgeFn] Error fetching profile:", profileQueryResponse.error?.message || "User profile data is null");
            console.error("[EdgeFn] Profile query details:", { userId, error: profileQueryResponse.error });
            return new Response(JSON.stringify({ error: "Failed to fetch user profile" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }

        // Profile fetched successfully

        const userProfileFromDB = profileQueryResponse.data;
        // No longer need to track last_openai_response_id since we're using completions API

        // Now validate time windows with user's timezone
        const now = new Date();
        // Use timezone from profile, fallback to EST
        const userTimezone = userProfileFromDB.timezone || 'America/New_York';
        const userLocalHour = getUserLocalHour(now, userTimezone);

        console.log("[EdgeFn] Time validation - Current UTC time:", now.toISOString());
        console.log("[EdgeFn] Time validation - User timezone:", userTimezone);
        console.log("[EdgeFn] Time validation - User local hour:", userLocalHour);

        // Extract the prayer type from slot (morning/evening)
        const isMorningSlot = slot.includes('am') || slot === 'morning';
        const isEveningSlot = slot.includes('pm') || slot === 'evening';

        // Skip time validation for onboarding prayers
        if (slot !== 'onboarding-initial') {
            if (isMorningSlot) {
                // Morning prayers: 4 AM - 4 PM (in user's timezone)
                if (userLocalHour < 4 || userLocalHour >= 16) {
                    console.log("[EdgeFn] Morning prayer rejected - outside time window");
                    return new Response(JSON.stringify({
                        error: "Morning prayers can only be generated between 4:00 AM and 4:00 PM",
                        availableAt: "4:00 AM",
                        currentUserTime: `${userLocalHour}:00`,
                        timezone: userTimezone
                    }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                        status: 400,
                    });
                }
            } else if (isEveningSlot) {
                // Evening prayers: 4 PM - 4 AM (in user's timezone)
                if (userLocalHour >= 4 && userLocalHour < 16) {
                    console.log("[EdgeFn] Evening prayer rejected - outside time window");
                    return new Response(JSON.stringify({
                        error: "Evening prayers can only be generated between 4:00 PM and 4:00 AM",
                        availableAt: "4:00 PM",
                        currentUserTime: `${userLocalHour}:00`,
                        timezone: userTimezone
                    }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                        status: 400,
                    });
                }
            }
        }

        const nestJsPayload: {
            userId: string;
            slot: string;
            input: string;
            instructions: string;
        } = {
            userId,
            slot,
            input: "",
            instructions: getInstructions(userProfileFromDB.faith_tradition), // Dynamic instructions based on faith tradition
        };

        let inputSnapshotForDB: object = {};
        let prayerInput = ""; // Initialize prayerInput

        if (slot === 'onboarding-initial' && initialOnboardingSnapshot) {
            console.log(`[EdgeFn] First prayer (onboarding-initial) for user ${userId} with client snapshot.`);

            const {
                firstName,
                initialMotivation,
                mood: moodFromSnapshot,
                moodContext,
                prayerNeeds,
                customPrayerNeed,
                relationshipWithGod,
                prayerFrequency,
                faithTradition,
                commitmentLevel,
                streakGoalDays
            } = initialOnboardingSnapshot;

            const { data: intentionsData, error: intentionsError } = await supabaseClientForReads
                .from("prayer_intentions")
                .select("*, prayer_focus_people (name, relationship, gender, image_uri)")
                .eq("user_id", userId)
                .eq("is_active", true)
                .returns<PrayerIntention[]>();

            if (intentionsError) {
                console.error("Error fetching intentions for first prayer:", intentionsError.message);
            }

            // Determine actual time-based slot for saving (4 AM - 4 PM = morning, 4 PM - 4 AM = evening)
            const displaySlot = userLocalHour < 16 ? 'morning' : 'evening';
            console.log(`[EdgeFn] Onboarding prayer will be saved as ${displaySlot} slot (user local hour: ${userLocalHour})`);

            prayerInput = `Generate my first prayer. This is for the '${displaySlot}' slot.\n`;
            const nameToUse = firstName || userProfileFromDB.display_name;
            if (nameToUse) prayerInput += `My name is ${nameToUse}.\n`;

            if (initialMotivation) {
                let motivationPhrase = "deepen my spiritual journey";
                if (initialMotivation === 'consistency') motivationPhrase = "pray more consistently";
                else if (initialMotivation === 'personal') motivationPhrase = "make my prayers more personal";
                else if (initialMotivation === 'closer') motivationPhrase = "feel closer to God";
                else if (initialMotivation === 'trying') motivationPhrase = "rebuild or start my prayer habit";
                else if (initialMotivation === 'start') motivationPhrase = "begin my walk with God";
                prayerInput += `I'm starting this prayer journey because I want to ${motivationPhrase}.\n`;
            }
            if (faithTradition) prayerInput += `My faith tradition is ${faithTradition}.\n`;
            if (prayerFrequency) prayerInput += `I typically pray ${prayerFrequency}.\n`;
            if (relationshipWithGod) prayerInput += `I currently feel my relationship with God is ${relationshipWithGod}.\n`;
            if (commitmentLevel) prayerInput += `I'm feeling ${commitmentLevel} about my prayer commitment.\n`;
            if (streakGoalDays) prayerInput += `I'm aiming for a prayer streak of ${streakGoalDays} days.\n`;

            if (moodFromSnapshot) {
                let moodString = `Today, I'm feeling ${moodFromSnapshot}`;
                if (moodContext) {
                    moodString += ` (specifically about: ${moodContext})`;
                }
                prayerInput += moodString + ".\n";
            }

            let personalNeedsAdded = false;
            let personalNeedsSection = "";
            if (prayerNeeds && prayerNeeds.length > 0) {
                personalNeedsSection += "\nFor myself, I ask for Your guidance and strength regarding:\n";
                prayerNeeds.forEach(need => { personalNeedsSection += `- ${need}\n`; });
                personalNeedsAdded = true;
            }
            if (customPrayerNeed) {
                if (!personalNeedsAdded) personalNeedsSection += "\nFor myself, I ask for Your guidance and strength regarding:\n";
                personalNeedsSection += `- And specifically: ${customPrayerNeed}\n`;
                personalNeedsAdded = true;
            }
            prayerInput += personalNeedsSection;

            let intentionsSection = "";
            if (intentionsData && intentionsData.length > 0) {
                intentionsSection += "\nPlease also include these specific intentions in my prayer:\n";
                intentionsData.forEach((intention: PrayerIntention) => {
                    const person = intention.prayer_focus_people;
                    if (!person && intention.person_id === null) {
                        intentionsSection += `- For myself: ${intention.details} (related to ${intention.category}).\n`;
                    } else if (person) {
                        const personName = person.name || "Someone";
                        let intentionLine = `- For ${personName}`;
                        if (person.relationship) intentionLine += ` (my ${person.relationship.toLowerCase()})`;
                        intentionLine += `: ${intention.details} (related to ${intention.category}).\n`;
                        intentionsSection += intentionLine;
                    }
                });
            } else if (!personalNeedsAdded) {
                intentionsSection += "\nI am open to Your guidance and blessings in all areas of my life.\n";
            }
            prayerInput += intentionsSection;

            nestJsPayload.input = prayerInput;
            nestJsPayload.instructions = getInstructions(initialOnboardingSnapshot.faithTradition);

            inputSnapshotForDB = {
                source: 'onboarding-initial',
                clientSnapshot: initialOnboardingSnapshot,
                activeIntentions: intentionsData || [],
                dbProfileMoodAtGeneration: userProfileFromDB.mood,
                slot: displaySlot, // Use display slot for tracking
            };

        } else {
            // --- REGULAR PRAYER GENERATION ---
            console.log(`[EdgeFn] Generating prayer (${slot}) for user ${userId}`);

            prayerInput = `Generate my ${slot} prayer.`;

            const nameToUse = userProfileFromDB.display_name;
            if (nameToUse) prayerInput += ` My name is ${nameToUse}.`;

            // Use mood from review screen if available, otherwise from profile
            if (changes_from_review_screen?.mood) {
                prayerInput += ` This ${slot} I'm feeling ${changes_from_review_screen.mood}`;
                if (changes_from_review_screen.moodContext) {
                    prayerInput += ` (specifically about: ${changes_from_review_screen.moodContext})`;
                }
                prayerInput += `.`;
            } else if (userProfileFromDB.mood) {
                prayerInput += ` I'm feeling ${userProfileFromDB.mood}`;
                if (userProfileFromDB.mood_context) {
                    prayerInput += ` (specifically about: ${userProfileFromDB.mood_context})`;
                }
                prayerInput += `.`;
            }

            // Fetch ALL active intentions 
            const { data: allActiveIntentions, error: activeIntentionsError } = await supabaseClientForReads
                .from("prayer_intentions")
                .select("*, prayer_focus_people (name, relationship, gender)")
                .eq("user_id", userId)
                .eq("is_active", true)
                .returns<PrayerIntention[]>();

            if (activeIntentionsError) {
                console.error("Error fetching active intentions:", activeIntentionsError.message);
            }

            // Include ALL active intentions in the prayer
            if (allActiveIntentions && allActiveIntentions.length > 0) {
                prayerInput += "\n\nPlease include these intentions in my prayer:";
                allActiveIntentions.forEach((intention) => {
                    const person = intention.prayer_focus_people;
                    if (!person && intention.person_id === null) {
                        prayerInput += `\n- For myself: ${intention.details} (related to ${intention.category}).`;
                    } else if (person) {
                        const personName = person.name || "Someone";
                        let intentionLine = `\n- For ${personName}`;
                        if (person.relationship) intentionLine += ` (my ${person.relationship.toLowerCase()})`;
                        intentionLine += `: ${intention.details} (related to ${intention.category}).`;
                        prayerInput += intentionLine;
                    }
                });
            }

            nestJsPayload.input = prayerInput;

            inputSnapshotForDB = {
                source: 'regular-prayer',
                changesFromReviewScreen: changes_from_review_screen || null,
                dbProfileMoodAtGeneration: userProfileFromDB.mood,
                activeIntentions: allActiveIntentions || [],
                slot,
            };
        }

        // Send payload to prayer service without logging raw prompt/instructions

        const nestJsResponse = await callNestJsWithFallback(nestJsPayload);

        if (!nestJsResponse.ok) {
            const errorBody = await nestJsResponse.text();
            console.error("[EdgeFn] All NestJS endpoints failed", nestJsResponse.status, errorBody);
            return new Response(JSON.stringify({ error: "Prayer generation service failed.", details: errorBody }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: nestJsResponse.status,
            });
        }

        const { prayer: prayerTextFromNest, responseId } = await nestJsResponse.json();

        // For onboarding prayers, use the actual time-based slot instead of 'onboarding-initial'
        const finalSlot = slot === 'onboarding-initial' 
            ? (inputSnapshotForDB as any).slot || slot 
            : slot;

        const prayerToInsert = {
            user_id: userId,
            content: prayerTextFromNest,
            slot: finalSlot,
            input_snapshot: inputSnapshotForDB,
        };

        const { data: savedPrayer, error: insertPrayerError } = await supabaseClientForReads
            .from('prayers')
            .insert(prayerToInsert)
            .select('id, content')
            .single();

        if (insertPrayerError) {
            console.error("Error saving generated prayer to DB:", insertPrayerError.message);
        } else {
            console.log("[EdgeFn] Prayer saved successfully with ID:", savedPrayer?.id);
        }

        // No longer need to update profile with response ID since we're using completions API

        const responseData = {
            prayer: savedPrayer?.content || prayerTextFromNest,
            prayerId: savedPrayer?.id,
            openAIResponseId: responseId
        };
        console.log("[EdgeFn] Returning response with prayerId:", responseData.prayerId);

        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("[EdgeFn] Unhandled error in generate-prayer:", (error as any).message, (error as any).stack);
        console.error("[EdgeFn] Error details:", {
            name: (error as any).name,
            message: (error as any).message,
            stack: (error as any).stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
        });
        return new Response(JSON.stringify({
            error: (error as any).message || "An unknown error occurred",
            type: (error as any).name || "UnknownError"
        }), {
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
        return await handleGeneratePrayerRequest(req);
    });
} 