import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FlowService } from '../services/flow-service'

export function useFlows() {
  return useQuery({
    queryKey: ['flows'],
    queryFn: FlowService.getFlows,
  })
}

export function useFlow(flowId: string | null) {
  const queryClient = useQueryClient()

  const { data: flow, isLoading } = useQuery({
    queryKey: ['flow', flowId],
    queryFn: () => (flowId ? FlowService.getFlow(flowId) : null),
    enabled: !!flowId,
  })

  const { data: steps = [] } = useQuery({
    queryKey: ['flow-steps', flowId],
    queryFn: () => (flowId ? FlowService.getFlowSteps(flowId) : []),
    enabled: !!flowId,
  })

  const saveStepsMutation = useMutation({
    mutationFn: ({ flowId, steps }: { flowId: string; steps: any[] }) =>
      FlowService.saveFlowSteps(flowId, steps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow-steps', flowId] })
    },
  })

  const deployFlowMutation = useMutation({
    mutationFn: FlowService.deployFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['flow', flowId] })
    },
  })

  const updateFlowMutation = useMutation({
    mutationFn: ({ flowId, updates }: { flowId: string; updates: any }) =>
      FlowService.updateFlow(flowId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['flow', flowId] })
    },
  })

  return {
    flow,
    steps,
    isLoading,
    saveSteps: (steps: any[]) =>
      saveStepsMutation.mutate({ flowId: flowId!, steps }),
    deployFlow: () => flowId && deployFlowMutation.mutate(flowId),
    updateFlow: (updates: any) =>
      flowId && updateFlowMutation.mutate({ flowId, updates }),
    isSaving: saveStepsMutation.isPending,
    isDeploying: deployFlowMutation.isPending,
    isUpdating: updateFlowMutation.isPending,
  }
}

export function useCreateFlow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: FlowService.createFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
    },
  })
}

export function useCreateFromTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (template: {
      name: string
      description: string
      screens: string[]
    }) => {
      // Create the flow
      const flow = await FlowService.createFlow({
        name: template.name,
        description: template.description,
      })

      // Add the template screens
      const steps = template.screens.map((screenId, index) => ({
        id: `step_${index + 1}`,
        type: screenId,
        config: {},
      }))

      await FlowService.saveFlowSteps(flow.id, steps)

      return flow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
    },
  })
}
