import { createFileRoute } from '@tanstack/react-router'
import OnboardingBuilder from '@/features/onboarding-builder'

export const Route = createFileRoute('/_authenticated/onboarding-builder/')({
  component: OnboardingBuilder,
})
