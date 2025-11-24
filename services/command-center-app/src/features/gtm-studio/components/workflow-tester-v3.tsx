import React, { useState, useEffect } from 'react'
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  FileText,
  Image,
  Video,
  Music,
  MessageSquare,
  TrendingUp,
  Timer,
  Sparkles,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { executeWorkflow } from '../services/workflow-execution-service'
import { Workflow } from './workflow-builder'

interface WorkflowTesterProps {
  workflow: Workflow
  task?: any
  onClose?: () => void
}

interface StepResult {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  startTime?: number
  endTime?: number
  duration?: number
  result?: any
  error?: string
}

const actionIcons = {
  'generate-image': Image,
  'create-video': Video,
  'contextual-image': Sparkles,
  'generate-audio': Music,
  'generate-script': FileText,
  'post-social': Send,
  'analyze-metrics': TrendingUp,
}

const actionNames = {
  'generate-image': 'Generate Image',
  'create-video': 'Generate Video',
  'contextual-image': 'Contextual Image',
  'generate-audio': 'Generate Audio',
  'generate-script': 'Generate Script',
  'post-social': 'Post to Social',
  'analyze-metrics': 'Analyze Metrics',
}

export function WorkflowTesterV3({
  workflow,
  task,
  onClose,
}: WorkflowTesterProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [stepResults, setStepResults] = useState<StepResult[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('execution')

  // Timer effect
  useEffect(() => {
    if (isExecuting && startTime) {
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 100)
      return () => clearInterval(timer)
    }
  }, [isExecuting, startTime])

  const runWorkflow = async () => {
    setIsExecuting(true)
    setStartTime(Date.now())
    setElapsedTime(0)
    setCurrentStepIndex(0)

    // Initialize step results
    const actionSteps = workflow.steps.filter((s) => s.type === 'action')
    const initialResults: StepResult[] = actionSteps.map((step) => ({
      id: step.id,
      name: actionNames[step.actionId] || step.actionId || 'Unknown Action',
      status: 'pending',
    }))
    setStepResults(initialResults)

    try {
      // Create a modified workflow execution that provides step callbacks
      const executionContext = {
        task: task || {
          id: 'test-task',
          title: 'Test Task',
          description: 'This is a test task for workflow execution',
        },
        variables: {},
      }

      const results: Record<string, any> = {}

      // Execute each step sequentially
      for (let i = 0; i < actionSteps.length; i++) {
        const step = actionSteps[i]
        setCurrentStepIndex(i)

        // Mark step as running
        const stepStartTime = Date.now()
        setStepResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: 'running', startTime: stepStartTime }
              : r
          )
        )

        try {
          // Execute the actual step
          console.log(
            `Executing step ${i + 1}/${actionSteps.length}: ${step.actionId}`
          )

          // Import and execute step directly
          const { executeWorkflowStep } = await import(
            '../services/workflow-execution-service'
          )
          const result = await executeWorkflowStep(step, {
            workflow,
            task: executionContext.task,
            variables: executionContext.variables,
            results,
          })

          results[step.id] = result

          // Mark step as completed
          const stepEndTime = Date.now()
          const duration = Math.round((stepEndTime - stepStartTime) / 1000)

          setStepResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    status: 'success',
                    endTime: stepEndTime,
                    duration,
                    result,
                  }
                : r
            )
          )

          console.log(`✅ Step "${step.actionId}" completed in ${duration}s`)
        } catch (error: any) {
          // Mark step as failed
          const stepEndTime = Date.now()
          const duration = Math.round((stepEndTime - stepStartTime) / 1000)

          setStepResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    status: 'error',
                    endTime: stepEndTime,
                    duration,
                    error: error.message,
                  }
                : r
            )
          )

          throw error
        }
      }

      toast.success('Workflow completed successfully!')
      setActiveTab('results')
    } catch (error: any) {
      console.error('Workflow execution error:', error)
      toast.error(error.message || 'Workflow execution failed')
    } finally {
      setIsExecuting(false)
      setCurrentStepIndex(-1)
    }
  }

  const renderResult = (result: any) => {
    if (!result) return null

    const resultIcons = {
      image: Image,
      video: Video,
      audio: Music,
      contextual_image: Sparkles,
      social_post: MessageSquare,
      analytics: TrendingUp,
      report: FileText,
    }

    const Icon = resultIcons[result.type] || Info

    return (
      <Card className='border-dashed'>
        <CardContent className='p-4'>
          <div className='flex items-start gap-3'>
            <div className='bg-primary/10 rounded-lg p-2'>
              <Icon className='text-primary h-4 w-4' />
            </div>
            <div className='flex-1 space-y-2'>
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>{result.type}</Badge>
                {result.platform && (
                  <Badge variant='secondary'>{result.platform}</Badge>
                )}
              </div>

              {result.url && (
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Generated Content:</p>
                  {result.type === 'image' ||
                  result.type === 'contextual_image' ? (
                    <img
                      src={result.url}
                      alt='Generated'
                      className='max-h-[400px] max-w-full cursor-pointer rounded-lg border shadow-sm transition-transform hover:scale-[1.02]'
                      onClick={() => window.open(result.url, '_blank')}
                    />
                  ) : result.type === 'video' ? (
                    <video
                      src={result.url}
                      controls
                      className='max-h-[400px] max-w-full rounded-lg border shadow-sm'
                    />
                  ) : (
                    <a
                      href={result.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-sm text-blue-500 hover:underline'
                    >
                      View {result.type}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold'>Test Workflow</h3>
          <p className='text-muted-foreground text-sm'>
            Run your workflow with test data to see the results
          </p>
        </div>
        <div className='flex items-center gap-3'>
          {isExecuting && (
            <div className='flex items-center gap-2 text-sm'>
              <Timer className='h-4 w-4' />
              <span className='font-mono'>
                {Math.floor(elapsedTime / 60)}:
                {(elapsedTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
          <Button onClick={runWorkflow} disabled={isExecuting}>
            {isExecuting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Running Step {currentStepIndex + 1} of {stepResults.length}
              </>
            ) : (
              <>
                <Play className='mr-2 h-4 w-4' />
                Run Workflow
              </>
            )}
          </Button>
        </div>
      </div>

      {task && (
        <Alert>
          <Info className='h-4 w-4' />
          <AlertTitle>Test Context</AlertTitle>
          <AlertDescription>
            Testing with task: {task.taskNumber} - {task.title}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='execution'>Execution Log</TabsTrigger>
          <TabsTrigger value='results'>Results</TabsTrigger>
        </TabsList>

        <TabsContent value='execution' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Workflow Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {stepResults.map((step, index) => {
                  const Icon =
                    actionIcons[
                      workflow.steps.filter((s) => s.type === 'action')[index]
                        ?.actionId
                    ] || FileText

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg p-3 transition-all',
                        step.status === 'pending' &&
                          'bg-muted/50 border-border border',
                        step.status === 'running' &&
                          'animate-pulse border border-blue-500/20 bg-blue-500/10',
                        step.status === 'success' &&
                          'border border-green-500/20 bg-green-500/10',
                        step.status === 'error' &&
                          'border border-red-500/20 bg-red-500/10'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          step.status === 'pending' && 'bg-muted',
                          step.status === 'running' && 'bg-blue-500/20',
                          step.status === 'success' && 'bg-green-500/20',
                          step.status === 'error' && 'bg-red-500/20'
                        )}
                      >
                        {step.status === 'pending' && (
                          <Icon className='text-muted-foreground h-5 w-5' />
                        )}
                        {step.status === 'running' && (
                          <Loader2 className='h-5 w-5 animate-spin text-blue-500' />
                        )}
                        {step.status === 'success' && (
                          <CheckCircle2 className='h-5 w-5 text-green-500' />
                        )}
                        {step.status === 'error' && (
                          <XCircle className='h-5 w-5 text-red-500' />
                        )}
                      </div>

                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <p className='text-sm font-medium'>{step.name}</p>
                          {step.status === 'running' && (
                            <Badge
                              variant='secondary'
                              className='animate-pulse text-xs'
                            >
                              Processing...
                            </Badge>
                          )}
                        </div>
                        {step.duration !== undefined && (
                          <p className='text-muted-foreground mt-1 text-xs'>
                            Completed in {step.duration}s
                          </p>
                        )}
                        {step.error && (
                          <p className='mt-1 text-xs text-red-600 dark:text-red-400'>
                            {step.error}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='results' className='space-y-4'>
          {stepResults.some((r) => r.result) ? (
            <div className='space-y-4'>
              {stepResults
                .filter((r) => r.result)
                .map((step) => (
                  <div key={step.id}>{renderResult(step.result)}</div>
                ))}
            </div>
          ) : (
            <Card className='border-dashed'>
              <CardContent className='p-8'>
                <div className='text-center'>
                  <Info className='text-muted-foreground/50 mx-auto mb-4 h-12 w-12' />
                  <h4 className='mb-2 font-semibold'>No Results Yet</h4>
                  <p className='text-muted-foreground text-sm'>
                    Run the workflow to see the results here
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
