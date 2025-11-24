import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'

// Define the expected shape of the prayer focus person data from the client or DB
// (Adjust based on actual data structure passed or fetched)
interface PrayerFocusPersonInput {
  id: string; // The ID of the prayer_focus_people record
  name: string;
  image_uri?: string;
  current_gratitude_prompt_id?: string;
  current_gratitude_detail?: string;
  current_challenge_prompt_id?: string;
  current_challenge_detail?: string;
  current_hope_prompt_id?: string;
  current_hope_detail?: string;
}

// Define the expected JSON body from the request (if any)
// Currently assuming we primarily rely on the user's auth token
// interface RequestPayload {
//   prayerFocusPeopleData?: PrayerFocusPersonInput[]; // Potentially pass data if not fetching fresh
// }

console.log('generate-first-prayer function booting up')

interface PrayerContext {
  userId: string;
  firstName?: string;
  mood?: string; // e.g., "moodId|emoji"
  moodContext?: string;
  prayerNeeds?: string[];
  customPrayerNeed?: string;
  // New onboarding fields
  initialMotivation?: string;
  relationshipWithGod?: string;
  prayerFrequency?: string;
  faithTradition?: string;
  commitmentLevel?: string;
  streakGoalDays?: number;
  prayerTimes?: string[];
  // Add other relevant fields that constitute the context for prayer generation
  // For example, details about people to pray for might be summarized here
  // For this initial version, we'll keep it simpler.
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let supabaseAdmin: SupabaseClient | null = null; // Define here for broader scope if needed

  try {
    // 1. Initialize Supabase Admin Client
    // Use ADMIN client for elevated privileges like updating user profiles if needed,
    // otherwise a service_role client might suffice. Ensure ANON_KEY and URL are set in secrets.
    supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use SERVICE_ROLE_KEY for backend operations
      {
        auth: {
          // Required for RLS and accessing auth.uid() later if using service_role key
          // Not strictly needed if using Supabase Admin client or if RLS is bypassed by service role
           autoRefreshToken: false,
           persistSession: false
        }
      }
    );

