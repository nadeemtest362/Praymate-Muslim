import { claudeAgentService } from '@/services/claude-agent.service'
import { GTMTask, TaskOwner } from '../types'
import {
  supabase,
  logAgentThought,
  assignAgentToTask,
} from './supabase-service'

// Comprehensive task context builder
export function buildTaskContext(task: GTMTask, allPhases?: any[]) {
  return {
    task: {
      id: task.id,
      title: task.title,
      number: task.taskNumber,
      owner: task.owner,
      phase: task.phase,
      phaseTitle: task.phaseTitle,
      dueDate: task.dueDate,
      dependencies: task.dependencies,
      isMilestone: task.isMilestone,
      priority: task.priority,
      currentStatus: task.status,
      existingNotes: task.notes,
    },
    campaign: {
      product: 'Personal Prayers iOS App',
      market: 'Christian TikTok users',
      goal: 'Drive app installs through viral TikTok content',
      timeline: '90-day campaign (D-21 to D+69)',
      keyMetrics: ['Hook rate', 'Hold time', 'CPI', 'Install rate'],
    },
    ownerContext: getOwnerContext(task.owner),
    phaseContext: getPhaseContext(task.phase),
    dependencies:
      task.dependencies.length > 0
        ? `This task depends on: ${task.dependencies.join(', ')}`
        : 'No dependencies',
  }
}

function getOwnerContext(owner: TaskOwner) {
  const contexts = {
    PM: {
      role: 'Product/Growth Manager',
      responsibilities: 'Strategy, metrics, coordination, campaign management',
      tools: 'Analytics platforms, project management, communication tools',
      focus: 'ROI, user acquisition, team alignment',
    },
    BE: {
      role: 'Backend Developer',
      responsibilities:
        'Technical infrastructure, automation, APIs, data pipelines',
      tools: 'AWS, Node.js, Python, databases, serverless functions',
      focus: 'Scalability, reliability, automation efficiency',
    },
    CR: {
      role: 'Creative/Content Creator',
      responsibilities:
        'Video production, graphics, copywriting, content strategy',
      tools: 'Video editors, Midjourney, design tools, content calendars',
      focus: 'Virality, engagement, brand consistency',
    },
    HC: {
      role: 'Host/Creator (On-camera talent)',
      responsibilities:
        'Filming, live streaming, community interaction, authenticity',
      tools: 'Camera equipment, streaming software, social platforms',
      focus: 'Personality, relatability, community building',
    },
  }
  return contexts[owner]
}

function getPhaseContext(phaseId: number) {
  const phases = {
    0: {
      name: 'Internal Tooling & Foundation',
      focus: 'Building automation infrastructure and content generation tools',
      deliverables: 'Working pipelines, templates, and automation systems',
    },
    1: {
      name: 'Asset Factory & Content Stockpile',
      focus: 'Mass-producing content assets for launch',
      deliverables: '50+ videos, templates, and reaction clips ready to post',
    },
    2: {
      name: 'Launch Blast',
      focus: 'High-volume posting and initial traction',
      deliverables: '15 videos/day, community engagement, first Live stream',
    },
    3: {
      name: 'Iterate & Scale',
      focus: 'Optimizing based on data, expanding reach',
      deliverables: 'Winning format variations, influencer partnerships',
    },
    4: {
      name: 'Community & Moat',
      focus: 'Building sustainable growth and community',
      deliverables: 'User-generated content, recurring engagement systems',
    },
  }
  return phases[phaseId] || { name: 'Unknown', focus: '', deliverables: '' }
}

// Generate comprehensive prompt for agent
export function generateAgentPrompt(context: any) {
  return `You are the Strategy Agent for a TikTok go-to-market campaign. Your task is to create detailed, actionable subtasks for the following:

## Task Details
- **Title**: ${context.task.title}
- **Task Number**: ${context.task.number}
- **Owner**: ${context.ownerContext.role} (${context.task.owner})
- **Phase**: ${context.phaseContext.name} (Phase ${context.task.phase})
- **Due**: ${context.task.dueDate}
- **Priority**: ${context.task.priority || 'Normal'}
${context.task.isMilestone ? '- **THIS IS A MILESTONE TASK** - Must result in a major deliverable\n' : ''}

## Owner Context
- **Role**: ${context.ownerContext.role}
- **Responsibilities**: ${context.ownerContext.responsibilities}
- **Tools Available**: ${context.ownerContext.tools}
- **Focus Areas**: ${context.ownerContext.focus}

## Phase Context
- **Current Phase**: ${context.phaseContext.name}
- **Phase Focus**: ${context.phaseContext.focus}
- **Expected Deliverables**: ${context.phaseContext.deliverables}

## Campaign Context
- **Product**: ${context.campaign.product}
- **Target Market**: ${context.campaign.market}
- **Goal**: ${context.campaign.goal}
- **Timeline**: ${context.campaign.timeline}
- **Key Metrics**: ${context.campaign.keyMetrics.join(', ')}

## Dependencies
${context.dependencies}

## Instructions
Create 3-6 CONCISE subtasks that:
1. Match the actual scope of "${context.task.title}" - don't overengineer!
2. Are things you can realistically do in the time given (${context.task.dueDate})
3. Focus on the core deliverable, not peripheral activities
4. Avoid generic project management fluff (no "research best practices" or "schedule meetings")
5. Be specific to THIS task, not general ${context.task.owner} work
${context.task.isMilestone ? '6. Ensure the final subtask produces the milestone deliverable\n' : ''}

Keep it simple and practical. If the task is "write a doc", the subtasks should be about writing the doc, not setting up complex systems.`
}

