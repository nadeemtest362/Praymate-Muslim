import { z } from 'zod'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'

// Schema for the generated user data
const UserDataSchema = z.object({
  firstName: z.string(),
  mood: z.enum([
    'peaceful',
    'hopeful',
    'grateful',
    'joyful',
    'excited',
    'loved',
    'blessed',
    'confident',
    'anxious',
    'weary',
    'sad',
    'overwhelmed',
    'frustrated',
    'confused',
    'lonely',
    'reflective',
    'content',
    'seeking',
  ]),
  moodContext: z.string(),
  initialMotivation: z.enum([
    'consistency',
    'personalization',
    'closer',
    'restart',
    'intercession',
    'inspiration',
  ]),
  relationshipWithGod: z.enum([
    'very_close',
    'close',
    'complicated',
    'distant',
    'rebuilding',
  ]),
  prayerFrequency: z.enum([
    'multiple_daily',
    'daily',
    'few_times_week',
    'occasionally',
    'rarely',
  ]),
  faithTradition: z.enum(['Catholic', 'Christian (non-Catholic)', 'Other']),
  commitmentLevel: z.enum([
    'extremely',
    'very',
    'somewhat',
    'neutral',
    'not_very',
  ]),
  streakGoalDays: z.union([
    z.literal(7),
    z.literal(21),
    z.literal(30),
    z.literal(40),
  ]),
  prayerTimes: z.array(z.enum(['morning', 'evening'])),
  prayerNeeds: z.array(z.string()),
  customPrayerNeed: z.string(),
  prayerIntentions: z.array(
    z.object({
      id: z.string(),
      person_id: z.string().nullable(),
      person: z
        .object({
          id: z.string(),
          name: z.string(),
          relationship: z.string(),
          gender: z.enum(['male', 'female']),
        })
        .nullable(),
      category: z.enum([
        'guidance',
        'wisdom',
        'healing',
        'peace',
        'strength',
        'gratitude',
        'forgiveness',
        'blessing',
        'financialHelp',
        'protection',
        'faith',
        'comfort',
        'joy',
        'patience',
        'love',
        'hope',
        'success',
        'other',
      ]),
      details: z.string(),
      is_active: z.boolean(),
    })
  ),
  lastOpenaiResponseId: z.string().nullable(),
})

export type GeneratedUserData = z.infer<typeof UserDataSchema>

