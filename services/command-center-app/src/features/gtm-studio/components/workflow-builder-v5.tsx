import React, { useState, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Node,
  Edge,
  Connection,
  NodeTypes,
  Handle,
  Position,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Play,
  Save,
  Image,
  Video,
  Music,
  FileText,
  Send,
  TrendingUp,
  Users,
  CheckCircle2,
  Calendar,
  Sparkles,
  X,
  Workflow as WorkflowIcon,
  Plus,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { WorkflowTesterV3 } from './workflow-tester-v3'

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
}

// Helper to get icon component from trigger/action id
function getIconFromId(id: string, type: 'trigger' | 'action') {
  if (type === 'trigger') {
    const trigger = NODE_TEMPLATES.triggers.find((t) => t.id === id)
    return trigger?.icon || Play
  } else {
    const action = NODE_TEMPLATES.actions.find((a) => a.id === id)
    return action?.icon || Sparkles
  }
}

// Node components
function TriggerNode({ data, selected }: any) {
  // Get icon from triggerId if icon is not a valid component
  const Icon =
    typeof data.icon === 'function'
      ? data.icon
      : getIconFromId(data.triggerId, 'trigger')

  return (
    <div
      className={cn(
        'bg-card min-w-[180px] rounded-lg border-2 px-4 py-3 shadow-sm',
        'transition-all duration-200',
        selected ? 'border-primary shadow-lg' : 'border-border',
        'hover:shadow-md'
      )}
    >
      <Handle
        type='source'
        position={Position.Right}
        className='!bg-primary !border-background !h-3 !w-3 !border-2'
      />
      <div className='flex items-center gap-2'>
        <div
          className={cn(
            'rounded-md bg-gradient-to-br p-2 text-white',
            data.color || 'from-green-500 to-emerald-600'
          )}
        >
          <Icon className='h-4 w-4' />
        </div>
        <div>
          <div className='text-sm font-medium'>{data.label}</div>
          <div className='text-muted-foreground text-xs'>Start workflow</div>
        </div>
      </div>
    </div>
  )
}

function ActionNode({ data, selected }: any) {
  // Get icon from actionId if icon is not a valid component
  const Icon =
    typeof data.icon === 'function'
      ? data.icon
      : getIconFromId(data.actionId, 'action')

  return (
    <div
      className={cn(
        'bg-card min-w-[180px] rounded-lg border-2 px-4 py-3 shadow-sm',
        'transition-all duration-200',
        selected ? 'border-primary shadow-lg' : 'border-border',
        'hover:shadow-md'
      )}
    >
      <Handle
        type='target'
        position={Position.Left}
        className='!bg-primary !border-background !h-3 !w-3 !border-2'
      />
      <Handle
        type='source'
        position={Position.Right}
        className='!bg-primary !border-background !h-3 !w-3 !border-2'
      />
      <div className='flex items-center gap-2'>
        <div
          className={cn(
            'rounded-md bg-gradient-to-br p-2 text-white',
            data.color || 'from-violet-500 to-purple-600'
          )}
        >
          <Icon className='h-4 w-4' />
        </div>
        <div>
          <div className='text-sm font-medium'>{data.label}</div>
          <div className='text-muted-foreground text-xs'>
            {data.description}
          </div>
        </div>
      </div>
      {data.config?.prompt && (
        <div className='mt-2 border-t pt-2'>
          <p className='text-muted-foreground truncate text-xs'>
            "{data.config.prompt}"
          </p>
        </div>
      )}
    </div>
  )
}

