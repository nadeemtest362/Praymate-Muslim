import { createFileRoute } from '@tanstack/react-router'
import ClaudeAgentsPage from '@/features/claude-agents'

export const Route = createFileRoute('/_authenticated/claude-agents/')({
  component: ClaudeAgentsPage,
})