const GENERATION_PROMPT = `Generate a realistic test user for a Christian prayer app. Create a unique persona with authentic life circumstances, challenges, and faith journey.

IMPORTANT: Return ONLY valid JSON with no additional text or formatting.
IMPORTANT: Ensure mood context and prayer needs are logically consistent (e.g., don't combine work success with job searching).

The user data must follow this EXACT structure with ONLY these fields:

{
  "firstName": "A realistic first name",
  "mood": "MUST be one of these exact values: peaceful, hopeful, grateful, joyful, excited, loved, blessed, confident, anxious, weary, sad, overwhelmed, frustrated, confused, lonely, reflective, content, seeking",
  "moodContext": "MUST be in FIRST PERSON (I/me/my). Write 1-2 sentences as if the person is speaking about why they feel this mood. Start with 'I' not their name. Example: 'I have a big presentation tomorrow and I'm worried about how it will go' NOT 'Maria is feeling anxious about her upcoming job interview'",
  "initialMotivation": "MUST be one of: consistency, personalization, closer, restart, intercession, inspiration, start",
  "relationshipWithGod": "MUST be one of: very_close, close, complicated, distant, rebuilding",
  "prayerFrequency": "MUST be one of: multiple_daily, daily, few_times_week, occasionally, rarely",
  "faithTradition": "MUST be EXACTLY one of: Catholic, Christian (non-Catholic), Other",
  "commitmentLevel": "MUST be one of: extremely, very, somewhat, neutral, not_very",
  "streakGoalDays": "MUST be one of: 7, 21, 30, 40",
  "prayerTimes": ["MUST be array containing one or both of: morning, evening"],
  "prayerNeeds": ["Array of 2-4 prayer THEME IDs from the PRAYER NEEDS list below - these are general themes"],
  "customPrayerNeed": "Optional personal prayer need they typed in, or empty string",
  "prayerIntentions": [
    {
      "id": "unique string like 1, 2, 3",
      "person_id": null (actual null, not string "null") for self, or unique ID string like "p1", "p2" if for another person,
      "person": null (actual null, not string "null") for self, or {
        "id": "must match person_id",
        "name": "Person's actual name",
        "relationship": "Examples: Mother, Father, Wife, Husband, Son, Daughter, Friend, Boss, Sister, Brother, Pastor, Coworker, Neighbor, etc.",
        "gender": "male or female"
      },
      "category": "MUST be EXACTLY one of these 18 values ONLY: guidance, wisdom, healing, peace, strength, gratitude, forgiveness, blessing, financialHelp, protection, faith, comfort, joy, patience, love, hope, success, other. DO NOT use prayer need IDs here!",
      "details": "Specific, heartfelt prayer request in their own words (1-2 sentences)",
      "is_active": true
    }
  ],
  "lastOpenaiResponseId": null (MUST be null for new users - never generate a fake ID)
}

VALID PRAYER NEED IDS (use 2-4 of these EXACT values):
faith_deepening, spiritual_discipline, discernment, worship, anxiety_peace, emotional_healing, mental_clarity, rest, family_harmony, forgiveness, compassion, community, life_purpose, wisdom_decisions, breakthrough, provision

FIELD EXPLANATIONS:
- initialMotivation: Why they're starting to use the app
  - consistency: "I want to pray more, but I keep getting distracted"
  - personalization: "I struggle to find the right words when I pray"
  - closer: "I miss feeling connected to God"
  - restart: "I'm trying to rebuild my faith journey"
  - intercession: "I carry others in my heart but rarely pray for them"
  - inspiration: "My spiritual life feels dry and routine"

INITIAL MOTIVATION MAPPING RULES - YOU MUST USE ONLY THESE EXACT VALUES:
- Use "consistency" for: wanting regular prayer habits, struggling with distractions, building discipline
- Use "personalization" for: finding right words, wanting meaningful prayers, struggling with what to say, seeking guidance on how to pray
- Use "closer" for: feeling disconnected from God, wanting deeper relationship, missing connection
- Use "restart" for: returning to faith, rebuilding spiritual life, starting over
- Use "intercession" for: praying for others, carrying burdens for loved ones, wanting to pray for people
- Use "inspiration" for: dry spiritual life, needing fresh perspective, feeling routine or stale

CRITICAL: When someone is seeking guidance, direction, or clarity:
- If they need guidance on HOW TO PRAY → use "personalization"
- If they need life guidance/direction → still choose from the 6 valid options above based on their overall motivation
- NEVER use "guidance" as initialMotivation - it's INVALID and will cause an error

Example mappings:
- "I need guidance in my career" → use "personalization" (they need help articulating prayers)
- "I'm seeking direction in life" → use "closer" (they want to connect with God for answers)
- "I don't know what to pray for" → use "personalization" (they struggle with prayer words)

- commitmentLevel: How committed they feel to building a prayer habit
- lastOpenaiResponseId: ALWAYS null for new test users (this gets set automatically after their first prayer)

PRAYER INTENTION CATEGORY MAPPING RULES - YOU MUST USE ONLY THESE EXACT CATEGORIES:
- Use "faith" for spiritual discipline, prayer life, Bible study, growing faith
- Use "guidance" for life purpose, direction, decisions, clarity about path
- Use "wisdom" for understanding, discernment, knowledge
- Use "financialHelp" for ANY prayer about money, finances, jobs, provision, bills, debt, business opportunities
- Use "healing" for physical or mental health issues
- Use "blessing" for general blessings, opportunities, or needs (not specifically financial)
- Use "protection" for safety, security concerns
- Use "strength" for courage, perseverance, endurance, support needs
- Use "peace" for anxiety, worry, stress relief, rest, calm
- Use "gratitude" for thanksgiving
- Use "forgiveness" for reconciliation, letting go
- Use "blessing" for blessings on others
- Use "comfort" for grief, loss, sadness
- Use "joy" for happiness, celebration
- Use "patience" for waiting, endurance
- Use "love" for relationships, compassion, family harmony
- Use "hope" for future, optimism
- Use "success" for achievements, goals
- Use "other" ONLY if absolutely none of the above fit

CRITICAL: Prayer intention categories are DIFFERENT from prayer needs!
- NEVER use: rest, family_harmony, spiritual_discipline, life_purpose, discernment, support, provision as categories
- For rest/sleep issues → use "peace"
- For family harmony → use "love" or "peace"
- For spiritual discipline → use "faith"
- For provision/opportunities → use "financialHelp" (if money-related) or "blessing" (if general)

GENERATION GUIDELINES:
1. Create a complete, realistic person with:
   - Authentic life situation (age, occupation, family status)
   - Current challenges that would lead them to prayer
   - Believable faith background and journey
   - Real emotional state with specific context

2. Ensure consistency across all fields:
   - Mood should match their current situation
   - Prayer frequency should align with their faith journey
   - Intentions should reflect their actual life circumstances
   - People in intentions should be realistic for their life stage

3. Create 3-5 prayer intentions that mix:
   - Personal needs (person_id: null, person: null)
   - Prayers for specific people in their life
   - Variety of categories that make sense for their situation

4. Make it diverse:
   - Different ages, genders, ethnicities (reflected in names)
   - Various life situations (single, married, divorced, widowed)
   - Different occupations and socioeconomic backgrounds
   - Range of faith maturities and traditions

5. Use natural language:
   - Prayer details should sound like how real people talk to God
   - Avoid religious jargon unless it fits the persona
   - Be specific about situations, not generic

Generate a unique, authentic persona that would realistically use a prayer app for their specific life situation and faith journey.

CRITICAL REMINDERS: 
- Use actual null values (not the string "null") for person_id when praying for self
- streakGoalDays must be exactly one of these numbers: 7, 21, 30, or 40
- All enum values must match exactly as specified
- When person_id is null, person must also be null
- initialMotivation MUST be one of: consistency, personalization, closer, restart, intercession, inspiration, start
- NEVER use "guidance" for initialMotivation - use the mapping rules above
- faithTradition MUST be EXACTLY: "Catholic", "Christian (non-Catholic)", or "Other"
- All prayer categories MUST be from the valid list - no made-up categories`