const NODE_TEMPLATES = {
  triggers: [
    {
      id: 'manual',
      name: 'Manual Trigger',
      icon: Play,
      color: 'from-green-500 to-emerald-600',
    },
    {
      id: 'schedule',
      name: 'Schedule',
      icon: Calendar,
      color: 'from-purple-500 to-pink-600',
    },
  ],
  actions: [
    {
      id: 'generate-image',
      name: 'Generate Image',
      icon: Image,
      color: 'from-violet-500 to-purple-600',
      category: 'media',
      description: 'Create AI images',
    },
    {
      id: 'create-video',
      name: 'Generate Video',
      icon: Video,
      color: 'from-purple-500 to-pink-600',
      category: 'media',
      description: 'Animate images',
    },
    {
      id: 'contextual-image',
      name: 'Contextual Image',
      icon: Sparkles,
      color: 'from-indigo-500 to-purple-600',
      category: 'media',
      description: 'Style transfer',
    },
    {
      id: 'generate-audio',
      name: 'Generate Audio',
      icon: Music,
      color: 'from-yellow-500 to-orange-600',
      category: 'media',
      description: 'Create music',
    },
    {
      id: 'generate-script',
      name: 'Generate Script',
      icon: FileText,
      color: 'from-teal-500 to-cyan-600',
      category: 'content',
      description: 'Write content',
    },
    {
      id: 'post-social',
      name: 'Post to Social',
      icon: Send,
      color: 'from-blue-500 to-cyan-600',
      category: 'social',
      description: 'Share content',
    },
    {
      id: 'analyze-metrics',
      name: 'Analyze Metrics',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-600',
      category: 'analytics',
      description: 'Track performance',
    },
  ],
}

export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: Node[]
  edges: Edge[]
  createdAt: Date
  updatedAt: Date
  lastRun?: Date
  runCount: number
  isTemplate?: boolean
  category?: string
}

