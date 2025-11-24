import { GTMTask, TaskOwner } from '../types'

// Task planning prompts based on owner type
const OWNER_PROMPTS: Record<TaskOwner, string> = {
  PM: 'Break down this product/growth management task into actionable steps focusing on strategy, metrics, and coordination:',
  BE: 'Break down this backend engineering task into technical implementation steps including setup, development, testing, and deployment:',
  CR: 'Break down this creative task into content creation steps including ideation, production, editing, and publishing:',
  HC: 'Break down this host/creator task into content creation and community engagement steps:',
}

const SYSTEM_PROMPT = `You are an expert project planner for a TikTok go-to-market campaign. 
Your job is to break down high-level tasks into specific, actionable subtasks.
Consider the task owner's role, dependencies, and the overall campaign timeline.
Return a JSON array of subtask strings, each being a clear, actionable step.
Aim for 4-7 subtasks that are specific and measurable.`

export async function generateTaskPlanWithAI(task: GTMTask): Promise<string[]> {
  const openAIKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!openAIKey) {
    throw new Error('OpenAI API key not configured')
  }

  const ownerPrompt = OWNER_PROMPTS[task.owner]
  const context = analyzeTaskContext(task)

  const userPrompt = `
${ownerPrompt}

Task: ${task.title}
Owner: ${task.owner}
Phase: ${task.phase} - ${task.phaseTitle}
Due: ${task.dueDate}
${task.dependencies.length > 0 ? `Dependencies: ${task.dependencies.join(', ')}` : ''}
${task.isMilestone ? 'This is a MILESTONE task - ensure subtasks lead to a major deliverable.' : ''}

Additional context:
- This is for a Christian prayer app TikTok marketing campaign
- Focus on viral content creation and community engagement
- Consider TikTok's algorithm and best practices

Return only a JSON array of subtask strings.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)

    // Handle different possible response formats
    if (Array.isArray(result)) {
      return result
    } else if (result.subtasks && Array.isArray(result.subtasks)) {
      return result.subtasks
    } else if (result.tasks && Array.isArray(result.tasks)) {
      return result.tasks
    } else {
      // Fallback to extracting any array from the response
      const arrays = Object.values(result).filter((v) => Array.isArray(v))
      if (arrays.length > 0) {
        return arrays[0] as string[]
      }
    }

    throw new Error('Invalid response format from AI')
  } catch (error) {
    console.error('AI task planning failed:', error)
    throw error
  }
}

// Analyze task context for better AI planning
export function analyzeTaskContext(task: GTMTask) {
  const keywords = task.title.toLowerCase().split(' ')
  const actions = keywords.filter((word) =>
    [
      'create',
      'build',
      'design',
      'implement',
      'setup',
      'configure',
      'draft',
      'film',
      'record',
      'generate',
      'launch',
      'publish',
    ].includes(word)
  )

  const technologies = keywords.filter((word) =>
    [
      'api',
      'database',
      'pipeline',
      'queue',
      'cdn',
      's3',
      'lambda',
      'tiktok',
      'instagram',
      'youtube',
      'midjourney',
      'elevenlabs',
    ].includes(word)
  )

  const contentTypes = keywords.filter((word) =>
    [
      'video',
      'slideshow',
      'reaction',
      'live',
      'content',
      'template',
      'audio',
      'voice',
    ].includes(word)
  )

  return {
    actions,
    technologies,
    contentTypes,
    hasSubtasks: task.subtasks && task.subtasks.length > 0,
    isMilestone: task.isMilestone,
    phase: task.phase,
    isContentCreation: task.owner === 'CR' || task.owner === 'HC',
    isTechnical: task.owner === 'BE',
    isStrategic: task.owner === 'PM',
  }
}

// Alternative: Use Claude via MCP if available
export async function generateTaskPlanWithClaude(
  task: GTMTask
): Promise<string[]> {
  // This would use the Claude MCP tool if you have it set up
  // For now, falling back to OpenAI
  return generateTaskPlanWithAI(task)
}
