import { GTMTask, TaskOwner } from '../types'

// Task planning prompts based on owner type
const OWNER_PROMPTS: Record<TaskOwner, string> = {
  PM: 'Break down this product/growth management task into actionable steps focusing on strategy, metrics, and coordination:',
  BE: 'Break down this backend engineering task into technical implementation steps including setup, development, testing, and deployment:',
  CR: 'Break down this creative task into content creation steps including ideation, production, editing, and publishing:',
  HC: 'Break down this host/creator task into content creation and community engagement steps:',
}

// Generate subtasks based on task context
export async function generateTaskPlan(task: GTMTask): Promise<string[]> {
  const prompt = OWNER_PROMPTS[task.owner]

  // In a real implementation, this would call your AI service
  // For now, we'll generate context-aware mock subtasks

  // Parse task title for key actions
  const title = task.title.toLowerCase()
  const subtasks: string[] = []

  // Add owner-specific subtasks
  switch (task.owner) {
    case 'PM':
      if (title.includes('metric') || title.includes('kpi')) {
        subtasks.push('Define key metrics and tracking methodology')
        subtasks.push('Set up analytics dashboard and reporting')
        subtasks.push('Create baseline measurements')
        subtasks.push('Document success criteria and thresholds')
      } else if (title.includes('launch') || title.includes('release')) {
        subtasks.push('Create launch checklist and timeline')
        subtasks.push('Coordinate with engineering and creative teams')
        subtasks.push('Prepare launch communications')
        subtasks.push('Set up monitoring and response protocols')
      }
      break

    case 'BE':
      if (title.includes('api') || title.includes('endpoint')) {
        subtasks.push('Design API schema and documentation')
        subtasks.push('Implement endpoint logic and validation')
        subtasks.push('Write unit and integration tests')
        subtasks.push('Set up monitoring and error handling')
      } else if (title.includes('pipeline') || title.includes('queue')) {
        subtasks.push('Design system architecture and data flow')
        subtasks.push('Set up infrastructure and dependencies')
        subtasks.push('Implement core processing logic')
        subtasks.push('Add error handling and retry mechanisms')
        subtasks.push('Create monitoring dashboard')
      }
      break

    case 'CR':
      if (title.includes('video') || title.includes('content')) {
        subtasks.push('Create content brief and storyboard')
        subtasks.push('Gather/create visual assets')
        subtasks.push('Record/produce raw content')
        subtasks.push('Edit and post-process')
        subtasks.push('Export in required formats')
      }
      break

    case 'HC':
      if (title.includes('film') || title.includes('record')) {
        subtasks.push('Plan shooting schedule and locations')
        subtasks.push('Set up equipment and lighting')
        subtasks.push('Record multiple takes/angles')
        subtasks.push('Review and select best clips')
        subtasks.push('Organize files for editing team')
      }
      break
  }

  // Add common subtasks if we haven't generated enough
  if (subtasks.length < 3) {
    subtasks.push(`Research best practices for: ${task.title}`)
    subtasks.push(`Create implementation plan and timeline`)
    subtasks.push(`Execute core task requirements`)
    subtasks.push(`Test and validate results`)
    subtasks.push(`Document process and outcomes`)
  }

  // Add dependency check if needed
  if (task.dependencies.length > 0) {
    subtasks.unshift(
      `Verify completion of dependencies: ${task.dependencies.join(', ')}`
    )
  }

  return subtasks
}

// Extract task context for better planning
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
    ].includes(word)
  )

  return {
    actions,
    technologies,
    hasSubtasks: task.subtasks && task.subtasks.length > 0,
    isMilestone: task.isMilestone,
    phase: task.phase,
  }
}
