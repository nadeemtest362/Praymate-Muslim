import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { AgentSession, AgentThought, DecisionPoint } from './interfaces/agent-session.interface';
import { ClaudeAgentsGateway } from './claude-agents.gateway';

@Injectable()
export class ClaudeAgentsService {
  private readonly logger = new Logger(ClaudeAgentsService.name);
  private sessions = new Map<string, AgentSession>();
  private decisionPoints = new Map<string, DecisionPoint>();
  private anthropic: Anthropic | null = null;

  constructor(private readonly gateway: ClaudeAgentsGateway) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.error('ANTHROPIC_API_KEY not found in environment');
      this.logger.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC')));
    } else {
      this.logger.log(`Initializing Anthropic SDK with API key: ${apiKey.substring(0, 10)}...`);
      try {
        this.anthropic = new Anthropic({ apiKey });
        this.logger.log('Anthropic SDK initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Anthropic SDK:', error);
      }
    }
  }

  async startMission(mission: string, context?: Record<string, any>): Promise<AgentSession> {
    const sessionId = uuidv4();
    const session: AgentSession = {
      id: sessionId,
      mission,
      status: 'running',
      startedAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    
    // Start async processing with Anthropic SDK
    this.processWithAnthropic(sessionId, mission, context);

    // Emit session started event
    this.gateway.emitSessionStarted(sessionId, mission);

    return session;
  }

  private async processWithAnthropic(sessionId: string, mission: string, context?: Record<string, any>) {
    if (!this.anthropic) {
      const error = 'Anthropic SDK not initialized - missing API key';
      this.logger.error(error);
      this.gateway.emitSessionError(sessionId, error);
      this.completeSession(sessionId, error);
      return;
    }

    try {
      this.logger.log(`Processing mission for session ${sessionId}`);
      
      // Emit initial thinking status
      const initThought: AgentThought = {
        sessionId,
        timestamp: new Date(),
        type: 'thought',
        content: 'Claude agent initialized and processing request...'
      };
      this.gateway.emitThought(initThought);

      // Call Anthropic API
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ 
          role: 'user', 
          content: mission 
        }],
        metadata: {
          user_id: sessionId
        }
      });

      // Extract text content
      const content = message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      // Emit result
      const resultThought: AgentThought = {
        sessionId,
        timestamp: new Date(),
        type: 'result',
        content,
        metadata: { 
          messageId: message.id,
          model: message.model,
          usage: message.usage
        }
      };
      this.gateway.emitThought(resultThought);
      
      // Store result in session
      const session = this.sessions.get(sessionId);
      if (session) {
        session.result = content;
      }
      
      // Log completion with cost estimate
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      const costEstimate = (inputTokens * 0.003 + outputTokens * 0.015) / 1000; // Claude 3.5 Sonnet pricing
      
      this.logger.log(`Session ${sessionId} completed. Tokens: ${inputTokens}+${outputTokens}, Est. cost: $${costEstimate.toFixed(4)}`);
      
      this.completeSession(sessionId);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Anthropic API error: ${errorMessage}`);
      this.logger.error('Full error:', error);
      
      const errorThought: AgentThought = {
        sessionId,
        timestamp: new Date(),
        type: 'error',
        content: `Failed to process request: ${errorMessage}`
      };
      this.gateway.emitThought(errorThought);
      
      this.gateway.emitSessionError(sessionId, errorMessage);
      this.completeSession(sessionId, errorMessage);
    }
  }

  private completeSession(sessionId: string, error?: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = error ? 'error' : 'completed';
      session.completedAt = new Date();
      if (error) {
        session.error = error;
      }
      this.gateway.emitSessionCompleted(sessionId);
    }
  }

  async respondToDecision(sessionId: string, decisionId: string, choice: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    const decisionPoint = this.decisionPoints.get(decisionId);

    if (!session || !decisionPoint) {
      throw new Error('Session or decision point not found');
    }

    this.logger.log(`Decision made for ${decisionId}: ${choice}`);
    
    // Emit the decision response
    const thought: AgentThought = {
      sessionId,
      timestamp: new Date(),
      type: 'thought',
      content: `User chose: ${choice}. Proceeding with this approach...`,
    };
    this.gateway.emitThought(thought);

    // Remove the decision point
    this.decisionPoints.delete(decisionId);
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.completedAt = new Date();
      this.gateway.emitSessionCompleted(sessionId);
    }
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }
}