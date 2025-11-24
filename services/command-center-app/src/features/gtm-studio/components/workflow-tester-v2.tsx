import React, { useState, useEffect, useRef } from 'react'
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
  Clock,
  Zap,
  Timer,
  Pause,
  Sparkles,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  executeWorkflow,
  testWorkflow,
} from '../services/workflow-execution-service'
import { Workflow } from './workflow-builder'

interface WorkflowTesterProps {
  workflow: Workflow
  task?: any
  onClose?: () => void
}

interface ExecutionResult {
  step: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: any
  error?: string
  timestamp?: string
  progress?: number
  estimatedTime?: number
}

const resultIcons = {
  image: Image,
  video: Video,
  audio: Music,
  contextual_image: Sparkles,
  social_post: MessageSquare,
  analytics: TrendingUp,
  report: FileText,
  notification: Info,
  task_update: CheckCircle2,
  scheduled_post: MessageSquare,
  comment_analysis: MessageSquare,
}

// TODO: Replace with real-time progress from Replicate API when we have bandwidth
// These estimates are based on actual measured execution times from production usage
const actionDetails = {
  'generate-image': { icon: Image, name: 'Generate Image', estimatedTime: 8 },
  'create-video': { icon: Video, name: 'Generate Video', estimatedTime: 180 }, // 3 minutes avg on Wan 2.1
  'contextual-image': {
    icon: Sparkles,
    name: 'Contextual Image',
    estimatedTime: 6,
  },
  'generate-audio': { icon: Music, name: 'Generate Audio', estimatedTime: 10 },
  'generate-script': {
    icon: FileText,
    name: 'Generate Script',
    estimatedTime: 3,
  },
  'post-social': { icon: Send, name: 'Post to Social', estimatedTime: 2 },
  'analyze-metrics': {
    icon: TrendingUp,
    name: 'Analyze Metrics',
    estimatedTime: 4,
  },
}

