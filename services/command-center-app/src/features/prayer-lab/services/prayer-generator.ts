import { createOpenAI } from '@ai-sdk/openai'

interface PrayerFocusPerson {
  name: string
  relationship?: string
  gender?: string
}

interface PrayerIntention {
  id: string
  person_id: string | null
  category: string
  details: string
  is_active: boolean
  prayer_focus_people?: PrayerFocusPerson | null
  person?: PrayerFocusPerson | null // Added to match index.tsx
}

interface InitialOnboardingSnapshot {
  userId: string
  firstName?: string
  initialMotivation?: string | null
  mood?: string
  moodContext?: string
  prayerNeeds?: string[]
  customPrayerNeed?: string
  relationshipWithGod?: string
  prayerFrequency?: string
  faithTradition?: string
  commitmentLevel?: string | null
  streakGoalDays?: number | null
  prayerIntentions?: PrayerIntention[]
}

interface GeneratePrayerParams {
  slot: string
  initialOnboardingSnapshot?: InitialOnboardingSnapshot
  lastOpenaiResponseId?: string | null
  // New fields for subsequent prayers
  manualPromptEdits?: string
  reviewChanges?: string
}

interface GeneratePrayerResponse {
  prayer: string
  responseId: string
  prompt: string // For display in Prayer Lab
}

const ACTS_MODEL_INSTRUCTIONS = `You are a compassionate, empathetic, Christian chaplain and prayer guide. Your purpose is to help an individual express their personal prayer to God.

Structure the prayer following the A.C.T.S. model:
1. Adoration: Begin with praising God. (Approx 20-25% of prayer)
2. Confession: Briefly acknowledge shortcomings or areas for improvement. (Approx 10-15% of prayer)
3. Thanksgiving: Express gratitude for blessings, specific and general. (Approx 20-25% of prayer)
4. Supplication: Make requests for the user and others they care about. This is the main body. (Approx 40-50% of prayer)

IMPORTANT GUIDANCE FOR SUPPLICATION SECTION:
When praying for others:
- Expand meaningfully on each intention - don't just restate what was provided
- Add spiritual depth and biblical wisdom relevant to their situation
- Use rich, heartfelt language that shows genuine care
- Connect their needs to God's character (His love, wisdom, protection, etc.)
- Be specific about what you're asking God to do
- Add related requests that naturally flow from the main intention

Example: If the intention is "communication with my wife," expand to pray for:
- Patience and understanding in conversations
- Hearts open to each other's perspectives  
- The wisdom to speak with love and listen with compassion
- Their marriage to reflect God's love

CRITICAL LANGUAGE STYLE:
- Use REVERENT yet PERSONAL language - balanced between formal reverence and heartfelt connection
- Address God with respect while maintaining genuine intimacy (e.g., "Heavenly Father," "Lord," "Dear God")
- Avoid overly casual phrases like "Hi God" or "you're amazing"
- Also avoid archaic language like "Thee," "Thou," or "comest"
- Strike a balance between reverence and relatability
- Examples:
  BAD: "Hi God, you're amazing and I'm grateful to be here with you"
  BAD: "I come before Thee in awe and reverence, O Lord most high"
  GOOD: "Gracious God, I come to You with a grateful heart"
  GOOD: "Lord, I thank You for Your steadfast love and faithfulness"

Maintain a tone that is: Reverent, sincere, personal, and heartfelt.
Address God respectfully (e.g., "Father," "Lord," "Gracious God," "Heavenly Father").
Write as someone speaking reverently yet personally to God (e.g., "I come to You," "I humbly ask," "Thank You for").
Conclude with "Amen" or "In Jesus' name, Amen."
Keep the prayer concise, around 250-350 words to allow proper attention to intentions for others.
Incorporate details from the user's input naturally.
If specific Bible verses are relevant and known, you can reference their themes naturally, but avoid lengthy quotations.
Focus on the user's current mood and needs, and give significant attention to their intentions for others.
Do not add any commentary before or after the prayer itself.`

