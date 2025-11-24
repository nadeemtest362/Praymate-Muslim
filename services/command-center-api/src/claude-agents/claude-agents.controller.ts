import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClaudeAgentsService } from './claude-agents.service';
import { StartMissionDto } from './dto/start-mission.dto';
import { DecisionResponseDto } from './dto/decision-response.dto';

@Controller('claude-agents')
export class ClaudeAgentsController {
  constructor(private readonly claudeAgentsService: ClaudeAgentsService) {}

  @Post('missions')
  async startMission(@Body() startMissionDto: StartMissionDto) {
    try {
      const session = await this.claudeAgentsService.startMission(
        startMissionDto.mission,
        startMissionDto.context,
      );
      return {
        sessionId: session.id,
        status: session.status,
        startedAt: session.startedAt,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to start mission',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('decisions')
  async respondToDecision(@Body() decisionResponseDto: DecisionResponseDto) {
    try {
      await this.claudeAgentsService.respondToDecision(
        decisionResponseDto.sessionId,
        decisionResponseDto.decisionId,
        decisionResponseDto.choice,
      );
      return { success: true };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to respond to decision',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const session = this.claudeAgentsService.getSession(sessionId);
    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
    return {
      id: session.id,
      mission: session.mission,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      error: session.error,
    };
  }

  @Get('sessions')
  async getAllSessions() {
    const sessions = this.claudeAgentsService.getAllSessions();
    return sessions.map(session => ({
      id: session.id,
      mission: session.mission,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    }));
  }

  @Delete('sessions/:sessionId')
  async stopSession(@Param('sessionId') sessionId: string) {
    try {
      await this.claudeAgentsService.stopSession(sessionId);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        'Failed to stop session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}