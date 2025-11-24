import Anthropic from '@anthropic-ai/sdk'
import { AgentType, AgentThought, Mission } from '../types'

// Agent-specific system prompts
const AGENT_SYSTEM_PROMPTS: Record<AgentType, string> = {
  strategist: `You are a Strategic Planner AI agent specialized in go-to-market strategy for a Christian prayer app.
Your role is to analyze market opportunities, define positioning, identify target audiences, and create strategic plans.
You think deeply about user needs, competitive differentiation, and growth strategies.
When given a mission, break it down into actionable insights and strategic recommendations.
Be specific, data-driven when possible, and always consider the unique aspects of faith-based applications.`,

  developer: `You are a Code Architect AI agent specialized in building modern web applications.
Your expertise includes React, TypeScript, Next.js, Supabase, and modern deployment practices.
When given a development mission, think through the technical architecture, implementation steps, and best practices.
Consider performance, scalability, security, and user experience in your solutions.
Be practical and implementation-focused in your responses.`,

  designer: `You are a UX Designer AI agent focused on creating beautiful, intuitive interfaces for spiritual applications.
Your expertise includes user research, wireframing, visual design, and creating calming, purposeful experiences.
When given a design mission, consider accessibility, emotional design, and the unique needs of users seeking spiritual connection.
Think about color psychology, typography for readability during prayer, and creating a sense of peace through design.`,

  researcher: `You are a Market Researcher AI agent specialized in understanding user behavior and market dynamics.
Your role is to gather insights, analyze competitors, conduct user research, and identify opportunities.
When given a research mission, be thorough in your analysis, look for patterns, and provide actionable insights.
Consider both quantitative and qualitative research methods, and always tie findings back to business objectives.`,

  content: `You are a Content Creator AI agent specialized in faith-based marketing and communication.
Your expertise includes copywriting, content strategy, social media, and community engagement.
When given a content mission, create compelling, authentic messages that resonate with the Christian community.
Balance reverence with accessibility, and always maintain a tone that reflects the app's spiritual purpose.`,
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentStreamUpdate {
  type: 'thought' | 'completion' | 'error'
  content: string
  thoughtType?: 'progress' | 'decision' | 'error'
}

export class AnthropicAgent {
  private client: Anthropic
  private agentType: AgentType
  private conversationHistory: AgentMessage[] = []
  private systemPrompt: string

  constructor(agentType: AgentType, apiKey: string) {
    this.client = new Anthropic({ apiKey })
    this.agentType = agentType
    this.systemPrompt = AGENT_SYSTEM_PROMPTS[agentType]
  }

  async executeMission(
    mission: Mission,
    onUpdate: (update: AgentStreamUpdate) => void
  ): Promise<void> {
    try {
      const missionPrompt = this.createMissionPrompt(mission)

      // Add mission to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: missionPrompt,
      })

      // Create the stream
      const stream = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: this.systemPrompt,
        messages: this.conversationHistory,
        stream: true,
      })

      let fullResponse = ''
      let currentThought = ''
      let isInThought = false

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          const text = chunk.delta.text
          fullResponse += text

          // Parse thoughts marked with specific patterns
          for (const char of text) {
            if (
              char === '🤔' ||
              char === '💡' ||
              char === '⚠️' ||
              char === '📐' ||
              char === '✍️'
            ) {
              if (currentThought) {
                onUpdate({
                  type: 'thought',
                  content: currentThought.trim(),
                  thoughtType: this.getThoughtType(currentThought),
                })
              }
              isInThought = true
              currentThought = char
            } else if (isInThought && (char === '\n' || char === '.')) {
              onUpdate({
                type: 'thought',
                content: currentThought.trim(),
                thoughtType: this.getThoughtType(currentThought),
              })
              isInThought = false
              currentThought = ''
            } else if (isInThought) {
              currentThought += char
            } else {
              // Stream regular content
              if (char !== '\n' || fullResponse.length > 1) {
                onUpdate({
                  type: 'thought',
                  content: char,
                  thoughtType: 'progress',
                })
              }
            }
          }
        }
      }

      // Handle any remaining thought
      if (currentThought) {
        onUpdate({
          type: 'thought',
          content: currentThought.trim(),
          thoughtType: this.getThoughtType(currentThought),
        })
      }

      // Add response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      })

      onUpdate({
        type: 'completion',
        content: fullResponse,
      })
    } catch (error) {
      console.error('Agent execution error:', error)
      onUpdate({
        type: 'error',
        content:
          error instanceof Error ? error.message : 'Unknown error occurred',
      })
    }
  }

  private createMissionPrompt(mission: Mission): string {
    let prompt = `Mission: ${mission.title}\n\n`
    prompt += `Description: ${mission.description}\n\n`

    if (mission.subtasks && mission.subtasks.length > 0) {
      prompt += `Subtasks to complete:\n`
      mission.subtasks.forEach((task, index) => {
        prompt += `${index + 1}. ${task}\n`
      })
      prompt += '\n'
    }

    prompt += `Priority: ${mission.priority}\n`
    prompt += `Timeline: Week ${mission.week}\n\n`

    prompt += `Please work through this mission step by step. Share your thoughts using these markers:
- 🤔 for decisions or considerations
- 💡 for insights or discoveries  
- ⚠️ for risks or blockers
- 📐 for design decisions
- ✍️ for content choices

Provide specific, actionable output for this mission.`

    return prompt
  }

  private getThoughtType(thought: string): 'progress' | 'decision' | 'error' {
    if (thought.includes('⚠️')) return 'error'
    if (
      thought.includes('🤔') ||
      thought.includes('📐') ||
      thought.includes('✍️')
    )
      return 'decision'
    return 'progress'
  }

  reset(): void {
    this.conversationHistory = []
  }

  getConversationHistory(): AgentMessage[] {
    return [...this.conversationHistory]
  }
}

// Agent Manager to handle multiple agents
export class AgentManager {
  private agents: Map<AgentType, AnthropicAgent> = new Map()
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  getAgent(type: AgentType): AnthropicAgent {
    if (!this.agents.has(type)) {
      this.agents.set(type, new AnthropicAgent(type, this.apiKey))
    }
    return this.agents.get(type)!
  }

  resetAgent(type: AgentType): void {
    const agent = this.getAgent(type)
    agent.reset()
  }

  resetAllAgents(): void {
    this.agents.forEach((agent) => agent.reset())
  }
}

// Singleton instance
let agentManagerInstance: AgentManager | null = null

export function getAgentManager(): AgentManager {
  if (!agentManagerInstance) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('VITE_ANTHROPIC_API_KEY environment variable is not set')
    }
    agentManagerInstance = new AgentManager(apiKey)
  }
  return agentManagerInstance
}