export async function generatePrayer({
  slot,
  initialOnboardingSnapshot,
  lastOpenaiResponseId,
  manualPromptEdits,
  reviewChanges,
}: GeneratePrayerParams): Promise<GeneratePrayerResponse> {
  let prayerInput = ''

  // First prayer logic (from edge function)
  if (
    !lastOpenaiResponseId &&
    slot === 'onboarding-initial' &&
    initialOnboardingSnapshot
  ) {
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
      streakGoalDays,
      prayerIntentions,
    } = initialOnboardingSnapshot

    prayerInput = `Generate my first prayer. This is for the '${slot}' slot.\n`

    if (firstName) prayerInput += `My name is ${firstName}.\n`

    // Handle initialMotivation properly based on the actual values
    if (initialMotivation) {
      let motivationPhrase = ''
      if (initialMotivation === 'consistency')
        motivationPhrase = 'I want to pray more, but I keep getting distracted'
      else if (initialMotivation === 'personalization')
        motivationPhrase = 'I struggle to find the right words when I pray'
      else if (initialMotivation === 'closer')
        motivationPhrase = 'I miss feeling connected to God'
      else if (initialMotivation === 'restart')
        motivationPhrase = "I'm trying to rebuild my faith journey"
      else if (initialMotivation === 'intercession')
        motivationPhrase = 'I carry others in my heart but rarely pray for them'
      else if (initialMotivation === 'inspiration')
        motivationPhrase = 'My spiritual life feels dry and routine'
      prayerInput += `I'm starting this prayer journey because ${motivationPhrase}.\n`
    }

    if (faithTradition)
      prayerInput += `My faith tradition is ${faithTradition}.\n`
    if (prayerFrequency)
      prayerInput += `I typically pray ${prayerFrequency.replace(/_/g, ' ')}.\n`
    if (relationshipWithGod)
      prayerInput += `I currently feel my relationship with God is ${relationshipWithGod.replace(/_/g, ' ')}.\n`

    if (commitmentLevel) {
      const commitmentText = {
        extremely: 'extremely committed',
        very: 'very committed',
        somewhat: 'somewhat committed',
        neutral: 'neutral',
        not_very: 'not very committed',
      }[commitmentLevel]
      prayerInput += `I'm feeling ${commitmentText} about my prayer commitment.\n`
    }

    if (streakGoalDays)
      prayerInput += `I'm aiming for a prayer streak of ${streakGoalDays} days.\n`

    // Mood
    if (moodFromSnapshot) {
      let moodString = `Today, I'm feeling ${moodFromSnapshot}`
      if (moodContext) {
        moodString += ` (specifically about: ${moodContext})`
      }
      prayerInput += moodString + '.\n'
    }

    // Personal needs
    let personalNeedsAdded = false
    let personalNeedsSection = ''
    if (prayerNeeds && prayerNeeds.length > 0) {
      personalNeedsSection +=
        '\nFor myself, I ask for Your guidance and strength regarding:\n'
      prayerNeeds.forEach((need) => {
        personalNeedsSection += `- ${need.replace(/_/g, ' ')}\n`
      })
      personalNeedsAdded = true
    }
    if (customPrayerNeed) {
      if (!personalNeedsAdded)
        personalNeedsSection +=
          '\nFor myself, I ask for Your guidance and strength regarding:\n'
      personalNeedsSection += `- And specifically: ${customPrayerNeed}\n`
      personalNeedsAdded = true
    }
    prayerInput += personalNeedsSection

    // Intentions
    let intentionsSection = ''
    if (prayerIntentions && prayerIntentions.length > 0) {
      intentionsSection +=
        '\nI have these prayer intentions for the people in my life. Please expand on each one meaningfully in the prayer, adding depth and spiritual insight:\n'
      prayerIntentions.forEach((intention: any) => {
        // Handle both prayer_focus_people (from DB) and person (from generated data)
        const person = intention.prayer_focus_people || intention.person
        if (!person && intention.person_id === null) {
          intentionsSection += `- For myself: ${intention.details} (theme: ${intention.category}).\n`
        } else if (person) {
          const personName = person.name || 'Someone'
          let intentionLine = `- For ${personName}`
          if (person.relationship) intentionLine += ` (${person.relationship})`
          intentionLine += `: ${intention.details} (theme: ${intention.category}).\n`
          intentionsSection += intentionLine
        }
      })
    } else if (!personalNeedsAdded) {
      intentionsSection +=
        '\nI am open to Your guidance and blessings in all areas of my life.\n'
    }
    prayerInput += intentionsSection
  } else {
    // Subsequent prayer - trust the API to maintain state
    if (
      manualPromptEdits &&
      manualPromptEdits !== `Generate my ${slot} prayer.`
    ) {
      // Use the manual prompt if it's been edited
      prayerInput = manualPromptEdits
    } else {
      // Simple subsequent prayer prompt
      prayerInput = `Generate my ${slot} prayer.`
    }

    // Add review changes if provided (these are the natural language diffs)
    if (reviewChanges && reviewChanges.trim()) {
      prayerInput += ` ${reviewChanges.trim()}`
    }

    console.log('Subsequent prayer input (natural language diff):', prayerInput)
  }

  // Debug log to see final prayer input
  console.log('Final prayer input being sent to OpenAI:', prayerInput)

  try {
    // Prepare the request body for OpenAI Responses API
    const requestBody: any = {
      model: 'gpt-4o',
      input: prayerInput,
    }

    // For first prayer, include instructions
    if (!lastOpenaiResponseId) {
      console.log('First prayer - including instructions')
      requestBody.instructions = ACTS_MODEL_INSTRUCTIONS
    } else {
      // For subsequent prayers, include previous_response_id
      console.log(
        'Subsequent prayer - using previous_response_id:',
        lastOpenaiResponseId
      )
      requestBody.previous_response_id = lastOpenaiResponseId
    }

    // Use OpenAI Responses API
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(
        `OpenAI API error: ${error.error?.message || 'Unknown error'}`
      )
    }

    const data = await response.json()

    console.log(
      'OpenAI Responses API full request body:',
      JSON.stringify(requestBody, null, 2)
    )
    console.log(
      'OpenAI Responses API raw response:',
      JSON.stringify(data, null, 2)
    )

    // Parse the response based on OpenAI Responses API format
    let prayerContent = ''
    let actualResponseData = data

    // Log the response type to debug
    console.log('Response type:', typeof data)
    console.log('Response is array?', Array.isArray(data))

    // According to OpenAI docs, Responses API should return an object with 'output' field
    if (data.output && Array.isArray(data.output)) {
      console.log('Found standard Responses API format with output array')
      console.log('Output array:', JSON.stringify(data.output, null, 2))

      // Find the message in the output array
      const messageOutput = data.output.find(
        (item: any) => item.type === 'message'
      )
      console.log('Found message output:', messageOutput ? 'Yes' : 'No')

      if (
        messageOutput &&
        messageOutput.content &&
        Array.isArray(messageOutput.content)
      ) {
        console.log(
          'Message content array:',
          JSON.stringify(messageOutput.content, null, 2)
        )

        // The content is an array with objects containing type and text
        const textContent = messageOutput.content.find(
          (c: any) => c.type === 'output_text'
        )
        console.log('Found text content:', textContent ? 'Yes' : 'No')

        if (textContent && textContent.text) {
          prayerContent = textContent.text
          console.log('Extracted prayer from standard Responses API format')
          console.log(
            'Prayer preview:',
            prayerContent.substring(0, 100) + '...'
          )
        } else {
          console.error('Text content missing text property:', textContent)
        }
      } else {
        console.error('Message output missing content array:', messageOutput)
      }
    }
    // Fallback: Handle array format (what we seem to be getting)
    else if (Array.isArray(actualResponseData)) {
      console.log(
        'Response is in array format (non-standard), extracting prayer...'
      )
      // Get the last message in the array
      const lastMessage = actualResponseData[actualResponseData.length - 1]
      if (lastMessage && lastMessage.content) {
        if (Array.isArray(lastMessage.content)) {
          // Find text content in the content array
          const textContent = lastMessage.content.find(
            (c: any) => c.type === 'output_text' || c.type === 'text'
          )
          if (textContent && textContent.text) {
            prayerContent = textContent.text
            console.log('Extracted prayer from message content array')
          }
        } else if (typeof lastMessage.content === 'string') {
          prayerContent = lastMessage.content
          console.log('Extracted prayer from message content string')
        }
      }
    }
    // Another possible format
    else if (
      actualResponseData.content &&
      Array.isArray(actualResponseData.content) &&
      actualResponseData.content.length > 0
    ) {
      // Extract the first content item
      const contentItem = data.content[0]
      console.log('Content item:', contentItem)
      console.log('Content item type:', typeof contentItem)
      console.log(
        'Content item keys:',
        contentItem && typeof contentItem === 'object'
          ? Object.keys(contentItem)
          : 'N/A'
      )

      if (typeof contentItem === 'string') {
        prayerContent = contentItem
      } else if (contentItem && typeof contentItem === 'object') {
        // Log all properties to see what's available
        console.log('Checking contentItem properties:')
        console.log('- text:', contentItem.text)
        console.log('- content:', contentItem.content)
        console.log('- output:', contentItem.output)
        console.log('- value:', contentItem.value)
        console.log('- type:', contentItem.type)

        // Content item might have text, content, or output property
        prayerContent =
          contentItem.text ||
          contentItem.content ||
          contentItem.output ||
          contentItem.value ||
          ''

        // If still no content, check for nested content array
        if (
          !prayerContent &&
          contentItem.content &&
          Array.isArray(contentItem.content)
        ) {
          prayerContent = contentItem.content
            .map((item: any) =>
              typeof item === 'string' ? item : item.text || ''
            )
            .join('')
        }

        // If still no content, check if it's a text type with text property (OpenAI Responses API format)
        if (!prayerContent && contentItem.type === 'text' && contentItem.text) {
          prayerContent = contentItem.text
        }

        // If we still don't have content, log the full structure to understand it better
        if (!prayerContent) {
          console.error(
            'Failed to extract prayer from content item. Full structure:',
            JSON.stringify(contentItem, null, 2)
          )
          // Try to extract any string value from the object
          const values = Object.values(contentItem)
          const stringValue = values.find((v) => typeof v === 'string')
          if (stringValue) {
            console.log('Found string value in object:', stringValue)
            prayerContent = stringValue as string
          } else {
            // Last resort - set error message instead of object
            prayerContent =
              'Prayer generation failed - unable to extract text content'
          }
        }
      }
    } else if (data.output) {
      prayerContent = data.output
    } else if (data.text) {
      prayerContent = data.text
    } else if (typeof data.content === 'string') {
      prayerContent = data.content
    }

    // If we still don't have content, log the entire response for debugging
    if (!prayerContent) {
      console.error('Unable to extract prayer content from response:', data)
      console.error('Content structure:', data.content)
      prayerContent = 'Prayer generation failed - unable to extract content'
    }

    console.log('Final prayer content type:', typeof prayerContent)
    console.log('Final prayer content:', prayerContent)

    // Ensure prayer is always a string
    if (typeof prayerContent !== 'string') {
      console.error(
        'Prayer content is not a string, converting:',
        prayerContent
      )
      prayerContent =
        typeof prayerContent === 'object'
          ? JSON.stringify(prayerContent)
          : String(prayerContent)
    }

    // Check if the prayer content is a JSON string that needs parsing
    if (
      prayerContent.startsWith('[{') &&
      prayerContent.includes('"type":"message"')
    ) {
      try {
        console.log('Detected JSON string prayer content, parsing...')
        const parsed = JSON.parse(prayerContent)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const message = parsed[0]
          if (
            message.content &&
            Array.isArray(message.content) &&
            message.content.length > 0
          ) {
            const textContent = message.content.find(
              (c: any) => c.type === 'output_text' || c.type === 'text'
            )
            if (textContent && textContent.text) {
              console.log('Extracted prayer text from JSON structure')
              prayerContent = textContent.text
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse JSON prayer content:', e)
      }
    }

    // Get the response ID - handle both expected and actual formats
    let responseId = ''

    // Use actualResponseData which has been parsed if needed
    if (actualResponseData.id) {
      responseId = actualResponseData.id
      console.log('Found response ID at root level:', responseId)
    } else if (actualResponseData.response_id) {
      responseId = actualResponseData.response_id
      console.log('Found response_id field:', responseId)
    } else if (Array.isArray(actualResponseData)) {
      // Array format - check each message for an ID
      for (const message of actualResponseData) {
        if (message.id) {
          responseId = message.id
          console.log('Found response ID in array message:', responseId)
          break // Use the first ID we find
        }
      }
    }

    // Special handling: Sometimes the response ID might be in a wrapped structure
    if (!responseId && data !== actualResponseData) {
      // Check the original data object too
      if (data.id) {
        responseId = data.id
        console.log('Found response ID in original data:', responseId)
      }
    }

    if (!responseId) {
      console.error(
        'WARNING: No response ID found! Full response:',
        JSON.stringify(data, null, 2)
      )
      console.error('This will break stateful conversation!')
    }

    const result = {
      prayer: prayerContent,
      responseId: responseId, // The response ID for stateful conversation
      prompt: prayerInput,
    }

    console.log('Returning result:', result)

    return result
  } catch (error) {
    console.error('Error generating prayer:', error)
    throw error
  }
}
