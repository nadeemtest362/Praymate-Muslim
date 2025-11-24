import React, { useState } from 'react'
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  GitBranch,
  GitMerge,
  Image,
  Video,
  Music,
  FileText,
  Download,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { executeWorkflowV2 } from '../services/workflow-execution-service-v2'

export function WorkflowTesterV4({
  workflow,
  onClose,
}: {
  workflow: any
  onClose: () => void
}) {
  const [running, setRunning] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [executionResults, setExecutionResults] = useState<any>(null)
  const [nodeStatuses, setNodeStatuses] = useState<
    Record<string, 'pending' | 'running' | 'completed' | 'error'>
  >({})
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')

  const runWorkflow = async () => {
    setRunning(true)
    setExecutionResults(null)
    setNodeStatuses({})
    setProgress(0)

    try {
      // Initialize all nodes as pending
      const statuses: Record<string, any> = {}
      workflow.nodes?.forEach((node: any) => {
        statuses[node.id] = 'pending'
      })
      setNodeStatuses(statuses)

      // Mock progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      // Execute workflow with enhanced service
      const results = await executeWorkflowV2(workflow, {
        variables: { testInput },
      })

      clearInterval(progressInterval)
      setProgress(100)

      // Update node statuses based on results
      Object.keys(results.results || {}).forEach((nodeId) => {
        statuses[nodeId] = 'completed'
      })
      setNodeStatuses(statuses)

      setExecutionResults(results)

      if (results.success) {
        toast.success('Workflow completed successfully!')
      } else {
        toast.error('Workflow failed: ' + results.error)
      }
    } catch (error) {
      console.error('Workflow execution error:', error)
      toast.error('Failed to execute workflow')
      setExecutionResults({ success: false, error: error.message })
    } finally {
      setRunning(false)
    }
  }

  const getNodeStatus = (nodeId: string) => {
    return nodeStatuses[nodeId] || 'pending'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className='h-4 w-4 text-green-500' />
      case 'running':
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
      case 'error':
        return <XCircle className='h-4 w-4 text-red-500' />
      default:
        return <AlertCircle className='h-4 w-4 text-gray-400' />
    }
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className='h-4 w-4' />
      case 'video':
        return <Video className='h-4 w-4' />
      case 'audio':
        return <Music className='h-4 w-4' />
      case 'script':
        return <FileText className='h-4 w-4' />
      default:
        return null
    }
  }

  // Group results by pipeline type
  const groupResultsByPipeline = () => {
    if (!executionResults?.results) return {}

    const grouped: Record<string, any[]> = {
      jesus: [],
      bible: [],
      testimony: [],
      prayer: [],
      other: [],
    }

    Object.entries(executionResults.results).forEach(
      ([nodeId, result]: [string, any]) => {
        // Find the node to get its pipeline type
        const node = workflow.nodes?.find((n: any) => n.id === nodeId)
        const pipelineType = node?.data?.pipelineType || 'other'

        if (grouped[pipelineType]) {
          grouped[pipelineType].push({
            nodeId,
            ...result,
            nodeName: node?.data?.label,
          })
        } else {
          grouped.other.push({ nodeId, ...result, nodeName: node?.data?.label })
        }
      }
    )

    return grouped
  }

  const pipelineResults = groupResultsByPipeline()

  return (
    <div className='space-y-6'>
      {/* Test Input */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Play className='h-5 w-5' />
            Test Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <Label>Test Input (Optional)</Label>
            <Textarea
              placeholder='Enter test data or leave empty for default...'
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className='mt-1'
              rows={3}
            />
          </div>

          <Button
            onClick={runWorkflow}
            disabled={running}
            className='w-full'
            size='lg'
          >
            {running ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Running Workflow...
              </>
            ) : (
              <>
                <Play className='mr-2 h-4 w-4' />
                Run Workflow
              </>
            )}
          </Button>

          {running && (
            <div className='space-y-2'>
              <div className='text-muted-foreground flex justify-between text-sm'>
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className='h-2' />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Results */}
      {executionResults && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center justify-between'>
              <span className='flex items-center gap-2'>
                Results
                <Badge
                  variant={executionResults.success ? 'default' : 'destructive'}
                >
                  {executionResults.success ? 'Success' : 'Failed'}
                </Badge>
              </span>
              {executionResults.summary && (
                <div className='flex gap-2 text-sm'>
                  <Badge variant='outline'>
                    {executionResults.summary.mediaGenerated.images} images
                  </Badge>
                  <Badge variant='outline'>
                    {executionResults.summary.mediaGenerated.videos} videos
                  </Badge>
                  <Badge variant='outline'>
                    {executionResults.summary.scriptsGenerated} scripts
                  </Badge>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className='grid w-full grid-cols-5'>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
                <TabsTrigger value='jesus'>Jesus</TabsTrigger>
                <TabsTrigger value='bible'>Bible</TabsTrigger>
                <TabsTrigger value='testimony'>Testimony</TabsTrigger>
                <TabsTrigger value='prayer'>Prayer</TabsTrigger>
              </TabsList>

              <TabsContent value='overview' className='mt-4'>
                <ScrollArea className='h-[400px] pr-4'>
                  <div className='space-y-4'>
                    {/* Node Execution Status */}
                    <div>
                      <h4 className='mb-2 font-medium'>Execution Flow</h4>
                      <div className='space-y-2'>
                        {workflow.nodes?.map((node: any) => (
                          <div
                            key={node.id}
                            className='bg-muted/50 flex items-center justify-between rounded-lg p-3'
                          >
                            <div className='flex items-center gap-3'>
                              {getStatusIcon(getNodeStatus(node.id))}
                              <div>
                                <div className='text-sm font-medium'>
                                  {node.data.label}
                                </div>
                                <div className='text-muted-foreground text-xs'>
                                  {node.type} • {node.id}
                                </div>
                              </div>
                            </div>
                            {node.type === 'splitter' && (
                              <Badge variant='outline' className='text-xs'>
                                <GitBranch className='mr-1 h-3 w-3' />
                                Parallel
                              </Badge>
                            )}
                            {node.type === 'merge' && (
                              <Badge variant='outline' className='text-xs'>
                                <GitMerge className='mr-1 h-3 w-3' />
                                Collect
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Error Details */}
                    {executionResults.error && (
                      <div className='bg-destructive/10 border-destructive/20 rounded-lg border p-4'>
                        <h4 className='text-destructive mb-1 font-medium'>
                          Error
                        </h4>
                        <p className='text-muted-foreground text-sm'>
                          {executionResults.error}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Pipeline-specific tabs */}
              {['jesus', 'bible', 'testimony', 'prayer'].map((pipelineType) => (
                <TabsContent
                  key={pipelineType}
                  value={pipelineType}
                  className='mt-4'
                >
                  <ScrollArea className='h-[400px] pr-4'>
                    <div className='space-y-4'>
                      {pipelineResults[pipelineType]?.length > 0 ? (
                        pipelineResults[pipelineType].map(
                          (result: any, index: number) => (
                            <Card key={index}>
                              <CardHeader className='py-3'>
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center gap-2'>
                                    {getMediaIcon(result.type)}
                                    <span className='text-sm font-medium'>
                                      {result.nodeName}
                                    </span>
                                  </div>
                                  <Badge variant='outline' className='text-xs'>
                                    {result.type}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className='pt-0'>
                                {/* Image result */}
                                {result.type === 'image' && result.url && (
                                  <div className='space-y-2'>
                                    <img
                                      src={result.url}
                                      alt='Generated'
                                      className='max-h-64 w-full rounded-lg object-cover'
                                    />
                                    <div className='flex gap-2'>
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        asChild
                                      >
                                        <a
                                          href={result.url}
                                          target='_blank'
                                          rel='noopener noreferrer'
                                        >
                                          <Eye className='mr-1 h-3.5 w-3.5' />
                                          View Full
                                        </a>
                                      </Button>
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        asChild
                                      >
                                        <a href={result.url} download>
                                          <Download className='mr-1 h-3.5 w-3.5' />
                                          Download
                                        </a>
                                      </Button>
                                    </div>
                                    {result.prompt && (
                                      <p className='text-muted-foreground text-xs'>
                                        Prompt: {result.prompt}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Video result */}
                                {result.type === 'video' && result.url && (
                                  <div className='space-y-2'>
                                    <video
                                      src={result.url}
                                      controls
                                      className='max-h-64 w-full rounded-lg'
                                    />
                                    <div className='flex gap-2'>
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        asChild
                                      >
                                        <a
                                          href={result.url}
                                          target='_blank'
                                          rel='noopener noreferrer'
                                        >
                                          <Eye className='mr-1 h-3.5 w-3.5' />
                                          View Full
                                        </a>
                                      </Button>
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        asChild
                                      >
                                        <a href={result.url} download>
                                          <Download className='mr-1 h-3.5 w-3.5' />
                                          Download
                                        </a>
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Script result */}
                                {result.type === 'script' && result.content && (
                                  <div className='space-y-2'>
                                    <div className='bg-muted/50 rounded-lg p-3'>
                                      <p className='text-sm whitespace-pre-wrap'>
                                        {result.content}
                                      </p>
                                    </div>
                                    {result.subtype && (
                                      <Badge
                                        variant='secondary'
                                        className='text-xs'
                                      >
                                        {result.subtype}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Audio result */}
                                {result.type === 'audio' && result.url && (
                                  <div className='space-y-2'>
                                    <audio
                                      src={result.url}
                                      controls
                                      className='w-full'
                                    />
                                    <Button size='sm' variant='outline' asChild>
                                      <a href={result.url} download>
                                        <Download className='mr-1 h-3.5 w-3.5' />
                                        Download
                                      </a>
                                    </Button>
                                  </div>
                                )}

                                {/* Splitter result */}
                                {result.type === 'splitter' && (
                                  <div className='text-muted-foreground text-sm'>
                                    <p>
                                      Created {result.branches} parallel
                                      branches
                                    </p>
                                    <p className='mt-1 text-xs'>
                                      Strategy: {result.strategy}
                                    </p>
                                  </div>
                                )}

                                {/* Merge result */}
                                {result.type === 'merge' && (
                                  <div className='text-muted-foreground text-sm'>
                                    <p>
                                      Collected{' '}
                                      {result.count ||
                                        result.collected?.length ||
                                        0}{' '}
                                      results
                                    </p>
                                    <p className='mt-1 text-xs'>
                                      Strategy: {result.strategy}
                                    </p>
                                  </div>
                                )}

                                {/* Social post result */}
                                {result.type === 'social_post' && (
                                  <div className='space-y-2'>
                                    <div className='flex items-center gap-2'>
                                      <Badge>{result.platform}</Badge>
                                      {result.bulk && (
                                        <Badge variant='secondary'>
                                          Bulk: {result.count} items
                                        </Badge>
                                      )}
                                    </div>
                                    {result.caption && (
                                      <p className='text-muted-foreground text-sm'>
                                        {result.caption}
                                      </p>
                                    )}
                                    {result.scheduled && (
                                      <p className='text-muted-foreground text-xs'>
                                        Scheduled:{' '}
                                        {new Date(
                                          result.scheduled
                                        ).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        )
                      ) : (
                        <div className='text-muted-foreground py-8 text-center'>
                          <p>No results for this pipeline</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
