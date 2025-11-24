import {
  checkClaudeHealth,
  checkRateLimit,
  incrementRequestCount,
} from './claude-health-check'
import { callClaude } from './claude-proxy-service'
import { supabase } from './supabase-service'

interface VideoForAnalysis {
  id: number // Internal database ID
  video_id: string // TikTok video ID
  title: string
  description: string
  hook_transcript: string | null
  views: number
  likes: number
  comments: number
  shares: number
  duration: number
  author_name: string
  author_id: number
}

interface ViralAnalysis {
  emotional_core: string[]
  viral_factors: string[]
  content_type: string
  hook_strategy: string
  replication_note: string
  hook_type?: string
  video_structure?: string
  pacing?: string
  target_audience?: string
}

// Rate limiting configuration
const BATCH_SIZE = 3 // Process 3 videos at a time (reduced for reliability)
const BATCH_DELAY = 5000 // 5 seconds between batches (increased delay)
const MAX_RETRIES = 3
const RETRY_DELAY = 3000 // 3 seconds between retries (increased delay)
const API_ERROR_DELAY = 10000 // 10 seconds delay on API errors

// Get unanalyzed videos
export async function getUnanalyzedVideos(
  limit: number = 100
): Promise<VideoForAnalysis[]> {
  // Check which videos already have analyses
  const { data: analyzed } = await supabase
    .from('ai_analyses')
    .select('video_id_internal')
    .eq('analysis_type', 'viral_factors')

  const analyzedIds = analyzed?.map((a) => a.video_id_internal) || []

  // Get viral Christian videos that haven't been analyzed
  let query = supabase
    .from('videos')
    .select(
      'id, video_id, title, description, views, likes, comments, shares, duration, author_id'
    )
    .or(
      `description.ilike.%christian%,description.ilike.%jesus%,description.ilike.%god%,description.ilike.%faith%,description.ilike.%prayer%`
    )
    .gte('views', 500000) // 500k+ views (viral threshold)
    .order('views', { ascending: false })
    .limit(limit)

  if (analyzedIds.length > 0) {
    query = query.not('id', 'in', `(${analyzedIds.join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching videos:', error)
    return []
  }

  // Get author names
  if (data && data.length > 0) {
    const authorIds = [...new Set(data.map((v) => v.author_id))]
    const { data: authors, error: authorsError } = await supabase
      .from('authors')
      .select('id, username')
      .in('id', authorIds)

    if (authorsError) {
      console.warn('Error fetching authors:', authorsError)
    }

    const authorMap = new Map(authors?.map((a) => [a.id, a.username]) || [])

    return data.map((video) => ({
      ...video,
      author_name: authorMap.get(video.author_id) || 'unknown',
      hook_transcript: null, // We don't have transcripts in this schema
    }))
  }

  return []
}

// Analyze a single video with retry logic
async function analyzeVideo(
  video: VideoForAnalysis,
  retries = 0
): Promise<any | null> {
  try {
    // Check rate limit before making request
    const rateLimit = checkRateLimit()
    if (!rateLimit.canProceed) {
      console.warn(
        `⏳ Rate limit reached. Waiting ${(rateLimit.resetIn / 1000).toFixed(0)}s...`
      )
      await new Promise((resolve) => setTimeout(resolve, rateLimit.resetIn))
    }

    incrementRequestCount()
    const content = video.hook_transcript || video.description || ''
    if (content.length < 20) {
      console.log(`⚠️ Skipping ${video.video_id} - content too short`)
      return null
    }

    // Log sample data for debugging
    if (retries === 0) {
      console.log(`
📹 Analyzing video ${video.video_id}:`)
      console.log(`   Title: ${video.title?.substring(0, 60)}...`)
      console.log(`   Description: ${content.substring(0, 100)}...`)
      console.log(
        `   Stats: ${video.views.toLocaleString()} views, ${((video.likes / video.views) * 100).toFixed(1)}% like rate`
      )
    }

    const prompt = `I have data about a viral Christian TikTok video. Based on its description and statistics, analyze why it succeeded.

Video Description/Caption:
"${content.substring(0, 800)}"

Video Title: "${video.title || 'Untitled'}"

Performance Metrics:
- Views: ${video.views.toLocaleString()}
- Likes: ${video.likes.toLocaleString()}
- Comments: ${video.comments.toLocaleString()}
- Shares: ${video.shares.toLocaleString()}
- Engagement Rate: ${(((video.likes + video.comments + video.shares) / video.views) * 100).toFixed(2)}%
- Duration: ${video.duration} seconds
- Creator: @${video.author_name}

Analyze this viral Christian content and return ONLY a JSON object with these fields:
{
  "emotional_core": ["emotion1", "emotion2", "emotion3"],
  "viral_factors": ["specific factor 1", "specific factor 2", "specific factor 3"],
  "content_type": "testimony" or "worship" or "teaching" or "comedy" or "challenge" or "transformation",
  "hook_strategy": "how the opening grabs attention based on the description",
  "replication_note": "one specific actionable tip for other creators",
  "hook_type": "question" or "statement" or "challenge" or "story" or "revelation",
  "video_structure": "single_scene" or "montage" or "tutorial" or "testimonial",
  "pacing": "fast" or "medium" or "slow" or "building",
  "target_audience": "specific demographic this appeals to"
}

Return ONLY valid JSON, no other text.`

    const response = await callClaude(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      'claude-3-5-sonnet-20241022',
      1024
    )

    // Check if response is an error message
    if (
      typeof response === 'string' &&
      (response.toLowerCase().includes('i apologize') ||
        response.toLowerCase().includes('error') ||
        response.toLowerCase().includes('unable to') ||
        response.toLowerCase().includes('cannot'))
    ) {
      throw new Error(
        `API returned error message: ${response.substring(0, 100)}...`
      )
    }

    // Try to extract JSON from the response
    let analysis: ViralAnalysis
    try {
      // Handle case where Claude might wrap JSON in markdown code blocks
      const jsonMatch =
        response.match(/```json\s*([\s\S]*?)\s*```/) ||
        response.match(/```\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : response
      analysis = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error(`JSON parse error for ${video.video_id}:`, parseError)
      // Check if it's definitely not JSON
      if (
        !response.trim().startsWith('{') &&
        !response.trim().startsWith('[')
      ) {
        throw new Error(
          `Response is not JSON: ${response.substring(0, 100)}...`
        )
      }
      // Try to parse as raw JSON
      analysis = JSON.parse(response)
    }

    // Validate required fields
    if (
      !analysis.emotional_core ||
      !analysis.viral_factors ||
      !analysis.content_type
    ) {
      throw new Error('Missing required fields in analysis')
    }

    // Map to ai_analyses schema
    return {
      video_id_internal: video.id,
      analysis_type: 'viral_factors',
      model_version: 'claude-3-5-sonnet-20241022',
      content: {
        video_id: video.video_id, // Store TikTok ID in content for reference
        emotional_core: analysis.emotional_core,
        viral_factors: analysis.viral_factors,
        content_type: analysis.content_type,
        hook_strategy: analysis.hook_strategy,
        replication_note: analysis.replication_note,
        hook_type: analysis.hook_type,
        video_structure: analysis.video_structure,
        pacing: analysis.pacing,
        target_audience: analysis.target_audience,
        // Store metadata for easier querying
        view_count: video.views,
        like_count: video.likes,
        engagement_rate: (
          ((video.likes + video.comments + video.shares) / video.views) *
          100
        ).toFixed(2),
      },
      raw_text_content: content,
      source_of_analysis_input: 'description',
      analyzed_at: new Date().toISOString(),
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error)

    // Check if it's an API rate limit or error response
    if (
      errorMessage.includes('API returned error') ||
      errorMessage.includes('Response is not JSON')
    ) {
      console.warn(
        `⚠️ API issue for ${video.video_id}: ${errorMessage.substring(0, 100)}`
      )

      if (retries < MAX_RETRIES) {
        console.log(
          `🔄 Retrying ${video.video_id} after API delay (attempt ${retries + 1}/${MAX_RETRIES})...`
        )
        // Longer delay for API issues
        await new Promise((resolve) => setTimeout(resolve, API_ERROR_DELAY))
        return analyzeVideo(video, retries + 1)
      }
    } else if (retries < MAX_RETRIES) {
      console.log(
        `🔄 Retrying ${video.video_id} (attempt ${retries + 1}/${MAX_RETRIES})...`
      )
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
      return analyzeVideo(video, retries + 1)
    }

    console.error(
      `❌ Failed to analyze ${video.video_id} after ${MAX_RETRIES} retries:`,
      errorMessage
    )
    return null
  }
}

