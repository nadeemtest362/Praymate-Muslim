import { supabase } from '../../../../lib/supabaseClient'
import { onboardingStateMachine } from './stateMachine'
import { onboardingDataRepository } from './dataRepository'
import { onboardingApiService } from '../../../../services/OnboardingApiService'
import NetInfo from '@react-native-community/netinfo'
import { useOnboardingStore } from '../../../../stores/onboardingStore'

interface FlowStep {
  id: string
  flow_id: string
  step_order: number
  screen_type: string
  config: any
  tracking_event_name?: string
}

interface Flow {
  id: string
  name: string
  status: 'draft' | 'active' | 'archived'
  version: number
}



export class FlowIntegrationService {
  private static instance: FlowIntegrationService
  private currentFlow: Flow | null = null
  private flowSteps: FlowStep[] = []
  private lastSyncedFlowVersion: number = 0

  private constructor() {}

  static getInstance(): FlowIntegrationService {
    if (!FlowIntegrationService.instance) {
      FlowIntegrationService.instance = new FlowIntegrationService()
    }
    return FlowIntegrationService.instance
  }

  /**
   * Initialize the flow integration with the active flow from backend
   */
  async initialize(): Promise<void> {
    try {
      // Check network connectivity first
      const networkState = await NetInfo.fetch()
      
      if (!networkState.isConnected) {
        // Use cached flow if available
        const cachedFlow = await this.loadCachedFlow()
        if (cachedFlow) {
          this.currentFlow = cachedFlow.flow
          this.flowSteps = cachedFlow.steps
          await this.syncStateMachine()
          return
        }
        throw new Error('No internet connection and no cached flow available')
      }

      // Fetch flow from edge function - this handles versioning!
      const flowResponse = await onboardingApiService.getOnboardingFlow()

      if (!flowResponse || !flowResponse.flow_id) {
        throw new Error('No onboarding flow available')
      }

      // Set current flow metadata
      this.currentFlow = {
        id: flowResponse.flow_id,
        name: flowResponse.flow_name,
        version: parseInt(flowResponse.flow_version),
        status: 'active' // User only gets active flows
      }

      // Transform steps to match our interface
      this.flowSteps = flowResponse.steps.map(step => ({
        id: step.id,
        flow_id: flowResponse.flow_id,
        step_order: step.step_order,
        screen_type: step.screen_type,
        config: step.config,
        tracking_event_name: step.tracking_event_name
      }))

      // If user is continuing, jump to their current step
      if (flowResponse.is_continuing && flowResponse.current_step > 1) {
        // Find the step they were on
        const currentStep = this.flowSteps.find(s => s.step_order === flowResponse.current_step)
        if (currentStep) {
          // Update state machine to their position
          await onboardingStateMachine.transitionTo(currentStep.screen_type as any)
        }
      }

      // Cache the flow for offline use
      await this.cacheFlow(this.currentFlow, this.flowSteps)

      // Sync with state machine
      await this.syncStateMachine()
      
      // Track flow initialization
      await this.trackEvent('flow_initialized', {
        flow_id: this.currentFlow.id,
        flow_version: this.currentFlow.version,
        step_count: this.flowSteps.length,
        is_continuing: flowResponse.is_continuing,
        current_step: flowResponse.current_step
      })

    } catch (error) {
      console.error('Failed to initialize flow integration:', error)
      throw error
    }
  }

  /**
   * Sync the server flow with our state machine
   */
  private async syncStateMachine(): Promise<void> {
    if (!this.flowSteps.length) return

    // Reset state machine with server-driven flow
    onboardingStateMachine.reset()
    
    // Initialize with the new flow
    // The state machine will use the steps as defined by the backend
  }

  /**
   * Get the current step configuration
   */
  getCurrentStepConfig(): any {
    const currentContext = onboardingStateMachine.getContext()
    const currentStep = this.flowSteps.find(
      step => step.screen_type === currentContext.currentState
    )
    
    return currentStep?.config || {}
  }

