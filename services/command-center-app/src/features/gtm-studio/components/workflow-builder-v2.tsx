import React, { useState } from 'react'
import {
  Plus,
  Workflow,
  Bot,
  GitBranch,
  Check,
  Clock,
  AlertCircle,
  Zap,
  ArrowRight,
  Play,
  Pause,
  X,
  Settings,
  Save,
  CheckCircle2,
  Video,
  MessageSquare,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Send,
  Brain,
  Sparkles,
  MoreVertical,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getRecommendedModel } from '../services/openrouter-service'
import { getRecommendedReplicateModel } from '../services/replicate-service'
import { GTMTask } from '../types'
import { ModelSelectorDialog } from './model-selector-dialog'
import { UnifiedModelSelectorV2 } from './unified-model-selector-v2'
import { WorkflowTester } from './workflow-tester'

// Trigger configurations
const TRIGGERS = [
  {
    id: 'task-status',
    name: 'Status Change',
    icon: CheckCircle2,
    color: 'from-green-500 to-emerald-600',
    description: 'When task status updates',
  },
  {
    id: 'subtask-complete',
    name: 'Subtasks Done',
    icon: Check,
    color: 'from-blue-500 to-cyan-600',
    description: 'All subtasks completed',
  },
  {
    id: 'schedule',
    name: 'Schedule',
    icon: Clock,
    color: 'from-purple-500 to-pink-600',
    description: 'Run at specific times',
  },
  {
    id: 'manual',
    name: 'Manual',
    icon: Play,
    color: 'from-orange-500 to-red-600',
    description: 'Trigger manually',
  },
]

// Action configurations
const ACTIONS = [
  {
    id: 'create-video',
    name: 'Video',
    icon: Video,
    color: 'from-purple-500 to-pink-600',
    supportsReplicate: true,
  },
  {
    id: 'generate-image',
    name: 'Image',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    supportsReplicate: true,
  },
  {
    id: 'generate-audio',
    name: 'Audio',
    icon: Zap,
    color: 'from-yellow-500 to-orange-600',
    supportsReplicate: true,
  },
  {
    id: 'post-social',
    name: 'Post',
    icon: Send,
    color: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'analyze-metrics',
    name: 'Analyze',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'notify-team',
    name: 'Notify',
    icon: Users,
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 'update-task',
    name: 'Update',
    icon: CheckCircle2,
    color: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'generate-report',
    name: 'Report',
    icon: FileText,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'schedule-post',
    name: 'Schedule',
    icon: Calendar,
    color: 'from-pink-500 to-rose-600',
  },
]

export interface WorkflowStep {
  id: string
  type: 'trigger' | 'action' | 'condition'
  actionId?: string
  triggerId?: string
  config?: Record<string, any>
  modelId?: string
  modelProvider?: 'openrouter' | 'replicate'
  nextStepId?: string
}

export interface Workflow {
  id: string
  name: string
  description?: string
  taskId?: string
  steps: WorkflowStep[]
  status: 'active' | 'paused' | 'draft'
  createdAt: Date
  lastRun?: Date
  runCount: number
}

interface WorkflowBuilderProps {
  task?: GTMTask
  onClose?: () => void
}

