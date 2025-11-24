import { supabase } from '@/lib/supabaseClient'

export async function getUserIntentions(userId: string) {
  try {
    const { data: intentions, error } = await supabase
      .from('prayer_lab_intentions')
      .select(
        `
        *,
        prayer_lab_people (
          id,
          name,
          relationship,
          gender
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error

    console.log('Loaded intentions from database:', intentions)

    // Transform to match the expected format
    return (
      intentions?.map((intention) => ({
        id: intention.id, // This should be the actual UUID from the database
        person_id: intention.person_id,
        person: intention.person_id
          ? {
              id: intention.prayer_lab_people.id,
              name: intention.prayer_lab_people.name,
              relationship: intention.prayer_lab_people.relationship,
              gender: intention.prayer_lab_people.gender,
            }
          : null,
        category: intention.category,
        details: intention.details,
        is_active: intention.is_active,
      })) || []
    )
  } catch (error) {
    console.error('Error loading user intentions:', error)
    return []
  }
}
