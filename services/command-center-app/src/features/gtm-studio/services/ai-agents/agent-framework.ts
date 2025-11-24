import Anthropic from '@anthropic-ai/sdk'
import { Stream } from '@anthropic-ai/sdk/streaming'

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface AgentContext {
  messages: AgentMessage[]
  systemPrompt: string
  temperature?: number
  maxTokens?: number
}

export abstract class BaseAgent {
  protected anthropic: Anthropic
  protected context: AgentContext
  protected agentType: string

  constructor(agentType: string, systemPrompt: string) {
    this.agentType = agentType
    this.anthropic = new Anthropic({
      apiKey: process.env.VITE_ANTHROPIC_API_KEY || '',
    })
    this.context = {
      messages: [],
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1500,
    }
  }

  async think(input: string): Promise<string> {
    try {
      // Add user message to context
      this.context.messages.push({
        role: 'user',
        content: input,
        timestamp: new Date(),
      })

      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: this.context.maxTokens || 1500,
        temperature: this.context.temperature || 0.7,
        system: this.context.systemPrompt,
        messages: this.context.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      })

      const assistantMessage =
        response.content[0].type === 'text' ? response.content[0].text : ''

      // Add assistant response to context
      this.context.messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date(),
      })

      return assistantMessage
    } catch (error) {
      console.error(`${this.agentType} agent error:`, error)
      throw new Error(`Failed to get response from ${this.agentType} agent`)
    }
  }

  async thinkStream(
    input: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      // Add user message to context
      this.context.messages.push({
        role: 'user',
        content: input,
        timestamp: new Date(),
      })

      const stream = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: this.context.maxTokens || 1500,
        temperature: this.context.temperature || 0.7,
        system: this.context.systemPrompt,
        messages: this.context.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      })

      let fullResponse = ''

      for await (const messageStreamEvent of stream) {
        if (
          messageStreamEvent.type === 'content_block_delta' &&
          messageStreamEvent.delta.type === 'text_delta'
        ) {
          const chunk = messageStreamEvent.delta.text
          fullResponse += chunk
          onChunk(chunk)
        }
      }

      // Add complete assistant response to context
      this.context.messages.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      })
    } catch (error) {
      console.error(`${this.agentType} agent stream error:`, error)
      throw new Error(`Failed to stream response from ${this.agentType} agent`)
    }
  }

  clearContext() {
    this.context.messages = []
  }

  getContext(): AgentMessage[] {
    return [...this.context.messages]
  }

  setTemperature(temperature: number) {
    this.context.temperature = Math.max(0, Math.min(1, temperature))
  }

  setMaxTokens(maxTokens: number) {
    this.context.maxTokens = Math.max(1, Math.min(4096, maxTokens))
  }
}