// Compact workflow step component
function WorkflowStepCard({
  step,
  index,
  action,
  isConfiguring,
  onConfigure,
  onRemove,
  onModelSelect,
}: any) {
  const modelName = step.modelId?.split('/')[1]?.split(':')[0] || 'Select model'

  return (
    <div className='group relative'>
      {/* Connection line */}
      {index > 0 && (
        <div className='to-border absolute -top-4 left-6 h-4 w-0.5 bg-gradient-to-b from-transparent' />
      )}

      <div
        className={cn(
          'relative flex items-center gap-3 rounded-lg border p-3 transition-all',
          'from-background to-muted/30 bg-gradient-to-br',
          isConfiguring ? 'ring-primary shadow-lg ring-2' : 'hover:shadow-md'
        )}
      >
        {/* Step number */}
        <div className='bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium'>
          {index + 1}
        </div>

        {/* Action icon */}
        <div
          className={cn(
            'rounded-lg bg-gradient-to-br p-2 text-white shadow-lg',
            action.color
          )}
        >
          <action.icon className='h-4 w-4' />
        </div>

        {/* Action details */}
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>{action.name}</span>
            {step.modelProvider && (
              <Badge variant='outline' className='h-5 px-1.5 text-xs'>
                {step.modelProvider === 'replicate' ? 'Media' : 'AI'}
              </Badge>
            )}
          </div>
          {step.modelId && (
            <p className='text-muted-foreground truncate text-xs'>
              {modelName}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
          <Button
            size='sm'
            variant='ghost'
            className='h-7 w-7 p-0'
            onClick={() => onConfigure(!isConfiguring)}
          >
            <Settings className='h-3.5 w-3.5' />
          </Button>
          <Button
            size='sm'
            variant='ghost'
            className='h-7 w-7 p-0'
            onClick={onRemove}
          >
            <X className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>

      {/* Model configuration */}
      {isConfiguring && (
        <div className='bg-muted/50 mt-2 rounded-lg border border-dashed p-3'>
          <UnifiedModelSelectorV2
            actionId={step.actionId}
            selectedModelId={step.modelId}
            selectedProvider={step.modelProvider || 'openrouter'}
            onModelSelect={onModelSelect}
            showCosts={false}
          />
        </div>
      )}
    </div>
  )
}

export function WorkflowBuilderV2({ task, onClose }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  )
  const [isCreating, setIsCreating] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [selectedTrigger, setSelectedTrigger] = useState<string>('')
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [configuringStep, setConfiguringStep] = useState<string | null>(null)
  const [showTester, setShowTester] = useState(false)

  const createNewWorkflow = () => {
    if (!workflowName || !selectedTrigger) {
      toast.error('Please provide a name and select a trigger')
      return
    }

    const newWorkflow: Workflow = {
      id: `wf-${Date.now()}`,
      name: workflowName,
      description: workflowDescription,
      taskId: task?.id,
      steps: [
        {
          id: 'trigger',
          type: 'trigger',
          triggerId: selectedTrigger,
          config: {},
        },
        ...workflowSteps,
      ],
      status: 'draft',
      createdAt: new Date(),
      runCount: 0,
    }

    setWorkflows([...workflows, newWorkflow])
    setSelectedWorkflow(newWorkflow)
    setIsCreating(false)
    toast.success('Workflow created!')
  }

  const addActionStep = (actionId: string) => {
    const action = ACTIONS.find((a) => a.id === actionId)
    if (!action) return

    // Determine default provider and get recommended model
    let recommendedModel
    let modelProvider: 'openrouter' | 'replicate' = 'openrouter'

    if (
      action.supportsReplicate &&
      ['generate-image', 'create-video', 'generate-audio'].includes(actionId)
    ) {
      recommendedModel = getRecommendedReplicateModel(actionId)
      modelProvider = 'replicate'
    } else {
      recommendedModel = getRecommendedModel(actionId)
    }

    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: 'action',
      actionId,
      modelId: recommendedModel.id,
      modelProvider,
      config: {},
    }

    setWorkflowSteps([...workflowSteps, newStep])
  }

  const removeStep = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter((s) => s.id !== stepId))
    if (configuringStep === stepId) {
      setConfiguringStep(null)
    }
  }

  const saveWorkflow = () => {
    if (!selectedWorkflow) return

    const updated = {
      ...selectedWorkflow,
      steps: [
        selectedWorkflow.steps[0], // Keep trigger
        ...workflowSteps,
      ],
    }

    setWorkflows(workflows.map((w) => (w.id === updated.id ? updated : w)))
    toast.success('Workflow saved!')
  }

  // Creation view
  if (isCreating) {
    return (
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold'>Create Workflow</h3>

        <div className='space-y-3'>
          <div>
            <Label htmlFor='name' className='text-sm'>
              Name
            </Label>
            <Input
              id='name'
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder='e.g., Content Pipeline'
              className='mt-1'
            />
          </div>

          <div>
            <Label htmlFor='description' className='text-sm'>
              Description
            </Label>
            <Textarea
              id='description'
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder='What does this workflow do?'
              className='mt-1 min-h-[60px]'
            />
          </div>

          <div>
            <Label className='text-sm'>Trigger</Label>
            <div className='mt-2 grid grid-cols-2 gap-2'>
              {TRIGGERS.map((trigger) => (
                <div
                  key={trigger.id}
                  onClick={() => setSelectedTrigger(trigger.id)}
                  className={cn(
                    'cursor-pointer rounded-lg border p-3 transition-all',
                    'hover:shadow-md active:scale-[0.98]',
                    selectedTrigger === trigger.id
                      ? 'ring-primary shadow-lg ring-2'
                      : 'hover:border-primary/50'
                  )}
                >
                  <div className='flex items-center gap-2'>
                    <div
                      className={cn(
                        'rounded-md bg-gradient-to-br p-1.5 text-white',
                        trigger.color
                      )}
                    >
                      <trigger.icon className='h-3.5 w-3.5' />
                    </div>
                    <div className='flex-1'>
                      <p className='text-sm font-medium'>{trigger.name}</p>
                      <p className='text-muted-foreground text-xs'>
                        {trigger.description}
                      </p>
                    </div>
                    {selectedTrigger === trigger.id && (
                      <Check className='text-primary h-4 w-4' />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='flex gap-2'>
          <Button
            onClick={createNewWorkflow}
            disabled={!workflowName || !selectedTrigger}
            className='flex-1'
          >
            Create Workflow
          </Button>
          <Button variant='outline' onClick={() => setIsCreating(false)}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // Workflow editing view
  if (selectedWorkflow) {
    const trigger = TRIGGERS.find(
      (t) => t.id === selectedWorkflow.steps[0]?.triggerId
    )

    return (
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>{selectedWorkflow.name}</h3>
            {selectedWorkflow.description && (
              <p className='text-muted-foreground text-sm'>
                {selectedWorkflow.description}
              </p>
            )}
          </div>
          <Button
            size='sm'
            variant='ghost'
            onClick={() => setSelectedWorkflow(null)}
          >
            <X className='h-4 w-4' />
          </Button>
        </div>

        {/* Trigger */}
        <div>
          <Label className='text-muted-foreground text-xs uppercase'>
            Trigger
          </Label>
          <div className='from-background to-muted/30 mt-2 rounded-lg border bg-gradient-to-br p-3'>
            <div className='flex items-center gap-3'>
              {trigger && (
                <>
                  <div
                    className={cn(
                      'rounded-lg bg-gradient-to-br p-2 text-white shadow-lg',
                      trigger.color
                    )}
                  >
                    <trigger.icon className='h-4 w-4' />
                  </div>
                  <div>
                    <p className='text-sm font-medium'>{trigger.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {trigger.description}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div>
          <Label className='text-muted-foreground text-xs uppercase'>
            Actions
          </Label>
          <ScrollArea className='mt-2 h-[400px]'>
            <div className='space-y-2 pr-4'>
              {workflowSteps.map((step, index) => {
                const action = ACTIONS.find((a) => a.id === step.actionId)
                if (!action) return null

                return (
                  <WorkflowStepCard
                    key={step.id}
                    step={step}
                    index={index}
                    action={action}
                    isConfiguring={configuringStep === step.id}
                    onConfigure={(show: boolean) =>
                      setConfiguringStep(show ? step.id : null)
                    }
                    onRemove={() => removeStep(step.id)}
                    onModelSelect={(
                      modelId: string,
                      provider: 'openrouter' | 'replicate'
                    ) => {
                      setWorkflowSteps(
                        workflowSteps.map((s) =>
                          s.id === step.id
                            ? { ...s, modelId, modelProvider: provider }
                            : s
                        )
                      )
                    }}
                  />
                )
              })}

              {/* Add action button */}
              <div className='pt-2'>
                <Label className='text-muted-foreground text-xs'>
                  Add Action
                </Label>
                <div className='mt-2 grid grid-cols-3 gap-2'>
                  {ACTIONS.map((action) => (
                    <Button
                      key={action.id}
                      variant='outline'
                      size='sm'
                      className='h-auto flex-col gap-1 p-2'
                      onClick={() => addActionStep(action.id)}
                    >
                      <action.icon className='h-4 w-4' />
                      <span className='text-xs'>{action.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className='flex gap-2'>
          <Button onClick={saveWorkflow} size='sm' className='flex-1'>
            <Save className='mr-1.5 h-3.5 w-3.5' />
            Save
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setShowTester(true)}
            className='flex-1'
          >
            <Play className='mr-1.5 h-3.5 w-3.5' />
            Test
          </Button>
        </div>

        {/* Workflow Tester */}
        {showTester && (
          <Sheet open={showTester} onOpenChange={setShowTester}>
            <SheetContent className='w-full overflow-y-auto sm:max-w-3xl'>
              <WorkflowTester
                workflow={selectedWorkflow}
                task={task}
                onClose={() => setShowTester(false)}
              />
            </SheetContent>
          </Sheet>
        )}
      </div>
    )
  }

  // Workflow list view
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Workflows</h3>
        <Button onClick={() => setIsCreating(true)} size='sm'>
          <Plus className='mr-1.5 h-3.5 w-3.5' />
          Create
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='p-8 text-center'>
            <Workflow className='text-muted-foreground/50 mx-auto mb-4 h-12 w-12' />
            <h4 className='mb-2 font-semibold'>No workflows yet</h4>
            <p className='text-muted-foreground mb-4 text-sm'>
              Create your first workflow to automate tasks
            </p>
            <Button onClick={() => setIsCreating(true)} size='sm'>
              <Plus className='mr-1.5 h-3.5 w-3.5' />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-2'>
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className='cursor-pointer transition-all hover:shadow-md'
              onClick={() => setSelectedWorkflow(workflow)}
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div
                      className={cn(
                        'rounded-lg p-2',
                        workflow.status === 'active'
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Workflow className='h-4 w-4' />
                    </div>
                    <div>
                      <h4 className='font-medium'>{workflow.name}</h4>
                      <p className='text-muted-foreground text-xs'>
                        {workflow.steps.length - 1} actions • Run{' '}
                        {workflow.runCount} times
                      </p>
                    </div>
                  </div>
                  <ChevronRight className='text-muted-foreground h-4 w-4' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