// Simulate agent thinking process with delays
export async function simulateAgentThinking(
  agentId: string,
  taskId: string,
  steps: string[]
) {
  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate thinking time
    await logAgentThought(agentId, taskId, 'progress', step)
  }
}

// Main agent planning function
export async function requestAgentSubtasks(taskId: string, task: GTMTask) {
  // Assign to strategy agent for planning
  const agent = await assignAgentToTask(taskId, 'strategist', true)

  // Build comprehensive context
  const context = buildTaskContext(task)

  // Log initial analysis
  await logAgentThought(
    agent.id,
    taskId,
    'planning',
    `Analyzing task: "${task.title}" for ${task.owner} role in Phase ${task.phase}`
  )

  try {
    await logAgentThought(
      agent.id,
      taskId,
      'progress',
      'Starting Claude agent session...'
    )

    // Create the mission prompt
    const prompt = generateAgentPrompt(context)
    const mission = `Generate subtasks for: ${task.title}

${prompt}

Return ONLY a JSON array of subtask strings, like: ["Subtask 1", "Subtask 2", "Subtask 3"]`

    // Start Claude agent mission
    const { sessionId } = await claudeAgentService.startMission(mission, {
      taskId,
      taskTitle: task.title,
      taskContext: context,
    })

    await logAgentThought(
      agent.id,
      taskId,
      'progress',
      `Claude agent session started: ${sessionId}`
    )

    // Connect to WebSocket to receive Claude's thoughts
    const socket = claudeAgentService.connect()
    claudeAgentService.joinSession(sessionId)

    // Wait for Claude to complete
    const subtasks = await new Promise<string[]>((resolve, reject) => {
      let result: string | null = null

      // Listen for thoughts
      claudeAgentService.onThought((thought) => {
        if (thought.sessionId === sessionId && thought.type === 'result') {
          result = thought.content
        }
      })

      // Listen for completion
      claudeAgentService.onSessionCompleted((data) => {
        if (data.sessionId === sessionId) {
          if (result) {
            try {
              // Parse Claude's JSON response
              const parsed = JSON.parse(result)
              resolve(Array.isArray(parsed) ? parsed : [])
            } catch (e) {
              // If not valid JSON, split by newlines
              const lines = result.split('\n').filter((line) => line.trim())
              resolve(lines)
            }
          } else {
            resolve([])
          }
        }
      })

      // Listen for errors
      claudeAgentService.onSessionError((data) => {
        if (data.sessionId === sessionId) {
          reject(new Error(data.error))
        }
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Claude agent timeout'))
      }, 30000)
    })

    claudeAgentService.leaveSession(sessionId)

    await logAgentThought(
      agent.id,
      taskId,
      'insight',
      `Claude agent completed analysis and generated ${subtasks.length} subtasks`
    )

    return {
      agent,
      subtasks,
      context,
    }
  } catch (error) {
    console.error('Failed to get Claude agent plan:', error)

    // Log the error
    await logAgentThought(
      agent.id,
      taskId,
      'error',
      `Failed to reach Claude agent: ${error.message}. Using fallback planning.`
    )

    // Fallback to simple generic subtasks
    const subtasks = await generateGenericSubtasks(task, context)

    await logAgentThought(
      agent.id,
      taskId,
      'insight',
      `Generated ${subtasks.length} fallback subtasks`
    )

    return {
      agent,
      subtasks,
      context,
    }
  }
}

// Generate smart subtasks based on task analysis
async function generateSmartSubtasks(
  task: GTMTask,
  context: any
): Promise<string[]> {
  const { title, owner, dueDate } = task
  const keywords = title.toLowerCase()

  // Analyze task type
  if (keywords.includes('define') || keywords.includes('doc')) {
    return [
      `List the key items needed for "${title}"`,
      `Write clear definitions/descriptions`,
      `Set specific targets or criteria`,
      `Create the document and share with team`,
    ]
  }

  if (keywords.includes('create') && keywords.includes('handles')) {
    return [
      `Choose available handles across platforms`,
      `Create platform-specific email addresses`,
      `Register accounts with consistent branding`,
      `Document credentials securely`,
    ]
  }

  if (keywords.includes('s3') || keywords.includes('cdn')) {
    return [
      `Create S3 bucket with appropriate naming`,
      `Configure bucket permissions and CORS`,
      `Set up CloudFront distribution`,
      `Test upload and public access`,
    ]
  }

  if (keywords.includes('generator') || keywords.includes('pipeline')) {
    return [
      `Build core generation logic`,
      `Set up input/output handling`,
      `Add processing pipeline steps`,
      `Test end-to-end flow`,
    ]
  }

  // Default to role-specific practical subtasks
  return generateGenericSubtasks(task, context)
}

// Generate generic subtasks when specific patterns don't match
async function generateGenericSubtasks(
  task: GTMTask,
  context: any
): Promise<string[]> {
  const { ownerContext } = context

  switch (task.owner) {
    case 'PM':
      return [
        `Define what "${task.title}" means specifically`,
        `Write down the key points/requirements`,
        `Get it done and share with team`,
      ]

    case 'BE':
      return [
        `Figure out simplest way to build "${task.title}"`,
        `Write the code`,
        `Test it works`,
        `Deploy or integrate`,
      ]

    case 'CR':
      return [
        `Sketch out "${task.title}" concept`,
        `Create/gather needed assets`,
        `Produce the content`,
        `Export in right format`,
      ]

    case 'HC':
      return [
        `Plan what to film for "${task.title}"`,
        `Set up and film it`,
        `Review and pick best takes`,
        `Send to editor`,
      ]

    default:
      return [
        `Analyze requirements for ${task.title}`,
        `Create implementation plan`,
        `Execute core deliverables`,
        `Test and validate results`,
        `Document process and outcomes`,
      ]
  }
}
