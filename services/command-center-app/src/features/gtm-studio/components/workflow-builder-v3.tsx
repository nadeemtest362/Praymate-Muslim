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
  ChevronRight,
  Loader2,
  Image,
  Music,
  Code2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { getRecommendedModel } from '../services/openrouter-service'
import { OPENROUTER_MODELS } from '../services/openrouter-service'
import { getRecommendedReplicateModel } from '../services/replicate-service'
import { REPLICATE_MODELS } from '../services/replicate-service'
import { GTMTask } from '../types'
import { WorkflowTester } from './workflow-tester'

// Split view approach - workflow on left, details on right

const TRIGGERS = [
  {
    id: 'task-status',
    name: 'Status Change',
    icon: CheckCircle2,
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'subtask-complete',
    name: 'Subtasks Done',
    icon: Check,
    color: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'schedule',
    name: 'Schedule',
    icon: Clock,
    color: 'from-purple-500 to-pink-600',
  },
  {
    id: 'manual',
    name: 'Manual',
    icon: Play,
    color: 'from-orange-500 to-red-600',
  },
]

const ACTIONS = [
  {
    id: 'create-video',
    name: 'Generate Video',
    icon: Video,
    color: 'from-purple-500 to-pink-600',
    category: 'media',
  },
  {
    id: 'generate-image',
    name: 'Generate Image',
    icon: Image,
    color: 'from-violet-500 to-purple-600',
    category: 'media',
  },
  {
    id: 'contextual-image',
    name: 'Contextual Image',
    icon: Sparkles,
    color: 'from-indigo-500 to-purple-600',
    category: 'media',
    isNew: true,
  },
  {
    id: 'generate-audio',
    name: 'Generate Audio',
    icon: Music,
    color: 'from-yellow-500 to-orange-600',
    category: 'media',
  },
  {
    id: 'generate-script',
    name: 'Generate Script',
    icon: FileText,
    color: 'from-teal-500 to-cyan-600',
    category: 'content',
  },
  {
    id: 'post-social',
    name: 'Post to Social',
    icon: Send,
    color: 'from-blue-500 to-cyan-600',
    category: 'social',
  },
  {
    id: 'analyze-metrics',
    name: 'Analyze Metrics',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-600',
    category: 'analytics',
  },
  {
    id: 'notify-team',
    name: 'Notify Team',
    icon: Users,
    color: 'from-orange-500 to-red-600',
    category: 'communication',
  },
  {
    id: 'update-task',
    name: 'Update Task',
    icon: CheckCircle2,
    color: 'from-indigo-500 to-purple-600',
    category: 'task',
  },
  {
    id: 'generate-report',
    name: 'Generate Report',
    icon: FileText,
    color: 'from-amber-500 to-orange-600',
    category: 'analytics',
  },
  {
    id: 'schedule-post',
    name: 'Schedule Content',
    icon: Calendar,
    color: 'from-pink-500 to-rose-600',
    category: 'social',
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

// Quick model selector - shows top 3 models + "more" option
function QuickModelSelector({
  actionId,
  selectedModelId,
  selectedProvider,
  onModelSelect,
}: any) {
  const isMediaAction = [
    'generate-image',
    'create-video',
    'generate-audio',
    'contextual-image',
  ].includes(actionId)
  const provider = isMediaAction ? 'replicate' : 'openrouter'

  // Get top models based on action
  const getTopModels = () => {
    if (isMediaAction) {
      const category =
        actionId === 'generate-image' || actionId === 'contextual-image'
          ? 'image'
          : actionId === 'create-video'
            ? 'video'
            : 'audio'
      return REPLICATE_MODELS[category]?.slice(0, 3) || []
    } else {
      // For language models, show one from each tier
      return [
        OPENROUTER_MODELS.fast[0],
        OPENROUTER_MODELS.balanced[0],
        OPENROUTER_MODELS.premium[0],
      ]
    }
  }

  const topModels = getTopModels()
  const recommendedModel = isMediaAction
    ? getRecommendedReplicateModel(actionId)
    : getRecommendedModel(actionId)

  return (
    <div className='space-y-2'>
      <Label className='text-muted-foreground text-xs'>AI Model</Label>
      <div className='grid gap-1'>
        {topModels.map((model) => (
          <button
            key={model.id}
            onClick={() => onModelSelect(model.id, provider)}
            className={cn(
              'w-full rounded-md border p-2 text-left transition-all',
              'hover:bg-muted/50 hover:border-primary/50',
              selectedModelId === model.id
                ? 'border-primary bg-primary/10'
                : 'border-border'
            )}
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Code2 className='text-muted-foreground h-3 w-3' />
                <span className='truncate text-sm font-medium'>
                  {model.name}
                </span>
                {model.id === recommendedModel.id && (
                  <Badge variant='secondary' className='h-4 px-1 text-xs'>
                    <Sparkles className='h-2.5 w-2.5' />
                  </Badge>
                )}
              </div>
              <span className='text-muted-foreground text-xs'>
                ${model.costPer1M || model.costPer1K || 0}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function WorkflowBuilderV3({ task, onClose }: any) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  )
  const [isCreating, setIsCreating] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [selectedTrigger, setSelectedTrigger] = useState<string>('')
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [showTester, setShowTester] = useState(false)

  const createNewWorkflow = () => {
    if (!workflowName || !selectedTrigger) {
      toast.error('Please provide a name and select a trigger')
      return
    }

    const newWorkflow: Workflow = {
      id: `wf-${Date.now()}`,
      name: workflowName,
      description: '',
      taskId: task?.id,
      steps: [
        {
          id: 'trigger',
          type: 'trigger',
          triggerId: selectedTrigger,
          config: {},
        },
      ],
      status: 'draft',
      createdAt: new Date(),
      runCount: 0,
    }

    setWorkflows([...workflows, newWorkflow])
    setSelectedWorkflow(newWorkflow)
    setIsCreating(false)
    setWorkflowSteps([])
    toast.success('Workflow created!')
  }

  const addActionStep = (actionId: string) => {
    const action = ACTIONS.find((a) => a.id === actionId)
    if (!action) return

    const isMediaAction = [
      'generate-image',
      'create-video',
      'generate-audio',
      'contextual-image',
    ].includes(actionId)
    const recommendedModel = isMediaAction
      ? getRecommendedReplicateModel(actionId)
      : getRecommendedModel(actionId)

    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: 'action',
      actionId,
      modelId: recommendedModel.id,
      modelProvider: isMediaAction ? 'replicate' : 'openrouter',
      config: {},
    }

    // Set default 9:16 aspect ratio for image generation
    if (actionId === 'generate-image' || actionId === 'contextual-image') {
      newStep.config = {
        aspectRatio: '9:16',
        width: 720,
        height: 1280,
      }
    }

    setWorkflowSteps([...workflowSteps, newStep])
    setSelectedStep(newStep.id) // Auto-select the new step
  }

  const removeStep = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter((s) => s.id !== stepId))
    if (selectedStep === stepId) {
      setSelectedStep(null)
    }
  }

  if (selectedWorkflow) {
    const trigger = TRIGGERS.find(
      (t) => t.id === selectedWorkflow.steps[0]?.triggerId
    )
    const currentStep = workflowSteps.find((s) => s.id === selectedStep)
    const currentAction = currentStep
      ? ACTIONS.find((a) => a.id === currentStep.actionId)
      : null

    return (
      <div className='flex h-full gap-4'>
        {/* Left side - Workflow steps */}
        <div className='flex-1 space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold'>{selectedWorkflow.name}</h3>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => setSelectedWorkflow(null)}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Trigger */}
          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs uppercase'>
              Trigger
            </Label>
            <div className='bg-muted/30 rounded-lg border p-3'>
              <div className='flex items-center gap-3'>
                {trigger && (
                  <>
                    <div
                      className={cn(
                        'rounded-lg bg-gradient-to-br p-2 text-white',
                        trigger.color
                      )}
                    >
                      <trigger.icon className='h-4 w-4' />
                    </div>
                    <span className='font-medium'>{trigger.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className='space-y-2'>
            <Label className='text-muted-foreground text-xs uppercase'>
              Actions
            </Label>

            {/* Existing steps */}
            <div className='space-y-2'>
              {workflowSteps.map((step, index) => {
                const action = ACTIONS.find((a) => a.id === step.actionId)
                if (!action) return null

                return (
                  <div
                    key={step.id}
                    onClick={() => setSelectedStep(step.id)}
                    className={cn(
                      'cursor-pointer rounded-lg border p-3 transition-all',
                      selectedStep === step.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <span className='text-muted-foreground text-sm'>
                          {index + 1}
                        </span>
                        <div
                          className={cn(
                            'rounded-lg bg-gradient-to-br p-2 text-white',
                            action.color
                          )}
                        >
                          <action.icon className='h-4 w-4' />
                        </div>
                        <span className='font-medium'>{action.name}</span>
                      </div>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={(e) => {
                          e.stopPropagation()
                          removeStep(step.id)
                        }}
                      >
                        <Trash2 className='h-3 w-3' />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add action buttons */}
            <div className='pt-2'>
              <Label className='text-muted-foreground mb-2 block text-xs'>
                Add Action
              </Label>
              <div className='grid grid-cols-3 gap-2'>
                {ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant='outline'
                    size='sm'
                    className='relative h-auto flex-col gap-2 p-3'
                    onClick={() => addActionStep(action.id)}
                  >
                    <action.icon className='h-5 w-5' />
                    <span className='text-xs'>{action.name.split(' ')[0]}</span>
                    {action.isNew && (
                      <Badge
                        variant='secondary'
                        className='absolute -top-1 -right-1 h-4 px-1 text-xs'
                      >
                        NEW
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom actions */}
          <div className='flex gap-2 pt-4'>
            <Button
              onClick={() => {
                if (!selectedWorkflow) return
                const updated = {
                  ...selectedWorkflow,
                  steps: [selectedWorkflow.steps[0], ...workflowSteps],
                }
                setWorkflows(
                  workflows.map((w) => (w.id === updated.id ? updated : w))
                )
                toast.success('Workflow saved!')
              }}
              size='sm'
              className='flex-1'
            >
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
        </div>

        {/* Right side - Step details */}
        <div className='w-80 border-l pl-4'>
          {currentStep && currentAction ? (
            <div className='space-y-4'>
              <div>
                <h4 className='flex items-center gap-2 font-semibold'>
                  <div
                    className={cn(
                      'rounded-lg bg-gradient-to-br p-1.5 text-white',
                      currentAction.color
                    )}
                  >
                    <currentAction.icon className='h-3.5 w-3.5' />
                  </div>
                  {currentAction.name}
                </h4>
                <p className='text-muted-foreground mt-1 text-sm'>
                  Configure this action step
                </p>
              </div>

              {/* Model selection */}
              <QuickModelSelector
                actionId={currentStep.actionId}
                selectedModelId={currentStep.modelId}
                selectedProvider={currentStep.modelProvider}
                onModelSelect={(
                  modelId: string,
                  provider: 'openrouter' | 'replicate'
                ) => {
                  setWorkflowSteps(
                    workflowSteps.map((s) =>
                      s.id === currentStep.id
                        ? { ...s, modelId, modelProvider: provider }
                        : s
                    )
                  )
                }}
              />

              {/* Action-specific config */}
              <div className='space-y-3'>
                {/* Image generation actions */}
                {(currentStep.actionId === 'generate-image' ||
                  currentStep.actionId === 'contextual-image') && (
                  <div className='space-y-3'>
                    <div>
                      <Label className='text-xs'>Prompt</Label>
                      <Textarea
                        placeholder='Describe the image you want to generate...'
                        className='mt-1 min-h-[80px]'
                        value={currentStep.config?.prompt || ''}
                        onChange={(e) => {
                          setWorkflowSteps(
                            workflowSteps.map((s) =>
                              s.id === currentStep.id
                                ? {
                                    ...s,
                                    config: {
                                      ...s.config,
                                      prompt: e.target.value,
                                    },
                                  }
                                : s
                            )
                          )
                        }}
                      />
                    </div>

                    <div>
                      <Label className='text-xs'>Aspect Ratio</Label>
                      <select
                        className='mt-1 w-full rounded-md border p-2 text-sm'
                        value={currentStep.config?.aspectRatio || '9:16'}
                        onChange={(e) => {
                          const ratio = e.target.value
                          let width = 1024
                          let height = 1024

                          if (ratio === '9:16') {
                            width = 720
                            height = 1280
                          } else if (ratio === '16:9') {
                            width = 1280
                            height = 720
                          } else if (ratio === '4:3') {
                            width = 1024
                            height = 768
                          } else if (ratio === '3:4') {
                            width = 768
                            height = 1024
                          }

                          setWorkflowSteps(
                            workflowSteps.map((s) =>
                              s.id === currentStep.id
                                ? {
                                    ...s,
                                    config: {
                                      ...s.config,
                                      aspectRatio: ratio,
                                      width,
                                      height,
                                    },
                                  }
                                : s
                            )
                          )
                        }}
                      >
                        <option value='9:16'>
                          9:16 (Portrait - TikTok/Reels)
                        </option>
                        <option value='1:1'>1:1 (Square - Instagram)</option>
                        <option value='16:9'>16:9 (Landscape - YouTube)</option>
                        <option value='4:3'>4:3 (Standard)</option>
                        <option value='3:4'>3:4 (Portrait)</option>
                      </select>
                    </div>

                    {currentStep.actionId === 'contextual-image' && (
                      <>
                        <div className='rounded-lg border border-purple-500/20 bg-purple-500/10 p-3'>
                          <p className='text-muted-foreground text-xs'>
                            <Sparkles className='mr-1 inline h-3 w-3' />
                            This action will use the image from the previous
                            step as a reference for character consistency or
                            style transfer
                          </p>
                        </div>

                        <div className='space-y-2'>
                          <Label className='text-xs'>Options</Label>
                          <div className='space-y-2'>
                            <label className='flex items-center gap-2 text-xs'>
                              <input
                                type='checkbox'
                                checked={
                                  currentStep.config?.character_consistency !==
                                  false
                                }
                                onChange={(e) => {
                                  setWorkflowSteps(
                                    workflowSteps.map((s) =>
                                      s.id === currentStep.id
                                        ? {
                                            ...s,
                                            config: {
                                              ...s.config,
                                              character_consistency:
                                                e.target.checked,
                                            },
                                          }
                                        : s
                                    )
                                  )
                                }}
                                className='rounded border-gray-300'
                              />
                              <span>Maintain character consistency</span>
                            </label>

                            <label className='flex items-center gap-2 text-xs'>
                              <input
                                type='checkbox'
                                checked={
                                  currentStep.config?.local_editing || false
                                }
                                onChange={(e) => {
                                  setWorkflowSteps(
                                    workflowSteps.map((s) =>
                                      s.id === currentStep.id
                                        ? {
                                            ...s,
                                            config: {
                                              ...s.config,
                                              local_editing: e.target.checked,
                                            },
                                          }
                                        : s
                                    )
                                  )
                                }}
                                className='rounded border-gray-300'
                              />
                              <span>Local editing mode</span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Video generation */}
                {currentStep.actionId === 'create-video' && (
                  <div className='space-y-3'>
                    <div>
                      <Label className='text-xs'>Motion Prompt</Label>
                      <Textarea
                        placeholder="Describe the motion you want (e.g., 'the person turns and smiles', 'camera pans across the scene')"
                        className='mt-1 min-h-[80px]'
                        value={currentStep.config?.video_prompt || ''}
                        onChange={(e) => {
                          setWorkflowSteps(
                            workflowSteps.map((s) =>
                              s.id === currentStep.id
                                ? {
                                    ...s,
                                    config: {
                                      ...s.config,
                                      video_prompt: e.target.value,
                                    },
                                  }
                                : s
                            )
                          )
                        }}
                      />
                    </div>
                    <div className='rounded-lg border border-purple-500/20 bg-purple-500/10 p-3'>
                      <p className='text-muted-foreground text-xs'>
                        <Video className='mr-1 inline h-3 w-3' />
                        Using Wan 2.1 for high-quality 720p video generation
                      </p>
                      <p className='text-muted-foreground mt-1 text-xs'>
                        • 81 frames at 16 FPS (~5 seconds) • Will use image from
                        previous step or generate one • ⏱️ Generation can take
                        2-4 minutes
                      </p>
                    </div>
                  </div>
                )}

                {/* Audio generation */}
                {currentStep.actionId === 'generate-audio' && (
                  <div>
                    <Label className='text-xs'>Audio Description</Label>
                    <Textarea
                      placeholder='Describe the audio/music you want...'
                      className='mt-1 min-h-[60px]'
                      value={currentStep.config?.prompt || ''}
                      onChange={(e) => {
                        setWorkflowSteps(
                          workflowSteps.map((s) =>
                            s.id === currentStep.id
                              ? {
                                  ...s,
                                  config: {
                                    ...s.config,
                                    prompt: e.target.value,
                                  },
                                }
                              : s
                          )
                        )
                      }}
                    />
                  </div>
                )}

                {currentStep.actionId === 'post-social' && (
                  <div>
                    <Label className='text-xs'>Platform</Label>
                    <select
                      className='mt-1 w-full rounded-md border p-2 text-sm'
                      value={currentStep.config?.platform || 'tiktok'}
                      onChange={(e) => {
                        setWorkflowSteps(
                          workflowSteps.map((s) =>
                            s.id === currentStep.id
                              ? {
                                  ...s,
                                  config: {
                                    ...s.config,
                                    platform: e.target.value,
                                  },
                                }
                              : s
                          )
                        )
                      }}
                    >
                      <option value='tiktok'>TikTok</option>
                      <option value='instagram'>Instagram</option>
                      <option value='youtube'>YouTube Shorts</option>
                    </select>
                  </div>
                )}

                {currentStep.actionId === 'schedule-post' && (
                  <div>
                    <Label className='text-xs'>Schedule Time</Label>
                    <Input
                      type='datetime-local'
                      className='mt-1'
                      value={currentStep.config?.schedule_time || ''}
                      onChange={(e) => {
                        setWorkflowSteps(
                          workflowSteps.map((s) =>
                            s.id === currentStep.id
                              ? {
                                  ...s,
                                  config: {
                                    ...s.config,
                                    schedule_time: e.target.value,
                                  },
                                }
                              : s
                          )
                        )
                      }}
                    />
                  </div>
                )}

                {currentStep.actionId === 'notify-team' && (
                  <div>
                    <Label className='text-xs'>Channel</Label>
                    <Input
                      placeholder='#general'
                      className='mt-1'
                      value={currentStep.config?.channel || ''}
                      onChange={(e) => {
                        setWorkflowSteps(
                          workflowSteps.map((s) =>
                            s.id === currentStep.id
                              ? {
                                  ...s,
                                  config: {
                                    ...s.config,
                                    channel: e.target.value,
                                  },
                                }
                              : s
                          )
                        )
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='flex h-full items-center justify-center'>
              <div className='text-center'>
                <Bot className='text-muted-foreground/30 mx-auto mb-3 h-12 w-12' />
                <p className='text-muted-foreground text-sm'>
                  Select a step to configure
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Workflow Tester */}
        {showTester && (
          <Sheet open={showTester} onOpenChange={setShowTester}>
            <SheetContent className='w-full overflow-y-auto sm:max-w-4xl'>
              <SheetHeader>
                <SheetTitle>Test Workflow</SheetTitle>
                <SheetDescription>
                  Run your workflow with test data to see the results
                </SheetDescription>
              </SheetHeader>
              {!import.meta.env.VITE_IMAGE_GEN_URL && (
                <div className='mt-2 mb-4 rounded-md border border-blue-500/20 bg-blue-500/10 p-2'>
                  <p className='text-xs text-blue-600 dark:text-blue-400'>
                    ℹ️ Using mock images. Set VITE_IMAGE_GEN_URL to your Railway
                    backend for real generation.
                  </p>
                </div>
              )}
              <div className='mt-6'>
                <WorkflowTester
                  workflow={{
                    ...selectedWorkflow,
                    steps: [selectedWorkflow.steps[0], ...workflowSteps],
                  }}
                  task={task}
                  onClose={() => setShowTester(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    )
  }

  // Create workflow form
  if (isCreating) {
    return (
      <div className='max-w-md space-y-4'>
        <h3 className='text-lg font-semibold'>Create Workflow</h3>

        <div>
          <Label htmlFor='name'>Name</Label>
          <Input
            id='name'
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder='e.g., Content Pipeline'
            className='mt-1'
          />
        </div>

        <div>
          <Label>Trigger</Label>
          <div className='mt-2 grid grid-cols-2 gap-2'>
            {TRIGGERS.map((trigger) => (
              <div
                key={trigger.id}
                onClick={() => setSelectedTrigger(trigger.id)}
                className={cn(
                  'cursor-pointer rounded-lg border p-3 transition-all',
                  selectedTrigger === trigger.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className='flex items-center gap-2'>
                  <trigger.icon className='h-4 w-4' />
                  <span className='text-sm font-medium'>{trigger.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='flex gap-2'>
          <Button
            onClick={createNewWorkflow}
            disabled={!workflowName || !selectedTrigger}
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

  // Workflow list
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
                    <Workflow className='h-4 w-4' />
                    <h4 className='font-medium'>{workflow.name}</h4>
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
