import { supabase } from '@/lib/supabaseClient'

export interface Flow {
  id: string
  name: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  version: string
  traffic_percentage: number
  created_at: string
  updated_at: string
}

export interface FlowStep {
  id: string
  flow_id: string
  step_order: number
  screen_type: string
  config: any
  tracking_event_name?: string
  created_at: string
  updated_at: string
}

export class FlowService {
  static async getFlows() {
    const { data, error } = await supabase
      .from('onboarding_flows')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Flow[]
  }

  static async getFlow(flowId: string) {
    const { data, error } = await supabase
      .from('onboarding_flows')
      .select('*')
      .eq('id', flowId)
      .single()

    if (error) throw error
    return data as Flow
  }

  static async getFlowSteps(flowId: string) {
    const { data, error } = await supabase
      .from('onboarding_flow_steps')
      .select('*')
      .eq('flow_id', flowId)
      .order('step_order')

    if (error) throw error

    // Transform the database steps to match the local format
    return data.map((step: any) => ({
      id: step.id,
      type: step.screen_type,
      config: step.config,
    }))
  }

  static async getScreenTypes() {
    // Fetch all unique screen types and their configs from the database
    const { data, error } = await supabase
      .from('onboarding_flow_steps')
      .select('screen_type, config')
      .order('screen_type')

    if (error) throw error

    // Group by screen type and return the latest config for each
    const screenTypes = new Map()
    data.forEach((step: any) => {
      if (!screenTypes.has(step.screen_type)) {
        screenTypes.set(step.screen_type, {
          type: step.screen_type,
          name: step.screen_type,
          config: step.config,
        })
      }
    })

    return Array.from(screenTypes.values())
  }

  static async createFlow(flow: { name: string; description?: string }) {
    const { data, error } = await supabase
      .from('onboarding_flows')
      .insert({
        name: flow.name,
        description: flow.description,
        status: 'DRAFT',
        version: '1',
        traffic_percentage: 100,
      })
      .select()
      .single()

    if (error) throw error
    return data as Flow
  }

  static async saveFlowSteps(flowId: string, steps: any[]) {
    // For draft flows, we can still modify in place since no users are using them
    const { data: flow } = await supabase
      .from('onboarding_flows')
      .select('status')
      .eq('id', flowId)
      .single()

    if (flow?.status === 'ACTIVE') {
      throw new Error(
        'Cannot modify an active flow. Please create a new version.'
      )
    }

    try {
      // Use transaction-safe database function to prevent race conditions
      const { error } = await supabase.rpc('save_flow_steps_transaction', {
        p_flow_id: flowId,
        p_steps: JSON.stringify(steps.map((step) => ({
          id: step.id, // Pass through client ID (will be ignored in favor of UUID preservation)
          type: step.type,
          config: step.config,
          tracking_event_name: step.tracking_event_name || `onboarding_${step.type}_viewed`,
        })))
      })
        
      if (error) throw error
    } catch (error) {
      // Log the error with context
      console.error('Failed to save flow steps:', {
        flowId,
        stepCount: steps.length,
        error,
      })
      throw error
    }
  }

  static async updateFlow(flowId: string, updates: Partial<Flow>) {
    const { data, error } = await supabase
      .from('onboarding_flows')
      .update(updates)
      .eq('id', flowId)
      .select()
      .single()

    if (error) throw error
    return data as Flow
  }

  static async deployFlow(flowId: string) {
    // Get the current flow and its steps
    const { data: sourceFlow, error: flowError } = await supabase
      .from('onboarding_flows')
      .select('*')
      .eq('id', flowId)
      .single()

    if (flowError) throw flowError

    const { data: sourceSteps, error: stepsError } = await supabase
      .from('onboarding_flow_steps')
      .select('*')
      .eq('flow_id', flowId)
      .order('step_order')

    if (stepsError) throw stepsError

    // Create a new flow version (immutable deployment)
    const newVersion = parseInt(sourceFlow.version) + 1
    const { data: newFlow, error: createError } = await supabase
      .from('onboarding_flows')
      .insert({
        name: sourceFlow.name,
        description: sourceFlow.description,
        status: 'ACTIVE',
        version: newVersion.toString(),
        traffic_percentage: sourceFlow.traffic_percentage || 100,
      })
      .select()
      .single()

    if (createError) throw createError

    // Copy all steps to the new flow
    if (sourceSteps.length > 0) {
      const newSteps = sourceSteps.map((step: any) => ({
        flow_id: newFlow.id,
        step_order: step.step_order,
        screen_type: step.screen_type,
        config: step.config,
        tracking_event_name: step.tracking_event_name,
      }))

      const { error: insertError } = await supabase
        .from('onboarding_flow_steps')
        .insert(newSteps)

      if (insertError) {
        // Rollback: delete the new flow if steps failed
        await supabase.from('onboarding_flows').delete().eq('id', newFlow.id)
        throw insertError
      }
    }

    // Note: Per product team decision, we do NOT automatically archive other active flows
    // This allows multiple concurrent A/B tests and gives admins manual control
    // If you need to archive flows, do it manually in the Flow Studio UI

    // Track the deployment
    await supabase.from('onboarding_analytics_events').insert({
      user_id: 'system',
      flow_id: newFlow.id,
      step_id: 'deployment',
      event_type: 'flow_deployed',
      event_data: {
        version: newVersion,
        source_flow_id: flowId,
        steps_count: sourceSteps.length,
      },
    })

    return newFlow as Flow
  }
}
