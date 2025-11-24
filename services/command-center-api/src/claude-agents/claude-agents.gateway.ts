import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AgentThought, DecisionPoint } from './interfaces/agent-session.interface';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'https://command-center.up.railway.app',
      'https://*.up.railway.app'
    ],
    credentials: true,
  },
})
export class ClaudeAgentsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ClaudeAgentsGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-session')
  handleJoinSession(
    @MessageBody() data: { sessionId: string },
    client: Socket,
  ) {
    client.join(`session-${data.sessionId}`);
    this.logger.log(`Client ${client.id} joined session ${data.sessionId}`);
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(
    @MessageBody() data: { sessionId: string },
    client: Socket,
  ) {
    client.leave(`session-${data.sessionId}`);
    this.logger.log(`Client ${client.id} left session ${data.sessionId}`);
  }

  emitThought(thought: AgentThought) {
    this.server.to(`session-${thought.sessionId}`).emit('agent-thought', thought);
  }

  emitDecisionPoint(decisionPoint: DecisionPoint) {
    this.server.to(`session-${decisionPoint.sessionId}`).emit('decision-point', decisionPoint);
  }

  emitSessionStarted(sessionId: string, mission: string) {
    this.server.to(`session-${sessionId}`).emit('session-started', {
      sessionId,
      mission,
      timestamp: new Date(),
    });
  }

  emitSessionCompleted(sessionId: string) {
    this.server.to(`session-${sessionId}`).emit('session-completed', {
      sessionId,
      timestamp: new Date(),
    });
  }

  emitSessionError(sessionId: string, error: string) {
    this.server.to(`session-${sessionId}`).emit('session-error', {
      sessionId,
      error,
      timestamp: new Date(),
    });
  }
}