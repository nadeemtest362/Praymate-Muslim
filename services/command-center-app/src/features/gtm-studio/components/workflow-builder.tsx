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
  Copy,
  Trash2,
  Save,
  CheckCircle2,
  Video,
  MessageSquare,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Mail,
  Database,
  Send,
  Brain,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getRecommendedModel } from '../services/openrouter-service'
import { getRecommendedReplicateModel } from '../services/replicate-service'
import { GTMTask } from '../types'
import { UnifiedModelSelectorV2 } from './unified-model-selector-v2'
import { WorkflowTester } from './workflow-tester'

// Workflow trigger types
const TRIGGERS = [
  {
    id: 'task-status',
    name: 'Task Status Change',
    icon: CheckCircle2,
    description: 'When a task status changes',
  },
  {
    id: 'subtask-complete',
    name: 'All Subtasks Complete',
    icon: Check,
    description: 'When all subtasks are done',
  },
  {
    id: 'schedule',
    name: 'Time Schedule',
    icon: Clock,
    description: 'Run at specific times',
  },
  {
    id: 'manual',
    name: 'Manual Trigger',
    icon: Play,
    description: 'Run workflow manually',
  },
  {
    id: 'milestone',
    name: 'Milestone Reached',
    icon: GitBranch,
    description: 'When a milestone is completed',
  },
]

// Workflow action types
const ACTIONS = [
  {
    id: 'create-video',
    name: 'Generate Video',
    icon: Video,
    category: 'content',
    description: 'Create slideshow or reaction video',
    color: 'from-purple-500 to-pink-500',
    supportsReplicate: true,
  },
  {
    id: 'generate-image',
    name: 'Generate Image',
    icon: Sparkles,
    category: 'content',
    description: 'Create images with AI',
    color: 'from-violet-500 to-purple-500',
    supportsReplicate: true,
  },
  {
    id: 'generate-audio',
    name: 'Generate Audio',
    icon: Zap,
    category: 'content',
    description: 'Create music or voice',
    color: 'from-yellow-500 to-orange-500',
    supportsReplicate: true,
  },
  {
    id: 'post-social',
    name: 'Post to Social',
    icon: Send,
    category: 'social',
    description: 'Post to TikTok, IG, or YouTube',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'analyze-metrics',
    name: 'Analyze Metrics',
    icon: TrendingUp,
    category: 'analytics',
    description: 'Check performance metrics',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'notify-team',
    name: 'Notify Team',
    icon: Users,
    category: 'communication',
    description: 'Send notifications to team',
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'update-task',
    name: 'Update Task',
    icon: CheckCircle2,
    category: 'task',
    description: 'Update task status or details',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    id: 'generate-report',
    name: 'Generate Report',
    icon: FileText,
    category: 'analytics',
    description: 'Create performance report',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'schedule-post',
    name: 'Schedule Content',
    icon: Calendar,
    category: 'social',
    description: 'Schedule future posts',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'crawl-comments',
    name: 'Crawl Comments',
    icon: MessageSquare,
    category: 'engagement',
    description: 'Collect and analyze comments',
    color: 'from-teal-500 to-cyan-500',
  },
]

