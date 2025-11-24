// Bulk viral video analyzer using ScrapeCreators integration
// Analyzes videos with proper routing based on transcript availability
import { supabase } from './supabase-service'
import { analyzeViralVideo } from './viral-video-analysis-service'

interface AnalysisStats {
  totalAnalyzed: number
  transcriptAnalysis: number
  geminiVideoAnalysis: number
  thumbnailAnalysis: number
  descriptionAnalysis: number
  failed: number
}

interface ViralInsights {
  totalAnalyzed: number
  topConcepts: Array<{
    concept_title: string
    theme_title: string
    emotion: string
    count: number
  }>
  topEmotions: Array<{
    emotion: string
    count: number
  }>
  topViralElements: Array<{
    element: string
    count: number
  }>
  analysisBreakdown: AnalysisStats
}

// Get unanalyzed viral videos
export async function getUnanalyzedViralVideos(
  limit: number = 100
): Promise<any[]> {
  // Get already analyzed video IDs
  const { data: analyzed } = await supabase
    .from('ai_analyses')
    .select('video_id_internal')
    .eq('analysis_type', 'claude_3.5_sonnet_structured_v2')

  const analyzedInternalIds = analyzed?.map((a) => a.video_id_internal) || []

  // Build query for unanalyzed videos with author info
  let query = supabase.from('videos').select(`
      *,
      authors!inner(
        username
      )
    `)

  // Get high-view videos
  query = query
    .gte('views', 1000000)
    .order('views', { ascending: false })
    .limit(limit)

  // Exclude already analyzed videos if any exist
  if (analyzedInternalIds.length > 0) {
    // Use proper array syntax for PostgREST
    query = query.not('id', 'in', `(${analyzedInternalIds.join(',')})`)
  }

  const { data: videos, error } = await query

  if (error) {
    console.error('Error fetching unanalyzed videos:', error)
    return []
  }

  return videos || []
}

// Simple rate limiter for Claude API
class RateLimiter {
  private tokenCount = 0
  private resetTime = Date.now() + 60000 // 1 minute window
  private readonly maxTokensPerMinute = 14000 // Conservative limit (leaving buffer)
  private readonly estimatedTokensPerRequest = 2500 // Mixed analysis types

  async waitIfNeeded() {
    // Reset counter if minute has passed
    if (Date.now() > this.resetTime) {
      this.tokenCount = 0
      this.resetTime = Date.now() + 60000
    }

    // If we're approaching limit, wait until reset
    if (
      this.tokenCount + this.estimatedTokensPerRequest >
      this.maxTokensPerMinute
    ) {
      const waitTime = this.resetTime - Date.now()
      console.log(
        `⏳ Rate limit approaching, waiting ${Math.ceil(waitTime / 1000)}s...`
      )
      await new Promise((resolve) => setTimeout(resolve, waitTime))
      this.tokenCount = 0
      this.resetTime = Date.now() + 60000
    }

    this.tokenCount += this.estimatedTokensPerRequest
  }
}

const rateLimiter = new RateLimiter()