  /**
   * Navigate to next step with server sync
   */
  async navigateNext(data?: any): Promise<any> {
    const currentContext = onboardingStateMachine.getContext()
    
    // Save data to backend if provided
    if (data) {
      await this.saveStepData(currentContext.currentState, data)
    }

    // Track step completion
    await this.trackStepCompletion(currentContext.currentState)

    // Find the next state from flow steps
    const currentIndex = this.flowSteps.findIndex(
      step => step.screen_type === currentContext.currentState
    )
    
    if (currentIndex === -1 || currentIndex >= this.flowSteps.length - 1) {
      throw new Error('No next step available')
    }

    const nextStep = this.flowSteps[currentIndex + 1]
    
    // Move to next state
    const result = await onboardingStateMachine.transitionTo(nextStep.screen_type as any)

    if (!result.valid) {
      throw new Error(`Failed to transition to next state: ${result.errors?.join(', ')}`)
    }

    const nextContext = onboardingStateMachine.getContext()

    // Update user's current step in profile
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_current_step: nextStep.step_order 
          })
          .eq('id', user.id)
      }
    } catch (error) {
      console.error('Failed to update current step in profile:', error)
      // Don't throw - this shouldn't block navigation
    }

    // Check if we need to fetch additional configuration
    if (nextStep?.config.requiresDynamicData) {
      await this.fetchDynamicData(nextStep)
    }

    return nextContext
  }

  /**
   * Navigate to previous step
   */
  async navigatePrevious(): Promise<any> {
    const result = await onboardingStateMachine.goBack()
    if (!result.valid) {
      throw new Error(`Failed to transition to previous state: ${result.errors?.join(', ')}`)
    }
    return onboardingStateMachine.getContext()
  }

  /**
   * Save step data to backend with retry logic
   */
  private async saveStepData(stepName: string, data: any): Promise<void> {
    try {
      // Save to local repository first
      await onboardingDataRepository.saveData(`step_${stepName}`, data)
      
      // Also save to onboarding events for analytics
      await supabase
        .from('onboarding_analytics_events')
        .insert({
          flow_id: this.currentFlow?.id,
          step_id: stepName,
          event_type: 'step_data_saved',
          event_data: data,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
    } catch (error) {
      console.error('Failed to save step data:', error)
      // Queue for retry if offline
      await onboardingDataRepository.queueAnalyticsEvent({
        flow_id: this.currentFlow?.id,
        step_id: stepName,
        event_type: 'step_data_saved',
        event_data: data,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
    }
  }

  /**
   * Track step completion
   */
  private async trackStepCompletion(stepName: string): Promise<void> {
    const step = this.flowSteps.find(s => s.screen_type === stepName)
    if (!step) return

    try {
      await supabase
        .from('onboarding_analytics_events')
        .insert({
          flow_id: this.currentFlow?.id,
          step_id: step.id,
          event_type: 'step_completed',
          event_data: {
            step_order: step.step_order,
            time_spent: this.calculateTimeSpent(stepName)
          },
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
    } catch (error) {
      console.error('Failed to track step completion:', error)
    }
  }

  /**
   * Track custom events
   */
  async trackEvent(eventType: string, eventData: any): Promise<void> {
    try {
      await supabase
        .from('onboarding_analytics_events')
        .insert({
          flow_id: this.currentFlow?.id,
          event_type: eventType,
          event_data: eventData,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }

  /**
   * Fetch dynamic data for a step
   */
  private async fetchDynamicData(step: FlowStep): Promise<void> {
    const { dynamicDataEndpoint, dynamicDataParams } = step.config

    if (!dynamicDataEndpoint) return

    try {
      const response = await fetch(dynamicDataEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(dynamicDataParams || {})
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dynamic data')
      }

      const dynamicData = await response.json()
      
      // Update step config with dynamic data
      step.config = {
        ...step.config,
        ...(dynamicData && typeof dynamicData === 'object' ? dynamicData : {})
      }
    } catch (error) {
      console.error('Failed to fetch dynamic data:', error)
      // Continue with static config
    }
  }

  /**
   * Check if flow needs update
   */
  async checkForFlowUpdates(): Promise<boolean> {
    // With immutable versioning, users stick to their assigned flow
    // No need to check for updates - they'll get new versions on next onboarding
    return false
  }

  /**
   * Reload flow if updated
   */
  async reloadFlow(): Promise<void> {
    await this.initialize()
  }

  /**
   * Cache flow for offline use
   */
  private async cacheFlow(flow: Flow, steps: FlowStep[]): Promise<void> {
    try {
      await onboardingDataRepository.saveData('active_flow', {
        flow,
        steps,
        cachedAt: Date.now()
      })
    } catch (error) {
      console.error('Failed to cache flow:', error)
    }
  }

  /**
   * Load cached flow
   */
  private async loadCachedFlow(): Promise<{ flow: Flow; steps: FlowStep[] } | null> {
    try {
      const cached = await onboardingDataRepository.getCachedData<any>('active_flow')
      if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) { // 24 hours
        return {
          flow: cached.flow,
          steps: cached.steps
        }
      }
    } catch (error) {
      console.error('Failed to load cached flow:', error)
    }
    return null
  }

  /**
   * Calculate time spent on a step
   */
  private calculateTimeSpent(stepName: string): number {
    // This would be implemented with actual time tracking
    return 0
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    const currentContext = onboardingStateMachine.getContext()
    const currentIndex = this.flowSteps.findIndex(
      step => step.screen_type === currentContext.currentState
    )
    return ((currentIndex + 1) / this.flowSteps.length) * 100
  }

  /**
   * Validate current flow state
   */
  async validateFlowState(): Promise<boolean> {
    const currentContext = onboardingStateMachine.getContext()
    const currentStep = this.flowSteps.find(
      step => step.screen_type === currentContext.currentState
    )

    if (!currentStep) {
      console.error('Current step not found in flow')
      return false
    }

    // Validate required data
    if (currentStep.config.requiredFields) {
      const stepData = await onboardingDataRepository.getCachedData<any>(
        `step_${currentContext.currentState}`
      )
      
      for (const field of currentStep.config.requiredFields) {
        if (!stepData?.[field]) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Handle flow completion
   */
  async completeFlow(): Promise<void> {
    try {
      // Save all onboarding data to the database before marking complete
      const onboardingStore = useOnboardingStore.getState()
      const { saveStateAtomically } = onboardingStore
      
      // saveStateAtomically will throw if it fails
      await saveStateAtomically()
      
      // Mark flow as completed
      await supabase
        .from('onboarding_analytics_events')
        .insert({
          flow_id: this.currentFlow?.id,
          event_type: 'flow_completed',
          event_data: {
            total_time: this.calculateTotalTime(),
            completion_rate: 100
          },
          user_id: (await supabase.auth.getUser()).data.user?.id
        })

      // Update user profile
      await supabase
        .from('profiles')
        .update({
          has_completed_onboarding: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_current_step: null // Clear since they're done
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id)

      // Clear cached flow data
      await onboardingDataRepository.clearCache()
      
    } catch (error) {
      console.error('Failed to complete flow:', error)
      throw error
    }
  }

  private calculateTotalTime(): number {
    // Implementation would track actual time
    return 0
  }

  /**
   * Get current flow metadata
   */
  getCurrentFlow(): Flow | null {
    return this.currentFlow
  }

  /**
   * Get all flow steps
   */
  getFlowSteps(): FlowStep[] {
    return this.flowSteps
  }

  /**
   * Get current step index
   */
  getCurrentStepIndex(): number {
    const currentContext = onboardingStateMachine.getContext()
    return this.flowSteps.findIndex(
      step => step.screen_type === currentContext.currentState
    )
  }
}

// Export singleton instance
export const flowIntegrationService = FlowIntegrationService.getInstance() 