export function WorkflowTesterV2({
  workflow,
  task,
  onClose,
}: WorkflowTesterProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>(
    []
  )
  const [finalResult, setFinalResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('execution')
  const [currentStep, setCurrentStep] = useState<number>(-1)
  const [executionProgress, setExecutionProgress] = useState(0)
  const [executionStartTime, setExecutionStartTime] = useState<Date | null>(
    null
  )
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Timer effect
  useEffect(() => {
    if (isExecuting && executionStartTime && !isPaused) {
      const timer = setInterval(() => {
        setElapsedTime(
          Math.floor((Date.now() - executionStartTime.getTime()) / 1000)
        )
      }, 100)
      return () => clearInterval(timer)
    }
  }, [isExecuting, executionStartTime, isPaused])

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      pollingIntervals.current.forEach((interval) => clearInterval(interval))
      pollingIntervals.current.clear()
    }
  }, [])

  // Simulate step-by-step execution with realistic polling
  const simulateStepExecution = async (stepIndex: number, step: any) => {
    if (isPaused) return

    const actionDetail = actionDetails[step.actionId] || {
      name: 'Process Step',
      estimatedTime: 5,
    }

    // Mark step as running
    setExecutionResults((prev) =>
      prev.map((r, i) =>
        i === stepIndex
          ? {
              ...r,
              status: 'running' as const,
              estimatedTime: actionDetail.estimatedTime,
            }
          : r
      )
    )

    const duration = actionDetail.estimatedTime * 1000
    const startTime = Date.now()

    // Start polling for this step
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(() => {
        if (isPaused) return

        const elapsed = Date.now() - startTime
        const progress = Math.min((elapsed / duration) * 100, 100)

        // Update step progress
        setExecutionResults((prev) =>
          prev.map((r, i) => (i === stepIndex ? { ...r, progress } : r))
        )

        // Update overall progress
        const stepWeight =
          100 / workflow.steps.filter((s) => s.type === 'action').length
        const baseProgress = stepIndex * stepWeight
        const stepProgress = (progress / 100) * stepWeight
        setExecutionProgress(baseProgress + stepProgress)

        if (elapsed >= duration) {
          clearInterval(pollInterval)
          pollingIntervals.current.delete(`step-${stepIndex}`)
          resolve(true)
        }
      }, 50)

      pollingIntervals.current.set(`step-${stepIndex}`, pollInterval)
    })
  }

  const runWorkflow = async () => {
    setIsExecuting(true)
    setExecutionResults([])
    setFinalResult(null)
    setCurrentStep(0)
    setExecutionProgress(0)
    setExecutionStartTime(new Date())
    setElapsedTime(0)
    setIsPaused(false)

    try {
      // Initialize results for each step
      const actionSteps = workflow.steps.filter((s) => s.type === 'action')
      const initialResults = actionSteps.map((step) => {
        const actionDetail = actionDetails[step.actionId] || {
          name: 'Process Step',
          estimatedTime: 5,
        }
        return {
          step: actionDetail.name,
          status: 'pending' as const,
          progress: 0,
          estimatedTime: actionDetail.estimatedTime,
        }
      })
      setExecutionResults(initialResults)

      // Calculate total estimated time
      const totalEstimatedTime = initialResults.reduce(
        (sum, r) => sum + (r.estimatedTime || 0),
        0
      )
      const totalMinutes = Math.round(totalEstimatedTime / 60)
      const displayTime =
        totalEstimatedTime < 60
          ? `${totalEstimatedTime} seconds`
          : `${totalMinutes} minute${totalMinutes > 1 ? 's' : ''}`
      toast.info(`Starting workflow execution (~${displayTime})`)

      // Start progress simulation in the background
      const progressPromise = (async () => {
        for (let i = 0; i < actionSteps.length; i++) {
          setCurrentStep(i)

          // Start simulating progress for this step
          const stepPromise = simulateStepExecution(i, actionSteps[i])

          // Wait for either simulation to complete or actual execution to finish
          await stepPromise

          // Don't mark as complete here - let the actual execution do that
        }
      })()

      // Execute actual workflow in parallel
      const result = await testWorkflow(workflow, { task })

      if (result.success) {
        setFinalResult(result.results)
        setExecutionProgress(100)
        toast.success('Workflow completed successfully!')

        // Update results with actual data
        setExecutionResults((prev) =>
          prev.map((r, i) => ({
            ...r,
            result: result.results[Object.keys(result.results)[i]] || null,
          }))
        )
      } else {
        throw new Error(result.error || 'Workflow execution failed')
      }
    } catch (error) {
      console.error('Workflow execution error:', error)
      toast.error(error.message || 'Workflow execution failed')

      // Mark current step as failed
      if (currentStep >= 0) {
        setExecutionResults((prev) =>
          prev.map((r, i) => ({
            ...r,
            status: i === currentStep ? 'error' : r.status,
            error: i === currentStep ? error.message : r.error,
          }))
        )
      }
    } finally {
      setIsExecuting(false)
      setExecutionStartTime(null)
      pollingIntervals.current.forEach((interval) => clearInterval(interval))
      pollingIntervals.current.clear()
    }
  }

  const pauseExecution = () => {
    setIsPaused(!isPaused)
    toast.info(isPaused ? 'Execution resumed' : 'Execution paused')
  }

  const renderResult = (result: any) => {
    if (!result) return null

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
            <>
              <div className='flex items-center gap-2 text-sm'>
                <Timer className='h-4 w-4' />
                <span className='font-mono'>
                  {Math.floor(elapsedTime / 60)}:
                  {(elapsedTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <Button size='sm' variant='outline' onClick={pauseExecution}>
                {isPaused ? (
                  <>
                    <Play className='mr-1.5 h-3.5 w-3.5' />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className='mr-1.5 h-3.5 w-3.5' />
                    Pause
                  </>
                )}
              </Button>
            </>
          )}
          <Button onClick={runWorkflow} disabled={isExecuting}>
            {isExecuting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Executing...
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

      {/* Overall Progress */}
      {isExecuting && (
        <Card>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Zap className='text-primary h-4 w-4' />
                  <span className='text-sm font-medium'>Overall Progress</span>
                </div>
                <span className='text-sm font-medium'>
                  {Math.round(executionProgress)}%
                </span>
              </div>
              <Progress value={executionProgress} className='h-2' />
              <div className='text-muted-foreground flex items-center justify-between text-xs'>
                <span>
                  Step {currentStep + 1} of{' '}
                  {workflow.steps.filter((s) => s.type === 'action').length}
                </span>
                <span>{isPaused ? 'Paused' : 'Running'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                {executionResults.map((result, index) => {
                  const status = result.status
                  const StepIcon =
                    Object.values(actionDetails).find(
                      (d) => d.name === result.step
                    )?.icon || Zap

                  return (
                    <div
                      key={index}
                      className={cn(
                        'relative flex items-center gap-3 overflow-hidden rounded-lg p-3 transition-all',
                        status === 'pending' &&
                          'bg-muted/50 border-border border',
                        status === 'running' &&
                          'border border-blue-500/20 bg-blue-500/10',
                        status === 'success' &&
                          'border border-green-500/20 bg-green-500/10',
                        status === 'error' &&
                          'border border-red-500/20 bg-red-500/10'
                      )}
                    >
                      {/* Progress bar background */}
                      {status === 'running' &&
                        result.progress !== undefined && (
                          <div
                            className='absolute inset-0 bg-blue-500/10 transition-all duration-300'
                            style={{ width: `${result.progress}%` }}
                          />
                        )}

                      <div className='relative flex flex-1 items-center gap-3'>
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg',
                            status === 'pending' && 'bg-muted',
                            status === 'running' && 'bg-blue-500/20',
                            status === 'success' && 'bg-green-500/20',
                            status === 'error' && 'bg-red-500/20'
                          )}
                        >
                          {status === 'pending' && (
                            <Clock className='text-muted-foreground h-5 w-5' />
                          )}
                          {status === 'running' && (
                            <Loader2 className='h-5 w-5 animate-spin text-blue-500' />
                          )}
                          {status === 'success' && (
                            <CheckCircle2 className='h-5 w-5 text-green-500' />
                          )}
                          {status === 'error' && (
                            <XCircle className='h-5 w-5 text-red-500' />
                          )}
                        </div>

                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <StepIcon className='text-muted-foreground h-4 w-4' />
                            <p className='text-sm font-medium'>{result.step}</p>
                            {result.estimatedTime && status === 'pending' && (
                              <Badge variant='outline' className='text-xs'>
                                ~
                                {result.estimatedTime < 60
                                  ? `${result.estimatedTime}s`
                                  : `${Math.round(result.estimatedTime / 60)}min`}
                              </Badge>
                            )}
                          </div>
                          {status === 'running' &&
                            result.progress !== undefined && (
                              <>
                                <div className='mt-1 flex items-center gap-2'>
                                  <Progress
                                    value={result.progress}
                                    className='h-1 flex-1'
                                  />
                                  <span className='text-muted-foreground text-xs'>
                                    {Math.round(result.progress)}%
                                  </span>
                                  {result.step === 'Generate Video' &&
                                    result.progress < 100 && (
                                      <span className='text-muted-foreground text-xs'>
                                        (
                                        {Math.round(
                                          (180 * result.progress) / 100
                                        )}
                                        s / 3min)
                                      </span>
                                    )}
                                </div>
                                {result.step === 'Generate Video' &&
                                  result.progress > 10 && (
                                    <p className='text-muted-foreground mt-1 text-xs'>
                                      🎬 Video is rendering on Replicate
                                      servers...
                                    </p>
                                  )}
                              </>
                            )}
                          {result.error && (
                            <p className='mt-1 text-xs text-red-600 dark:text-red-400'>
                              {result.error}
                            </p>
                          )}
                          {result.timestamp && (
                            <p className='text-muted-foreground mt-1 text-xs'>
                              Completed in{' '}
                              {result.estimatedTime < 60
                                ? `${result.estimatedTime}s`
                                : `${Math.round(result.estimatedTime / 60)}min`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='results' className='space-y-4'>
          {finalResult ? (
            <div className='space-y-4'>
              {Object.values(finalResult).map((result: any, index) => (
                <div key={index}>{renderResult(result)}</div>
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
