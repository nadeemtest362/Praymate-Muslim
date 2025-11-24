import { Module } from '@nestjs/common';
import { ClaudeAgentsController } from './claude-agents.controller';
import { ClaudeAgentsGateway } from './claude-agents.gateway';
import { ClaudeAgentsService } from './claude-agents.service';

@Module({
  controllers: [ClaudeAgentsController],
  providers: [ClaudeAgentsGateway, ClaudeAgentsService],
})
export class ClaudeAgentsModule {}