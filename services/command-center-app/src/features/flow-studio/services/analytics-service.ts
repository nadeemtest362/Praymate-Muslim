import { supabase } from '@/lib/supabaseClient'

interface FlowAnalytics {
  flowId: string
  flowName: string
  flowVersion: string
  totalStarts: number
  completions: number
  stepMetrics: StepMetric[]
  periodComparison: {
    completionRateChange: number
    avgTimeChange: number
    startsChange: number
  }
}

interface StepMetric {
  stepId: string
  stepOrder: number
  screenType: string
  views: number
  completions: number
  dropOffs: number
  avgTimeSeconds: number
  errorCount: number
}

export class AnalyticsService {
  static async getFlowAnalytics(
    flowId: string,
    days: number = 30
  ): Promise<FlowAnalytics | null> {
    try {
      // Check current user first
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      console.log(
        'Current authenticated user:',
        currentUser?.id,
        currentUser?.email
      )

      // Get flow details
      const { data: flow, error: flowError } = await supabase
        .from('onboarding_flows')
        .select('id, name, version')
        .eq('id', flowId)
        .single()

      if (flowError || !flow) {
        console.error('Failed to fetch flow:', flowError)
        return null
      }

      console.log('Flow:', flow)

      // Get flow steps
      const { data: steps, error: stepsError } = await supabase
        .from('onboarding_flow_steps')
        .select('id, step_order, screen_type, config')
        .eq('flow_id', flowId)
        .order('step_order')

      if (stepsError || !steps) {
        console.error('Failed to fetch steps:', stepsError)
        return null
      }

      console.log('Steps:', steps)

      // Get analytics events for this flow
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: events, error: eventsError } = await supabase
        .from('onboarding_analytics_events')
        .select('*')
        .eq('flow_id', flowId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (eventsError) {
        console.error('Failed to fetch events:', eventsError)
        console.error(
          'Events error details:',
          eventsError.message,
          eventsError.details,
          eventsError.hint
        )
        return null
      }

      console.log('Total events fetched:', events?.length || 0)
      console.log('Sample events:', events?.slice(0, 5))

      // Process analytics data
      const stepMetrics = steps.map((step) => {
        const stepEvents = events?.filter((e) => e.step_id === step.id) || []

        console.log(`Events for step ${step.screen_type}:`, stepEvents.length)

        // Count different event types based on actual event names
        const views = stepEvents.filter(
          (e) =>
            e.event_name?.includes('screen_viewed') ||
            e.event_name?.includes('_viewed')
        ).length

        const completions = stepEvents.filter(
          (e) =>
            e.event_name?.includes('_navigated_away_next') ||
            e.event_name?.includes('_completed')
        ).length

        const errors = stepEvents.filter(
          (e) =>
            e.event_name?.includes('_error') ||
            e.event_name?.includes('_failed')
        ).length

        console.log(
          `${step.screen_type} - Views: ${views}, Completions: ${completions}`
        )

        // Calculate average time (for now just estimate based on views)
        const avgTime = 10 // Default 10 seconds per step

        return {
          stepId: step.id,
          stepOrder: step.step_order,
          screenType: step.screen_type,
          views,
          completions,
          dropOffs: views - completions,
          avgTimeSeconds: avgTime,
          errorCount: errors,
        }
      })

      // Calculate overall metrics
      const flowStarts =
        events?.filter((e) => e.event_name === 'flow_started').length || 0
      const flowCompletions =
        events?.filter(
          (e) =>
            e.event_name === 'flow_completed_all_steps' ||
            e.event_name === 'onboarding_marked_complete'
        ).length || 0

      console.log(
        `Flow starts: ${flowStarts}, Flow completions: ${flowCompletions}`
      )

      // Get comparison period (previous period of same length)
      const comparisonStartDate = new Date(startDate)
      comparisonStartDate.setDate(comparisonStartDate.getDate() - days)

      const { data: comparisonEvents } = await supabase
        .from('onboarding_analytics_events')
        .select('event_name, event_data')
        .eq('flow_id', flowId)
        .gte('created_at', comparisonStartDate.toISOString())
        .lt('created_at', startDate.toISOString())

      // Calculate period comparison
      const prevStarts =
        comparisonEvents?.filter((e) => e.event_name === 'flow_started')
          .length || 0
      const prevCompletions =
        comparisonEvents?.filter(
          (e) =>
            e.event_name === 'flow_completed_all_steps' ||
            e.event_name === 'onboarding_marked_complete'
        ).length || 0

      const currentCompletionRate =
        flowStarts > 0 ? (flowCompletions / flowStarts) * 100 : 0
      const prevCompletionRate =
        prevStarts > 0 ? (prevCompletions / prevStarts) * 100 : 0

      return {
        flowId: flow.id,
        flowName: flow.name,
        flowVersion: flow.version,
        totalStarts: flowStarts,
        completions: flowCompletions,
        stepMetrics,
        periodComparison: {
          completionRateChange: currentCompletionRate - prevCompletionRate,
          avgTimeChange: 0, // Would need more detailed time tracking
          startsChange:
            prevStarts > 0 ? ((flowStarts - prevStarts) / prevStarts) * 100 : 0,
        },
      }
    } catch (error) {
      console.error('Failed to get flow analytics:', error)
      return null
    }
  }

