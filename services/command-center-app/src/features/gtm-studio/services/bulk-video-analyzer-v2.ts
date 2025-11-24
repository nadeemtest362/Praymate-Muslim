import { createClient } from '@supabase/supabase-js'
import { callClaude } from './claude-proxy-service'
import { supabase } from './supabase-service'

// Create a separate client for the command center DB where we store analyses
const ccSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const ccSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const ccSupabase = createClient(ccSupabaseUrl, ccSupabaseAnonKey)

interface VideoForAnalysis {
  id: string
  video_id: string
  title: string
  caption: string
  hook_transcript: string | null
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  duration: number
  author_name: string
}

interface AnalysisResult {
  video_id: string
  analysis_type: 'hook_only' | 'caption_only' | 'skip_insufficient_data'
  emotional_core?: string[]
  viral_factors?: string[]
  content_type?: string
  execution_details?: any
  replication_notes?: string
  confidence_score: number
  raw_response?: string
  error?: string
}

interface AnalysisProgress {
  total_videos: number
  analyzed_count: number
  success_count: number
  error_count: number
  skipped_count: number
  estimated_cost: number
  rate_limit_pauses: number
  last_processed_id?: string
}

// Rate limiting configuration
const RATE_LIMITS = {
  requests_per_minute: 40, // Stay under Claude's 50 rpm limit
  tokens_per_minute: 30000, // Stay under 40k tpm limit
  cost_limit: 10.0, // Stop at $10 to prevent accidents
  pause_on_rate_limit_ms: 65000, // Wait 65 seconds on rate limit
  max_retries: 3,
  backoff_multiplier: 2,
}

// Track API usage
let apiUsageTracker = {
  requests_this_minute: 0,
  tokens_this_minute: 0,
  total_cost: 0,
  minute_reset_time: Date.now() + 60000,
}

// Cost estimation (Claude Sonnet pricing)
const COST_PER_1K_INPUT_TOKENS = 0.003
const COST_PER_1K_OUTPUT_TOKENS = 0.015
const AVG_TOKENS_PER_ANALYSIS = 1500 // Rough estimate

// Get progress from database
export async function getAnalysisProgress(): Promise<AnalysisProgress> {
  const { data: progress } = await ccSupabase
    .from('analysis_progress')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (progress) {
    return progress
  }

  // Initialize progress
  const { data: videoCount } = await supabase
    .from('videos')
    .select('count', { count: 'exact', head: true })
    .or(
      `caption.ilike.%christian%,caption.ilike.%jesus%,caption.ilike.%god%,caption.ilike.%faith%,caption.ilike.%prayer%`
    )
    .gte('view_count', 500000)

  return {
    total_videos: videoCount?.count || 0,
    analyzed_count: 0,
    success_count: 0,
    error_count: 0,
    skipped_count: 0,
    estimated_cost: 0,
    rate_limit_pauses: 0,
  }
}

// Save progress to database
async function saveProgress(progress: AnalysisProgress) {
  await ccSupabase.from('analysis_progress').insert(progress)
}

// Check if we should pause for rate limiting
async function checkAndHandleRateLimit(): Promise<void> {
  const now = Date.now()

  // Reset counters if minute has passed
  if (now > apiUsageTracker.minute_reset_time) {
    apiUsageTracker.requests_this_minute = 0
    apiUsageTracker.tokens_this_minute = 0
    apiUsageTracker.minute_reset_time = now + 60000
  }

  // Check if we're approaching limits
  if (
    apiUsageTracker.requests_this_minute >=
      RATE_LIMITS.requests_per_minute - 5 ||
    apiUsageTracker.tokens_this_minute >= RATE_LIMITS.tokens_per_minute - 5000
  ) {
    console.log('⏸️  Approaching rate limit, pausing for 1 minute...')
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMITS.pause_on_rate_limit_ms)
    )

    // Reset after pause
    apiUsageTracker.requests_this_minute = 0
    apiUsageTracker.tokens_this_minute = 0
    apiUsageTracker.minute_reset_time = Date.now() + 60000
  }

  // Check cost limit
  if (apiUsageTracker.total_cost >= RATE_LIMITS.cost_limit) {
    throw new Error(
      `Cost limit of $${RATE_LIMITS.cost_limit} reached. Total cost: $${apiUsageTracker.total_cost.toFixed(2)}`
    )
  }
}

