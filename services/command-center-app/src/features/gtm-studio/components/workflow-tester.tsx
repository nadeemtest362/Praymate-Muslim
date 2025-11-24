import React, { useState } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
}

const resultIcons = {
  image: Image,
  video: Video,
  audio: Music,
  social_post: MessageSquare,
  analytics: TrendingUp,
  report: FileText,
  notification: Info,
  task_update: CheckCircle2,
  scheduled_post: MessageSquare,
  comment_analysis: MessageSquare,
}

export function WorkflowTester({
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

  const runWorkflow = async () => {
    setIsExecuting(true)
    setExecutionResults([])
    setFinalResult(null)

    try {
      // Initialize results for each step
      const initialResults = workflow.steps
        .filter((s) => s.type === 'action')
        .map((step) => ({
          step: step.actionId || 'unknown',
          status: 'pending' as const,
        }))
      setExecutionResults(initialResults)

      // Execute workflow
      const result = await testWorkflow(workflow, { task })

      if (result.success) {
        setFinalResult(result.results)
        toast.success('Workflow completed successfully!')

        // Update all results to success
        setExecutionResults(
          initialResults.map((r) => ({
            ...r,
            status: 'success',
            result:
              result.results[
                Object.keys(result.results).find((k) => k.includes(r.step)) ||
                  ''
              ],
            timestamp: new Date().toISOString(),
          }))
        )
      } else {
        throw new Error(result.error || 'Workflow execution failed')
      }
    } catch (error) {
      console.error('Workflow execution error:', error)
      toast.error(error.message || 'Workflow execution failed')

      // Mark failed step
      setExecutionResults((prev) =>
        prev.map((r, i) => ({
          ...r,
          status:
            i === prev.findIndex((p) => p.status === 'pending')
              ? 'error'
              : r.status,
          error:
            i === prev.findIndex((p) => p.status === 'pending')
              ? error.message
              : r.error,
        }))
      )
    } finally {
      setIsExecuting(false)
    }
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
                    <div className='space-y-2'>
                      <div className='group relative inline-block'>
                        <img
                          src={result.url}
                          alt='Generated'
                          className='max-h-[400px] max-w-full cursor-pointer rounded-lg border object-contain shadow-sm transition-transform hover:scale-[1.02]'
                          crossOrigin='anonymous'
                          onClick={() => window.open(result.url, '_blank')}
                          onError={(e) => {
                            console.error('Image failed to load:', result.url)
                            // Optionally set a fallback image
                            ;(e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23f0f0f0"/%3E%3Ctext x="200" y="200" text-anchor="middle" font-family="Arial" font-size="18" fill="%23666"%3EImage failed to load%3C/text%3E%3C/svg%3E'
                          }}
                        />
                        <div className='pointer-events-none absolute inset-0 rounded-lg bg-black/0 transition-colors group-hover:bg-black/10' />
                        <div className='absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100'>
                          <Badge variant='secondary' className='shadow-lg'>
                            <Image className='mr-1 h-3 w-3' />
                            View full size
                          </Badge>
                        </div>
                      </div>
                      {result.prompt && (
                        <p className='text-muted-foreground text-xs italic'>
                          Prompt: {result.prompt}
                        </p>
                      )}
                      <div className='text-muted-foreground text-xs'>
                        <a
                          href={result.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='hover:underline'
                        >
                          {result.url}
                        </a>
                      </div>
                    </div>
                  ) : result.type === 'video' ? (
                    <video
                      src={result.url}
                      controls
                      className='w-full rounded-lg border shadow-sm'
                    />
                  ) : result.type === 'audio' ? (
                    <audio src={result.url} controls className='w-full' />
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

              {result.caption && (
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Caption:</p>
                  <p className='text-muted-foreground text-sm whitespace-pre-wrap'>
                    {result.caption}
                  </p>
                </div>
              )}

              {result.analysis && (
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Analysis:</p>
                  <p className='text-muted-foreground text-sm whitespace-pre-wrap'>
                    {result.analysis}
                  </p>
                </div>
              )}

              {result.metrics && (
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Metrics:</p>
                  <div className='grid grid-cols-2 gap-2 text-sm'>
                    {Object.entries(result.metrics).map(([key, value]) => (
                      <div key={key} className='flex justify-between'>
                        <span className='text-muted-foreground capitalize'>
                          {key.replace('_', ' ')}:
                        </span>
                        <span className='font-medium'>{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.timestamp && (
                <p className='text-muted-foreground text-xs'>
                  Generated at {new Date(result.timestamp).toLocaleString()}
                </p>
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
                {workflow.steps
                  .filter((s) => s.type === 'action')
                  .map((step, index) => {
                    const result = executionResults[index]
                    const action = step.actionId

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          'flex items-center gap-3 rounded-lg p-3 transition-all',
                          result?.status === 'success' &&
                            'border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20',
                          result?.status === 'error' &&
                            'border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20',
                          result?.status === 'running' &&
                            'border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20',
                          result?.status === 'pending' &&
                            'border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                        )}
                      >
                        <div className='flex items-center gap-2'>
                          {result?.status === 'pending' && (
                            <div className='h-4 w-4 rounded-full border-2 border-gray-400' />
                          )}
                          {result?.status === 'running' && (
                            <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                          )}
                          {result?.status === 'success' && (
                            <CheckCircle2 className='h-4 w-4 text-green-500' />
                          )}
                          {result?.status === 'error' && (
                            <XCircle className='h-4 w-4 text-red-500' />
                          )}
                        </div>
                        <div className='flex-1'>
                          <p className='text-foreground text-sm font-medium'>
                            {action}
                          </p>
                          {result?.error && (
                            <p className='mt-1 text-xs text-red-600 dark:text-red-400'>
                              {result.error}
                            </p>
                          )}
                          {result?.timestamp && (
                            <p className='text-muted-foreground mt-1 text-xs'>
                              Completed at{' '}
                              {new Date(result.timestamp).toLocaleTimeString()}
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