  static async getLiveSessions(flowId: string): Promise<any[]> {
    try {
      // Get recent events to find active users
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      // Get unique users who have recent events
      const { data: recentEvents } = await supabase
        .from('onboarding_analytics_events')
        .select('user_id, event_name, created_at, step_id')
        .eq('flow_id', flowId)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false })

      if (!recentEvents || recentEvents.length === 0) return []

      // Group events by user to find their latest activity
      const userLatestEvents = new Map<string, any>()
      const userStartTimes = new Map<string, Date>()

      recentEvents.forEach((event) => {
        // Track flow start times
        if (event.event_name === 'flow_started') {
          userStartTimes.set(event.user_id, new Date(event.created_at))
        }

        // Track latest event for each user
        if (
          !userLatestEvents.has(event.user_id) ||
          new Date(event.created_at) >
            new Date(userLatestEvents.get(event.user_id).created_at)
        ) {
          userLatestEvents.set(event.user_id, event)
        }
      })

      // Get flow steps to map step IDs to screen types
      const { data: steps } = await supabase
        .from('onboarding_flow_steps')
        .select('id, step_order, screen_type')
        .eq('flow_id', flowId)
        .order('step_order')

      // Get user profiles to check completion status
      const uniqueUserIds = Array.from(userLatestEvents.keys())
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, has_completed_onboarding, display_name')
        .in('id', uniqueUserIds)

      // Build active sessions list
      const activeSessions: any[] = []

      userLatestEvents.forEach((latestEvent, userId) => {
        const profile = profiles?.find((p) => p.id === userId)

        // Only include users who haven't completed onboarding
        if (profile && !profile.has_completed_onboarding) {
          const currentStep = steps?.find((s) => s.id === latestEvent.step_id)

          activeSessions.push({
            userId: profile.display_name || userId.substring(0, 8),
            currentStep: currentStep?.screen_type || 'Unknown',
            currentStepOrder: currentStep?.step_order || 0,
            lastActivity: new Date(latestEvent.created_at),
            startTime:
              userStartTimes.get(userId) || new Date(latestEvent.created_at),
            progress:
              steps && currentStep
                ? (currentStep.step_order / steps.length) * 100
                : 0,
          })
        }
      })

      return activeSessions.sort(
        (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
      )
    } catch (error) {
      console.error('Failed to get live sessions:', error)
      return []
    }
  }

  static async getBusinessMetrics(
    flowId: string,
    days: number = 30
  ): Promise<any> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get paywall events
      const { data: paywallEvents } = await supabase
        .from('onboarding_analytics_events')
        .select('event_name, event_data')
        .eq('flow_id', flowId)
        .in('event_name', [
          'paywall_viewed',
          'paywall_converted',
          'paywall_skipped',
        ])
        .gte('created_at', startDate.toISOString())

      const paywallViews =
        paywallEvents?.filter((e) => e.event_name === 'paywall_viewed')
          .length || 0
      const paywallConversions =
        paywallEvents?.filter((e) => e.event_name === 'paywall_converted')
          .length || 0
      const paywallSkips =
        paywallEvents?.filter((e) => e.event_name === 'paywall_skipped')
          .length || 0

      // Calculate revenue (would need integration with payment data)
      const avgSubscriptionPrice = 9.99 // Default assumption
      const estimatedRevenue = paywallConversions * avgSubscriptionPrice

      return {
        paywallViews,
        paywallConversions,
        paywallConversionRate:
          paywallViews > 0 ? (paywallConversions / paywallViews) * 100 : 0,
        paywallSkipRate:
          paywallViews > 0 ? (paywallSkips / paywallViews) * 100 : 0,
        estimatedRevenue,
        revenuePerVisitor:
          paywallViews > 0 ? estimatedRevenue / paywallViews : 0,
        avgRevenuePerUser:
          paywallConversions > 0 ? estimatedRevenue / paywallConversions : 0,
      }
    } catch (error) {
      console.error('Failed to get business metrics:', error)
      return {
        paywallViews: 0,
        paywallConversions: 0,
        paywallConversionRate: 0,
        paywallSkipRate: 0,
        estimatedRevenue: 0,
        revenuePerVisitor: 0,
        avgRevenuePerUser: 0,
      }
    }
  }

  static async trackEvent(eventName: string, eventData: any) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      await supabase.from('onboarding_analytics_events').insert({
        user_id: user?.id || 'system',
        event_name: eventName,
        event_data: eventData,
      })
    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }
}