// Get next batch of videos to analyze
export async function getNextVideoBatch(
  lastProcessedId?: string,
  limit: number = 1
): Promise<VideoForAnalysis[]> {
  // First, get already analyzed video IDs from command center DB
  const { data: analyzedVideos } = await ccSupabase
    .from('viral_video_analyses')
    .select('video_id')

  const analyzedIds = analyzedVideos?.map((v) => v.video_id) || []

  // Build query
  let query = supabase
    .from('videos')
    .select('*')
    .or(
      `caption.ilike.%christian%,caption.ilike.%jesus%,caption.ilike.%god%,caption.ilike.%faith%,caption.ilike.%prayer%`
    )
    .gte('view_count', 500000)
    .order('view_count', { ascending: false })
    .limit(limit)

  // Exclude already analyzed
  if (analyzedIds.length > 0) {
    query = query.not('video_id', 'in', `(${analyzedIds.join(',')})`)
  }

  // Resume from last processed
  if (lastProcessedId) {
    query = query.gt('video_id', lastProcessedId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching videos:', error)
    return []
  }

  return data || []
}

// Analyze a single video with proper error handling
export async function analyzeVideoSafely(
  video: VideoForAnalysis,
  retryCount = 0
): Promise<AnalysisResult> {
  try {
    // Check if we have enough data
    const hasHook = video.hook_transcript && video.hook_transcript.length > 10
    const hasCaption = video.caption && video.caption.length > 20

    if (!hasHook && !hasCaption) {
      return {
        video_id: video.video_id,
        analysis_type: 'skip_insufficient_data',
        confidence_score: 0,
        error: 'Insufficient data for analysis',
      }
    }

    // Check rate limits before making request
    await checkAndHandleRateLimit()

    const analysisType = hasHook ? 'hook_only' : 'caption_only'
    const contentToAnalyze = hasHook
      ? `Hook: "${video.hook_transcript}"\nCaption: ${video.caption}`
      : video.caption

    const prompt = `Analyze this viral Christian TikTok and return ONLY valid JSON:

Stats: ${video.view_count.toLocaleString()} views, ${((video.like_count / video.view_count) * 100).toFixed(1)}% like rate

Content: ${contentToAnalyze.substring(0, 500)}...

Return this EXACT JSON structure:
{
  "emotional_core": ["max 3 emotions"],
  "viral_factors": ["max 3 specific reasons"],
  "content_type": "testimony|worship|teaching|comedy|challenge|transformation",
  "execution_details": {
    "hook_strategy": "how it grabs attention"
  },
  "replication_notes": "one specific insight",
  "confidence_score": 0.0-1.0
}`

    // Track API usage
    apiUsageTracker.requests_this_minute++
    apiUsageTracker.tokens_this_minute += AVG_TOKENS_PER_ANALYSIS
    apiUsageTracker.total_cost +=
      (AVG_TOKENS_PER_ANALYSIS / 1000) *
      (COST_PER_1K_INPUT_TOKENS + COST_PER_1K_OUTPUT_TOKENS)

    const response = await callClaude(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      'claude-3-5-sonnet-20241022',
      512
    ) // Smaller token limit

    try {
      const analysis = JSON.parse(response)
      return {
        video_id: video.video_id,
        analysis_type: analysisType,
        ...analysis,
        raw_response: response,
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return {
        video_id: video.video_id,
        analysis_type: analysisType,
        confidence_score: 0,
        error: 'Failed to parse AI response',
        raw_response: response,
      }
    }
  } catch (error: any) {
    console.error(`Error analyzing video ${video.video_id}:`, error)

    // Check if it's a rate limit error
    if (error.message?.includes('rate limit') || error.status === 429) {
      console.log('🚨 Rate limit hit! Pausing...')
      apiUsageTracker.requests_this_minute = RATE_LIMITS.requests_per_minute // Max out counter
      await new Promise((resolve) =>
        setTimeout(resolve, RATE_LIMITS.pause_on_rate_limit_ms)
      )

      // Retry after pause
      if (retryCount < RATE_LIMITS.max_retries) {
        return analyzeVideoSafely(video, retryCount + 1)
      }
    }

    return {
      video_id: video.video_id,
      analysis_type: 'caption_only',
      confidence_score: 0,
      error: error.message || 'Unknown error',
    }
  }
}

// Save analysis to command center database
export async function saveAnalysisSafely(
  analysis: AnalysisResult
): Promise<boolean> {
  try {
    // Skip if it's an error or skip result
    if (analysis.error || analysis.analysis_type === 'skip_insufficient_data') {
      await ccSupabase.from('analysis_errors').insert({
        video_id: analysis.video_id,
        error: analysis.error,
        analysis_type: analysis.analysis_type,
        attempted_at: new Date().toISOString(),
      })
      return false
    }

    const { error } = await ccSupabase.from('viral_video_analyses').insert({
      video_id: analysis.video_id,
      analysis_type: analysis.analysis_type,
      emotional_core: analysis.emotional_core || [],
      viral_factors: analysis.viral_factors || [],
      content_type: analysis.content_type || 'unknown',
      execution_details: analysis.execution_details || {},
      replication_notes: analysis.replication_notes || '',
      confidence_score: analysis.confidence_score,
      raw_response: analysis.raw_response,
      analyzed_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Error saving analysis:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in saveAnalysisSafely:', error)
    return false
  }
}

// Main analysis function with proper orchestration
export async function runBulkAnalysis(
  maxVideos: number = 100,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<AnalysisProgress> {
  console.log(
    `🚀 Starting bulk analysis (max ${maxVideos} videos, $${RATE_LIMITS.cost_limit} limit)`
  )

  const progress = await getAnalysisProgress()
  let videosProcessed = 0

  try {
    while (videosProcessed < maxVideos) {
      // Get ONE video at a time to avoid parallel processing
      const videos = await getNextVideoBatch(progress.last_processed_id, 1)

      if (videos.length === 0) {
        console.log('✅ No more videos to analyze')
        break
      }

      const video = videos[0]
      console.log(
        `\n📹 Analyzing: ${video.title} (${video.view_count.toLocaleString()} views)`
      )

      // Analyze with safety checks
      const analysis = await analyzeVideoSafely(video)

      // Update progress
      progress.analyzed_count++
      progress.last_processed_id = video.video_id

      // Save analysis
      if (analysis.error) {
        progress.error_count++
        console.log(`❌ Error: ${analysis.error}`)
      } else if (analysis.analysis_type === 'skip_insufficient_data') {
        progress.skipped_count++
        console.log(`⏭️  Skipped: Insufficient data`)
      } else {
        const saved = await saveAnalysisSafely(analysis)
        if (saved) {
          progress.success_count++
          console.log(
            `✅ Success: ${analysis.content_type} (${analysis.confidence_score.toFixed(2)} confidence)`
          )
        }
      }

      // Update cost estimate
      progress.estimated_cost = apiUsageTracker.total_cost

      // Save progress periodically
      if (videosProcessed % 10 === 0) {
        await saveProgress(progress)
      }

      // Notify progress
      if (onProgress) {
        onProgress(progress)
      }

      videosProcessed++

      // Small delay between videos to be nice to APIs
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    // Final progress save
    await saveProgress(progress)
  } catch (error: any) {
    console.error('❌ Bulk analysis failed:', error)
    progress.error = error.message
    await saveProgress(progress)
  }

  console.log(`
📊 Analysis Complete:
- Processed: ${progress.analyzed_count}
- Successful: ${progress.success_count}
- Errors: ${progress.error_count}
- Skipped: ${progress.skipped_count}
- Cost: $${progress.estimated_cost.toFixed(2)}
`)

  return progress
}

// Get cost estimate before running
export async function estimateAnalysisCost(
  videoCount: number
): Promise<{ videos: number; estimatedCost: number; estimatedTime: string }> {
  const costPerVideo =
    (AVG_TOKENS_PER_ANALYSIS / 1000) *
    (COST_PER_1K_INPUT_TOKENS + COST_PER_1K_OUTPUT_TOKENS)
  const totalCost = videoCount * costPerVideo
  const timeMinutes =
    Math.ceil(videoCount / RATE_LIMITS.requests_per_minute) +
    (videoCount * 1.5) / 1000 / 60 // Including delays

  return {
    videos: videoCount,
    estimatedCost: totalCost,
    estimatedTime:
      timeMinutes < 60
        ? `${timeMinutes} minutes`
        : `${(timeMinutes / 60).toFixed(1)} hours`,
  }
}
