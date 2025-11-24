import React, { useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  Handle,
  Position,
  NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Church,
  Book,
  Heart,
  BookOpen,
  Sparkles,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Wand2,
  Video,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { 
  executeBatchWithWorkingServices, 
  groupResultsByPipeline,
  generateCompleteContent 
} from '../services/simple-batch-service'
import { MediaResultsViewer } from './media-results-viewer'

// Smart content templates with pre-configured workflows
const CONTENT_TEMPLATES = {
  christian: {
    name: 'Christian Content Pack',
    description: 'Generate Jesus, Bible, Testimony & Prayer content',
    icon: Church,
    color: 'from-amber-500 to-orange-600',
    variations: 1, // 1 per category = 4 total
    pipelines: [
      {
        id: 'jesus',
        name: 'Jesus Content',
        icon: Church,
        basePrompt: 'Create inspiring content about Jesus Christ that resonates with modern audiences',
        hooks: ['question', 'bold statement', 'story', 'scripture'],
        styles: ['cinematic', 'testimonial', 'viral', 'traditional'],
      },
      {
        id: 'bible',
        name: 'Bible Verses',
        icon: Book,
        basePrompt: 'Create engaging Bible verse content that speaks to daily life',
        hooks: ['verse first', 'life situation', 'question', 'promise'],
        styles: ['modern', 'traditional', 'aesthetic', 'minimalist'],
      },
      {
        id: 'testimony',
        name: 'Testimonies',
        icon: Heart,
        basePrompt: 'Share powerful testimony stories of transformation and faith',
        hooks: ['before/after', 'struggle', 'breakthrough', 'miracle'],
        styles: ['emotional', 'documentary', 'conversational', 'dramatic'],
      },
      {
        id: 'prayer',
        name: 'Prayer Content',
        icon: BookOpen,
        basePrompt: 'Create meaningful prayer content that connects hearts to God',
        hooks: ['invitation', 'declaration', 'meditation', 'worship'],
        styles: ['peaceful', 'powerful', 'intimate', 'corporate'],
      },
    ],
  },
}

// Custom node for the template block
function TemplateNode({ data, selected }: any) {
  const template = CONTENT_TEMPLATES[data.templateId as keyof typeof CONTENT_TEMPLATES]
  if (!template) return null

  return (
    <div
      className={cn(
        'min-w-[300px] rounded-xl border-2 bg-card p-4 shadow-lg',
        'transition-all duration-200',
        selected ? 'border-primary shadow-xl' : 'border-border',
        data.status === 'running' && 'animate-pulse'
      )}
    >
      <Handle
        type='source'
        position={Position.Right}
        className='!h-3 !w-3 !border-2 !border-background !bg-primary'
      />
      
      <div className='space-y-3'>
        <div className='flex items-center gap-3'>
          <div className={cn('rounded-lg bg-gradient-to-br p-3 text-white', template.color)}>
            <template.icon className='h-6 w-6' />
          </div>
          <div className='flex-1'>
            <h3 className='font-semibold'>{template.name}</h3>
            <p className='text-xs text-muted-foreground'>{template.description}</p>
          </div>
          {data.status === 'running' && <Loader2 className='h-5 w-5 animate-spin' />}
          {data.status === 'success' && <CheckCircle2 className='h-5 w-5 text-green-500' />}
          {data.status === 'error' && <AlertCircle className='h-5 w-5 text-red-500' />}
        </div>

        <div className='grid grid-cols-2 gap-2'>
          {template.pipelines.map((pipeline) => {
            const PipelineIcon = pipeline.icon
            return (
              <div
                key={pipeline.id}
                className='flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm'
              >
                <PipelineIcon className='h-4 w-4 text-muted-foreground' />
                <span>{pipeline.name}</span>
              </div>
            )
          })}
        </div>

        <div className='flex items-center justify-between rounded-lg bg-muted/30 p-2'>
          <span className='text-sm text-muted-foreground'>Variations per type</span>
          <Badge variant='secondary'>{template.variations}x</Badge>
        </div>

        {data.progress !== undefined && (
          <div className='space-y-1'>
            <div className='flex justify-between text-xs'>
              <span>Generating content...</span>
              <span>{data.progress}%</span>
            </div>
            <Progress value={data.progress} className='h-1' />
          </div>
        )}
      </div>
    </div>
  )
}

// Result display node
function ResultNode({ data }: any) {
  return (
    <div className='min-w-[250px] rounded-xl border-2 border-border bg-card p-4 shadow-lg'>
      <Handle
        type='target'
        position={Position.Left}
        className='!h-3 !w-3 !border-2 !border-background !bg-primary'
      />
      
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <CheckCircle2 className='h-5 w-5 text-green-500' />
          <h3 className='font-semibold'>Content Generated</h3>
        </div>
        
        {data.results && (
          <div className='space-y-2'>
            {Object.entries(data.results).map(([type, items]: [string, any]) => (
              <div key={type} className='rounded-lg bg-muted/50 p-2'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-sm font-medium capitalize'>{type}</span>
                  <Badge variant='secondary' className='text-xs'>
                    {Array.isArray(items) ? items.length : 0} items
                  </Badge>
                </div>
                {Array.isArray(items) && items.length > 0 && (
                  <div className='text-xs text-muted-foreground'>
                    <span className='text-green-600'>
                      {items.filter((i: any) => !i.error).length} successful
                    </span>
                    {items.filter((i: any) => i.error).length > 0 && (
                      <span className='text-red-600'>
                        {' '}• {items.filter((i: any) => i.error).length} failed
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <Button 
          size='sm' 
          className='w-full'
          onClick={() => data.onViewResults && data.onViewResults()}
        >
          <Sparkles className='mr-2 h-4 w-4' />
          View Results
        </Button>
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  template: TemplateNode,
  result: ResultNode,
}

export function SimpleWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isRunning, setIsRunning] = useState(false)
  const [isResultsOpen, setIsResultsOpen] = useState(false)
  const [batchResults, setBatchResults] = useState<any>(null)
  const [generateVideo, setGenerateVideo] = useState(false)
  const [runCount, setRunCount] = useState(() => {
    // Initialize from localStorage to persist across refreshes
    const saved = localStorage.getItem('gtm-run-count')
    return saved ? parseInt(saved, 10) : 0
  })
  const [isRerolling, setIsRerolling] = useState(false)
  const [savedRuns, setSavedRuns] = useState<any[]>([])
  
  // Load saved runs on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('gtm-workflow-runs')
    if (saved) {
      try {
        const runs = JSON.parse(saved)
        console.log('Loaded saved runs:', runs.length)
        setSavedRuns(runs)
      } catch (e) {
        console.error('Failed to load saved runs:', e)
      }
    }
  }, [])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges]
  )

  // Create a complete workflow with one click
  const createChristianWorkflow = useCallback(() => {
    const templateNode: Node = {
      id: 'template-1',
      type: 'template',
      position: { x: 100, y: 200 },
      data: {
        templateId: 'christian',
        status: 'idle',
      },
    }

    const resultNode: Node = {
      id: 'result-1',
      type: 'result',
      position: { x: 500, y: 200 },
      data: {},
    }

    setNodes([templateNode, resultNode])
    setEdges([
      {
        id: 'e1-2',
        source: 'template-1',
        target: 'result-1',
        animated: true,
      },
    ])

    toast.success('Christian content workflow created! Click Run to generate content.')
  }, [setNodes, setEdges])

  // Run the workflow
  const runWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error('Create a workflow first!')
      return
    }

    setIsRunning(true)
    const newRunCount = runCount + 1
    setRunCount(newRunCount)
    localStorage.setItem('gtm-run-count', newRunCount.toString()) // Persist it
    
    // Update template node to show running state
    setNodes((nds) =>
      nds.map((node) =>
        node.type === 'template'
          ? { ...node, data: { ...node.data, status: 'running', progress: 0 } }
          : node
      )
    )

    try {
      // Create workflow configuration from template
      const templateNode = nodes.find((n) => n.type === 'template')
      if (!templateNode) return

      const template = CONTENT_TEMPLATES[templateNode.data.templateId as keyof typeof CONTENT_TEMPLATES]
      
      // Execute batch using ACTUAL WORKING SERVICES (OpenAI + Claude + Replicate)
      const batchResults = await executeBatchWithWorkingServices(
        {
          basePrompt: '', // Empty because we'll use specific prompts per type
          variations: 4, // 1 per category
          templates: template.pipelines.map(p => p.id),
          varyTone: false,
          varyStyle: false,
          varyHook: false,
          varyLength: false,
          generateVideo, // Use state value
          generateAudio: false,
          runSeed: newRunCount,
        },
        (progress, completed, total) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.type === 'template'
                ? { ...node, data: { ...node.data, progress } }
                : node
            )
          )
        }
      )

      const groupedResults = groupResultsByPipeline(batchResults)
      
      console.log('Batch results:', batchResults)
      console.log('Grouped results:', groupedResults)
      console.log('Keys:', Object.keys(groupedResults))
      
      // Store results for viewer
      setBatchResults(groupedResults)
      
      // Save to history with timestamp
      const runData = {
        id: `run-${Date.now()}`,
        timestamp: new Date().toISOString(),
        results: groupedResults,
        runNumber: runCount
      }
      
      // Save to localStorage
      const allRuns = [...savedRuns, runData]
      setSavedRuns(allRuns)
      localStorage.setItem('gtm-workflow-runs', JSON.stringify(allRuns))

      // Update nodes with results and callback
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type === 'template') {
            return { ...node, data: { ...node.data, status: 'success', progress: 100 } }
          }
          if (node.type === 'result') {
            return { 
              ...node, 
              data: { 
                ...node.data, 
                results: groupedResults,
                onViewResults: () => setIsResultsOpen(true)
              } 
            }
          }
          return node
        })
      )

      toast.success('Content generated! Opening gallery...')
      
      // Auto-open results
      setIsResultsOpen(true)
    } catch (error) {
      console.error('Workflow failed:', error)
      toast.error('Workflow failed')
      
      setNodes((nds) =>
        nds.map((node) =>
          node.type === 'template'
            ? { ...node, data: { ...node.data, status: 'error' } }
            : node
        )
      )
    } finally {
      setIsRunning(false)
    }
  }, [nodes, setNodes])
  
  // Handle rerolling a single image
  const handleRerollImage = useCallback(async (contentId: string, imageIndex: number) => {
    if (!batchResults || isRerolling) return
    
    setIsRerolling(true)
    toast.info('Regenerating image...')
    
    try {
      // Find the original content item
      const allItems = Object.values(batchResults).flat() as any[]
      const item = allItems.find(i => i.id === contentId)
      if (!item) throw new Error('Content not found')
      
      // Get the specific text overlay for this image
      const lines = item.result.split('\n').filter((l: string) => l.trim())
      const overlayText = lines[imageIndex] || ''
      const cleanText = overlayText.replace(/^[A-Z\s\d]+:\s*/i, '')
      
      // Generate a new image prompt for this specific overlay
      const { generateImage } = await import('../services/replicate-service')
      const { generateText } = await import('ai')
      const { createOpenAI } = await import('@ai-sdk/openai')
      const { uploadGeneratedImage } = await import('../services/supabase-service')
      
      const openai = createOpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      })
      
      // Create a fresh image prompt
      const imagePromptRequest = `Create a FRESH, DIFFERENT cinematic background image for this TikTok text overlay:

"${cleanText}"

Category: ${item.pipelineType}
Slide ${imageIndex + 1} of ${lines.length}

CREATE SOMETHING COMPLETELY DIFFERENT from before. New angle, new visual, new mood.
Must be photorealistic, cinematic, emotional, and work as a background for text.
9:16 vertical format.

New image prompt:`
      
      const { text: newImagePrompt } = await generateText({
        model: openai('gpt-4o'),
        prompt: imagePromptRequest,
        temperature: 0.9, // Higher temp for more variety
      })
      
      // Generate the new image
      const imageResult = await generateImage(newImagePrompt.trim(), 'black-forest-labs/flux-1.1-pro-ultra', {
        width: 1080,
        height: 1920,
        raw: false,
        num_outputs: 1,
      })
      
      if (imageResult && imageResult[0]) {
        // Upload the new image
        const uploadResult = await uploadGeneratedImage(imageResult[0], {
          prompt: newImagePrompt,
          model: 'black-forest-labs/flux-1.1-pro-ultra',
          model_provider: 'replicate',
          aspect_ratio: '9:16',
          width: 1080,
          height: 1920,
        })
        
        // Update the results
        const updatedResults = { ...batchResults }
        Object.values(updatedResults).forEach((items: any[]) => {
          const itemToUpdate = items.find(i => i.id === contentId)
          if (itemToUpdate && itemToUpdate.imageUrls) {
            itemToUpdate.imageUrls[imageIndex] = uploadResult.publicUrl
          }
        })
        
        setBatchResults(updatedResults)
        toast.success('Image regenerated!')
      }
    } catch (error) {
      console.error('Reroll failed:', error)
      toast.error('Failed to regenerate image')
    } finally {
      setIsRerolling(false)
    }
  }, [batchResults, isRerolling])

  return (
    <div className='relative h-[600px] w-full overflow-hidden rounded-lg bg-slate-900'>
      {/* Simple action bar */}
      <div className='absolute left-4 top-4 z-10 flex gap-2'>
        <Button
          onClick={createChristianWorkflow}
          disabled={nodes.length > 0}
          className='bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
        >
          <Layers className='mr-2 h-4 w-4' />
          Create Christian Content Pack
        </Button>
        
        {/* Video Toggle */}
        <Button
          variant='outline'
          onClick={() => setGenerateVideo(!generateVideo)}
          className='flex items-center gap-2'
        >
          <Video className='h-4 w-4' />
          Video: {generateVideo ? 'ON' : 'OFF'}
          {generateVideo ? <ToggleRight className='h-4 w-4' /> : <ToggleLeft className='h-4 w-4' />}
        </Button>
        
        {nodes.length > 0 && (
          <>
            <Button
              onClick={runWorkflow}
              disabled={isRunning}
              variant='default'
            >
              {isRunning ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Generating...
                </>
              ) : (
                <>
                  <Play className='mr-2 h-4 w-4' />
                  Run Workflow
                </>
              )}
            </Button>
            
            {/* History dropdown */}
            {savedRuns.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline'>
                    History ({savedRuns.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-[250px]'>
                  <div className='max-h-[400px] overflow-y-auto'>
                    {savedRuns.slice().reverse().map((run, idx) => (
                      <DropdownMenuItem
                        key={run.id}
                        onClick={() => {
                          setBatchResults(run.results)
                          setIsResultsOpen(true)
                        }}
                      >
                        <div className='flex flex-col'>
                          <div className='font-medium'>Run #{savedRuns.length - idx}</div>
                          <div className='text-xs text-muted-foreground'>
                            {new Date(run.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className='text-destructive focus:text-destructive'
                    onClick={() => {
                      setSavedRuns([])
                      localStorage.removeItem('gtm-workflow-runs')
                      toast.success('History cleared')
                    }}
                  >
                    Clear History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>

      {/* Help text when empty */}
      {nodes.length === 0 && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
          <div className='text-center space-y-2'>
            <Wand2 className='h-12 w-12 mx-auto text-muted-foreground/30' />
            <p className='text-muted-foreground'>
              Click "Create Christian Content Pack" to get started
            </p>
            <p className='text-sm text-muted-foreground/70'>
              One click generates 4 content packages (text + images) using GPT-4o + Claude + Replicate
            </p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className='bg-slate-950'
        proOptions={{ hideAttribution: true }}
      >
        <Background color='#475569' gap={16} size={1} />
        <Controls className='bg-background/95 backdrop-blur' />
        <MiniMap
          className='bg-background/95 backdrop-blur'
          nodeColor='#64748b'
          maskColor='rgb(15, 23, 42, 0.8)'
        />
      </ReactFlow>

      <MediaResultsViewer
        isOpen={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
        results={batchResults}
        onRerollImage={handleRerollImage}
      />
    </div>
  )
}