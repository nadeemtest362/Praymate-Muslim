// Quick test to get sample Christian TikTok URLs from the database
import { supabase } from '../services/supabase-service'

async function getSampleUrls() {
  console.log('🔍 Fetching sample Christian TikTok URLs...')

  const { data: videos, error } = await supabase
    .from('videos')
    .select('video_id, author_unique_id, views, description')
    .gte('views', 5000000) // Very viral videos
    .order('views', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\n📹 Sample TikTok URLs for testing:\n')
  videos?.forEach((video, i) => {
    const url = `https://www.tiktok.com/@${video.author_unique_id}/video/${video.video_id}`
    console.log(`${i + 1}. ${url}`)
    console.log(`   Views: ${video.views.toLocaleString()}`)
    console.log(`   Description: ${video.description?.substring(0, 50)}...`)
    console.log('')
  })
}

getSampleUrls()