export function WorkflowBuilderV5({
  workflow: existingWorkflow,
  onClose,
  onSave,
}: {
  workflow?: any
  onClose: () => void
  onSave?: (workflow: any) => void
}) {
  // Extract nodes and edges from existing workflow's steps if present
  let initialNodes = existingWorkflow?.steps?.nodes || []
  let initialEdges = existingWorkflow?.steps?.edges || []

  // If loading from database, restore icon references
  if (existingWorkflow) {
    initialNodes = initialNodes.map((node: any) => {
      if (node.type === 'trigger') {
        const template = NODE_TEMPLATES.triggers.find(
          (t) => t.id === node.data.triggerId
        )
        if (template) {
          node.data.icon = template.icon
          node.data.color = template.color
        }
      } else if (node.type === 'action') {
        const template = NODE_TEMPLATES.actions.find(
          (a) => a.id === node.data.actionId
        )
        if (template) {
          node.data.icon = template.icon
          node.data.color = template.color
        }
      }
      return node
    })
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showNodeConfig, setShowNodeConfig] = useState(false)
  const [showTester, setShowTester] = useState(false)
  const [workflowName, setWorkflowName] = useState(
    existingWorkflow?.name || 'New Workflow'
  )
  const [nodeConfig, setNodeConfig] = useState<any>({})

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setNodeConfig(node.data.config || {})
    setShowNodeConfig(true)
  }, [])

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      setEdges(
        deleted.reduce((acc, node) => {
          const incomers = getIncomers(node, nodes, edges)
          const outgoers = getOutgoers(node, nodes, edges)
          const connectedEdges = getConnectedEdges([node], edges)

          const remainingEdges = acc.filter(
            (edge) => !connectedEdges.includes(edge)
          )

          const createdEdges = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}-${target}`,
              source,
              target,
              type: 'smoothstep',
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
              },
            }))
          )

          return [...remainingEdges, ...createdEdges]
        }, edges)
      )
    },
    [nodes, edges]
  )

  const addNode = (template: any, type: 'trigger' | 'action') => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: {
        x: Math.random() * 500 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        label: template.name,
        icon: template.icon,
        color: template.color,
        description: template.description,
        [type === 'trigger' ? 'triggerId' : 'actionId']: template.id,
        config: {},
      },
    }

    // Set default config for specific actions
    if (
      template.id === 'generate-image' ||
      template.id === 'contextual-image'
    ) {
      newNode.data.config = {
        aspectRatio: '9:16',
        width: 720,
        height: 1280,
      }
    }

    // Set default model
    if (type === 'action') {
      const isMediaAction = [
        'generate-image',
        'create-video',
        'generate-audio',
        'contextual-image',
      ].includes(template.id)
      const recommendedModel = isMediaAction
        ? getRecommendedReplicateModel(template.id)
        : getRecommendedModel(template.id)
      newNode.data.modelId = recommendedModel.id
      newNode.data.modelProvider = isMediaAction ? 'replicate' : 'openrouter'
    }

    setNodes((nds) => nds.concat(newNode))
  }

  const updateNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config,
            },
          }
        }
        return node
      })
    )
  }, [])

  // Convert to old workflow format for execution
  const convertToExecutableWorkflow = () => {
    const steps = nodes.map((node) => ({
      id: node.id,
      type: node.type as 'trigger' | 'action',
      actionId: node.data.actionId,
      triggerId: node.data.triggerId,
      config: node.data.config,
      modelId: node.data.modelId,
      modelProvider: node.data.modelProvider,
    }))

    return {
      id: `wf-${Date.now()}`,
      name: workflowName,
      steps,
      createdAt: new Date(),
      runCount: 0,
    }
  }

  return (
    <div className='bg-background flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b px-4 py-3'>
        <div className='flex items-center gap-3'>
          <WorkflowIcon className='h-5 w-5' />
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className='h-8 w-48 font-medium'
          />
        </div>
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setShowTester(true)}
          >
            <Play className='mr-1.5 h-3.5 w-3.5' />
            Test
          </Button>
          <Button
            size='sm'
            onClick={() => {
              const workflow = {
                id: existingWorkflow?.id,
                name: workflowName,
                nodes,
                edges,
              }
              onSave?.(workflow)
              toast.success('Workflow saved!')
            }}
          >
            <Save className='mr-1.5 h-3.5 w-3.5' />
            Save
          </Button>
          <Button size='sm' variant='ghost' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden'>
        {/* Left sidebar - Node palette */}
        <div className='bg-muted/20 w-64 overflow-y-auto border-r p-4'>
          <div className='space-y-4'>
            {/* Triggers */}
            <div>
              <h3 className='text-muted-foreground mb-2 text-sm font-medium'>
                TRIGGERS
              </h3>
              <div className='space-y-1'>
                {NODE_TEMPLATES.triggers.map((trigger) => (
                  <Card
                    key={trigger.id}
                    className='hover:border-primary/50 cursor-pointer p-3 transition-all hover:shadow-md'
                    onClick={() => addNode(trigger, 'trigger')}
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
                      <span className='text-sm font-medium'>
                        {trigger.name}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className='text-muted-foreground mb-2 text-sm font-medium'>
                ACTIONS
              </h3>
              <div className='space-y-1'>
                {NODE_TEMPLATES.actions.map((action) => (
                  <Card
                    key={action.id}
                    className='hover:border-primary/50 cursor-pointer p-3 transition-all hover:shadow-md'
                    onClick={() => addNode(action, 'action')}
                  >
                    <div className='flex items-center gap-2'>
                      <div
                        className={cn(
                          'rounded-md bg-gradient-to-br p-1.5 text-white',
                          action.color
                        )}
                      >
                        <action.icon className='h-3.5 w-3.5' />
                      </div>
                      <div className='flex-1'>
                        <div className='text-sm font-medium'>{action.name}</div>
                        <div className='text-muted-foreground text-xs'>
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className='flex-1'>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodesDelete={onNodesDelete}
            nodeTypes={nodeTypes}
            fitView
            className='bg-muted/10'
          >
            <Background variant='dots' gap={20} size={1} />
            <Controls className='bg-background rounded-lg border shadow-sm' />
            <MiniMap className='bg-background rounded-lg border shadow-sm' />
          </ReactFlow>
        </div>

        {/* Right sidebar - Node config */}
        {showNodeConfig && selectedNode && (
          <div className='bg-background w-80 overflow-y-auto border-l p-4'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='flex items-center gap-2 font-semibold'>
                <Settings className='h-4 w-4' />
                Configure Node
              </h3>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => setShowNodeConfig(false)}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>

            {/* Node-specific configuration */}
            <div className='space-y-4'>
              {/* Image generation config */}
              {selectedNode.data.actionId === 'generate-image' && (
                <>
                  <div>
                    <Label className='text-xs'>Prompt</Label>
                    <Textarea
                      placeholder='Describe the image...'
                      className='mt-1 min-h-[80px]'
                      value={nodeConfig.prompt || ''}
                      onChange={(e) =>
                        setNodeConfig({ ...nodeConfig, prompt: e.target.value })
                      }
                      onBlur={() =>
                        updateNodeConfig(selectedNode.id, nodeConfig)
                      }
                    />
                  </div>
                  <div>
                    <Label className='text-xs'>Aspect Ratio</Label>
                    <select
                      className='mt-1 w-full rounded-md border p-2 text-sm'
                      value={nodeConfig.aspectRatio || '9:16'}
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

                        const updatedConfig = {
                          ...nodeConfig,
                          aspectRatio: ratio,
                          width,
                          height,
                        }
                        setNodeConfig(updatedConfig)
                        updateNodeConfig(selectedNode.id, updatedConfig)
                      }}
                    >
                      <option value='9:16'>9:16 (TikTok/Reels)</option>
                      <option value='1:1'>1:1 (Square)</option>
                      <option value='16:9'>16:9 (YouTube)</option>
                      <option value='4:3'>4:3 (Standard)</option>
                      <option value='3:4'>3:4 (Portrait)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Video generation config */}
              {selectedNode.data.actionId === 'create-video' && (
                <div>
                  <Label className='text-xs'>Motion Prompt</Label>
                  <Textarea
                    placeholder='Describe the motion...'
                    className='mt-1 min-h-[80px]'
                    value={nodeConfig.video_prompt || ''}
                    onChange={(e) =>
                      setNodeConfig({
                        ...nodeConfig,
                        video_prompt: e.target.value,
                      })
                    }
                    onBlur={() => updateNodeConfig(selectedNode.id, nodeConfig)}
                  />
                  <p className='text-muted-foreground mt-2 text-xs'>
                    • 81 frames at 16 FPS (~5 seconds) • ⏱️ Generation takes ~3
                    minutes • Progress bar shows processing time
                  </p>
                </div>
              )}

              {/* Contextual Image config */}
              {selectedNode.data.actionId === 'contextual-image' && (
                <>
                  <div>
                    <Label className='text-xs'>Style Prompt</Label>
                    <Textarea
                      placeholder='Describe the style transformation...'
                      className='mt-1 min-h-[80px]'
                      value={nodeConfig.prompt || ''}
                      onChange={(e) =>
                        setNodeConfig({ ...nodeConfig, prompt: e.target.value })
                      }
                      onBlur={() =>
                        updateNodeConfig(selectedNode.id, nodeConfig)
                      }
                    />
                  </div>
                  <div className='rounded-lg border border-purple-500/20 bg-purple-500/10 p-3'>
                    <p className='text-muted-foreground text-xs'>
                      <Sparkles className='mr-1 inline h-3 w-3' />
                      Uses image from previous step as reference
                    </p>
                  </div>
                </>
              )}

              {/* Audio generation config */}
              {selectedNode.data.actionId === 'generate-audio' && (
                <div>
                  <Label className='text-xs'>Audio Description</Label>
                  <Textarea
                    placeholder='Describe the audio/music...'
                    className='mt-1 min-h-[80px]'
                    value={nodeConfig.prompt || ''}
                    onChange={(e) =>
                      setNodeConfig({ ...nodeConfig, prompt: e.target.value })
                    }
                    onBlur={() => updateNodeConfig(selectedNode.id, nodeConfig)}
                  />
                </div>
              )}

              {/* Social post config */}
              {selectedNode.data.actionId === 'post-social' && (
                <div>
                  <Label className='text-xs'>Platform</Label>
                  <select
                    className='mt-1 w-full rounded-md border p-2 text-sm'
                    value={nodeConfig.platform || 'tiktok'}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...nodeConfig,
                        platform: e.target.value,
                      }
                      setNodeConfig(updatedConfig)
                      updateNodeConfig(selectedNode.id, updatedConfig)
                    }}
                  >
                    <option value='tiktok'>TikTok</option>
                    <option value='instagram'>Instagram</option>
                    <option value='youtube'>YouTube Shorts</option>
                  </select>
                </div>
              )}
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
            <div className='mt-6'>
              <WorkflowTesterV3
                workflow={convertToExecutableWorkflow()}
                onClose={() => setShowTester(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
