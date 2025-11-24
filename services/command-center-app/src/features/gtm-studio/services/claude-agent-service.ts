import { AgentType, AgentThought, Mission } from '../types'

// Browser-compatible stub for Claude Agent Service
// The actual CLI integration would require a backend service
// Use claude-agent-service-dev.ts for browser-based development

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

export interface ClaudeAgentConfig {
  id: string
  name: string
  type: AgentType
  systemPrompt: string
  allowedTools?: string[]
}

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export class ClaudeAgent extends EventEmitter {
  private process: any = null
  private sessionId: string | null = null
  private messageBuffer: string = ''
  private config: ClaudeAgentConfig
  private messages: ClaudeMessage[] = []

  constructor(config: ClaudeAgentConfig) {
    super()
    this.config = config
  }

  async start(mission: Mission): Promise<void> {
    console.warn('Claude CLI is not available in browser environment')
    this.emit(
      'error',
      new Error(
        'Claude CLI is not available in browser environment. Please use development mode.'
      )
    )
  }

  async sendMessage(message: string): Promise<void> {
    console.warn('Cannot send message - Claude CLI is not available in browser')
  }

  async stop(): Promise<void> {
    console.warn('Cannot stop - Claude CLI is not available in browser')
  }

  private setupProcessHandlers(): void {
    // No-op in browser
  }

  private parseThought(data: string): AgentThought | null {
    return null
  }

  private buildInitialPrompt(mission: Mission): string {
    return `Mission: ${mission.title}\n${mission.description}`
  }

  getMessages(): ClaudeMessage[] {
    return this.messages
  }

  getSessionId(): string | null {
    return this.sessionId
  }
}

export const AGENT_CONFIGS: Record<AgentType, Partial<ClaudeAgentConfig>> = {
  researcher: {
    name: 'Research Agent',
    systemPrompt: 'You are a research specialist...',
    allowedTools: ['search', 'analyze'],
  },
  developer: {
    name: 'Development Agent',
    systemPrompt: 'You are a development specialist...',
    allowedTools: ['code', 'test', 'debug'],
  },
  designer: {
    name: 'Design Agent',
    systemPrompt: 'You are a design specialist...',
    allowedTools: ['design', 'prototype'],
  },
  analyst: {
    name: 'Analysis Agent',
    systemPrompt: 'You are an analysis specialist...',
    allowedTools: ['analyze', 'report'],
  },
  coordinator: {
    name: 'Coordination Agent',
    systemPrompt: 'You are a coordination specialist...',
    allowedTools: ['plan', 'coordinate'],
  },
}

export function createClaudeAgent(type: AgentType, id: string): ClaudeAgent {
  const baseConfig = AGENT_CONFIGS[type]
  if (!baseConfig) {
    throw new Error(`Unknown agent type: ${type}`)
  }

  return new ClaudeAgent({
    id,
    type,
    ...baseConfig,
  } as ClaudeAgentConfig)
}
