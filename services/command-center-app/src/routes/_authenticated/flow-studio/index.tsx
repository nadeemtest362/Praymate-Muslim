import { createFileRoute } from '@tanstack/react-router'
import FlowStudioV4 from '@/features/flow-studio/flow-studio-v4'

export const Route = createFileRoute('/_authenticated/flow-studio/')({
  component: FlowStudioV4,
})
