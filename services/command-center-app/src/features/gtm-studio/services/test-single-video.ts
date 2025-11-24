import { fetchTikTokVideoDetails } from './scrape-creators-service'
import { analyzeViralVideo } from './viral-video-analysis-service'

export async function testSingleVideo(videoId: string) {
  console.log('='.repeat(80))
  console.log('TESTING SINGLE VIDEO:', videoId)
  console.log('='.repeat(80))

  try {
    // Step 1: Fetch video details
    console.log('\n📥 STEP 1: Fetching video details from ScrapeCreators...')
    const videoUrl = `https://www.tiktok.com/@test/video/${videoId}`
    const videoData = await fetchTikTokVideoDetails(videoUrl, true) // get_transcript = true

    console.log('✅ Video data received:')
    console.log(
      '- Title:',
      videoData.aweme_detail?.desc?.substring(0, 100) + '...'
    )
    console.log('- Has transcript:', !!videoData.transcript)
    console.log('- Transcript length:', videoData.transcript?.length || 0)
    console.log(
      '- Video URL:',
      videoData.aweme_detail?.video?.play_addr?.url_list?.[0]?.substring(
        0,
        50
      ) + '...'
    )
    console.log(
      '- Thumbnail URL:',
      videoData.aweme_detail?.video?.origin_cover?.url_list?.[0]?.substring(
        0,
        50
      ) + '...'
    )

    // Step 2: Analyze with our service
    console.log('\n🧠 STEP 2: Running viral video analysis...')
    const result = await analyzeViralVideo(videoUrl, videoId)

    console.log('\n📊 ANALYSIS RESULT:')
    console.log('- Source:', result.source)
    console.log('- Has error:', !!result.error)
    console.log('- Error:', result.error)
    console.log('- Has analysis:', !!result.analysis)

    if (result.analysis) {
      console.log('\n🎯 EXTRACTED HOOK:', result.analysis.hook || 'NOT FOUND')

      // Also show the raw analysis to debug hook extraction
      if (result.rawAnalysis) {
        console.log('\n📄 RAW GEMINI ANALYSIS (first 500 chars):')
        console.log(result.rawAnalysis.substring(0, 500) + '...')

        // Try to find HOOK in raw analysis
        const hookMatch = result.rawAnalysis.match(/HOOK:\s*(.+?)(?:\n|$)/i)
        if (hookMatch) {
          console.log('\n✅ HOOK FOUND IN RAW ANALYSIS:', hookMatch[1])
        }
      }

      console.log('\n📝 ANALYSIS SECTIONS:')
      result.analysis.original_video_analysis?.sections?.forEach(
        (section: any, i: number) => {
          console.log(`\n${i + 1}. ${section.subheading}:`)
          section.points?.forEach((point: string) => {
            console.log(
              `   - ${point.substring(0, 100)}${point.length > 100 ? '...' : ''}`
            )
          })
        }
      )
    }

    return result
  } catch (error) {
    console.error('❌ TEST FAILED:', error)
    throw error
  }
}

// Run test if called directly (disabled in browser)
if (false && import.meta.url.endsWith('test-single-video.ts')) {
  testSingleVideo('7178976611662826795')
    .then(() => {
      console.log('\n✅ Test complete')
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error)
    })
}