// Run bulk analysis with detailed tracking
export async function runBulkViralAnalysis(
  totalVideos: number = 100,
  batchSize: number = 20 // Process in reasonable batches
): Promise<AnalysisStats> {
  console.log(`🚀 Starting bulk viral video analysis of ${totalVideos} videos`)

  const stats: AnalysisStats = {
    totalAnalyzed: 0,
    transcriptAnalysis: 0,
    geminiVideoAnalysis: 0,
    thumbnailAnalysis: 0,
    descriptionAnalysis: 0,
    failed: 0,
  }

  let processed = 0

  while (processed < totalVideos) {
    // Get next batch of unanalyzed videos
    const videos = await getUnanalyzedViralVideos(
      Math.min(batchSize, totalVideos - processed)
    )

    if (videos.length === 0) {
      console.log('No more unanalyzed videos found')
      break
    }

    console.log(`Processing batch of ${videos.length} videos...`)

    // Log the first video to see available fields
    if (videos.length > 0) {
      console.log('First video fields:', Object.keys(videos[0]))
      console.log('First video sample:', {
        video_id: videos[0].video_id,
        author_name: videos[0].author_name,
        author_unique_id: videos[0].author_unique_id,
        views: videos[0].views,
      })
    }

    // Analyze batch SEQUENTIALLY to control rate
    const results = []
    for (const video of videos) {
      try {
        // Wait if we're approaching rate limit
        await rateLimiter.waitIfNeeded()

        // Construct proper TikTok URL from video data
        // TikTok URLs follow the pattern: https://www.tiktok.com/@username/video/videoid
        const authorHandle =
          video.authors?.username || `user${video.author_id}` || 'unknown'
        const videoUrl = `https://www.tiktok.com/@${authorHandle}/video/${video.video_id}`

        console.log(`🔍 Analyzing video: ${videoUrl}`)

        const result = await analyzeViralVideo(videoUrl, video.video_id)

        if (result.error) {
          stats.failed++
          console.error(
            `❌ Failed to analyze ${video.video_id}: ${result.error}`
          )
          results.push({ success: false, source: 'error' })
        } else {
          // Track analysis source
          switch (result.source) {
            case 'transcript':
              stats.transcriptAnalysis++
              break
            case 'gemini_video':
              stats.geminiVideoAnalysis++
              break
            case 'thumbnail':
              stats.thumbnailAnalysis++
              break
            case 'description':
              stats.descriptionAnalysis++
              break
          }

          stats.totalAnalyzed++
          console.log(
            `✅ Analyzed ${video.video_id} via ${result.source} (${video.views.toLocaleString()} views)`
          )

          results.push({ success: true, source: result.source })
        }
      } catch (error) {
        stats.failed++
        console.error(`❌ Error analyzing ${video.video_id}:`, error)
        results.push({ success: false, source: 'error' })
      }
    }

    processed += videos.length

    const successCount = results.filter((r) => r.success).length
    console.log(
      `Batch complete: ${successCount}/${videos.length} successful. Total processed: ${processed}`
    )

    // Small pause between batches (rate limiting is handled per-request)
    if (processed < totalVideos) {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // 1 second between batches
    }
  }

  // Log final statistics
  console.log(`
✨ Analysis complete!
Total Videos Processed: ${processed}
Successfully Analyzed: ${stats.totalAnalyzed}
Failed: ${stats.failed}

Analysis Sources:
- Transcript: ${stats.transcriptAnalysis} (${((stats.transcriptAnalysis / stats.totalAnalyzed) * 100).toFixed(1)}%)
- Gemini Video: ${stats.geminiVideoAnalysis} (${((stats.geminiVideoAnalysis / stats.totalAnalyzed) * 100).toFixed(1)}%)
- Thumbnail: ${stats.thumbnailAnalysis} (${((stats.thumbnailAnalysis / stats.totalAnalyzed) * 100).toFixed(1)}%)
- Description: ${stats.descriptionAnalysis} (${((stats.descriptionAnalysis / stats.totalAnalyzed) * 100).toFixed(1)}%)
  `)

  return stats
}

