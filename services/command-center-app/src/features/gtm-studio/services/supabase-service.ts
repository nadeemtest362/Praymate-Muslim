import { createClient } from '@supabase/supabase-js'
import { GTMPhase, GTMTask, GTMRisk, TaskStatus } from '../types'
import {
  saveViralInsightsSummary,
  saveViralTechniques,
  saveEmotionalTriggers,
  saveVisualElements,
  saveTopHooks,
  saveConceptThemes,
} from './viral-insights-service'

// Viral video database client - separate from main auth
const supabaseUrl = import.meta.env.VITE_VIRAL_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_VIRAL_SUPABASE_ANON_KEY || ''

export const viralSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't manage auth sessions
    autoRefreshToken: false, // Don't auto-refresh
    detectSessionInUrl: false, // Don't detect auth in URL
  },
  global: {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  },
})

// Export as supabase for backwards compatibility in GTM Studio
export const supabase = viralSupabase

// Project management
export async function getOrCreateProject(name: string = 'TikTok GTM') {
  console.log(`🔎 Checking for existing project: ${name}`)

  const { data: existing, error: fetchError } = await viralSupabase
    .from('gtm_projects')
    .select('*')
    .eq('name', name)
    .maybeSingle() // Use maybeSingle to avoid 406 error

  if (fetchError) {
    console.error('❌ Error fetching project:', fetchError)
  }

  if (existing) {
    console.log('✅ Found existing project:', existing.id)
    return existing
  }

  console.log('📝 Creating new project...')
  const { data, error } = await viralSupabase
    .from('gtm_projects')
    .insert({
      name,
      description: 'Personal Prayers TikTok Go-to-Market Campaign',
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating project:', error)
    // If it's a duplicate key error, try to fetch the existing project
    if (error.code === '23505') {
      console.log('🔄 Project already exists, fetching...')
      const { data: existingAfterError } = await viralSupabase
        .from('gtm_projects')
        .select('*')
        .eq('name', name)
        .single()

      if (existingAfterError) {
        console.log(
          '✅ Found existing project after duplicate error:',
          existingAfterError.id
        )
        return existingAfterError
      }
    }
    throw error
  }

  console.log('✅ Created new project:', data.id)
  return data
}

// Load all GTM data
export async function loadGTMDataFromDB(projectId: string) {
  // Load phases
  const { data: phases, error: phasesError } = await viralSupabase
    .from('gtm_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_number')

  if (phasesError) throw phasesError

  // Load tasks with subtasks
  const { data: tasks, error: tasksError } = await viralSupabase
    .from('gtm_tasks')
    .select(
      `
      *,
      subtasks:gtm_subtasks(
        *
      )
    `
    )
    .eq('project_id', projectId)
    .order('task_number')

  // Note: Supabase doesn't support ordering nested relations directly,
  // but subtasks will be ordered by order_index in the transform below

  if (tasksError) throw tasksError

  console.log(`📋 Loaded ${tasks?.length || 0} tasks`)
  const totalSubtasks =
    tasks?.reduce((acc, task) => acc + (task.subtasks?.length || 0), 0) || 0
  console.log(`📝 Total subtasks across all tasks: ${totalSubtasks}`)

  // Log tasks with notes
  const tasksWithNotes =
    tasks?.filter((task) => task.notes && task.notes.trim() !== '') || []
  console.log(`📄 Tasks with notes: ${tasksWithNotes.length}`)
  if (tasksWithNotes.length > 0) {
    tasksWithNotes.forEach((task) => {
      console.log(
        `  - Task ${task.task_number}: "${task.notes.substring(0, 50)}${task.notes.length > 50 ? '...' : ''}"`
      )
    })
  }

  // Transform to match our types
  const phasesWithTasks = phases.map((phase) => ({
    id: phase.phase_number,
    title: phase.title,
    subtitle: phase.subtitle,
    dateRange: phase.date_range,
    color: phase.color || 'from-blue-500 to-blue-600',
    bgGradient: phase.bg_gradient || 'from-blue-50 to-blue-100',
    hasMilestone: phase.has_milestone,
    tasks: tasks
      .filter((task) => task.phase_id === phase.id)
      .map((task) => ({
        id: task.id,
        phase: phase.phase_number,
        phaseTitle: phase.title,
        taskNumber: task.task_number,
        title: task.title,
        owner: task.owner,
        dueDate: task.due_date,
        dependencies: task.dependencies || [],
        status: task.status as TaskStatus,
        isMilestone: task.is_milestone,
        priority: task.priority,
        subtasks: (task.subtasks || [])
          .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
          .map((sub: any) => ({
            id: sub.id,
            title: sub.title,
            dueDate: sub.due_date,
            status: sub.status as TaskStatus,
          })),
        notes: task.notes,
        assignedAgent: task.assigned_agent,
      })),
    progress: calculatePhaseProgress(
      tasks.filter((t) => t.phase_id === phase.id)
    ),
  }))

  return { phases: phasesWithTasks, risks: [] } // Add risks loading if needed
}

// Save task updates
export async function updateTask(taskId: string, updates: Partial<GTMTask>) {
  console.log(`💾 Updating task ${taskId}:`, {
    title: updates.title?.substring(0, 30) + '...',
    status: updates.status,
    notes: updates.notes ? `"${updates.notes.substring(0, 50)}..."` : 'null',
    subtasks: updates.subtasks?.length || 0,
  })

  const { error } = await viralSupabase
    .from('gtm_tasks')
    .update({
      title: updates.title,
      status: updates.status,
      notes: updates.notes,
      assigned_agent: updates.assignedAgent,
      completed_at:
        updates.status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)

  if (error) throw error

  console.log('✅ Task updated successfully')

  // Update subtasks if provided
  if (updates.subtasks) {
    console.log(
      `🔄 Updating subtasks for task ${taskId}:`,
      updates.subtasks.length,
      'subtasks'
    )

    // Delete existing subtasks
    const { error: deleteError } = await viralSupabase
      .from('gtm_subtasks')
      .delete()
      .eq('task_id', taskId)

    if (deleteError) {
      console.error('❌ Error deleting existing subtasks:', deleteError)
      throw deleteError
    }

    // Insert new subtasks
    if (updates.subtasks.length > 0) {
      const subtasksToInsert = updates.subtasks.map((subtask, index) => ({
        task_id: taskId,
        title: subtask.title,
        due_date: subtask.dueDate,
        status: subtask.status || 'not-started',
        order_index: index,
      }))

      console.log('📝 Inserting subtasks:', subtasksToInsert)

      const { data: insertedSubtasks, error: subtaskError } =
        await viralSupabase
          .from('gtm_subtasks')
          .insert(subtasksToInsert)
          .select()

      if (subtaskError) {
        console.error('❌ Error inserting subtasks:', subtaskError)
        throw subtaskError
      }

      console.log('✅ Subtasks saved:', insertedSubtasks?.length || 0)
    }
  }
}

// Agent management
export async function assignAgentToTask(
  taskId: string,
  agentType: string,
  subtaskGeneration = false
) {
  // Get or create agent
  const { data: agent } = await viralSupabase
    .from('gtm_agents')
    .select('*')
    .eq('type', agentType)
    .single()

  if (!agent) throw new Error('Agent not found')

  // Check if assignment already exists
  const { data: existingAssignment } = await viralSupabase
    .from('gtm_agent_tasks')
    .select('*')
    .eq('agent_id', agent.id)
    .eq('task_id', taskId)
    .maybeSingle() // Use maybeSingle to handle no results

  if (!existingAssignment) {
    // Create new assignment
    const { error } = await viralSupabase.from('gtm_agent_tasks').insert({
      agent_id: agent.id,
      task_id: taskId,
      status: 'assigned',
    })

    if (error) throw error
  }

  // Update task
  await viralSupabase
    .from('gtm_tasks')
    .update({ assigned_agent: agent.id })
    .eq('id', taskId)

  // If this is for subtask generation, log the agent's initial thought
  if (subtaskGeneration) {
    await logAgentThought(
      agent.id,
      taskId,
      'planning',
      'Analyzing task requirements to generate actionable subtasks...'
    )
  }

  return agent
}

// Placeholder for agent subtask generation - moved to agent-planner.ts to avoid circular dependency

// Log agent thoughts
export async function logAgentThought(
  agentId: string,
  taskId: string,
  thoughtType: string,
  content: string
) {
  const { error } = await viralSupabase.from('gtm_agent_thoughts').insert({
    agent_id: agentId,
    task_id: taskId,
    thought_type: thoughtType,
    content,
  })

  if (error) throw error
}

// Query viral videos for content inspiration
export async function getViralContentForTask(
  taskId: string,
  keywords: string[]
) {
  // This queries your viral video database
  const { data, error } = await viralSupabase
    .from('videos')
    .select('*')
    .or(keywords.map((k) => `caption.ilike.%${k}%`).join(','))
    .order('view_count', { ascending: false })
    .limit(10)

  if (error) throw error
  return data
}

// Query highest performing Christian TikTok videos with comprehensive AI analysis
export async function getTopChristianTikTokHooks(
  limit: number = 100,
  minViews: number = 500000
) {
  console.log(
    `🔍 Querying top ${limit} Christian TikTok videos with AI insights (min ${minViews} views)...`
  )

  // Query videos with Christian-related keywords, including AI analysis data
  const { data, error } = await viralSupabase
    .from('videos')
    .select(
      `
      id, 
      video_id, 
      title, 
      description, 
      views, 
      likes, 
      comments, 
      shares, 
      author_id, 
      duration, 
      created_at,
      authors!inner(username),
      ai_analyses!inner(
        content,
        analysis_type,
        source_of_analysis_input
      )
    `
    )
    .or(
      `description.ilike.%christian%,description.ilike.%jesus%,description.ilike.%god%,description.ilike.%faith%,description.ilike.%prayer%,description.ilike.%testimony%,description.ilike.%church%,description.ilike.%bible%,description.ilike.%worship%,description.ilike.%blessed%`
    )
    .gte('views', minViews)
    .in('ai_analyses.analysis_type', [
      'claude_3.5_sonnet_structured_v2',
      'claude_3.5_sonnet_structured_v2_aisdk',
    ])
    .not('ai_analyses.source_of_analysis_input', 'eq', 'description') // Exclude description-only analyses
    .order('views', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('❌ Error fetching Christian videos:', error)
    throw error
  }

  console.log(
    `✅ Found ${data?.length || 0} high-performing Christian videos with AI analysis`
  )

  // Extract comprehensive viral insights from AI analysis
  const videosWithInsights =
    data?.map((video) => {
      const analysis = video.ai_analyses?.[0]?.content
      const sourceType = video.ai_analyses?.[0]?.source_of_analysis_input

      // Extract all viral elements
      let hook_transcript = ''
      let viral_techniques = []
      let emotional_triggers = []
      let visual_elements = []
      let key_success_factors = analysis?.key_elements_for_success || []
      let new_concepts = analysis?.new_video_concepts?.concepts || []

      // CRITICAL: Extract the actual hook - what stops people scrolling

      // First check if we have an explicit hook field (from updated analyzer)
      if (analysis?.hook) {
        hook_transcript = analysis.hook
      }

      // Otherwise, check for thumbnail text or transcript sections
      if (!hook_transcript) {
        const thumbnailTextSection =
          analysis?.original_video_analysis?.sections?.find(
            (s: any) =>
              s.subheading?.toLowerCase().includes('thumbnail') ||
              s.subheading?.toLowerCase().includes('text on screen') ||
              s.subheading?.toLowerCase().includes('visual hook')
          )

        if (thumbnailTextSection?.points?.[0]) {
          // Extract just the text part if it's in the format "TEXT ON SCREEN: [actual text]"
          const textMatch = thumbnailTextSection.points[0].match(
            /TEXT ON SCREEN:\s*(.+)/i
          )
          if (textMatch) {
            hook_transcript = textMatch[1]
          } else {
            hook_transcript = thumbnailTextSection.points[0]
          }
        }
      }

      // For videos with transcripts, try to extract the opening line
      if (
        !hook_transcript &&
        (sourceType === 'transcript' || sourceType === 'multi_source')
      ) {
        const contentSummary =
          analysis?.original_video_analysis?.sections?.find(
            (s: any) =>
              s.subheading?.toLowerCase().includes('content') ||
              s.subheading?.toLowerCase().includes('summary') ||
              s.subheading?.toLowerCase().includes('opening')
          )
        if (contentSummary?.points?.[0]) {
          const firstPoint = contentSummary.points[0]
          // Extract quoted text if present
          const quotedMatch = firstPoint.match(/"([^"]+)"/)
          if (quotedMatch) {
            hook_transcript = quotedMatch[1]
          }
        }
      }

      // Check for any hook-related section
      if (!hook_transcript) {
        const hookSection = analysis?.original_video_analysis?.sections?.find(
          (s: any) =>
            s.subheading?.toLowerCase().includes('hook') ||
            s.subheading?.toLowerCase().includes('opening')
        )
        if (hookSection?.points?.[0]) {
          hook_transcript = hookSection.points[0]
        }
      }

      // Extract insights from analysis sections
      if (analysis?.original_video_analysis?.sections) {
        analysis.original_video_analysis.sections.forEach((section: any) => {
          const heading = section.subheading?.toLowerCase() || ''

          // Extract techniques
          if (
            heading.includes('hook') ||
            heading.includes('opening') ||
            heading.includes('technique')
          ) {
            viral_techniques.push(...(section.points || []))
          }
          // Extract emotional elements
          else if (heading.includes('emotion') || heading.includes('appeal')) {
            emotional_triggers.push(...(section.points || []))
          }
          // Extract visual elements
          else if (
            heading.includes('visual') ||
            heading.includes('spectacle')
          ) {
            visual_elements.push(...(section.points || []))
          }
          // Capture any other techniques
          else if (
            section.points?.length > 0 &&
            !heading.includes('content') &&
            !heading.includes('structure')
          ) {
            viral_techniques.push(...section.points)
          }
        })
      }

      // If still no hook, use description as last resort
      if (!hook_transcript && video.description) {
        hook_transcript = video.description
      }

      return {
        ...video,
        hook_transcript,
        viral_techniques,
        emotional_triggers,
        visual_elements,
        key_success_factors,
        new_concepts,
        overall_summary: analysis?.overall_summary,
        analysis_source: sourceType,
        author_name: video.authors?.username || `Author ${video.author_id}`,
        view_count: video.views,
        like_count: video.likes,
        comment_count: video.comments,
        share_count: video.shares,
      }
    }) || []

  // Only filter for videos that have real analysis (not description-only)
  const videosWithRealAnalysis = videosWithInsights.filter((video) => {
    // Ensure we have meaningful analysis data from actual video/transcript
    const hasRealAnalysis =
      video.analysis_source &&
      video.analysis_source !== 'description' &&
      (video.viral_techniques.length > 0 ||
        video.emotional_triggers.length > 0 ||
        video.visual_elements.length > 0 ||
        video.key_success_factors.length > 0)

    return hasRealAnalysis
  })

  console.log(
    `📊 Found ${videosWithRealAnalysis.length} Christian videos with comprehensive viral insights (all types)`
  )

  return videosWithRealAnalysis
}

// Analyze hook patterns from viral Christian content
export async function analyzeChristianHookPatterns(saveToDb: boolean = false) {
  console.log('🧠 Analyzing Christian TikTok hook patterns...')

  const videos = await getTopChristianTikTokHooks(500, 0) // Get ALL Christian videos with proper analysis

  if (!videos || videos.length === 0) {
    console.error('❌ No videos found for analysis')
    return null
  }

  // Comprehensive viral insights analysis
  const hookAnalysis = {
    totalVideos: videos.length,
    averageViews: Math.round(
      videos.reduce((sum, v) => sum + (v.views || 0), 0) / videos.length
    ),
    averageEngagementRate: 0,
    hookLengths: [] as number[],
    // Hook patterns
    commonPatterns: {
      questions: 0,
      statements: 0,
      personalStory: 0,
      challenge: 0,
      revelation: 0,
      controversy: 0,
    },
    // Aggregated insights from AI analysis
    viralTechniques: {} as Record<string, number>,
    emotionalTriggers: {} as Record<string, number>,
    visualElements: {} as Record<string, number>,
    successFactors: {} as Record<string, number>,
    conceptThemes: {} as Record<string, number>,
    // Top performing elements
    topHooks: [] as any[],
    topTechniques: [] as any[],
    topConcepts: [] as any[],
    wordFrequency: {} as Record<string, number>,
  }

  videos.forEach((video) => {
    const hook = video.hook_transcript || ''
    const views = video.views || 0
    const likes = video.likes || 0
    const comments = video.comments || 0
    const shares = video.shares || 0

    // Calculate engagement rate
    const engagementRate =
      views > 0 ? ((likes + comments + shares) / views) * 100 : 0

    // Track hook length
    const hookLength = hook.split(' ').length
    if (hookLength > 0) {
      hookAnalysis.hookLengths.push(hookLength)
    }

    // Analyze hook patterns
    const lowerHook = hook.toLowerCase()

    if (lowerHook.includes('?')) hookAnalysis.commonPatterns.questions++
    if (
      lowerHook.includes('i ') ||
      lowerHook.includes('my ') ||
      lowerHook.includes('me ')
    ) {
      hookAnalysis.commonPatterns.personalStory++
    }
    if (lowerHook.includes('challenge') || lowerHook.includes('dare')) {
      hookAnalysis.commonPatterns.challenge++
    }
    if (
      lowerHook.includes('truth') ||
      lowerHook.includes('secret') ||
      lowerHook.includes('reveal')
    ) {
      hookAnalysis.commonPatterns.revelation++
    }
    if (
      lowerHook.includes('controversial') ||
      lowerHook.includes('unpopular')
    ) {
      hookAnalysis.commonPatterns.controversy++
    }

    // Aggregate viral techniques from AI analysis
    video.viral_techniques?.forEach((technique: string) => {
      const key = technique.substring(0, 100) // Truncate for grouping
      hookAnalysis.viralTechniques[key] =
        (hookAnalysis.viralTechniques[key] || 0) + 1
    })

    // Aggregate emotional triggers
    video.emotional_triggers?.forEach((trigger: string) => {
      const key = trigger.substring(0, 100)
      hookAnalysis.emotionalTriggers[key] =
        (hookAnalysis.emotionalTriggers[key] || 0) + 1
    })

    // Aggregate visual elements
    video.visual_elements?.forEach((element: string) => {
      const key = element.substring(0, 100)
      hookAnalysis.visualElements[key] =
        (hookAnalysis.visualElements[key] || 0) + 1
    })

    // Aggregate success factors
    video.key_success_factors?.forEach((factor: string) => {
      hookAnalysis.successFactors[factor] =
        (hookAnalysis.successFactors[factor] || 0) + 1
    })

    // Aggregate concept themes for new video ideas
    video.new_concepts?.forEach((concept: any) => {
      if (concept.theme_title) {
        hookAnalysis.conceptThemes[concept.theme_title] =
          (hookAnalysis.conceptThemes[concept.theme_title] || 0) + 1
      }
    })

    // Track word frequency (excluding common words)
    const words = hook.toLowerCase().split(/\s+/)
    const stopWords = [
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'it',
      'this',
      'that',
      'these',
      'those',
    ]

    words.forEach((word) => {
      if (word.length > 2 && !stopWords.includes(word)) {
        hookAnalysis.wordFrequency[word] =
          (hookAnalysis.wordFrequency[word] || 0) + 1
      }
    })

    // Store top performing content with comprehensive insights
    if (views > 500000 && hook.length > 10) {
      hookAnalysis.topHooks.push({
        hook,
        views,
        engagementRate: engagementRate.toFixed(2),
        author: video.author_name || 'Unknown',
        id: video.id,
        techniques: video.viral_techniques?.slice(0, 3) || [],
        emotionalTriggers: video.emotional_triggers?.slice(0, 2) || [],
        visualElements: video.visual_elements?.slice(0, 2) || [],
        analysisSource: video.analysis_source,
      })
    }
  })

  // Calculate average engagement rate
  const totalEngagement = videos.reduce((sum, v) => {
    const views = v.view_count || 0
    const engagement =
      (v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0)
    return sum + (views > 0 ? (engagement / views) * 100 : 0)
  }, 0)
  hookAnalysis.averageEngagementRate = parseFloat(
    (totalEngagement / videos.length).toFixed(2)
  )

  // Sort and limit top elements
  hookAnalysis.topHooks.sort((a, b) => b.views - a.views)
  hookAnalysis.topHooks = hookAnalysis.topHooks.slice(0, 20)

  // Get top viral techniques
  hookAnalysis.topTechniques = Object.entries(hookAnalysis.viralTechniques)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([technique, count]) => ({ technique, count }))

  // Get top concept themes for new video ideas
  hookAnalysis.topConcepts = Object.entries(hookAnalysis.conceptThemes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([theme, count]) => ({ theme, count }))

  // Get most common words
  const sortedWords = Object.entries(hookAnalysis.wordFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 30)

  const finalAnalysis = {
    ...hookAnalysis,
    averageHookLength:
      hookAnalysis.hookLengths.length > 0
        ? Math.round(
            hookAnalysis.hookLengths.reduce((a, b) => a + b, 0) /
              hookAnalysis.hookLengths.length
          )
        : 0,
    mostCommonWords: sortedWords.map(([word, count]) => ({ word, count })),
    patternPercentages: {
      questions:
        ((hookAnalysis.commonPatterns.questions / videos.length) * 100).toFixed(
          1
        ) + '%',
      personalStory:
        (
          (hookAnalysis.commonPatterns.personalStory / videos.length) *
          100
        ).toFixed(1) + '%',
      challenge:
        ((hookAnalysis.commonPatterns.challenge / videos.length) * 100).toFixed(
          1
        ) + '%',
      revelation:
        (
          (hookAnalysis.commonPatterns.revelation / videos.length) *
          100
        ).toFixed(1) + '%',
      controversy:
        (
          (hookAnalysis.commonPatterns.controversy / videos.length) *
          100
        ).toFixed(1) + '%',
    },
    // Summary insights from AI analysis
    topEmotionalTriggers: Object.entries(hookAnalysis.emotionalTriggers)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([trigger, count]) => ({ trigger, count })),
    topVisualElements: Object.entries(hookAnalysis.visualElements)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([element, count]) => ({ element, count })),
    topSuccessFactors: Object.entries(hookAnalysis.successFactors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([factor, count]) => ({ factor, count })),
  }

  // Save to database if requested
  if (saveToDb && videos.length > 0) {
    console.log('💾 Saving viral insights to database...')

    try {
      // Save main summary
      await saveViralInsightsSummary('christian', finalAnalysis)

      // Save detailed breakdowns
      await saveViralTechniques('christian', hookAnalysis.topTechniques, videos)
      await saveEmotionalTriggers(
        'christian',
        finalAnalysis.topEmotionalTriggers,
        videos
      )
      await saveVisualElements(
        'christian',
        finalAnalysis.topVisualElements,
        videos
      )
      await saveTopHooks('christian', hookAnalysis.topHooks)
      await saveConceptThemes('christian', hookAnalysis.topConcepts, videos)

      console.log('✅ Viral insights saved successfully')
    } catch (error) {
      console.error('❌ Error saving viral insights:', error)
    }
  }

  return finalAnalysis
}

