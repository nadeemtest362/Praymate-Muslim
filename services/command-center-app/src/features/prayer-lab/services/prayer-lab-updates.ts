import { supabase } from '@/lib/supabaseClient'

export async function updateUserMood(
  userId: string,
  mood: string,
  moodContext?: string
) {
  try {
    const { error } = await supabase
      .from('prayer_lab_users')
      .update({
        mood,
        mood_context: moodContext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating user mood:', error)
    return false
  }
}

export async function updateIntentionStatus(
  intentionId: string,
  isActive: boolean
) {
  try {
    console.log('Updating intention status:', { intentionId, isActive })

    const { data, error } = await supabase
      .from('prayer_lab_intentions')
      .update({
        is_active: isActive,
      })
      .eq('id', intentionId)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    console.log('Update successful:', data)
    return true
  } catch (error) {
    console.error('Error updating intention status:', error)
    console.error('Intention ID that failed:', intentionId)
    return false
  }
}
