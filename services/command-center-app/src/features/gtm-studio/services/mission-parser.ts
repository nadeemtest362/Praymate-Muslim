import { Mission, AgentType } from '../types'

// This would normally parse the gtm.MD file, but for now we'll use hardcoded missions
export async function parseMissions(): Promise<Mission[]> {
  // In a real implementation, this would parse the gtm.MD file
  // For now, we'll return structured missions based on a typical GTM strategy

  const missions: Mission[] = [
    // Week 1 - Strategy & Planning
    {
      id: 'strategy-1',
      title: 'Define Target Market & Value Proposition',
      description:
        'Analyze market segments and create clear value proposition for Personal Prayers app',
      agentType: 'strategist',
      priority: 'high',
      week: 1,
      subtasks: [
        'Identify primary user personas',
        'Define unique value proposition',
        'Competitive analysis',
      ],
      status: 'pending',
    },
    {
      id: 'research-1',
      title: 'Market Research & User Interviews',
      description:
        'Conduct user research to validate assumptions about Christian prayer app users',
      agentType: 'researcher',
      priority: 'high',
      week: 1,
      subtasks: [
        'Survey potential users',
        'Analyze competitor apps',
        'Document user pain points',
      ],
      status: 'pending',
    },

    // Week 2 - Product Development
    {
      id: 'dev-1',
      title: 'Set Up Landing Page Infrastructure',
      description:
        'Create high-converting landing page with email capture and analytics',
      agentType: 'developer',
      priority: 'high',
      week: 2,
      subtasks: [
        'Next.js landing page setup',
        'Email capture integration',
        'Analytics implementation',
      ],
      status: 'pending',
    },
    {
      id: 'design-1',
      title: 'Design Landing Page & Brand Assets',
      description:
        'Create compelling visual design that resonates with Christian audience',
      agentType: 'designer',
      priority: 'high',
      week: 2,
      subtasks: [
        'Landing page mockups',
        'Brand style guide',
        'App store assets',
      ],
      status: 'pending',
    },

    // Week 3 - Content Creation
    {
      id: 'content-1',
      title: 'Create Launch Content Strategy',
      description:
        'Develop content plan for blog posts, social media, and email campaigns',
      agentType: 'content',
      priority: 'medium',
      week: 3,
      subtasks: [
        'Blog post calendar',
        'Social media templates',
        'Email sequences',
      ],
      status: 'pending',
    },
    {
      id: 'content-2',
      title: 'Write Core Marketing Copy',
      description:
        'Create compelling copy for landing page, app store, and ads',
      agentType: 'content',
      priority: 'high',
      week: 3,
      subtasks: ['Landing page copy', 'App store description', 'Ad variations'],
      status: 'pending',
    },

    // Week 4 - Pre-Launch
    {
      id: 'strategy-2',
      title: 'Define Launch Metrics & KPIs',
      description:
        'Set clear success metrics for app launch and growth targets',
      agentType: 'strategist',
      priority: 'medium',
      week: 4,
      subtasks: [
        'Define success metrics',
        'Set growth targets',
        'Create tracking dashboard',
      ],
      status: 'pending',
    },
    {
      id: 'dev-2',
      title: 'Implement A/B Testing Framework',
      description:
        'Set up infrastructure for testing different onboarding flows and features',
      agentType: 'developer',
      priority: 'medium',
      week: 4,
      subtasks: ['A/B testing setup', 'Feature flags', 'Analytics events'],
      status: 'pending',
    },

    // Week 5 - Launch
    {
      id: 'content-3',
      title: 'Execute Launch Campaign',
      description:
        'Coordinate multi-channel launch across social, email, and communities',
      agentType: 'content',
      priority: 'high',
      week: 5,
      subtasks: ['Social media posts', 'Email blast', 'Community outreach'],
      status: 'pending',
    },
    {
      id: 'researcher-2',
      title: 'Monitor Launch Metrics',
      description: 'Track and analyze user behavior during launch week',
      agentType: 'researcher',
      priority: 'high',
      week: 5,
      subtasks: [
        'User analytics',
        'Conversion tracking',
        'Feedback collection',
      ],
      status: 'pending',
    },

    // Week 6 - Optimization
    {
      id: 'design-2',
      title: 'Optimize Onboarding Flow',
      description: 'Improve user onboarding based on launch data and feedback',
      agentType: 'designer',
      priority: 'medium',
      week: 6,
      subtasks: [
        'Analyze drop-off points',
        'Design improvements',
        'Test variations',
      ],
      status: 'pending',
    },
    {
      id: 'dev-3',
      title: 'Implement Growth Features',
      description: 'Build referral system and social sharing features',
      agentType: 'developer',
      priority: 'medium',
      week: 6,
      subtasks: ['Referral system', 'Social sharing', 'Streak rewards'],
      status: 'pending',
    },
  ]

  return missions
}
