import { useEffect, useState, useCallback, useRef } from 'react'
import { Alert } from 'react-native'
import { router } from 'expo-router'
import { flowIntegrationService } from '../services/onboarding/flowIntegration'
import { onboardingStateMachine } from '../services/onboarding/stateMachine'
import { onboardingDataRepository } from '../services/onboarding/dataRepository'
import { navigationController } from '../services/onboarding/navigationController'
import { statePreservation } from '../services/onboarding/statePreservation'
import type { OnboardingContext } from '../services/onboarding/stateMachine'

interface UseOnboardingFlowResult {
  // Current state
  currentState: OnboardingContext
  currentStepConfig: any
  isLoading: boolean
  error: Error | null
  progress: number

  // Navigation
  canGoNext: boolean
  canGoBack: boolean
  navigateNext: (data?: any) => Promise<void>
  navigatePrevious: () => Promise<void>
  skipStep: () => Promise<void>

  // Data management
  saveStepData: (data: any) => Promise<void>
  getStepData: (stepName?: string) => Promise<any>
  updateContext: (updates: Partial<OnboardingContext>) => void

  // Flow control
  pauseFlow: () => Promise<void>
  resumeFlow: () => Promise<void>
  restartFlow: () => Promise<void>
  completeFlow: () => Promise<void>

  // Analytics
  trackEvent: (eventType: string, eventData: any) => Promise<void>
  trackScreenView: (screenName: string) => Promise<void>

  // Error handling
  clearError: () => void
  retry: () => Promise<void>
}

