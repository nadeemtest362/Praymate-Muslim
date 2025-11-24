import { io, Socket } from 'socket.io-client'

export interface AgentThought {
  sessionId: string
  timestamp: Date
  type: 'thought' | 'action' | 'result' | 'error' | 'decision_point'
  content: string
  metadata?: any
}

export interface DecisionPoint {
  sessionId: string
  id: string
  question: string
  options: string[]
  timestamp: Date
}

export interface AgentSession {
  id: string
  mission: string
  status: 'idle' | 'running' | 'completed' | 'error'
  startedAt: Date
  completedAt?: Date
  error?: string
}

class ClaudeAgentService {
  private socket: Socket | null = null
  private apiUrl: string

  constructor() {
    this.apiUrl =
      import.meta.env.VITE_COMMAND_CENTER_API_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:3001'
  }

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.apiUrl, {
        transports: ['websocket'],
        reconnection: true,
      })

      this.socket.on('connect', () => {
        console.log('Connected to Claude Agent service')
      })

      this.socket.on('disconnect', () => {
        console.log('Disconnected from Claude Agent service')
      })
    }

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('join-session', { sessionId })
    }
  }

  leaveSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('leave-session', { sessionId })
    }
  }

  async startMission(
    mission: string,
    context?: Record<string, any>
  ): Promise<{ sessionId: string }> {
    const response = await fetch(`${this.apiUrl}/claude-agents/missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mission, context }),
    })

    if (!response.ok) {
      throw new Error('Failed to start mission')
    }

    return response.json()
  }

  async respondToDecision(
    sessionId: string,
    decisionId: string,
    choice: string
  ): Promise<void> {
    const response = await fetch(`${this.apiUrl}/claude-agents/decisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, decisionId, choice }),
    })

    if (!response.ok) {
      throw new Error('Failed to respond to decision')
    }
  }

  async getSession(sessionId: string): Promise<AgentSession> {
    const response = await fetch(
      `${this.apiUrl}/claude-agents/sessions/${sessionId}`
    )

    if (!response.ok) {
      throw new Error('Failed to get session')
    }

    return response.json()
  }

  async getAllSessions(): Promise<AgentSession[]> {
    const response = await fetch(`${this.apiUrl}/claude-agents/sessions`)

    if (!response.ok) {
      throw new Error('Failed to get sessions')
    }

    return response.json()
  }

  async stopSession(sessionId: string): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/claude-agents/sessions/${sessionId}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      throw new Error('Failed to stop session')
    }
  }

  onThought(callback: (thought: AgentThought) => void) {
    if (this.socket) {
      this.socket.on('agent-thought', callback)
    }
  }

  onDecisionPoint(callback: (decision: DecisionPoint) => void) {
    if (this.socket) {
      this.socket.on('decision-point', callback)
    }
  }

  onSessionStarted(
    callback: (data: { sessionId: string; mission: string }) => void
  ) {
    if (this.socket) {
      this.socket.on('session-started', callback)
    }
  }

  onSessionCompleted(callback: (data: { sessionId: string }) => void) {
    if (this.socket) {
      this.socket.on('session-completed', callback)
    }
  }

  onSessionError(
    callback: (data: { sessionId: string; error: string }) => void
  ) {
    if (this.socket) {
      this.socket.on('session-error', callback)
    }
  }
}

export const claudeAgentService = new ClaudeAgentService()
