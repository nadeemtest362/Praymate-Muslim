import { supabase } from './supabase-service'

export async function checkVideosTableSchema() {
  try {
    // Get table schema information from Supabase
    const { data, error } = await supabase.from('videos').select('*').limit(1)

    if (error) {
      console.error('Error fetching videos schema:', error)
      return null
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0])
      console.log('Videos table columns:', columns)
      console.log('Sample row:', data[0])
      return { columns, sample: data[0] }
    }

    return null
  } catch (error) {
    console.error('Error checking schema:', error)
    return null
  }
}

// Run the check
checkVideosTableSchema()
