import { Brain, Code2, PenTool, Search, FileText } from 'lucide-react'
import { AgentType, AgentStatus, Mission, AgentThought } from '../types'
import { ClaudeAgent, createClaudeAgent } from './claude-agent-service'
import {
  ClaudeAgentDev,
  createClaudeAgentDev,
} from './claude-agent-service-dev'

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

export interface AgentUpdate {
  agentId: string
  type: 'status' | 'thought' | 'progress' | 'error' | 'complete'
  data: any
}

export interface DecisionRequest {
  id: string
  agentId: string
  agentType: AgentType
  question: string
  options?: string[]
  context: string
  timestamp: Date
}

export class ClaudeAgentManager extends EventEmitter {
  private agents: Map<string, ClaudeAgent | ClaudeAgentDev> = new Map()
  private agentStatuses: Map<string, AgentStatus> = new Map()
  private missionQueue: Mission[] = []
  private activeMissions: Map<string, Mission> = new Map()
  private decisionRequests: Map<string, DecisionRequest> = new Map()
  private isRunning: boolean = false
  private isDevelopmentMode: boolean = false

  constructor(options?: { developmentMode?: boolean }) {
    super()
    this.isDevelopmentMode = options?.developmentMode ?? true // Default to dev mode for now
    this.initializeAgents()
  }

  private initializeAgents(): void {
    const agentConfigs: Array<{
      id: string
      type: AgentType
      name: string
      icon: any
      color: string
      bgColor: string
      borderColor: string
    }> = [
      {
        id: 'strategist',
        type: 'strategist',
        name: 'Strategic Planner',
        icon: Brain,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
      },
      {
        id: 'developer',
        type: 'developer',
        name: 'Code Architect',
        icon: Code2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
      },
      {
        id: 'designer',
        type: 'designer',
        name: 'UX Designer',
        icon: PenTool,
        color: 'text-pink-500',
        bgColor: 'bg-pink-500/10',
        borderColor: 'border-pink-500/20',
      },
      {
        id: 'researcher',
        type: 'researcher',
        name: 'Market Researcher',
        icon: Search,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
      },
      {
        id: 'content',
        type: 'content',
        name: 'Content Creator',
        icon: FileText,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
      },
    ]

    for (const config of agentConfigs) {
      // Create the Claude agent (dev or real based on mode)
      const agent = this.isDevelopmentMode
        ? createClaudeAgentDev(config.type, config.id)
        : createClaudeAgent(config.type, config.id)
      this.agents.set(config.id, agent)

      // Create the status object
      const status: AgentStatus = {
        id: config.id,
        name: config.name,
        type: config.type,
        status: 'idle',
        icon: config.icon,
        color: config.color,
        bgColor: config.bgColor,
        borderColor: config.borderColor,
        currentMission: null,
        thoughts: [],
        completedMissions: 0,
        progress: 0,
      }
      this.agentStatuses.set(config.id, status)

      // Set up agent event handlers
      this.setupAgentHandlers(agent, config.id)
    }
  }

  private setupAgentHandlers(
    agent: ClaudeAgent | ClaudeAgentDev,
    agentId: string
  ): void {
    agent.on('thought', (thought: AgentThought) => {
      const status = this.agentStatuses.get(agentId)
      if (status) {
        // Keep only the last 5 thoughts
        status.thoughts = [...status.thoughts.slice(-4), thought]
        this.emit('agentUpdate', {
          agentId,
          type: 'thought',
          data: thought,
        })
      }
    })

    agent.on('tool_use', (toolUse: any) => {
      // Check if this is a decision point
      if (toolUse.name === 'ask_human' || this.isDecisionPoint(toolUse)) {
        const request: DecisionRequest = {
          id: Date.now().toString(),
          agentId,
          agentType: this.agentStatuses.get(agentId)?.type || 'developer',
          question: toolUse.input.question || 'Decision needed',
          options: toolUse.input.options,
          context: toolUse.input.context || '',
          timestamp: new Date(),
        }
        this.decisionRequests.set(request.id, request)
        this.emit('decisionRequired', request)
      }
    })

    agent.on('complete', (result: any) => {
      const status = this.agentStatuses.get(agentId)
      if (status && status.currentMission) {
        status.status = 'idle'
        status.completedMissions++
        status.progress = 100

        // Move mission to completed
        this.activeMissions.delete(agentId)
        this.emit('missionComplete', {
          agentId,
          mission: status.currentMission,
          result,
        })

        // Reset agent state
        status.currentMission = null
        status.progress = 0

        // Try to assign next mission
        this.assignNextMission(agentId)
      }
    })

    agent.on('error', (error: any) => {
      const status = this.agentStatuses.get(agentId)
      if (status) {
        status.status = 'blocked'
        const errorThought: AgentThought = {
          id: Date.now().toString(),
          content: `Error: ${error}`,
          timestamp: new Date(),
          type: 'error',
        }
        status.thoughts = [...status.thoughts.slice(-4), errorThought]
        this.emit('agentUpdate', {
          agentId,
          type: 'error',
          data: error,
        })
      }
    })

    agent.on('usage', (usage: any) => {
      this.emit('agentUpdate', {
        agentId,
        type: 'usage',
        data: usage,
      })
    })
  }

