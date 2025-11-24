import { checkRateLimit, incrementRequestCount } from './claude-health-check'
import { callClaude } from './claude-proxy-service'
import { fetchTikTokVideoDetails } from './scrape-creators-service'
import { supabase } from './supabase-service'

interface VideoForAnalysis {
  id: number
  video_id: string
  title: string
  description: string
  views: number
  likes: number
  comments: number
  shares: number
  duration: number
  author_id: number
  video_url?: string
}

interface ViralAnalysis {
  hook_analysis: {
    first_3_seconds: string
    hook_type: string
    attention_grabbing_elements: string[]
  }
  emotional_journey: {
    opening_emotion: string
    peak_emotion: string
    closing_emotion: string
  }
  viral_factors: string[]
  content_structure: {
    type: string
    pacing: string
    key_moments: string[]
  }
  visual_elements: string[]
  audio_elements: string[]
  replication_formula: string
  target_audience: string
}

export async function analyzeVideoWithTranscript(
  video: VideoForAnalysis
): Promise<any | null> {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit()
    if (!rateLimit.canProceed) {
      console.warn(
        `⏳ Rate limit reached. Waiting ${(rateLimit.resetIn / 1000).toFixed(0)}s...`
      )
      await new Promise((resolve) => setTimeout(resolve, rateLimit.resetIn))
    }

    incrementRequestCount()

    // Construct TikTok URL if not provided
    const videoUrl =
      video.video_url || `https://www.tiktok.com/@user/video/${video.video_id}`

    console.log(`🎬 Fetching transcript for video ${video.video_id}...`)
    const videoDetails = await fetchTikTokVideoDetails(videoUrl, true)

    if (!videoDetails || !videoDetails.transcript) {
      console.warn(`⚠️ No transcript available for ${video.video_id}`)
      return null
    }

    console.log(`✅ Got transcript (${videoDetails.transcript.length} chars)`)

    const prompt = `Analyze this viral Christian TikTok video with ACTUAL TRANSCRIPT.

VIDEO TRANSCRIPT (what they actually say):
"${videoDetails.transcript}"

VIDEO DESCRIPTION/CAPTION:
"${video.description || videoDetails.aweme_detail?.desc || ''}"

PERFORMANCE METRICS:
- Views: ${video.views.toLocaleString()}
- Likes: ${video.likes.toLocaleString()} (${((video.likes / video.views) * 100).toFixed(1)}% like rate)
- Comments: ${video.comments.toLocaleString()}
- Shares: ${video.shares.toLocaleString()}
- Duration: ${video.duration} seconds

Analyze what ACTUALLY makes this video viral based on the REAL CONTENT:

{
  "hook_analysis": {
    "first_3_seconds": "exact words/sounds in first 3 seconds",
    "hook_type": "question|statement|story|challenge|revelation",
    "attention_grabbing_elements": ["specific elements that stop scroll"]
  },
  "emotional_journey": {
    "opening_emotion": "initial emotional state",
    "peak_emotion": "strongest emotion in video",
    "closing_emotion": "final emotional state"
  },
  "viral_factors": ["3-5 specific reasons based on actual content"],
  "content_structure": {
    "type": "testimony|teaching|worship|comedy|challenge|transformation",
    "pacing": "fast|medium|slow|building",
    "key_moments": ["timestamp markers of viral moments"]
  },
  "visual_elements": ["inferred from transcript mentions"],
  "audio_elements": ["music/sounds mentioned or implied"],
  "replication_formula": "specific actionable formula based on this video",
  "target_audience": "specific demographic this appeals to"
}

Return ONLY valid JSON.`

    const response = await callClaude(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      'claude-3-5-sonnet-20241022',
      2048
    )

    // Parse response
    let analysis: ViralAnalysis
    try {
      const jsonMatch =
        response.match(/```json\s*([\s\S]*?)\s*```/) ||
        response.match(/```\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : response
      analysis = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error(`JSON parse error for ${video.video_id}:`, parseError)
      throw new Error('Failed to parse analysis')
    }

    // Store analysis with transcript
    return {
      video_id_internal: video.id,
      analysis_type: 'viral_factors_with_transcript',
      model_version: 'claude-3-5-sonnet-20241022',
      content: {
        ...analysis,
        video_id: video.video_id,
        view_count: video.views,
        like_count: video.likes,
        engagement_rate: (
          ((video.likes + video.comments + video.shares) / video.views) *
          100
        ).toFixed(2),
        has_transcript: true,
        transcript_length: videoDetails.transcript.length,
      },
      raw_text_content: videoDetails.transcript,
      source_of_analysis_input: 'transcript',
      analyzed_at: new Date().toISOString(),
    }
  } catch (error: any) {
    console.error(`❌ Failed to analyze ${video.video_id}:`, error.message)
    return null
  }
}

// Get videos that need transcript analysis
export async function getVideosForTranscriptAnalysis(
  limit: number = 10
): Promise<VideoForAnalysis[]> {
  // Get videos that have been analyzed without transcripts
  const { data: withoutTranscripts } = await supabase
    .from('ai_analyses')
    .select('video_id_internal')
    .eq('analysis_type', 'viral_factors')
    .limit(100)

  const idsToReanalyze =
    withoutTranscripts?.map((a) => a.video_id_internal) || []

  // Get high-performing Christian videos
  let query = supabase
    .from('videos')
    .select(
      'id, video_id, title, description, views, likes, comments, shares, duration, author_id'
    )
    .or(
      `description.ilike.%christian%,description.ilike.%jesus%,description.ilike.%god%,description.ilike.%faith%`
    )
    .gte('views', 5000000) // 5M+ views for transcript analysis (costs more)
    .order('views', { ascending: false })
    .limit(limit)

  // Prioritize videos we've already analyzed poorly
  if (idsToReanalyze.length > 0) {
    query = query.in('id', idsToReanalyze.slice(0, limit))
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching videos:', error)
    return []
  }

  return data || []
}

// Run transcript-based analysis
export async function runTranscriptAnalysis(limit: number = 5): Promise<void> {
  console.log(`🚀 Starting transcript-based analysis of ${limit} videos...`)

  const videos = await getVideosForTranscriptAnalysis(limit)

  if (videos.length === 0) {
    console.log('✅ No videos to analyze')
    return
  }

  console.log(`📊 Found ${videos.length} videos to analyze with transcripts`)

  let successful = 0
  let failed = 0

  // Process one at a time (transcripts are expensive)
  for (const video of videos) {
    console.log(
      `\n🎯 Analyzing video ${video.video_id} (${video.views.toLocaleString()} views)...`
    )

    const analysis = await analyzeVideoWithTranscript(video)

    if (analysis) {
      // Save to database
      const { error } = await supabase.from('ai_analyses').insert(analysis)

      if (error) {
        console.error(`Failed to save analysis:`, error)
        failed++
      } else {
        console.log(`✅ Successfully analyzed with transcript!`)
        successful++
      }
    } else {
      failed++
    }

    // Pause between videos
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  console.log(`\n✨ Transcript analysis complete!`)
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
}