export function useOnboardingFlow(): UseOnboardingFlowResult {
  const [currentState, setCurrentState] = useState<OnboardingContext>(
    onboardingStateMachine.getContext()
  )
  const [currentStepConfig, setCurrentStepConfig] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [progress, setProgress] = useState(0)

  const isInitialized = useRef(false)
  const retryCount = useRef(0)

  // Define trackEvent early
  const trackEvent = useCallback(async (eventType: string, eventData: any) => {
    try {
      await flowIntegrationService.trackEvent(eventType, eventData)
    } catch (err) {
      console.error('Failed to track event:', err)
      // Don't throw - analytics shouldn't break the flow
    }
  }, [])

  // Define pauseFlow early
  const pauseFlow = useCallback(async () => {
    try {
      await statePreservation.saveCurrentState()
      await trackEvent('flow_paused', {
        step: currentState.currentState,
        progress: progress
      })
    } catch (err) {
      console.error('Failed to pause flow:', err)
    }
  }, [trackEvent, currentState.currentState, progress])

  // Define initializeFlow early
  const initializeFlow = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Initialize flow from backend first
      await flowIntegrationService.initialize()
      
      isInitialized.current = true
      
      await trackEvent('flow_initialized', {
        step: currentState.currentState,
        progress: progress
      })
    } catch (err) {
      console.error('Failed to initialize flow:', err)
      setError(err instanceof Error ? err : new Error('Failed to initialize'))
    } finally {
      setIsLoading(false)
    }
  }, [trackEvent, currentState.currentState, progress])

  // Initialize flow on mount
  useEffect(() => {
    if (!isInitialized.current) {
      initializeFlow()
    }

    // Subscribe to state changes
    const unsubscribe = onboardingStateMachine.subscribe((newState) => {
      setCurrentState(newState)
      updateProgress()
    })

    return () => {
      unsubscribe()
      pauseFlow()
    }
  }, [initializeFlow, pauseFlow])

  // Update step config when state changes
  useEffect(() => {
    if (currentState.currentState !== 'error') {
      const config = flowIntegrationService.getCurrentStepConfig()
      setCurrentStepConfig(config)
    }
  }, [currentState.currentState])



  const updateProgress = () => {
    const newProgress = flowIntegrationService.getProgress()
    setProgress(newProgress)
  }

  const navigateNext = useCallback(async (data?: any) => {
    try {
      setIsLoading(true)
      setError(null)

      // Update context with step data if provided
      if (data) {
        onboardingStateMachine.updateContext(data)
      }

      // Validate before navigation
      const isValid = await flowIntegrationService.validateFlowState()
      if (!isValid) {
        throw new Error('Please complete all required fields')
      }

      // Navigate to next step
      const nextState = await flowIntegrationService.navigateNext(data)

      // Save state after successful navigation
      await statePreservation.saveCurrentState()

      // Handle screen navigation
      const nextStep = flowIntegrationService.getFlowSteps().find(
        step => step.screen_type === nextState.currentState
      )

      if (nextStep) {
        navigationController.navigateToState(nextStep.screen_type as any)
      }

      // Track navigation
      await trackEvent('step_navigated', {
        from: currentState.currentState,
        to: nextState.currentState,
        direction: 'forward'
      })

    } catch (err) {
      console.error('Failed to navigate next:', err)
      setError(err instanceof Error ? err : new Error('Navigation failed'))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentState, trackEvent])

  const navigatePrevious = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const previousState = await flowIntegrationService.navigatePrevious()

      // Save state after successful navigation
      await statePreservation.saveCurrentState()

      // Handle screen navigation
      const previousStep = flowIntegrationService.getFlowSteps().find(
        step => step.screen_type === previousState.currentState
      )

      if (previousStep) {
        navigationController.navigateToState(previousStep.screen_type as any)
      }

      // Track navigation
      await trackEvent('step_navigated', {
        from: currentState.currentState,
        to: previousState.currentState,
        direction: 'backward'
      })

    } catch (err) {
      console.error('Failed to navigate previous:', err)
      setError(err instanceof Error ? err : new Error('Navigation failed'))
    } finally {
      setIsLoading(false)
    }
  }, [currentState, trackEvent])

  const skipStep = useCallback(async () => {
    try {
      // Check if current step is skippable
      if (!currentStepConfig.skippable) {
        Alert.alert('Cannot Skip', 'This step is required and cannot be skipped.')
        return
      }

      // Track skip event
      await trackEvent('step_skipped', {
        step: currentState.currentState
      })

      // Navigate to next step
      await navigateNext()
    } catch (err) {
      console.error('Failed to skip step:', err)
      setError(err instanceof Error ? err : new Error('Skip failed'))
    }
  }, [currentState, currentStepConfig, navigateNext, trackEvent])

  const saveStepData = useCallback(async (data: any) => {
    try {
      await onboardingDataRepository.saveData(
        `step_${currentState.currentState}`,
        data
      )
      
      // Also update state machine context
      onboardingStateMachine.updateContext(data)
      
      // Save to persistent storage
      await statePreservation.saveCurrentState()
    } catch (err) {
      console.error('Failed to save step data:', err)
      setError(err instanceof Error ? err : new Error('Save failed'))
      throw err
    }
  }, [currentState])

  const getStepData = useCallback(async (stepName?: string) => {
    try {
      const key = `step_${stepName || currentState.currentState}`
      return await onboardingDataRepository.getCachedData(key)
    } catch (err) {
      console.error('Failed to get step data:', err)
      return null
    }
  }, [currentState])

  const updateContext = useCallback((updates: Partial<OnboardingContext>) => {
    onboardingStateMachine.updateContext(updates)
  }, [])



  const resumeFlow = useCallback(async () => {
    try {
      // State restoration is handled automatically by StatePreservationSystem
      await trackEvent('flow_resumed', {
        step: currentState.currentState,
        progress
      })
    } catch (err) {
      console.error('Failed to resume flow:', err)
      setError(err instanceof Error ? err : new Error('Resume failed'))
    }
  }, [currentState, progress, trackEvent])

  const restartFlow = useCallback(async () => {
    try {
      Alert.alert(
        'Restart Onboarding',
        'Are you sure you want to restart? All progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restart',
            style: 'destructive',
            onPress: async () => {
              setIsLoading(true)
              
              // Clear all data
              await onboardingDataRepository.clearCache()
              await statePreservation.clearPreservedState()
              
              // Reset state machine
              onboardingStateMachine.reset()
              
              // Reinitialize flow
              await flowIntegrationService.initialize()
              
              // Navigate to first step
              router.replace('/onboarding')
              
              await trackEvent('flow_restarted', {})
              
              setIsLoading(false)
            }
          }
        ]
      )
    } catch (err) {
      console.error('Failed to restart flow:', err)
      setError(err instanceof Error ? err : new Error('Restart failed'))
    }
  }, [trackEvent])

  const completeFlow = useCallback(async () => {
    try {
      setIsLoading(true)
      
      await flowIntegrationService.completeFlow()
      await statePreservation.clearPreservedState()
      
      await trackEvent('flow_completed', {
        total_time: Date.now() - currentState.startedAt.getTime(),
        steps_completed: currentState.completedSteps.length
      })
      
      // Navigate to main app
      router.replace('/(app)/(tabs)/home')
      
    } catch (err) {
      console.error('Failed to complete flow:', err)
      setError(err instanceof Error ? err : new Error('Completion failed'))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [currentState, trackEvent])

  const trackScreenView = useCallback(async (screenName: string) => {
    await trackEvent('screen_viewed', {
      screen_name: screenName,
      timestamp: new Date().toISOString()
    })
  }, [trackEvent])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const retry = useCallback(async () => {
    setError(null)
    await initializeFlow()
  }, [initializeFlow])

  // Compute navigation capabilities
  const canGoNext = currentState.currentState !== 'complete' && 
    currentState.currentState !== 'error' &&
    !isLoading

  const canGoBack = onboardingStateMachine.canGoBack() && 
    currentState.currentState !== 'welcome' &&
    currentState.currentState !== 'error' &&
    !isLoading

  return {
    // Current state
    currentState,
    currentStepConfig,
    isLoading,
    error,
    progress,

    // Navigation
    canGoNext,
    canGoBack,
    navigateNext,
    navigatePrevious,
    skipStep,

    // Data management
    saveStepData,
    getStepData,
    updateContext,

    // Flow control
    pauseFlow,
    resumeFlow,
    restartFlow,
    completeFlow,

    // Analytics
    trackEvent,
    trackScreenView,

    // Error handling
    clearError,
    retry
  }
} 