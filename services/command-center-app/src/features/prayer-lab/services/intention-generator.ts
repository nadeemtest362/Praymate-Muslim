import { z } from 'zod'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'

// Schema for the generated intentions
const IntentionDataSchema = z.object({
  intentions: z.array(
    z.object({
      person: z
        .object({
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
})

export type GeneratedIntentionData = z.infer<typeof IntentionDataSchema>

const INTENTION_GENERATION_PROMPT = `Generate 2-3 realistic prayer intentions for a Christian prayer app user. Create diverse, authentic intentions that a real person would pray for.

IMPORTANT: Return ONLY valid JSON with no additional text or formatting.

The intention data must follow this EXACT structure:

{
  "intentions": [
    {
      "person": null (for self) OR {
        "name": "Person's actual name",
        "relationship": "Examples: Mother, Father, Wife, Husband, Son, Daughter, Friend, Boss, Sister, Brother, Pastor, Coworker, Neighbor, etc.",
        "gender": "male or female"
      },
      "category": "MUST be EXACTLY one of these 18 values ONLY: guidance, wisdom, healing, peace, strength, gratitude, forgiveness, blessing, financialHelp, protection, faith, comfort, joy, patience, love, hope, success, other",
      "details": "Specific, heartfelt prayer request in their own words (1-2 sentences)",
      "is_active": true
    }
  ]
}

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
- Use "comfort" for grief, loss, sadness
- Use "joy" for happiness, celebration
- Use "patience" for waiting, endurance
- Use "love" for relationships, compassion, family harmony
- Use "hope" for future, optimism
- Use "success" for achievements, goals
- Use "other" ONLY if absolutely none of the above fit

GENERATION GUIDELINES:
1. Create realistic people with diverse backgrounds:
   - Mix of family members, friends, coworkers, neighbors
   - Different ages and life situations
   - Authentic names and relationships

2. Create authentic prayer needs:
   - Mix personal intentions (person: null) with intercession for others
   - Specific situations that real people face
   - Heartfelt language that sounds natural
   - Variety of categories that make sense together

3. Make intentions specific and meaningful:
   - Avoid generic requests like "bless them"
   - Include specific circumstances or challenges
   - Use natural, conversational language
   - Focus on real-life situations

4. Ensure variety:
   - Different relationship types (family, friends, work, etc.)
   - Mix of prayer categories
   - Balance of self and intercession
   - Different life stages and situations

Examples of good intentions:
- For self: "I'm struggling to find direction after graduating college and need wisdom about which job opportunities to pursue" (category: guidance)
- For mother: "My mom is going through a difficult divorce and I pray she finds peace and strength during this painful time" (category: peace)
- For coworker: "My colleague Sarah is dealing with her father's cancer diagnosis and needs comfort and hope" (category: comfort)

Generate 2-3 intentions that feel authentic and would be meaningful additions to someone's prayer life.`

export async function generateIntentions(
  modelId: string = 'gpt-4o-mini'
): Promise<GeneratedIntentionData> {
  try {
    const apiKey =
      import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error(
        'OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your environment.'
      )
    }

    console.log('Generating intentions with model:', modelId)

    const openaiProvider = createOpenAI({
      apiKey: apiKey,
    })

    const startTime = Date.now()

    const { object } = await generateObject({
      model: openaiProvider(modelId),
      schema: IntentionDataSchema,
      prompt: INTENTION_GENERATION_PROMPT,
      temperature: 0.9, // Higher temperature for more variety
      maxRetries: 0,
    })

    const duration = Date.now() - startTime
    console.log(`Generated intentions in ${duration}ms:`, object)

    return object
  } catch (error) {
    console.error('Error generating intentions with AI:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}
