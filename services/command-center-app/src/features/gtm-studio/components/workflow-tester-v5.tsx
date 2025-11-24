import React, { useState, useEffect } from 'react'
import { Play, X, Loader2, CheckCircle2, AlertCircle, Grid3x3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { executeWorkflowV3 } from '../services/workflow-execution-service-v3'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface WorkflowTesterV5Props {
  isOpen: boolean
  onClose: () => void
  nodes: any[]
  edges: any[]
  onNodeUpdate?: (nodeId: string, updates: any) => void
}

export function WorkflowTesterV5({
  isOpen,
  onClose,
  nodes,
  edges,
  onNodeUpdate,
}: WorkflowTesterV5Props) {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, string>>({})
  const [nodeProgress, setNodeProgress] = useState<Record<string, any>>({})
  const [selectedTab, setSelectedTab] = useState('overview')

  useEffect(() => {
    if (!isOpen) {
      setResults(null)
      setNodeStatuses({})
      setNodeProgress({})
      setSelectedTab('overview')
    }
  }, [isOpen])

  const runWorkflow = async () => {
    setIsRunning(true)
    setResults(null)
    setNodeStatuses({})
    setNodeProgress({})

    // Initialize all nodes as pending
    const initialStatuses: Record<string, string> = {}
    nodes.forEach((node) => {
      initialStatuses[node.id] = 'pending'
    })
    setNodeStatuses(initialStatuses)

    try {
      // Update nodes to show running state
      nodes.forEach((node) => {
        if (onNodeUpdate) {
          onNodeUpdate(node.id, { status: 'pending' })
        }
      })

      // Create workflow object
      const workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        steps: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          actionId: node.data.actionId,
          triggerId: node.data.triggerId,
          config: node.data.config || {},
          modelId: node.data.modelId,
          modelProvider: node.data.modelProvider,
          // Include batch-specific fields
          variations: node.data.variations,
          strategy: node.data.strategy,
          basePrompt: node.data.basePrompt,
          varyTone: node.data.varyTone,
          varyStyle: node.data.varyStyle,
          varyHook: node.data.varyHook,
          varyLength: node.data.varyLength,
          templates: node.data.templates,
        })),
      }

      // Track which nodes are being executed
      const nodeUpdateHandler = (nodeId: string) => {
        setNodeStatuses((prev) => ({ ...prev, [nodeId]: 'running' }))
        if (onNodeUpdate) {
          onNodeUpdate(nodeId, { status: 'running' })
        }
      }

      // Progress handler for batch nodes
      const progressHandler = (
        nodeId: string,
        progress: number,
        completedCount: number,
        totalCount: number
      ) => {
        setNodeProgress((prev) => ({
          ...prev,
          [nodeId]: { progress, completedCount, totalCount },
        }))
        if (onNodeUpdate) {
          onNodeUpdate(nodeId, {
            progress,
            completedCount,
            totalCount,
          })
        }
      }

      // Execute workflow with progress tracking
      const result = await executeWorkflowV3(workflow, undefined, progressHandler)
      
      setResults(result)

      // Update all nodes to success
      nodes.forEach((node) => {
        setNodeStatuses((prev) => ({ ...prev, [node.id]: 'success' }))
        if (onNodeUpdate) {
          onNodeUpdate(node.id, { status: 'success' })
        }
      })

      toast.success('Workflow completed successfully!')
    } catch (error) {
      console.error('Workflow execution failed:', error)
      toast.error('Workflow execution failed')
      
      // Update failed nodes
      nodes.forEach((node) => {
        if (nodeStatuses[node.id] === 'running') {
          setNodeStatuses((prev) => ({ ...prev, [node.id]: 'error' }))
          if (onNodeUpdate) {
            onNodeUpdate(node.id, { status: 'error' })
          }
        }
      })
    } finally {
      setIsRunning(false)
      
      // Clear statuses after delay
      setTimeout(() => {
        if (onNodeUpdate) {
          nodes.forEach((node) => {
            onNodeUpdate(node.id, { status: undefined })
          })
        }
      }, 5000)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className='h-4 w-4 animate-spin' />
      case 'success':
        return <CheckCircle2 className='h-4 w-4 text-green-500' />
      case 'error':
        return <AlertCircle className='h-4 w-4 text-red-500' />
      default:
        return null
    }
  }

  const renderBatchResults = (batchResults: any) => {
    if (!batchResults || !batchResults.results) return null

    const pipelineTypes = Object.keys(batchResults.results)
    
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <Card className='p-4'>
            <div className='text-sm text-muted-foreground'>Total Variations</div>
            <div className='text-2xl font-bold'>{batchResults.totalVariations}</div>
          </Card>
          <Card className='p-4'>
            <div className='text-sm text-muted-foreground'>Success Rate</div>
            <div className='text-2xl font-bold'>
              {Math.round((batchResults.summary.successful / batchResults.summary.total) * 100)}%
            </div>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className='grid grid-cols-5 w-full'>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            {pipelineTypes.map((type) => (
              <TabsTrigger key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4'>
              {pipelineTypes.map((type) => {
                const items = batchResults.results[type]
                return (
                  <Card key={type} className='p-4'>
                    <div className='flex items-center justify-between mb-2'>
                      <h4 className='font-medium capitalize'>{type} Pipeline</h4>
                      <Badge variant='secondary'>{items.length} variations</Badge>
                    </div>
                    <div className='grid grid-cols-2 gap-2 text-sm'>
                      <div>
                        <span className='text-muted-foreground'>Successful:</span>{' '}
                        {items.filter((i: any) => !i.error).length}
                      </div>
                      <div>
                        <span className='text-muted-foreground'>Failed:</span>{' '}
                        {items.filter((i: any) => i.error).length}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {pipelineTypes.map((type) => (
            <TabsContent key={type} value={type}>
              <ScrollArea className='h-[400px] pr-4'>
                <div className='space-y-4'>
                  {batchResults.results[type].map((item: any, index: number) => (
                    <Card
                      key={item.id}
                      className={cn(
                        'p-4',
                        item.error && 'border-red-500/20 bg-red-50/50 dark:bg-red-950/20'
                      )}
                    >
                      <div className='flex items-start justify-between mb-2'>
                        <div>
                          <Badge variant='outline'>Variant {item.variant}</Badge>
                          <div className='flex gap-2 mt-1'>
                            {item.tone !== 'default' && (
                              <Badge variant='secondary' className='text-xs'>
                                {item.tone}
                              </Badge>
                            )}
                            {item.style !== 'default' && (
                              <Badge variant='secondary' className='text-xs'>
                                {item.style}
                              </Badge>
                            )}
                            {item.hook !== 'default' && (
                              <Badge variant='secondary' className='text-xs'>
                                {item.hook}
                              </Badge>
                            )}
                            {item.length !== '30 seconds' && (
                              <Badge variant='secondary' className='text-xs'>
                                {item.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {item.error ? (
                          <AlertCircle className='h-5 w-5 text-red-500' />
                        ) : (
                          <CheckCircle2 className='h-5 w-5 text-green-500' />
                        )}
                      </div>
                      <div className='space-y-2'>
                        <div>
                          <div className='text-sm font-medium mb-1'>Prompt:</div>
                          <div className='text-sm text-muted-foreground bg-muted/50 p-2 rounded'>
                            {item.prompt}
                          </div>
                        </div>
                        {item.result && (
                          <div>
                            <div className='text-sm font-medium mb-1'>Result:</div>
                            <div className='text-sm bg-muted/30 p-2 rounded max-h-[100px] overflow-y-auto'>
                              {typeof item.result === 'string'
                                ? item.result
                                : JSON.stringify(item.result, null, 2)}
                            </div>
                          </div>
                        )}
                        {item.error && (
                          <div className='text-sm text-red-600 dark:text-red-400'>
                            Error: {item.error}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Test Workflow</DialogTitle>
          <DialogDescription>
            Run your workflow and see the results in real-time
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <div className='space-y-1'>
              <h3 className='text-sm font-medium'>Workflow Nodes</h3>
              <div className='flex gap-2'>
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className='flex items-center gap-1 text-xs text-muted-foreground'
                  >
                    {getStatusIcon(nodeStatuses[node.id])}
                    <span>{node.data.label}</span>
                    {nodeProgress[node.id] && (
                      <Badge variant='secondary' className='ml-1'>
                        {nodeProgress[node.id].completedCount}/
                        {nodeProgress[node.id].totalCount}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Button
              onClick={runWorkflow}
              disabled={isRunning}
              size='sm'
            >
              {isRunning ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Running...
                </>
              ) : (
                <>
                  <Play className='mr-2 h-4 w-4' />
                  Run Workflow
                </>
              )}
            </Button>
          </div>

          {/* Progress bars for batch nodes */}
          {Object.entries(nodeProgress).map(([nodeId, progress]) => {
            const node = nodes.find((n) => n.id === nodeId)
            if (!node || node.type !== 'batch') return null

            return (
              <Card key={nodeId} className='p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <Grid3x3 className='h-4 w-4' />
                    <span className='font-medium'>{node.data.label}</span>
                  </div>
                  <span className='text-sm text-muted-foreground'>
                    {progress.completedCount}/{progress.totalCount} variations
                  </span>
                </div>
                <Progress value={progress.progress} className='h-2' />
              </Card>
            )
          })}

          {results && (
            <div className='space-y-4'>
              <h3 className='text-sm font-medium'>Execution Results</h3>
              
              {/* Check if we have batch results */}
              {results.batchItems && results.batchItems.length > 0 ? (
                renderBatchResults(
                  Object.values(results.results).find(
                    (r: any) => r && r.totalVariations
                  )
                )
              ) : (
                <ScrollArea className='h-[400px] pr-4'>
                  <div className='space-y-4'>
                    {Object.entries(results.results).map(([nodeId, result]) => {
                      const node = nodes.find((n) => n.id === nodeId)
                      return (
                        <Card key={nodeId} className='p-4'>
                          <div className='flex items-center justify-between mb-2'>
                            <h4 className='font-medium'>
                              {node?.data.label || nodeId}
                            </h4>
                            <Badge
                              variant={
                                nodeStatuses[nodeId] === 'success'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {nodeStatuses[nodeId]}
                            </Badge>
                          </div>
                          <pre className='text-xs bg-muted p-2 rounded overflow-x-auto'>
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}