export interface WorkflowStep {
  id: string
  type: 'trigger' | 'action' | 'condition'
  actionId?: string
  triggerId?: string
  config?: Record<string, any>
  modelId?: string // AI model selection
  modelProvider?: 'openrouter' | 'replicate' // Model provider
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

export function WorkflowBuilder({ task, onClose }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  )
  const [isCreating, setIsCreating] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [selectedTrigger, setSelectedTrigger] = useState<string>('')
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [showActionPicker, setShowActionPicker] = useState(false)
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
      // Use Replicate for media generation
      recommendedModel = getRecommendedReplicateModel(actionId)
      modelProvider = 'replicate'
    } else {
      // Use OpenRouter for language models
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
    setShowActionPicker(false)

    // Open configuration for the new step
    setConfiguringStep(newStep.id)
  }

  const removeStep = (stepId: string) => {
    setWorkflowSteps(workflowSteps.filter((s) => s.id !== stepId))
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

  const toggleWorkflowStatus = (workflow: Workflow) => {
    const newStatus = workflow.status === 'active' ? 'paused' : 'active'
    setWorkflows(
      workflows.map((w) =>
        w.id === workflow.id ? { ...w, status: newStatus } : w
      )
    )
    toast.success(`Workflow ${newStatus === 'active' ? 'activated' : 'paused'}`)
  }

  if (isCreating) {
    return (
      <div className='space-y-6'>
        <div>
          <h3 className='mb-4 text-lg font-semibold'>Create New Workflow</h3>
          {task && (
            <p className='text-muted-foreground mb-4 text-sm'>
              For task: {task.taskNumber} - {task.title}
            </p>
          )}
        </div>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Workflow Name</Label>
            <Input
              id='name'
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder='e.g., Auto-post on completion'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='description'>Description (optional)</Label>
            <Textarea
              id='description'
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder='What does this workflow do?'
              className='min-h-[80px]'
            />
          </div>

          <div className='space-y-2'>
            <Label>Trigger</Label>
            <p className='text-muted-foreground text-sm'>
              When should this workflow run?
            </p>
            <div className='grid grid-cols-1 gap-2'>
              {TRIGGERS.map((trigger) => (
                <Card
                  key={trigger.id}
                  className={cn(
                    'cursor-pointer transition-all',
                    selectedTrigger === trigger.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                  onClick={() => setSelectedTrigger(trigger.id)}
                >
                  <CardContent className='p-3'>
                    <div className='flex items-start gap-3'>
                      <div className='bg-primary/10 rounded-lg p-2'>
                        <trigger.icon className='text-primary h-4 w-4' />
                      </div>
                      <div className='flex-1'>
                        <h4 className='text-sm font-medium'>{trigger.name}</h4>
                        <p className='text-muted-foreground text-xs'>
                          {trigger.description}
                        </p>
                      </div>
                      {selectedTrigger === trigger.id && (
                        <CheckCircle2 className='text-primary h-4 w-4' />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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

  if (selectedWorkflow) {
    const trigger = TRIGGERS.find(
      (t) => t.id === selectedWorkflow.steps[0]?.triggerId
    )

    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>{selectedWorkflow.name}</h3>
            {selectedWorkflow.description && (
              <p className='text-muted-foreground text-sm'>
                {selectedWorkflow.description}
              </p>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Badge
              variant={
                selectedWorkflow.status === 'active' ? 'default' : 'secondary'
              }
            >
              {selectedWorkflow.status}
            </Badge>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => setSelectedWorkflow(null)}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>

        <div className='space-y-4'>
          {/* Trigger */}
          <div>
            <Label className='text-muted-foreground mb-2 text-xs uppercase'>
              Trigger
            </Label>
            <Card className='bg-primary/5 border-primary/20'>
              <CardContent className='p-4'>
                <div className='flex items-center gap-3'>
                  {trigger && (
                    <>
                      <div className='bg-primary/10 rounded-lg p-2'>
                        <trigger.icon className='text-primary h-5 w-5' />
                      </div>
                      <div className='flex-1'>
                        <h4 className='font-medium'>{trigger.name}</h4>
                        <p className='text-muted-foreground text-sm'>
                          {trigger.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div>
            <Label className='text-muted-foreground mb-2 text-xs uppercase'>
              Actions
            </Label>
            <div className='space-y-2'>
              {workflowSteps.map((step, index) => {
                const action = ACTIONS.find((a) => a.id === step.actionId)
                if (!action) return null

                return (
                  <div key={step.id} className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <div className='text-muted-foreground flex items-center gap-1'>
                        <span className='text-xs'>{index + 1}</span>
                        <ArrowRight className='h-3 w-3' />
                      </div>
                      <Card className='flex-1'>
                        <CardContent className='p-3'>
                          <div className='flex items-center gap-3'>
                            <div
                              className={cn(
                                'rounded-lg bg-gradient-to-br p-2',
                                action.color,
                                'text-white'
                              )}
                            >
                              <action.icon className='h-4 w-4' />
                            </div>
                            <div className='flex-1'>
                              <h4 className='text-sm font-medium'>
                                {action.name}
                              </h4>
                              <p className='text-muted-foreground text-xs'>
                                {action.description}
                              </p>
                              {step.modelId && (
                                <div className='mt-1 flex items-center gap-2'>
                                  <Badge variant='outline' className='text-xs'>
                                    <Brain className='mr-1 h-3 w-3' />
                                    {step.modelProvider === 'replicate'
                                      ? 'Replicate'
                                      : 'OpenRouter'}
                                  </Badge>
                                  <Badge
                                    variant='secondary'
                                    className='text-xs'
                                  >
                                    {step.modelId
                                      .split('/')[1]
                                      ?.split(':')[0] || step.modelId}
                                  </Badge>
                                  <Button
                                    size='sm'
                                    variant='ghost'
                                    className='h-5 px-2 text-xs'
                                    onClick={() =>
                                      setConfiguringStep(
                                        configuringStep === step.id
                                          ? null
                                          : step.id
                                      )
                                    }
                                  >
                                    <Settings className='mr-1 h-3 w-3' />
                                    Configure
                                  </Button>
                                </div>
                              )}
                            </div>
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() => removeStep(step.id)}
                            >
                              <X className='h-3 w-3' />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Model Configuration Panel */}
                    {configuringStep === step.id && (
                      <Card className='ml-8 border-dashed'>
                        <CardContent className='p-4'>
                          <UnifiedModelSelectorV2
                            actionId={step.actionId}
                            selectedModelId={step.modelId}
                            selectedProvider={
                              step.modelProvider || 'openrouter'
                            }
                            onModelSelect={(modelId, provider) => {
                              setWorkflowSteps(
                                workflowSteps.map((s) =>
                                  s.id === step.id
                                    ? { ...s, modelId, modelProvider: provider }
                                    : s
                                )
                              )
                            }}
                          />
                          <Button
                            size='sm'
                            variant='outline'
                            className='mt-4 w-full'
                            onClick={() => setConfiguringStep(null)}
                          >
                            Done Configuring
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )
              })}

              {showActionPicker ? (
                <Card className='border-dashed'>
                  <CardContent className='p-4'>
                    <div className='grid grid-cols-2 gap-2'>
                      {ACTIONS.map((action) => (
                        <Button
                          key={action.id}
                          variant='outline'
                          size='sm'
                          className='justify-start'
                          onClick={() => addActionStep(action.id)}
                        >
                          <action.icon className='mr-2 h-3 w-3' />
                          {action.name}
                        </Button>
                      ))}
                    </div>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='mt-2 w-full'
                      onClick={() => setShowActionPicker(false)}
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full border-dashed'
                  onClick={() => setShowActionPicker(true)}
                >
                  <Plus className='mr-2 h-3 w-3' />
                  Add Action
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className='flex gap-2'>
          <Button onClick={saveWorkflow}>
            <Save className='mr-2 h-4 w-4' />
            Save Workflow
          </Button>
          <Button variant='outline' onClick={() => setShowTester(true)}>
            <Play className='mr-2 h-4 w-4' />
            Test Workflow
          </Button>
          <Button
            variant='outline'
            onClick={() => toggleWorkflowStatus(selectedWorkflow)}
          >
            {selectedWorkflow.status === 'active' ? (
              <>
                <Pause className='mr-2 h-4 w-4' />
                Pause
              </>
            ) : (
              <>
                <Play className='mr-2 h-4 w-4' />
                Activate
              </>
            )}
          </Button>
        </div>

        {/* Workflow Tester Dialog */}
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

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold'>Automation Workflows</h3>
          <p className='text-muted-foreground text-sm'>
            Create automated workflows to streamline your GTM tasks
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className='mr-2 h-4 w-4' />
          Create Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='p-8'>
            <div className='text-center'>
              <Workflow className='text-muted-foreground/50 mx-auto mb-4 h-12 w-12' />
              <h4 className='mb-2 font-semibold'>No workflows yet</h4>
              <p className='text-muted-foreground mb-4 text-sm'>
                Create your first workflow to automate repetitive tasks
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className='mr-2 h-4 w-4' />
                Create Workflow
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4'>
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className='hover:border-primary/50 cursor-pointer transition-all'
              onClick={() => setSelectedWorkflow(workflow)}
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <div
                      className={cn(
                        'rounded-lg p-2',
                        workflow.status === 'active'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-gray-500/10 text-gray-500'
                      )}
                    >
                      <Workflow className='h-5 w-5' />
                    </div>
                    <div>
                      <h4 className='font-semibold'>{workflow.name}</h4>
                      <div className='text-muted-foreground flex items-center gap-4 text-sm'>
                        <span>{workflow.steps.length - 1} actions</span>
                        <span>•</span>
                        <span>Run {workflow.runCount} times</span>
                        {workflow.lastRun && (
                          <>
                            <span>•</span>
                            <span>
                              Last run{' '}
                              {new Date(workflow.lastRun).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge
                      variant={
                        workflow.status === 'active' ? 'default' : 'secondary'
                      }
                    >
                      {workflow.status}
                    </Badge>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleWorkflowStatus(workflow)
                      }}
                    >
                      {workflow.status === 'active' ? (
                        <Pause className='h-3 w-3' />
                      ) : (
                        <Play className='h-3 w-3' />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
