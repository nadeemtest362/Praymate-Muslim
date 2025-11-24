import { supabase } from '@/lib/supabaseClient'
import type { GeneratedUserData } from './ai-user-generator'

// Using dedicated Prayer Lab tables to avoid polluting production data

interface SavedUser {
  id: string
  first_name: string
  email: string
  display_name?: string
  mood?: string
  mood_context?: string
  last_openai_response_id?: string | null
  created_at?: string
}

interface SavedPrayer {
  id: string
  user_id: string
  content: string
  slot: string
  prompt?: string
  openai_response_id?: string
  model: string
  input_snapshot: any
  created_at: string
}

export async function saveTestUser(
  userData: GeneratedUserData
): Promise<SavedUser> {
  try {
    // Create a test user email
    const email = `${userData.firstName.toLowerCase()}.prayerlab.${Date.now()}@test.local`

    // Create user in prayer_lab_users table (no auth user needed for testing)
    const { data: user, error: userError } = await supabase
      .from('prayer_lab_users')
      .insert({
        email,
        first_name: userData.firstName,
        display_name: userData.firstName,
        mood: userData.mood,
        mood_context: userData.moodContext,
        last_openai_response_id: userData.lastOpenaiResponseId,
        initial_motivation: userData.initialMotivation,
        prayer_frequency: userData.prayerFrequency,
        relationship_with_god: userData.relationshipWithGod,
        faith_tradition: userData.faithTradition,
        commitment_level: userData.commitmentLevel,
        streak_goal_days: userData.streakGoalDays,
        prayer_times: userData.prayerTimes,
        prayer_needs: userData.prayerNeeds,
        custom_prayer_need: userData.customPrayerNeed,
      })
      .select()
      .single()

    if (userError) throw userError
    if (!user) throw new Error('Failed to create test user')

    const userId = user.id

    // Save prayer intentions
    if (userData.prayerIntentions && userData.prayerIntentions.length > 0) {
      // First, create prayer focus people if needed
      const peopleToCreate = userData.prayerIntentions
        .filter((i) => i.person)
        .map((i) => ({
          user_id: userId,
          name: i.person!.name,
          relationship: i.person!.relationship,
          gender: i.person!.gender,
        }))

      let peopleMap: Record<string, string> = {}

      if (peopleToCreate.length > 0) {
        const { data: createdPeople, error: peopleError } = await supabase
          .from('prayer_lab_people')
          .insert(peopleToCreate)
          .select()

        if (peopleError) throw peopleError

        // Map temporary IDs to real IDs
        createdPeople?.forEach((person) => {
          const originalIntention = userData.prayerIntentions.find(
            (i) => i.person?.name === person.name
          )
          if (originalIntention?.person_id) {
            peopleMap[originalIntention.person_id] = person.id
          }
        })
      }

      // Create intentions
      const intentionsToCreate = userData.prayerIntentions.map((intention) => ({
        user_id: userId,
        person_id: intention.person_id
          ? peopleMap[intention.person_id] || null
          : null,
        category: intention.category,
        details: intention.details,
        is_active: intention.is_active,
      }))

      const { error: intentionsError } = await supabase
        .from('prayer_lab_intentions')
        .insert(intentionsToCreate)

      if (intentionsError) throw intentionsError
    }

    return {
      id: userId,
      first_name: userData.firstName,
      email,
      display_name: userData.firstName,
      mood: userData.mood,
      mood_context: userData.moodContext,
      last_openai_response_id: userData.lastOpenaiResponseId,
      created_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error saving test user:', error)
    throw error
  }
}

export async function savePrayer(
  userId: string,
  prayerContent: string,
  slot: string,
  inputSnapshot: any,
  responseId?: string,
  prompt?: string,
  modelKnowledge?: {
    modelKnew: any
    modelKnows: any
  }
): Promise<SavedPrayer> {
  try {
    // Enhance input snapshot with model knowledge
    const enhancedSnapshot = {
      ...inputSnapshot,
      modelKnowledge: modelKnowledge || null,
    }

    const { data, error } = await supabase
      .from('prayer_lab_prayers')
      .insert({
        user_id: userId,
        content: prayerContent,
        slot,
        input_snapshot: enhancedSnapshot,
        openai_response_id: responseId,
        prompt,
        model: 'gpt-4o',
      })
      .select()
      .single()

    if (error) throw error

    // Update user's last_openai_response_id if provided
    if (responseId) {
      console.log(`Updating user ${userId} with response ID: ${responseId}`)

      const { data: updateData, error: updateError } = await supabase
        .from('prayer_lab_users')
        .update({
          last_openai_response_id: responseId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating last response ID:', updateError)
      } else {
        console.log(
          'Successfully updated user with response ID:',
          updateData?.last_openai_response_id
        )
      }
    } else {
      console.error('No response ID provided to save!')
    }

    return data
  } catch (error) {
    console.error('Error saving prayer:', error)
    throw error
  }
}

export async function getTestUsers() {
  try {
    const { data, error } = await supabase
      .from('prayer_lab_users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching test users:', error)
    return []
  }
}

export async function getUserPrayers(userId: string) {
  try {
    const { data, error } = await supabase
      .from('prayer_lab_prayers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user prayers:', error)
    return []
  }
}

// Function to save generated intentions to the database
export async function saveGeneratedIntentions(
  userId: string,
  intentions: Array<{
    person?: {
      name: string
      relationship: string
      gender: 'male' | 'female'
    } | null
    category: string
    details: string
    is_active: boolean
  }>
): Promise<void> {
  try {
    // Group intentions by whether they need people created
    const intentionsWithPeople = intentions.filter((i) => i.person)

    // Create people first if needed
    let peopleMap: Record<string, string> = {}

    if (intentionsWithPeople.length > 0) {
      const peopleToCreate = intentionsWithPeople.map((i) => ({
        user_id: userId,
        name: i.person!.name,
        relationship: i.person!.relationship,
        gender: i.person!.gender,
      }))

      const { data: createdPeople, error: peopleError } = await supabase
        .from('prayer_lab_people')
        .insert(peopleToCreate)
        .select()

      if (peopleError) throw peopleError

      // Map people names to IDs
      createdPeople?.forEach((person, index) => {
        const originalIntention = intentionsWithPeople[index]
        if (originalIntention.person) {
          peopleMap[originalIntention.person.name] = person.id
        }
      })
    }

    // Create all intentions
    const intentionsToCreate = intentions.map((intention) => ({
      user_id: userId,
      person_id: intention.person ? peopleMap[intention.person.name] : null,
      category: intention.category,
      details: intention.details,
      is_active: intention.is_active,
    }))

    const { error: intentionsError } = await supabase
      .from('prayer_lab_intentions')
      .insert(intentionsToCreate)

    if (intentionsError) throw intentionsError

    console.log('Successfully saved generated intentions to database')
  } catch (error) {
    console.error('Error saving generated intentions:', error)
    throw error
  }
}