    // 2. Authenticate User and Get User ID
    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }
    // Extract the token
    const token = authHeader.replace('Bearer ', '')
    // Get user data based on the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
       console.error('User auth error:', userError)
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = user.id
    console.log(`Authenticated user: ${userId}`)

    // 3. Fetch User Profile Data including onboarding fields
    console.log(`Fetching profile data for user ${userId}...`)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        display_name,
        first_name,
        mood,
        mood_context,
        prayer_needs,
        custom_prayer_need,
        initial_motivation,
        relationship_with_god,
        prayer_frequency,
        faith_tradition,
        commitment_level,
        streak_goal_days,
        prayer_times
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      throw new Error(`Database error fetching profile: ${profileError.message}`)
    }

    // 4. Fetch Prayer Focus People Data for the User
    // Fetch the most recent G/C/H state for the user's focus people
    console.log(`Fetching prayer_focus_people for user ${userId}...`)
    const { data: prayerFocusPeople, error: fetchError } = await supabaseAdmin
      .from('prayer_focus_people')
      .select(`
        id,
        name,
        image_uri,
        current_gratitude_prompt_id,
        current_gratitude_detail,
        current_challenge_prompt_id,
        current_challenge_detail,
        current_hope_prompt_id,
        current_hope_detail
      `)
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching prayer focus people:', fetchError)
      throw new Error(`Database error fetching prayer focus people: ${fetchError.message}`)
    }
    // Type assertion after check
    const focusPeopleTyped = prayerFocusPeople as PrayerFocusPersonInput[] | null;

    if (!focusPeopleTyped || focusPeopleTyped.length === 0) {
        console.warn(`No prayer focus people found for user ${userId}`)
      // Decide how to handle - maybe return an error or generate a generic prayer?
      return new Response(JSON.stringify({ error: 'No prayer focus people found for user.' }), {
        status: 404, // Or 400 Bad Request
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log(`Found ${focusPeopleTyped.length} prayer focus people.`)

    // 5. Construct OpenAI Prompt
    // TODO: Map prompt IDs to actual text if needed (fetch from DB or use constants)
    console.log('Constructing OpenAI prompt...')
    
    // Build context from profile data
    let contextualInfo = '';
    
    // Add user's name if available
    const userName = profile?.first_name || profile?.display_name || 'this person';
    
    // Add faith tradition context
    if (profile?.faith_tradition) {
      const faithMap: Record<string, string> = {
        'catholic': 'Catholic Christian',
        'christian_non_catholic': 'Christian',
        'other': 'faith tradition'
      };
      contextualInfo += `This person follows the ${faithMap[profile.faith_tradition] || 'faith'} tradition. `;
    }
    
    // Add relationship with God context
    if (profile?.relationship_with_god) {
      const relationshipMap: Record<string, string> = {
        'very_close': 'They feel very close to God',
        'close': 'They feel close to God',
        'complicated': 'Their relationship with God is complicated',
        'distant': 'They feel distant from God',
        'rebuilding': 'They are rebuilding their relationship with God'
      };
      contextualInfo += `${relationshipMap[profile.relationship_with_god] || ''}. `;
    }
    
    // Add prayer frequency context
    if (profile?.prayer_frequency) {
      const frequencyMap: Record<string, string> = {
        'multiple_daily': 'They pray multiple times daily',
        'daily': 'They pray daily',
        'few_times_week': 'They pray a few times a week',
        'occasionally': 'They pray occasionally',
        'rarely': 'They rarely pray'
      };
      contextualInfo += `${frequencyMap[profile.prayer_frequency] || ''}. `;
    }
    
    // Add mood context
    if (profile?.mood) {
      contextualInfo += `They are feeling ${profile.mood}`;
      if (profile?.mood_context) {
        contextualInfo += ` because ${profile.mood_context}`;
      }
      contextualInfo += '. ';
    }
    
    // Add personal prayer needs
    let personalNeeds = '';
    if (profile?.prayer_needs && profile.prayer_needs.length > 0) {
      personalNeeds = '\n\nPersonal prayer needs:\n';
      profile.prayer_needs.forEach((need: string) => {
        personalNeeds += `- ${need}\n`;
      });
      if (profile?.custom_prayer_need) {
        personalNeeds += `- ${profile.custom_prayer_need}\n`;
      }
    }
    
    let promptContent = `Generate a personalized, heartfelt prayer for ${userName}. 
    
${contextualInfo}

Focus on these people and their situations:\n\n`;
    
    focusPeopleTyped.forEach((person: PrayerFocusPersonInput, index: number) => {
      promptContent += `Person ${index + 1}: ${person.name}\n`;
      if (person.current_gratitude_prompt_id) { // Assuming prompt ID maps to text
        promptContent += `- Gratitude: ${person.current_gratitude_prompt_id} ${person.current_gratitude_detail ? `(${person.current_gratitude_detail})` : ''}\n`;
      }
       if (person.current_challenge_prompt_id) {
        promptContent += `- Challenge: ${person.current_challenge_prompt_id} ${person.current_challenge_detail ? `(${person.current_challenge_detail})` : ''}\n`;
      }
       if (person.current_hope_prompt_id) {
        promptContent += `- Hope: ${person.current_hope_prompt_id} ${person.current_hope_detail ? `(${person.current_hope_detail})` : ''}\n`;
      }
      promptContent += '\n';
    });
    
    // Add personal needs at the end
    promptContent += personalNeeds;
    
    // Add instruction for prayer style based on initial motivation
    if (profile?.initial_motivation) {
      const motivationInstructions: Record<string, string> = {
        'consistency': 'Help them build a consistent prayer habit',
        'personalization': 'Make this prayer feel deeply personal and specific',
        'closer': 'Help them feel closer to God through this prayer',
        'restart': 'Encourage them as they restart their prayer journey',
        'intercession': 'Focus on interceding for others',
        'inspiration': 'Provide spiritual inspiration and renewal',
        'start': 'Guide them gently as they begin their faith journey'
      };
      promptContent += `\n${motivationInstructions[profile.initial_motivation] || ''}`;
    }
    
    console.log('Prompt constructed.') // Be cautious logging full prompts if sensitive

    // 6. Call OpenAI Responses API (Create)
    console.log('Calling OpenAI Responses API...')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable.");
    }

    // Use the /v1/responses endpoint
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        // Add specific headers if required by Responses API
      },
      body: JSON.stringify({
         model: "gpt-4o", // Or "gpt-4o", etc.
         input: [{ role: "user", content: promptContent }],
         // Add other parameters like temperature, max_output_tokens if needed
      }),
    });

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error(`OpenAI API Error (${openaiResponse.status}): ${errorBody}`);
      throw new Error(`OpenAI API request failed: ${openaiResponse.statusText}`);
    }

    const openaiResult = await openaiResponse.json();
    console.log('OpenAI response received.')

    // Extract prayer text and potential conversation ID - **VERIFY THIS PARSING**
    const prayerText = openaiResult?.output?.[0]?.content?.[0]?.text?.trim() ?? "Placeholder: Failed to parse prayer text.";
    const conversationId = openaiResult?.id ?? null; // Tentative: Check if response.id is the correct persistent ID

    if (!conversationId) {
        console.warn("OpenAI response did not include a top-level 'id'. Check response structure for conversation/thread ID.")
        // Handle missing ID if it's critical
    }

    // 7. Create Input Snapshot
    const inputSnapshot = focusPeopleTyped.map((p: PrayerFocusPersonInput) => ({
      id: p.id,
      name: p.name,
      image_uri: p.image_uri,
      gratitudePromptId: p.current_gratitude_prompt_id,
      gratitudeDetail: p.current_gratitude_detail,
      challengePromptId: p.current_challenge_prompt_id,
      challengeDetail: p.current_challenge_detail,
      hopePromptId: p.current_hope_prompt_id,
      hopeDetail: p.current_hope_detail,
    }));
    console.log('Input snapshot created.')

    // 8. Perform Database Updates (Transaction recommended)
    console.log('Starting database updates...')

    // Update user's profile with the conversation ID
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ openai_conversation_id: conversationId })
      .eq('id', userId);

    if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError)
        // Decide how to handle partial failure - maybe log and continue, or rollback?
        throw new Error(`Database error updating profile: ${profileUpdateError.message}`)
    }
     console.log('Profile updated with conversation ID.')

    // Insert the generated prayer
    const { error: prayerInsertError } = await supabaseAdmin
      .from('prayers')
      .insert({
        user_id: userId,
        prayer_text: prayerText,
        openai_conversation_id: conversationId, // Store the thread/conversation ID with the prayer
        input_snapshot: inputSnapshot,
      });

    if (prayerInsertError) {
      console.error('Error inserting prayer:', prayerInsertError)
      throw new Error(`Database error inserting prayer: ${prayerInsertError.message}`)
    }
    console.log('Prayer inserted.')

    // Update prayer_focus_people with initial G/C/H state (if not already done post-onboarding)
    // This might be redundant if the frontend/onboarding flow already saved this state.
    // If needed, loop through prayerFocusPeople and update each record.
    // Example (only if necessary):
    // for (const person of prayerFocusPeople) {
    //   const { error: focusUpdateError } = await supabaseAdmin
    //     .from('prayer_focus_people')
    //     .update({
    //       current_gratitude_prompt_id: person.current_gratitude_prompt_id,
    //       current_gratitude_detail: person.current_gratitude_detail,
    //       // ... other fields
    //     })
    //     .eq('id', person.id)
    //     .eq('user_id', userId); // Ensure user can only update their own
    //    if (focusUpdateError) { console.error(`Error updating focus person ${person.id}:`, focusUpdateError); /* handle */ }
    // }
    // console.log('Prayer focus people records updated (if applicable).')

    console.log('Database updates complete.')
    // --- End Core Logic ---

    // 9. Return Response
    return new Response(JSON.stringify({ prayerText: prayerText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Type check the error before accessing properties
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in generate-first-prayer function:', message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 