  async start(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    this.emit('started')

    // Start processing missions
    this.processMissionQueue()
  }

  async stop(): Promise<void> {
    this.isRunning = false

    // Stop all active agents
    for (const [agentId, agent] of this.agents) {
      await agent.stop()
      const status = this.agentStatuses.get(agentId)
      if (status) {
        status.status = 'idle'
        status.currentMission = null
        status.progress = 0
      }
    }

    this.emit('stopped')
  }

  async reset(): Promise<void> {
    await this.stop()

    // Reset all agent statuses
    for (const status of this.agentStatuses.values()) {
      status.status = 'idle'
      status.currentMission = null
      status.thoughts = []
      status.completedMissions = 0
      status.progress = 0
    }

    // Clear missions
    this.activeMissions.clear()
    this.decisionRequests.clear()

    this.emit('reset')
  }

  addMissions(missions: Mission[]): void {
    this.missionQueue.push(...missions)
    if (this.isRunning) {
      this.processMissionQueue()
    }
  }

  private async processMissionQueue(): Promise<void> {
    if (!this.isRunning) return

    // Find idle agents and assign missions
    for (const [agentId, status] of this.agentStatuses) {
      if (status.status === 'idle' && !status.currentMission) {
        this.assignNextMission(agentId)
      }
    }
  }

  private async assignNextMission(agentId: string): Promise<void> {
    const status = this.agentStatuses.get(agentId)
    if (!status || status.status !== 'idle') return

    // Find next mission for this agent type
    const missionIndex = this.missionQueue.findIndex(
      (m) => m.agentType === status.type
    )
    if (missionIndex === -1) return

    const mission = this.missionQueue.splice(missionIndex, 1)[0]
    const agent = this.agents.get(agentId)

    if (!agent) return

    try {
      // Update status
      status.status = 'working'
      status.currentMission = mission
      status.progress = 0

      // Start the agent on this mission
      await agent.start(mission)
      this.activeMissions.set(agentId, mission)

      this.emit('missionStarted', {
        agentId,
        mission,
      })

      // Simulate progress updates
      this.simulateProgress(agentId)
    } catch (error) {
      console.error(`Failed to start agent ${agentId}:`, error)
      status.status = 'blocked'
      // Return mission to queue
      this.missionQueue.unshift(mission)
    }
  }

  private simulateProgress(agentId: string): void {
    const interval = setInterval(() => {
      const status = this.agentStatuses.get(agentId)
      if (!status || status.status !== 'working') {
        clearInterval(interval)
        return
      }

      // Update progress (this would normally come from actual task completion)
      status.progress = Math.min(status.progress + Math.random() * 10, 95)

      this.emit('agentUpdate', {
        agentId,
        type: 'progress',
        data: status.progress,
      })
    }, 2000)
  }

  private isDecisionPoint(toolUse: any): boolean {
    // Detect decision points based on tool usage patterns
    const decisionIndicators = [
      'choose',
      'select',
      'decide',
      'option',
      'preference',
      'should',
      'which',
      'recommend',
      'best',
    ]

    const inputStr = JSON.stringify(toolUse.input).toLowerCase()
    return decisionIndicators.some((indicator) => inputStr.includes(indicator))
  }

  async respondToDecision(decisionId: string, response: string): Promise<void> {
    const decision = this.decisionRequests.get(decisionId)
    if (!decision) return

    const agent = this.agents.get(decision.agentId)
    if (agent) {
      await agent.sendMessage(
        `Based on the decision point, the chosen option is: ${response}`
      )
      this.decisionRequests.delete(decisionId)
      this.emit('decisionResolved', { decisionId, response })
    }
  }

  getAgentStatuses(): AgentStatus[] {
    return Array.from(this.agentStatuses.values())
  }

  getMissionQueue(): Mission[] {
    return this.missionQueue
  }

  getCompletedMissions(): Mission[] {
    // This would be tracked separately in a real implementation
    return []
  }

  getDecisionRequests(): DecisionRequest[] {
    return Array.from(this.decisionRequests.values())
  }
}
