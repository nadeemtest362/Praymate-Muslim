// Service for persisting and retrieving viral insights
import { supabase } from './supabase-service'

interface ViralInsightsSummary {
  category: string
  insights_data: any
  total_videos_analyzed: number
  average_views: number
  average_engagement_rate: number
}

// Save or update viral insights summary
export async function saveViralInsightsSummary(
  category: string,
  insightsData: any
) {
  const summary: ViralInsightsSummary = {
    category,
    insights_data: insightsData,
    total_videos_analyzed: insightsData.totalVideos || 0,
    average_views: insightsData.averageViews || 0,
    average_engagement_rate: insightsData.averageEngagementRate || 0,
  }

  const { data, error } = await supabase
    .from('viral_insights_summary')
    .upsert(summary, {
      onConflict: 'category',
      ignoreDuplicates: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving viral insights summary:', error)
    throw error
  }

  return data
}

// Save viral techniques
export async function saveViralTechniques(
  category: string,
  techniques: Array<{ technique: string; count: number }>,
  videoData?: any[]
) {
  const techniqueRecords = techniques.map((item) => ({
    category,
    technique: item.technique,
    occurrence_count: item.count,
    avg_views_when_used: calculateAvgViews(item.technique, videoData),
    avg_engagement_rate: calculateAvgEngagement(item.technique, videoData),
    example_video_ids: getExampleVideoIds(item.technique, videoData),
  }))

  const { error } = await supabase
    .from('viral_techniques')
    .upsert(techniqueRecords, {
      onConflict: 'category,technique',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('Error saving viral techniques:', error)
  }
}

// Save emotional triggers
export async function saveEmotionalTriggers(
  category: string,
  triggers: Array<{ trigger: string; count: number }>,
  videoData?: any[]
) {
  const triggerRecords = triggers.map((item) => ({
    category,
    trigger: item.trigger,
    occurrence_count: item.count,
    effectiveness_score: calculateEffectiveness(item.trigger, videoData),
    example_video_ids: getExampleVideoIds(
      item.trigger,
      videoData,
      'emotional_triggers'
    ),
  }))

  const { error } = await supabase
    .from('viral_emotional_triggers')
    .upsert(triggerRecords, {
      onConflict: 'category,trigger',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('Error saving emotional triggers:', error)
  }
}

// Save visual elements
export async function saveVisualElements(
  category: string,
  elements: Array<{ element: string; count: number }>,
  videoData?: any[]
) {
  const elementRecords = elements.map((item) => ({
    category,
    element: item.element,
    occurrence_count: item.count,
    avg_views_when_used: calculateAvgViews(
      item.element,
      videoData,
      'visual_elements'
    ),
    example_video_ids: getExampleVideoIds(
      item.element,
      videoData,
      'visual_elements'
    ),
  }))

  const { error } = await supabase
    .from('viral_visual_elements')
    .upsert(elementRecords, {
      onConflict: 'category,element',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('Error saving visual elements:', error)
  }
}

// Save top performing hooks
export async function saveTopHooks(category: string, hooks: any[]) {
  const hookRecords = hooks.map((hook) => ({
    category,
    hook_text: hook.hook,
    pattern_type: detectPatternType(hook.hook),
    views: hook.views,
    engagement_rate: parseFloat(hook.engagementRate),
    author_username: hook.author,
    video_id: hook.id,
    techniques_used: hook.techniques || [],
    emotional_triggers: hook.emotionalTriggers || [],
  }))

  const { error } = await supabase
    .from('viral_hook_formulas')
    .insert(hookRecords)

  if (error) {
    console.error('Error saving hook formulas:', error)
  }
}

// Save concept themes
export async function saveConceptThemes(
  category: string,
  themes: Array<{ theme: string; count: number }>,
  videoData?: any[]
) {
  const themeRecords = themes.map((item) => ({
    category,
    theme_title: item.theme,
    occurrence_count: item.count,
    concept_examples: getConceptExamples(item.theme, videoData),
    avg_performance_score: calculatePerformanceScore(item.theme, videoData),
  }))

  const { error } = await supabase
    .from('viral_concept_themes')
    .upsert(themeRecords, {
      onConflict: 'category,theme_title',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('Error saving concept themes:', error)
  }
}

// Retrieve viral insights
export async function getViralInsights(category: string) {
  const { data: summary, error: summaryError } = await supabase
    .from('viral_insights_summary')
    .select('*')
    .eq('category', category)
    .single()

  if (summaryError && summaryError.code !== 'PGRST116') {
    console.error('Error fetching viral insights:', summaryError)
    return null
  }

  // If we have cached insights that are less than 1 hour old, return them
  if (summary && summary.last_updated) {
    const lastUpdated = new Date(summary.last_updated)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)

    if (lastUpdated > hourAgo) {
      return summary.insights_data
    }
  }

  return null
}

// Get top techniques for a category
export async function getTopTechniques(category: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('viral_techniques')
    .select('*')
    .eq('category', category)
    .order('occurrence_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching top techniques:', error)
    return []
  }

  return data
}

// Get top emotional triggers
export async function getTopEmotionalTriggers(
  category: string,
  limit: number = 10
) {
  const { data, error } = await supabase
    .from('viral_emotional_triggers')
    .select('*')
    .eq('category', category)
    .order('effectiveness_score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching emotional triggers:', error)
    return []
  }

  return data
}

// Get proven hook formulas
export async function getProvenHooks(
  category: string,
  minEngagement: number = 5.0
) {
  const { data, error } = await supabase
    .from('viral_hook_formulas')
    .select('*')
    .eq('category', category)
    .gte('engagement_rate', minEngagement)
    .order('views', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching proven hooks:', error)
    return []
  }

  return data
}

// Helper functions
function calculateAvgViews(
  item: string,
  videoData?: any[],
  field: string = 'viral_techniques'
): number {
  if (!videoData) return 0

  const relevantVideos = videoData.filter((v) =>
    v[field]?.some((t: string) => t.includes(item))
  )

  if (relevantVideos.length === 0) return 0

  const totalViews = relevantVideos.reduce((sum, v) => sum + (v.views || 0), 0)
  return Math.round(totalViews / relevantVideos.length)
}

function calculateAvgEngagement(item: string, videoData?: any[]): number {
  if (!videoData) return 0

  const relevantVideos = videoData.filter((v) =>
    v.viral_techniques?.some((t: string) => t.includes(item))
  )

  if (relevantVideos.length === 0) return 0

  const totalEngagement = relevantVideos.reduce((sum, v) => {
    const views = v.views || 1
    const engagement =
      (((v.likes || 0) + (v.comments || 0) + (v.shares || 0)) / views) * 100
    return sum + engagement
  }, 0)

  return parseFloat((totalEngagement / relevantVideos.length).toFixed(2))
}

function calculateEffectiveness(trigger: string, videoData?: any[]): number {
  if (!videoData) return 0

  const relevantVideos = videoData.filter((v) =>
    v.emotional_triggers?.some((t: string) => t.includes(trigger))
  )

  if (relevantVideos.length === 0) return 0

  // Effectiveness based on engagement rate
  const avgEngagement =
    relevantVideos.reduce((sum, v) => {
      const views = v.views || 1
      const engagement =
        (((v.likes || 0) + (v.comments || 0) + (v.shares || 0)) / views) * 100
      return sum + engagement
    }, 0) / relevantVideos.length

  return parseFloat(avgEngagement.toFixed(2))
}

function getExampleVideoIds(
  item: string,
  videoData?: any[],
  field: string = 'viral_techniques'
): string[] {
  if (!videoData) return []

  return videoData
    .filter((v) => v[field]?.some((t: string) => t.includes(item)))
    .slice(0, 5)
    .map((v) => v.video_id)
    .filter(Boolean)
}

function detectPatternType(hook: string): string {
  const lower = hook.toLowerCase()

  if (lower.includes('?')) return 'question'
  if (lower.includes('i ') || lower.includes('my ')) return 'personal_story'
  if (lower.includes('challenge') || lower.includes('dare')) return 'challenge'
  if (
    lower.includes('truth') ||
    lower.includes('secret') ||
    lower.includes('reveal')
  )
    return 'revelation'
  if (lower.includes('controversial') || lower.includes('unpopular'))
    return 'controversy'

  return 'statement'
}

function getConceptExamples(theme: string, videoData?: any[]): any {
  if (!videoData) return {}

  const examples = []

  for (const video of videoData) {
    if (video.new_concepts) {
      const relevantConcepts = video.new_concepts.filter(
        (c: any) => c.theme_title === theme
      )

      examples.push(...relevantConcepts)

      if (examples.length >= 3) break
    }
  }

  return examples.slice(0, 3)
}

function calculatePerformanceScore(theme: string, videoData?: any[]): number {
  if (!videoData) return 0

  const relevantVideos = videoData.filter((v) =>
    v.new_concepts?.some((c: any) => c.theme_title === theme)
  )

  if (relevantVideos.length === 0) return 0

  // Performance score based on average views and engagement
  const avgViews =
    relevantVideos.reduce((sum, v) => sum + (v.views || 0), 0) /
    relevantVideos.length
  const avgEngagement =
    relevantVideos.reduce((sum, v) => {
      const views = v.views || 1
      const engagement =
        (((v.likes || 0) + (v.comments || 0) + (v.shares || 0)) / views) * 100
      return sum + engagement
    }, 0) / relevantVideos.length

  // Normalize to 0-100 scale
  const viewScore = Math.min((avgViews / 1000000) * 50, 50) // Max 50 points for views
  const engagementScore = Math.min(avgEngagement * 5, 50) // Max 50 points for engagement

  return parseFloat((viewScore + engagementScore).toFixed(2))
}