// Function to generate new mood and mood context
export async function generateNewMood(
  modelId: string = 'gpt-4o-mini',
  previousMood?: string
): Promise<{ mood: string; moodContext: string }> {
  const apiKey =
    import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OpenAI API key is not configured')
  }

  const openaiProvider = createOpenAI({
    apiKey: apiKey,
  })

  const moodPrompt = `Generate a realistic mood for someone returning to pray after hours or a day has passed.
  ${previousMood ? `Their previous mood was "${previousMood}". Time has passed and life events have occurred since then.` : ''}
  
  The mood should reflect what has happened in their life SINCE their last prayer - new developments, events that occurred during the day, evolving situations, etc.
  
  The mood context must describe what happened during the time between prayers. Examples:
  - "I had a difficult conversation with my teenager this morning"
  - "I just received unexpected medical test results"
  - "The presentation I was worried about went better than expected"
  - "My boss added three more projects to my plate today"
  - "I got into an argument with my spouse over finances"
  
  DO NOT mention prayer, praying, prayer sessions, or how they felt after praying.
  The mood represents their current emotional state based on LIFE EVENTS, not spiritual experiences.
  
  Return ONLY valid JSON with exactly these fields:
  {
    "mood": "one of: peaceful, hopeful, grateful, joyful, excited, loved, blessed, confident, anxious, weary, sad, overwhelmed, frustrated, confused, lonely, reflective, content, seeking",
    "moodContext": "First person description of current life situation (1-2 sentences)"
  }`

  const { object } = await generateObject({
    model: openaiProvider(modelId),
    schema: z.object({
      mood: z.enum([
        'peaceful',
        'hopeful',
        'grateful',
        'joyful',
        'excited',
        'loved',
        'blessed',
        'confident',
        'anxious',
        'weary',
        'sad',
        'overwhelmed',
        'frustrated',
        'confused',
        'lonely',
        'reflective',
        'content',
        'seeking',
        'angry',
      ]),
      moodContext: z.string(),
    }),
    prompt: moodPrompt,
    temperature: 0.9,
    maxRetries: 0,
  })

  return object
}

export async function generateTestUser(
  modelId: string = 'gpt-4o-mini'
): Promise<GeneratedUserData> {
  try {
    const apiKey =
      import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error(
        'OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment.'
      )
    }

    console.log('Generating test user with model:', modelId)
    console.log('API key configured:', apiKey ? 'Yes' : 'No')
    console.log(
      'API key first 10 chars:',
      apiKey ? apiKey.substring(0, 10) + '...' : 'None'
    )

    // Create OpenAI instance directly
    const openaiProvider = createOpenAI({
      apiKey: apiKey,
    })

    console.log('Calling generateObject with model:', modelId)
    const startTime = Date.now()

    const { object } = await generateObject({
      model: openaiProvider(modelId),
      schema: UserDataSchema,
      prompt: GENERATION_PROMPT,
      temperature: 0.8, // Reasonable temperature for variety
      maxRetries: 0, // Disable retries to see errors immediately
    })

    const duration = Date.now() - startTime
    console.log(`Generated user in ${duration}ms:`, object)

    // Verify the generated data is different each time
    console.log('Generated name:', object.firstName)
    console.log('Generated mood:', object.mood)
    console.log('Generated motivation:', object.initialMotivation)

    return object
  } catch (error) {
    console.error('Error generating user with AI:', error)
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}

// Export available models for the UI
export const availableModels = [
  { id: 'gpt-4o', name: 'GPT-4o', badge: 'Most Creative' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: 'Fast & Efficient' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', badge: 'Legacy' },
]

// Test function to verify OpenAI API is working
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    const apiKey =
      import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY

    if (!apiKey) {
      console.error('No OpenAI API key found')
      return false
    }

    const openaiProvider = createOpenAI({
      apiKey: apiKey,
    })

    // Try a simple generation to test the API
    const { object } = await generateObject({
      model: openaiProvider('gpt-3.5-turbo'),
      schema: z.object({ test: z.string() }),
      prompt:
        'Generate a JSON object with a test field containing the word "success"',
      maxRetries: 0,
    })

    console.log('OpenAI API test successful:', object)
    return true
  } catch (error) {
    console.error('OpenAI API test failed:', error)
    return false
  }
}
