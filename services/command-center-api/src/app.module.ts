import { Module } from '@nestjs/common';
import { ClaudeAgentsModule } from './claude-agents/claude-agents.module';

@Module({
  imports: [ClaudeAgentsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}