// Save content reference
export async function saveContentReference(
  taskId: string,
  videoId: number,
  usageType: string,
  notes?: string
) {
  const { error } = await viralSupabase.from('gtm_content_references').insert({
    task_id: taskId,
    video_id: videoId,
    usage_type: usageType,
    notes,
  })

  if (error) throw error
}

// Helper to calculate phase progress
function calculatePhaseProgress(tasks: any[]): number {
  if (tasks.length === 0) return 0
  const completed = tasks.filter((t) => t.status === 'completed').length
  return (completed / tasks.length) * 100
}

// Upload generated image to storage
export async function uploadGeneratedImage(
  imageUrl: string,
  metadata: {
    workflow_id?: string
    task_id?: string
    prompt: string
    model: string
    model_provider?: string
    aspect_ratio?: string
    width?: number
    height?: number
    cost_estimate?: number
  }
) {
  try {
    console.log('📸 Uploading image to storage:', {
      url: imageUrl.substring(0, 50) + '...',
      model: metadata.model,
    })

    // Fetch the image
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error('Failed to fetch image')

    // Get the array buffer first
    const arrayBuffer = await response.arrayBuffer()
    const fileSize = arrayBuffer.byteLength

    // Determine mime type from response headers or default to png
    const contentType = response.headers.get('content-type') || 'image/png'
    const mimeType = contentType.split(';')[0] // Remove any charset info

    // Log what we're uploading
    console.log('📦 Upload details:', { size: fileSize, type: mimeType })

    // Generate filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const extension = mimeType.split('/')[1] || 'png'
    const fileName = `${timestamp}-${randomId}.${extension}`
    const filePath = `image-assets/${fileName}`

    // Convert ArrayBuffer to Uint8Array for Supabase
    const uint8Array = new Uint8Array(arrayBuffer)

    // Upload to storage using the correct format
    const { data: uploadData, error: uploadError } = await viralSupabase.storage
      .from('toktrendz-media')
      .upload(filePath, uint8Array, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      throw uploadError
    }

    // Get public URL - ensure we have the direct image URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('toktrendz-media').getPublicUrl(filePath)

    console.log('📎 Public URL from Supabase:', publicUrl)
    console.log('📎 File path:', filePath)

    // Verify the URL structure is correct
    const correctPublicUrl = publicUrl

    // Save to database
    const { data: dbData, error: dbError } = await viralSupabase
      .from('gtm_image_assets')
      .insert({
        workflow_id: metadata.workflow_id,
        task_id: metadata.task_id,
        prompt: metadata.prompt,
        model: metadata.model,
        model_provider: metadata.model_provider || 'replicate',
        aspect_ratio: metadata.aspect_ratio,
        width: metadata.width,
        height: metadata.height,
        file_path: filePath,
        public_url: correctPublicUrl,
        original_url: imageUrl,
        file_size: fileSize,
        mime_type: mimeType,
        cost_estimate: metadata.cost_estimate,
        metadata: {},
        tags: [],
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database insert error:', dbError)
      throw dbError
    }

    console.log('✅ Image uploaded successfully:', dbData.id)

    return {
      id: dbData.id,
      filePath,
      publicUrl: correctPublicUrl,
      originalUrl: imageUrl,
      record: dbData,
    }
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

// Upload generated video to storage
export async function uploadGeneratedVideo(
  videoUrl: string,
  metadata: {
    workflow_id?: string
    task_id?: string
    prompt?: string
    script?: string
    source_image_id?: string
    model: string
    model_provider?: string
    duration?: number
    fps?: number
    resolution?: string
    cost_estimate?: number
  }
) {
  try {
    console.log('🎬 Uploading video to storage:', {
      url: videoUrl.substring(0, 50) + '...',
      model: metadata.model,
    })

    // Fetch the video
    const response = await fetch(videoUrl)
    if (!response.ok) throw new Error('Failed to fetch video')

    // Get the array buffer first
    const arrayBuffer = await response.arrayBuffer()
    const fileSize = arrayBuffer.byteLength

    // Determine mime type from response headers or default to mp4
    const contentType = response.headers.get('content-type') || 'video/mp4'
    const mimeType = contentType.split(';')[0] // Remove any charset info

    // Generate filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const extension = mimeType.split('/')[1] || 'mp4'
    const fileName = `${timestamp}-${randomId}.${extension}`
    const filePath = `video-assets/${fileName}`

    // Convert ArrayBuffer to Uint8Array for Supabase
    const uint8Array = new Uint8Array(arrayBuffer)

    // Upload to storage using the correct format
    const { data: uploadData, error: uploadError } = await viralSupabase.storage
      .from('toktrendz-media')
      .upload(filePath, uint8Array, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      throw uploadError
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('toktrendz-media').getPublicUrl(filePath)

    // Ensure the URL has proper format for direct video access
    const correctPublicUrl = publicUrl.includes(
      'toktrendz-media/toktrendz-media'
    )
      ? publicUrl.replace('toktrendz-media/toktrendz-media', 'toktrendz-media')
      : publicUrl

    // Save to database
    const { data: dbData, error: dbError } = await viralSupabase
      .from('gtm_video_assets')
      .insert({
        workflow_id: metadata.workflow_id,
        task_id: metadata.task_id,
        prompt: metadata.prompt,
        script: metadata.script,
        source_image_id: metadata.source_image_id,
        model: metadata.model,
        model_provider: metadata.model_provider || 'replicate',
        duration: metadata.duration,
        fps: metadata.fps,
        resolution: metadata.resolution,
        file_path: filePath,
        public_url: correctPublicUrl,
        original_url: videoUrl,
        file_size: fileSize,
        mime_type: mimeType,
        cost_estimate: metadata.cost_estimate,
        metadata: {},
        tags: [],
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database insert error:', dbError)
      throw dbError
    }

    console.log('✅ Video uploaded successfully:', dbData.id)

    return {
      id: dbData.id,
      filePath,
      publicUrl: correctPublicUrl,
      originalUrl: videoUrl,
      record: dbData,
    }
  } catch (error) {
    console.error('Error uploading video:', error)
    throw error
  }
}

// Initialize default GTM data from gtm.MD
export async function initializeGTMData(projectId: string, phases: GTMPhase[]) {
  // Insert phases
  for (const phase of phases) {
    const { data: phaseData, error: phaseError } = await viralSupabase
      .from('gtm_phases')
      .insert({
        project_id: projectId,
        phase_number: phase.id,
        title: phase.title,
        subtitle: phase.subtitle,
        date_range: phase.dateRange,
        has_milestone: phase.hasMilestone,
        color: phase.color,
        bg_gradient: phase.bgGradient,
      })
      .select()
      .single()

    if (phaseError) throw phaseError

    // Insert tasks for this phase
    for (const task of phase.tasks) {
      const { data: taskData, error: taskError } = await viralSupabase
        .from('gtm_tasks')
        .insert({
          project_id: projectId,
          phase_id: phaseData.id,
          task_number: task.taskNumber,
          title: task.title,
          owner: task.owner,
          due_date: task.dueDate,
          dependencies: task.dependencies,
          status: task.status,
          is_milestone: task.isMilestone,
          priority: task.priority,
        })
        .select()
        .single()

      if (taskError) throw taskError

      // Insert subtasks if they exist (from gtm.MD parsing)
      if (task.subtasks && task.subtasks.length > 0) {
        const subtasksToInsert = task.subtasks.map(
          (subtask: any, index: number) => ({
            task_id: taskData.id,
            title: subtask.title,
            due_date: subtask.dueDate,
            status: subtask.status || 'not-started',
            order_index: index,
          })
        )

        const { error: subtaskError } = await viralSupabase
          .from('gtm_subtasks')
          .insert(subtasksToInsert)

        if (subtaskError) {
          console.error('Error inserting subtasks:', subtaskError)
          throw subtaskError
        }

        console.log(
          `✅ Inserted ${task.subtasks.length} subtasks for task ${task.taskNumber}`
        )
      }
    }
  }
}

// Workflow CRUD operations (using existing gtm_workflows table)
export const workflowService = {
  async list() {
    const { data, error } = await viralSupabase
      .from('gtm_workflows')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error loading workflows:', error)
      throw error
    }
    return data || []
  },

  async get(id: string) {
    const { data, error } = await viralSupabase
      .from('gtm_workflows')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async create(workflow: any) {
    // Convert React Flow format to gtm_workflows format
    const { data, error } = await viralSupabase
      .from('gtm_workflows')
      .insert([
        {
          name: workflow.name,
          steps: {
            nodes: workflow.nodes || [],
            edges: workflow.edges || [],
          },
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating workflow:', error)
      throw error
    }
    return data
  },

  async update(id: string, workflow: any) {
    const { data, error } = await viralSupabase
      .from('gtm_workflows')
      .update({
        name: workflow.name,
        steps: {
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating workflow:', error)
      throw error
    }
    return data
  },

  async delete(id: string) {
    const { error } = await viralSupabase
      .from('gtm_workflows')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting workflow:', error)
      throw error
    }
  },

  // Track workflow execution
  async createRun(workflowId: string, taskId?: string) {
    const { data, error } = await viralSupabase
      .from('gtm_workflow_runs')
      .insert([
        {
          workflow_id: workflowId,
          task_id: taskId,
          status: 'running',
        },
      ])
      .select()
      .single()

    if (error) throw error

    // Increment run count
    await viralSupabase
      .from('gtm_workflows')
      .update({
        run_count: supabase.sql`run_count + 1`,
        last_run: new Date().toISOString(),
      })
      .eq('id', workflowId)

    return data
  },

  async updateRun(
    runId: string,
    updates: {
      status?: string
      error?: string
      outputs?: any
      completed_at?: string
    }
  ) {
    const { data, error } = await viralSupabase
      .from('gtm_workflow_runs')
      .update(updates)
      .eq('id', runId)
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// Production session management
export const productionSessionService = {
  async create(name?: string) {
    const { data, error } = await viralSupabase
      .from('production_sessions')
      .insert([
        {
          name: name || `Session ${new Date().toLocaleString()}`,
          assets: [],
          settings: {},
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(
    sessionId: string,
    updates: { assets?: any[]; settings?: any; name?: string }
  ) {
    console.log('Updating session:', sessionId, {
      assetsCount: updates.assets?.length,
      hasSettings: !!updates.settings,
    })

    const { data, error } = await viralSupabase
      .from('production_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      throw error
    }

    console.log('Session updated successfully')
    return data
  },

  async get(sessionId: string) {
    const { data, error } = await viralSupabase
      .from('production_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      console.error('Error loading session:', error)
      throw error
    }

    console.log('Session loaded from DB:', {
      id: data.id,
      name: data.name,
      assetsCount: data.assets?.length || 0,
      hasSettings: !!data.settings,
    })

    return data
  },

  async listRecent(limit = 20) {
    console.log('📋 Loading recent production sessions...')

    const { data, error } = await viralSupabase
      .from('production_sessions')
      .select('*')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ Failed to load sessions:', error)
      throw error
    }

    console.log(`✅ Loaded ${data?.length || 0} sessions from database`)
    console.log(
      'Session IDs:',
      data?.map((s) => ({ id: s.id, name: s.name }))
    )

    return data || []
  },

  async archive(sessionId: string) {
    const { error } = await viralSupabase
      .from('production_sessions')
      .update({ status: 'archived' })
      .eq('id', sessionId)

    if (error) throw error
  },

  async delete(sessionId: string) {
    console.log('🗑️ Attempting to delete session:', sessionId)

    // First, try to delete any related assets
    try {
      const { error: assetsError } = await viralSupabase
        .from('production_assets')
        .delete()
        .eq('session_id', sessionId)

      if (assetsError) {
        console.warn(
          '⚠️ Could not delete assets (table may not exist):',
          assetsError.message
        )
      }
    } catch (err) {
      console.warn('⚠️ Assets deletion failed:', err)
    }

    // Then delete the session
    const { data, error, count } = await viralSupabase
      .from('production_sessions')
      .delete()
      .eq('id', sessionId)
      .select()

    console.log('Delete operation result:', { data, error, count, sessionId })

    if (error) {
      console.error('❌ Database delete failed:', error)
      // Log the full error details
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw new Error(`Failed to delete session: ${error.message}`)
    }

    if (!data || data.length === 0) {
      console.warn(
        '⚠️ No rows were deleted - session may not exist:',
        sessionId
      )
      throw new Error('Session not found or already deleted')
    }

    console.log('✅ Session deleted from database:', data[0])
    return data[0]
  },
}
