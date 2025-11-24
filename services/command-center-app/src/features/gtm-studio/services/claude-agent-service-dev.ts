import { AgentType, AgentThought, Mission } from '../types'
import { AGENT_CONFIGS } from './claude-agent-service'
import { ClaudeAgentConfig, ClaudeMessage } from './claude-agent-service'

// Simple EventEmitter implementation for browser
class EventEmitter {
  private events: Map<string, Function[]> = new Map()

  on(event: string, listener: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(listener)
  }

  emit(event: string, ...args: any[]) {
    if (this.events.has(event)) {
      this.events.get(event)!.forEach((listener) => listener(...args))
    }
  }

  off(event: string, listener: Function) {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }
}

// Development mode agent that simulates Claude behavior without requiring the CLI
export class ClaudeAgentDev extends EventEmitter {
  private config: ClaudeAgentConfig
  private isProcessing: boolean = false
  private messageQueue: string[] = []
  private simulationInterval: NodeJS.Timeout | null = null

  constructor(config: ClaudeAgentConfig) {
    super()
    this.config = config
  }

  async start(mission: Mission): Promise<void> {
    this.isProcessing = true

    // Simulate initial thinking
    setTimeout(() => {
      this.emit('thought', {
        id: Date.now().toString(),
        content: `Analyzing mission: ${mission.title}`,
        timestamp: new Date(),
        type: 'progress',
      })
    }, 500)

    // Simulate various agent behaviors based on type
    this.simulateAgentBehavior(mission)
  }

  async sendMessage(message: string): Promise<void> {
    if (this.isProcessing) {
      this.messageQueue.push(message)
      return
    }

    this.isProcessing = true

    // Check if this is a decision response
    if (message.includes('Based on the decision point')) {
      setTimeout(() => {
        this.emit('thought', {
          id: Date.now().toString(),
          content: `Decision received. Continuing with: ${message.split(': ')[1]}`,
          timestamp: new Date(),
          type: 'progress',
        })

        // Resume the simulation after decision
        if (this.simulationInterval === null) {
          const mission = {
            title: 'Continuing mission',
            description: '',
          } as Mission
          this.simulateAgentBehavior(mission, true)
        }

        this.isProcessing = false
      }, 500)
    } else {
      // Simulate normal response
      setTimeout(() => {
        this.emit('thought', {
          id: Date.now().toString(),
          content: `Processing: ${message.substring(0, 50)}...`,
          timestamp: new Date(),
          type: 'progress',
        })

        this.isProcessing = false
        this.emit('complete', 'Simulated completion')

        // Process any queued messages
        if (this.messageQueue.length > 0) {
          const nextMessage = this.messageQueue.shift()
          if (nextMessage) {
            this.sendMessage(nextMessage)
          }
        }
      }, 1000)
    }
  }

