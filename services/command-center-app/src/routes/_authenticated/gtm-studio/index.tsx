import { createFileRoute } from '@tanstack/react-router'
import GTMStudio from '@/features/gtm-studio'

export const Route = createFileRoute('/_authenticated/gtm-studio/')({
  component: GTMStudio,
})
