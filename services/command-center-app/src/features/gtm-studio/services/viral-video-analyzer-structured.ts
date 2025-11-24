import { callClaude } from './claude-proxy-service'
import { supabase } from './supabase-service'

interface VideoData {
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

interface StructuredAnalysis {
  // Core categorization
  content_type:
    | 'testimony'
    | 'worship'
    | 'teaching'
    | 'comedy'
    | 'challenge'
    | 'transformation'
    | 'prophecy'
    | 'miracle'
  hook_type: 'question' | 'statement' | 'challenge' | 'story' | 'revelation'

  // Emotional analysis
  primary_emotion: string
  secondary_emotion?: string
  tertiary_emotion?: string

  // Viral factors (specific, actionable)
  viral_factors: string[]

  // Hook analysis
  hook_strategy: string
  hook_features: {
    has_question: boolean
    has_number: boolean
    is_personal: boolean
    word_count: number
  }

  // Structure
  video_structure: 'single_scene' | 'montage' | 'tutorial' | 'testimonial'
  pacing: 'fast' | 'medium' | 'slow' | 'building'

  // Insights
  replication_formula: string
  target_audience: string
}

// Analyze videos with structured output
export async function analyzeVideoStructured(
  video: VideoData
): Promise<StructuredAnalysis | null> {
  const content = video.hook_transcript || video.caption || ''
  if (content.length < 20) return null

  const prompt = `Analyze this viral Christian TikTok video for actionable insights.

Video: "${content.substring(0, 800)}"
Stats: ${video.view_count.toLocaleString()} views, ${((video.like_count / video.view_count) * 100).toFixed(1)}% engagement

Return a JSON object with EXACTLY these fields:

{
  "content_type": "testimony|worship|teaching|comedy|challenge|transformation|prophecy|miracle",
  "hook_type": "question|statement|challenge|story|revelation",
  
  "primary_emotion": "single emotion word (joy, fear, hope, anger, etc)",
  "secondary_emotion": "second emotion or null",
  "tertiary_emotion": "third emotion or null",
  
  "viral_factors": ["specific reason 1", "specific reason 2", "specific reason 3"],
  
  "hook_strategy": "one sentence explaining how the first 3 seconds grab attention",
  "hook_features": {
    "has_question": true/false,
    "has_number": true/false,
    "is_personal": true/false (uses I/my/me),
    "word_count": number
  },
  
  "video_structure": "single_scene|montage|tutorial|testimonial",
  "pacing": "fast|medium|slow|building",
  
  "replication_formula": "specific formula: [emotion] + [hook type] + [key element]",
  "target_audience": "specific audience this appeals to"
}

Be extremely specific. Focus on WHY it worked, not just describing it.`

  try {
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

    return JSON.parse(response)
  } catch (error) {
    console.error(`Analysis failed for ${video.video_id}:`, error)
    return null
  }
}

// Save analysis with proper structure
export async function saveStructuredAnalysis(
  video: VideoData,
  analysis: StructuredAnalysis
): Promise<boolean> {
  try {
    // Save main analysis
    const { error: mainError } = await supabase
      .from('viral_video_analyses')
      .insert({
        video_id: video.video_id,

        // Video metadata
        view_count: video.view_count,
        like_count: video.like_count,
        comment_count: video.comment_count,
        share_count: video.share_count,
        duration: video.duration,
        author_name: video.author_name,

        // Analysis results
        content_type: analysis.content_type,
        hook_type: analysis.hook_type,

        // Emotions
        primary_emotion: analysis.primary_emotion,
        secondary_emotion: analysis.secondary_emotion,
        tertiary_emotion: analysis.tertiary_emotion,

        // Viral factors
        viral_factor_1: analysis.viral_factors[0],
        viral_factor_2: analysis.viral_factors[1],
        viral_factor_3: analysis.viral_factors[2],

        // Hook analysis
        hook_strategy: analysis.hook_strategy,
        hook_word_count: analysis.hook_features.word_count,
        hook_has_question: analysis.hook_features.has_question,
        hook_has_number: analysis.hook_features.has_number,
        hook_personal: analysis.hook_features.is_personal,

        // Structure
        video_structure: analysis.video_structure,
        pacing: analysis.pacing,

        // Insights
        replication_formula: analysis.replication_formula,
        target_audience: analysis.target_audience,

        // Raw data
        raw_caption: video.caption,
        raw_hook: video.hook_transcript,
        raw_analysis_response: analysis,
      })

    if (mainError) {
      console.error('Error saving main analysis:', mainError)
      return false
    }

    // Update emotion occurrences
    for (const [rank, emotion] of [
      [1, analysis.primary_emotion],
      [2, analysis.secondary_emotion],
      [3, analysis.tertiary_emotion],
    ].filter(([_, e]) => e)) {
      // Insert emotion if not exists
      await supabase.from('emotions').upsert(
        {
          emotion_name: emotion as string,
          emotion_category: categorizeEmotion(emotion as string),
        },
        { onConflict: 'emotion_name' }
      )

      // Link to video
      const { data: emotionData } = await supabase
        .from('emotions')
        .select('id')
        .eq('emotion_name', emotion)
        .single()

      if (emotionData) {
        await supabase.from('video_emotions').insert({
          video_id: video.video_id,
          emotion_id: emotionData.id,
          emotion_rank: rank as number,
        })
      }
    }

    // Update viral factors
    for (const factor of analysis.viral_factors.filter(Boolean)) {
      // Insert factor if not exists
      await supabase.from('viral_factors').upsert(
        {
          factor_name: factor,
          factor_category: categorizeFactor(factor),
        },
        { onConflict: 'factor_name' }
      )

      // Link to video
      const { data: factorData } = await supabase
        .from('viral_factors')
        .select('id')
        .eq('factor_name', factor)
        .single()

      if (factorData) {
        await supabase.from('video_viral_factors').insert({
          video_id: video.video_id,
          factor_id: factorData.id,
        })
      }
    }

    return true
  } catch (error) {
    console.error('Error in saveStructuredAnalysis:', error)
    return false
  }
}

// Bulk analyze with structured data
export async function runStructuredAnalysis(
  totalVideos: number = 500,
  batchSize: number = 10
): Promise<void> {
  console.log(`🚀 Starting structured analysis of ${totalVideos} videos`)

  // Get already analyzed videos
  const { data: analyzed } = await supabase
    .from('viral_video_analyses')
    .select('video_id')
  const analyzedIds = analyzed?.map((a) => a.video_id) || []

  let processed = 0

  while (processed < totalVideos) {
    // Get unanalyzed videos
    let query = supabase
      .from('videos')
      .select('*')
      .or(
        `caption.ilike.%christian%,caption.ilike.%jesus%,caption.ilike.%god%,caption.ilike.%faith%,caption.ilike.%prayer%`
      )
      .gte('view_count', 1000000)
      .order('view_count', { ascending: false })
      .limit(batchSize)

    if (analyzedIds.length > 0) {
      query = query.not('video_id', 'in', `(${analyzedIds.join(',')})`)
    }

    const { data: videos } = await query

    if (!videos || videos.length === 0) {
      console.log('No more videos to analyze')
      break
    }

    // Analyze batch in parallel
    const results = await Promise.all(
      videos.map(async (video) => {
        const analysis = await analyzeVideoStructured(video)
        if (analysis) {
          const saved = await saveStructuredAnalysis(video, analysis)
          if (saved) {
            analyzedIds.push(video.video_id)
            return { success: true, video_id: video.video_id }
          }
        }
        return { success: false, video_id: video.video_id }
      })
    )

    const successCount = results.filter((r) => r.success).length
    processed += videos.length

    console.log(
      `Batch complete: ${successCount}/${videos.length} successful. Total: ${processed}`
    )

    // Brief pause between batches
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  // Refresh materialized views
  await supabase.rpc('refresh_materialized_views')

  console.log(`✨ Analysis complete! Processed ${processed} videos.`)
}

// Helper functions
function categorizeEmotion(emotion: string): string {
  const positive = [
    'joy',
    'hope',
    'love',
    'gratitude',
    'peace',
    'excitement',
    'inspiration',
  ]
  const negative = [
    'fear',
    'anger',
    'sadness',
    'guilt',
    'shame',
    'anxiety',
    'frustration',
  ]

  emotion = emotion.toLowerCase()
  if (positive.includes(emotion)) return 'positive'
  if (negative.includes(emotion)) return 'negative'
  return 'mixed'
}

function categorizeFactor(factor: string): string {
  const lower = factor.toLowerCase()
  if (lower.includes('emotion') || lower.includes('feel')) return 'emotional'
  if (
    lower.includes('share') ||
    lower.includes('comment') ||
    lower.includes('relate')
  )
    return 'social'
  if (
    lower.includes('hook') ||
    lower.includes('story') ||
    lower.includes('content')
  )
    return 'content'
  if (
    lower.includes('trend') ||
    lower.includes('timing') ||
    lower.includes('moment')
  )
    return 'timing'
  return 'technical'
}

// Query functions for insights

export async function getWinningFormulas() {
  const { data } = await supabase
    .from('top_content_formulas')
    .select('*')
    .limit(20)

  return data
}

export async function getEmotionCombos() {
  const { data } = await supabase
    .from('emotion_combinations')
    .select('*')
    .limit(20)

  return data
}

export async function getHookPatterns() {
  const { data } = await supabase.from('hook_performance').select('*').limit(20)

  return data
}

export async function getTopCreators() {
  const { data } = await supabase
    .from('author_strategies')
    .select('*')
    .limit(20)

  return data
}