  async stop(): Promise<void> {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval)
      this.simulationInterval = null
    }
    this.emit('stopped')
  }

  async resume(sessionId: string): Promise<void> {
    // Simulate resuming a session
    this.emit('thought', {
      id: Date.now().toString(),
      content: `Resumed session: ${sessionId}`,
      timestamp: new Date(),
      type: 'progress',
    })
  }

  private simulateAgentBehavior(
    mission: Mission,
    resumeFromDecision: boolean = false
  ): void {
    const behaviors = this.getAgentBehaviors()[this.config.type]
    let stepIndex = resumeFromDecision
      ? behaviors.findIndex((b) => b.type === 'decision') + 1
      : 0

    this.simulationInterval = setInterval(
      () => {
        if (stepIndex >= behaviors.length) {
          // Complete the mission
          if (this.simulationInterval) {
            clearInterval(this.simulationInterval)
          }
          this.isProcessing = false
          this.emit('complete', `Completed: ${mission.title}`)
          return
        }

        const behavior = behaviors[stepIndex]

        if (behavior.type === 'thought') {
          this.emit('thought', {
            id: Date.now().toString(),
            content: behavior.content,
            timestamp: new Date(),
            type: 'progress',
          })
        } else if (behavior.type === 'tool') {
          this.emit('thought', {
            id: Date.now().toString(),
            content: `Using tool: ${behavior.tool} - ${behavior.description}`,
            timestamp: new Date(),
            type: 'progress',
          })
          this.emit('tool_use', {
            name: behavior.tool,
            input: behavior.input,
            id: Date.now().toString(),
          })
        } else if (behavior.type === 'decision') {
          this.emit('thought', {
            id: Date.now().toString(),
            content: behavior.content,
            timestamp: new Date(),
            type: 'decision',
          })
          this.emit('tool_use', {
            name: 'ask_human',
            input: {
              question: behavior.question,
              options: behavior.options,
              context: behavior.context,
            },
            id: Date.now().toString(),
          })
          // Pause until decision is made
          if (this.simulationInterval) {
            clearInterval(this.simulationInterval)
          }
        }

        stepIndex++
      },
      2000 + Math.random() * 2000
    ) // Random delay between 2-4 seconds
  }

  private getAgentBehaviors(): Record<AgentType, any[]> {
    return {
      strategist: [
        {
          type: 'thought',
          content: 'Analyzing market landscape for Christian prayer apps...',
        },
        {
          type: 'tool',
          tool: 'WebSearch',
          description: 'Searching for competitor analysis',
          input: { query: 'christian prayer apps market 2024' },
        },
        {
          type: 'thought',
          content: 'Found 3 main competitors: Hallow, Pray.com, and Abide',
        },
        {
          type: 'thought',
          content: 'Identifying unique value propositions...',
        },
        {
          type: 'decision',
          content: 'Need strategic direction',
          question:
            'Should we focus on individual users or church communities first?',
          options: ['Individual users', 'Church communities', 'Both equally'],
          context: 'Market research shows different engagement patterns',
        },
        {
          type: 'thought',
          content: 'Creating go-to-market strategy based on decision...',
        },
      ],
      developer: [
        { type: 'thought', content: 'Setting up project architecture...' },
        {
          type: 'tool',
          tool: 'Bash',
          description: 'Initializing Next.js project',
          input: { command: 'npx create-next-app@latest' },
        },
        { type: 'thought', content: 'Configuring TypeScript and ESLint...' },
        {
          type: 'tool',
          tool: 'Write',
          description: 'Creating configuration files',
          input: { file_path: 'tsconfig.json' },
        },
        {
          type: 'decision',
          content: 'Architecture decision needed',
          question: 'Which backend should we use?',
          options: ['Supabase', 'Firebase', 'Custom Node.js'],
          context: 'Need real-time features and authentication',
        },
        { type: 'thought', content: 'Implementing chosen backend...' },
      ],
      designer: [
        {
          type: 'thought',
          content: 'Researching design patterns for prayer apps...',
        },
        {
          type: 'tool',
          tool: 'WebFetch',
          description: 'Analyzing competitor designs',
          input: { url: 'https://hallow.com' },
        },
        {
          type: 'thought',
          content: 'Creating mood board with calming colors...',
        },
        { type: 'thought', content: 'Sketching initial wireframes...' },
        {
          type: 'decision',
          content: 'Design direction needed',
          question: 'What visual style should we pursue?',
          options: ['Minimalist', 'Traditional', 'Modern gradient'],
          context: 'Target audience includes all age groups',
        },
        {
          type: 'thought',
          content: 'Building component library based on chosen style...',
        },
      ],
      researcher: [
        { type: 'thought', content: 'Designing user survey questions...' },
        {
          type: 'tool',
          tool: 'WebSearch',
          description: 'Finding prayer app statistics',
          input: { query: 'christian prayer app usage statistics 2024' },
        },
        {
          type: 'thought',
          content: 'Key insight: 73% of users want guided prayers',
        },
        {
          type: 'thought',
          content: 'Analyzing user pain points from reviews...',
        },
        {
          type: 'decision',
          content: 'Research focus needed',
          question: 'Which user segment should we prioritize research on?',
          options: ['Daily practitioners', 'Beginners', 'Occasional users'],
          context: 'Limited research budget',
        },
        { type: 'thought', content: 'Conducting focused user interviews...' },
      ],
      content: [
        { type: 'thought', content: 'Brainstorming landing page headlines...' },
        {
          type: 'tool',
          tool: 'Write',
          description: 'Creating headline variations',
          input: { content: 'Find Peace in Prayer' },
        },
        { type: 'thought', content: 'Writing value proposition copy...' },
        { type: 'thought', content: 'Developing email onboarding sequence...' },
        {
          type: 'decision',
          content: 'Tone decision needed',
          question: 'What tone should our content use?',
          options: [
            'Formal and reverent',
            'Warm and conversational',
            'Inspirational and uplifting',
          ],
          context: 'Brand voice affects all content',
        },
        {
          type: 'thought',
          content: 'Creating content calendar with chosen voice...',
        },
      ],
    }
  }
}

// Export a factory that returns the dev version
export function createClaudeAgentDev(
  type: AgentType,
  id: string
): ClaudeAgentDev {
  const config = AGENT_CONFIGS[type]
  return new ClaudeAgentDev({
    id,
    ...config,
  })
}