// Get insights from analyzed videos
export async function getViralInsights(): Promise<ViralInsights | null> {
  try {
    // Get all analyses
    const { data: analyses, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('analysis_type', 'claude_3.5_sonnet_structured_v2')
      .order('analyzed_at', { ascending: false })

    if (error || !analyses) {
      console.error('Error fetching analyses:', error)
      return null
    }

    // Extract insights
    const conceptMap = new Map<
      string,
      { count: number; theme: string; emotion: string }
    >()
    const emotionMap = new Map<string, number>()
    const elementMap = new Map<string, number>()

    const stats: AnalysisStats = {
      totalAnalyzed: analyses.length,
      transcriptAnalysis: 0,
      geminiVideoAnalysis: 0,
      thumbnailAnalysis: 0,
      descriptionAnalysis: 0,
      failed: 0,
    }

    analyses.forEach((analysis) => {
      // Track source
      switch (analysis.source_of_analysis_input) {
        case 'transcript':
          stats.transcriptAnalysis++
          break
        case 'gemini_video':
          stats.geminiVideoAnalysis++
          break
        case 'thumbnail':
          stats.thumbnailAnalysis++
          break
        case 'description':
          stats.descriptionAnalysis++
          break
      }

      const content = analysis.content

      // Extract concepts
      if (content?.new_video_concepts?.concepts) {
        content.new_video_concepts.concepts.forEach((concept: any) => {
          const key = concept.concept_title
          if (key) {
            const existing = conceptMap.get(key) || {
              count: 0,
              theme: concept.theme_title,
              emotion: concept.details?.emotion,
            }
            conceptMap.set(key, {
              count: existing.count + 1,
              theme: concept.theme_title || existing.theme,
              emotion: concept.details?.emotion || existing.emotion,
            })
          }

          // Track emotions from concepts
          if (concept.details?.emotion) {
            const emotionKey = concept.details.emotion
              .split(' ')[0]
              .toLowerCase()
            emotionMap.set(emotionKey, (emotionMap.get(emotionKey) || 0) + 1)
          }
        })
      }

      // Extract key elements
      if (content?.key_elements_for_success) {
        content.key_elements_for_success.forEach((element: string) => {
          const key = element.split(':')[0].trim()
          elementMap.set(key, (elementMap.get(key) || 0) + 1)
        })
      }
    })

    // Convert maps to sorted arrays
    const topConcepts = Array.from(conceptMap.entries())
      .map(([concept_title, data]) => ({
        concept_title,
        theme_title: data.theme,
        emotion: data.emotion,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    const topEmotions = Array.from(emotionMap.entries())
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    const topViralElements = Array.from(elementMap.entries())
      .map(([element, count]) => ({ element, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    return {
      totalAnalyzed: analyses.length,
      topConcepts,
      topEmotions,
      topViralElements,
      analysisBreakdown: stats,
    }
  } catch (error) {
    console.error('Error getting viral insights:', error)
    return null
  }
}

// Get specific video analyses
export async function getVideoAnalyses(videoId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('video_id', videoId)
    .order('analyzed_at', { ascending: false })

  if (error) {
    console.error('Error fetching video analyses:', error)
    return []
  }

  return data || []
}

// Helper function to extract replication formulas
export async function getReplicationFormulas(): Promise<
  Array<{
    formula: string
    examples: number
    avgViews: number
  }>
> {
  const { data: analyses, error } = await supabase
    .from('ai_analyses')
    .select('content, video_id_internal')
    .eq('analysis_type', 'claude_3.5_sonnet_structured_v2')

  if (error || !analyses) {
    return []
  }

  // Get video view counts
  const videoIds = analyses.map((a) => a.video_id_internal).filter(Boolean)

  if (videoIds.length === 0) {
    return []
  }

  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('id, views')
    .in('id', videoIds)

  if (videosError) {
    console.error('Error fetching video view counts:', videosError)
    return []
  }

  const viewCountMap = new Map(videos?.map((v) => [v.id, v.views]) || [])

  // Extract and aggregate formulas
  const formulaMap = new Map<string, { count: number; totalViews: number }>()

  analyses.forEach((analysis) => {
    const concepts = analysis.content?.new_video_concepts?.concepts || []
    concepts.forEach((concept: any) => {
      if (concept.details) {
        const formula = `${concept.details.emotion} + ${concept.theme_title}`
        const existing = formulaMap.get(formula) || { count: 0, totalViews: 0 }
        const viewCount = viewCountMap.get(analysis.video_id_internal) || 0

        formulaMap.set(formula, {
          count: existing.count + 1,
          totalViews: existing.totalViews + viewCount,
        })
      }
    })
  })

  return Array.from(formulaMap.entries())
    .map(([formula, data]) => ({
      formula,
      examples: data.count,
      avgViews: Math.round(data.totalViews / data.count),
    }))
    .sort((a, b) => b.avgViews - a.avgViews)
    .slice(0, 20)
}