// Analyze videos in controlled batches
export async function analyzeVideoBatch(
  videos: VideoForAnalysis[]
): Promise<void> {
  console.log(
    `🎬 Analyzing batch of ${videos.length} videos in groups of ${BATCH_SIZE}...`
  )

  const results = []

  // Process in smaller batches to avoid rate limits
  for (let i = 0; i < videos.length; i += BATCH_SIZE) {
    const batch = videos.slice(i, i + BATCH_SIZE)
    console.log(
      `📊 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(videos.length / BATCH_SIZE)}`
    )

    const batchResults = await Promise.all(
      batch.map((video) => analyzeVideo(video))
    )

    results.push(...batchResults)

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < videos.length) {
      console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s before next batch...`)
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
    }
  }

  // Save successful analyses
  const validAnalyses = results.filter((a) => a !== null)
  const failedCount = results.length - validAnalyses.length

  if (validAnalyses.length > 0) {
    console.log(`💾 Saving ${validAnalyses.length} successful analyses...`)

    // Insert in batches to avoid database timeouts
    const insertBatchSize = 10
    let savedCount = 0

    for (let i = 0; i < validAnalyses.length; i += insertBatchSize) {
      const insertBatch = validAnalyses.slice(i, i + insertBatchSize)
      const { error } = await supabase.from('ai_analyses').insert(insertBatch)

      if (error) {
        console.error(
          `Error saving batch ${Math.floor(i / insertBatchSize) + 1}:`,
          error
        )
        // Log the specific videos that failed
        insertBatch.forEach((a) =>
          console.error(`Failed to save: ${a.video_id}`)
        )
      } else {
        savedCount += insertBatch.length
        console.log(
          `✅ Saved batch ${Math.floor(i / insertBatchSize) + 1} (${insertBatch.length} videos)`
        )
      }
    }

    console.log(
      `💾 Successfully saved ${savedCount}/${validAnalyses.length} analyses to database`
    )
  }

  if (failedCount > 0) {
    console.warn(`⚠️ ${failedCount} videos failed to analyze`)
  }

  console.log(
    `📈 Batch complete: ${validAnalyses.length}/${videos.length} successful`
  )
}

// Main bulk analysis function
export async function runBulkAnalysis(
  totalVideos: number = 1000,
  batchSize: number = 20
): Promise<{ analyzed: number; failed: number; errors: string[] }> {
  console.log(`🚀 Starting analysis of up to ${totalVideos} videos`)
  console.log(
    `⚙️ Configuration: Batch size=${batchSize}, API batch=${BATCH_SIZE}, Delay=${BATCH_DELAY}ms`
  )

  // Health check before starting
  console.log(`🏥 Checking Claude API health...`)
  const health = await checkClaudeHealth()
  if (!health.healthy) {
    console.error(`❌ Claude API health check failed: ${health.message}`)
    throw new Error(`Cannot start analysis: ${health.message}`)
  }
  console.log(
    `✅ Claude API is healthy (${health.responseTime}ms response time)`
  )

  let analyzed = 0
  let failed = 0
  const errors: string[] = []
  const startTime = Date.now()

  while (analyzed < totalVideos) {
    const videos = await getUnanalyzedVideos(
      Math.min(batchSize, totalVideos - analyzed)
    )

    if (videos.length === 0) {
      console.log('✅ No more videos to analyze')
      break
    }

    console.log(`\n🎯 Fetched ${videos.length} videos to analyze`)
    const batchStartTime = Date.now()

    await analyzeVideoBatch(videos)

    const batchTime = (Date.now() - batchStartTime) / 1000
    // Count successful analyses (this is approximate, actual count happens in analyzeVideoBatch)
    const successCount = videos.length // This will be updated with actual results later
    analyzed += successCount

    console.log(`⏱️ Batch completed in ${batchTime.toFixed(1)}s`)
    console.log(
      `📊 Overall progress: ${analyzed}/${totalVideos} videos (${((analyzed / totalVideos) * 100).toFixed(1)}%)`
    )

    // Brief pause between fetches
    if (analyzed < totalVideos) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  const totalTime = (Date.now() - startTime) / 1000 / 60
  console.log(`\n✨ Analysis complete!`)
  console.log(
    `📊 Total: ${analyzed} videos analyzed in ${totalTime.toFixed(1)} minutes`
  )
  console.log(`⚡ Average: ${(analyzed / totalTime).toFixed(1)} videos/minute`)

  return { analyzed, failed, errors }
}

// Get insights from analyses
export async function getViralInsights() {
  const { data: analyses } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('analysis_type', 'viral_factors')
    .order('analyzed_at', { ascending: false })
    .limit(1000)

  if (!analyses || analyses.length === 0) return null

  // Aggregate data - extract from JSONB content
  const emotions = analyses.flatMap((a) => a.content?.emotional_core || [])
  const factors = analyses.flatMap((a) => a.content?.viral_factors || [])
  const types = analyses.map((a) => a.content?.content_type).filter(Boolean)

  // Count frequencies
  const countItems = (items: string[]) => {
    return items.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }

  const emotionCounts = countItems(emotions)
  const factorCounts = countItems(factors)
  const typeCounts = countItems(types)

  // Sort and get top items
  const getTop = (counts: Record<string, number>, limit: number) => {
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([item, count]) => ({ item, count }))
  }

  return {
    totalAnalyzed: analyses.length,
    topEmotions: getTop(emotionCounts, 10),
    topViralFactors: getTop(factorCounts, 20),
    contentTypes: getTop(typeCounts, 10),
    examples: analyses.slice(0, 10).map((a) => ({
      video_id: a.video_id_internal,
      views: a.content?.view_count || 0,
      hook_strategy: a.content?.hook_strategy,
      replication_note: a.content?.replication_note,
    })),
  }
}
