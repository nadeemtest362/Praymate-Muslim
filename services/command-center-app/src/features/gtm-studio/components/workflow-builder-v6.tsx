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
  GitBranch,
  GitMerge,
  Loader2,
  Book,
  Heart,
  Church,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { WorkflowTesterV4 } from './workflow-tester-v4'

// Node component definitions
function TriggerNode({ data, selected }: any) {
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

// New Splitter Node
function SplitterNode({ data, selected }: any) {
  return (
    <div
      className={cn(
        'bg-card min-w-[200px] rounded-lg border-2 px-4 py-3 shadow-sm',
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
      {/* Multiple output handles for parallel branches */}
      <Handle
        type='source'
        position={Position.Right}
        id='output-1'
        style={{ top: '20%' }}
        className='!border-background !h-3 !w-3 !border-2 !bg-blue-500'
      />
      <Handle
        type='source'
        position={Position.Right}
        id='output-2'
        style={{ top: '40%' }}
        className='!border-background !h-3 !w-3 !border-2 !bg-purple-500'
      />
      <Handle
        type='source'
        position={Position.Right}
        id='output-3'
        style={{ top: '60%' }}
        className='!border-background !h-3 !w-3 !border-2 !bg-green-500'
      />
      <Handle
        type='source'
        position={Position.Right}
        id='output-4'
        style={{ top: '80%' }}
        className='!border-background !h-3 !w-3 !border-2 !bg-orange-500'
      />
      <div className='flex items-center gap-2'>
        <div className='rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-2 text-white'>
          <GitBranch className='h-4 w-4' />
        </div>
        <div>
          <div className='text-sm font-medium'>{data.label}</div>
          <div className='text-muted-foreground text-xs'>
            {data.branches || 4} parallel outputs
          </div>
        </div>
      </div>
    </div>
  )
}

// New Merge Node
function MergeNode({ data, selected }: any) {
  return (
    <div
      className={cn(
        'bg-card min-w-[180px] rounded-lg border-2 px-4 py-3 shadow-sm',
        'transition-all duration-200',
        selected ? 'border-primary shadow-lg' : 'border-border',
        'hover:shadow-md'
      )}
    >
      {/* Multiple input handles */}
      <Handle
        type='target'
        position={Position.Left}
        id='input-1'
        style={{ top: '20%' }}
        className='!border-background !h-3 !w-3 !border-2 !bg-blue-500'
      />
      <Handle
        type='target'
        position={Position.Left}
        id='input-2'
        style={{ top: '40%' }}
        className='!border-background !h-3 !w-3 !border-2 !bg-purple-500'
      />
      <Handle
        type='target'
        position={Position.Left}
        id='input-3'
        style={{ top: '60%' }}
        className='!border-background !h-3 !w-3 !border-2 !bg-green-500'
      />
      <Handle
        type='target'
        position={Position.Left}
        id='input-4'
        style={{ top: '80%' }}
        className='!border-background !h-3 !w-3 !border-2 !bg-orange-500'
      />
      <Handle
        type='source'
        position={Position.Right}
        className='!bg-primary !border-background !h-3 !w-3 !border-2'
      />
      <div className='flex items-center gap-2'>
        <div className='rounded-md bg-gradient-to-br from-teal-500 to-cyan-600 p-2 text-white'>
          <GitMerge className='h-4 w-4' />
        </div>
        <div>
          <div className='text-sm font-medium'>{data.label}</div>
          <div className='text-muted-foreground text-xs'>Collect outputs</div>
        </div>
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  splitter: SplitterNode,
  merge: MergeNode,
}

// Helper to get icon component from trigger/action id
function getIconFromId(
  id: string,
  type: 'trigger' | 'action' | 'splitter' | 'merge'
) {
  if (type === 'trigger') {
    const trigger = NODE_TEMPLATES.triggers.find((t) => t.id === id)
    return trigger?.icon || Play
  } else if (type === 'action') {
    const action = NODE_TEMPLATES.actions.find((a) => a.id === id)
    return action?.icon || Sparkles
  } else if (type === 'splitter') {
    return GitBranch
  } else {
    return GitMerge
  }
}

// Pipeline templates for different content types
const PIPELINE_TEMPLATES = {
  jesus: {
    name: 'Jesus Content',
    icon: Church,
    color: 'from-blue-500 to-purple-600',
    nodes: [
      {
        id: 'generate-image',
        name: 'Disney Jesus Image',
        config: { style: 'disney animated' },
      },
      { id: 'create-video', name: 'Animate', config: { motion: 'cinematic' } },
      {
        id: 'generate-script',
        name: 'Generate Hook',
        config: { type: 'viral_hook' },
      },
      { id: 'post-social', name: 'Add Caption', config: {} },
    ],
  },
  bible: {
    name: 'Bible Verse',
    icon: Book,
    color: 'from-green-500 to-emerald-600',
    nodes: [
      {
        id: 'generate-script',
        name: 'Select Verse',
        config: { type: 'bible_verse' },
      },
      {
        id: 'generate-image',
        name: 'Typography Design',
        config: { style: 'typography' },
      },
      { id: 'create-video', name: 'Add Motion', config: { motion: 'subtle' } },
      {
        id: 'generate-audio',
        name: 'Background Music',
        config: { style: 'meditation' },
      },
    ],
  },
  testimony: {
    name: 'Testimony',
    icon: Heart,
    color: 'from-pink-500 to-rose-600',
    nodes: [
      {
        id: 'generate-script',
        name: 'Write Story',
        config: { type: 'testimony' },
      },
      { id: 'generate-audio', name: 'AI Voice', config: { voice: 'warm' } },
      {
        id: 'generate-image',
        name: 'B-roll Images',
        config: { style: 'realistic' },
      },
      { id: 'create-video', name: 'Compile Video', config: {} },
    ],
  },
  prayer: {
    name: 'Prayer',
    icon: BookOpen,
    color: 'from-purple-500 to-indigo-600',
    nodes: [
      {
        id: 'generate-script',
        name: 'Prayer Text',
        config: { type: 'prayer' },
      },
      {
        id: 'generate-image',
        name: 'Meditative Visual',
        config: { style: 'peaceful' },
      },
      {
        id: 'generate-audio',
        name: 'Ambient Music',
        config: { style: 'ambient' },
      },
      { id: 'create-video', name: 'Combine', config: { pace: 'slow' } },
    ],
  },
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
    {
      id: 'batch',
      name: 'Batch Creator',
      icon: Loader2,
      color: 'from-blue-500 to-cyan-600',
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
  flow: [
    {
      id: 'splitter',
      name: 'Split Flow',
      icon: GitBranch,
      color: 'from-indigo-500 to-purple-600',
      description: 'Create parallel paths',
    },
    {
      id: 'merge',
      name: 'Merge Results',
      icon: GitMerge,
      color: 'from-teal-500 to-cyan-600',
      description: 'Collect outputs',
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

export function WorkflowBuilderV6({
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
      } else if (node.type === 'splitter' || node.type === 'merge') {
        const template = NODE_TEMPLATES.flow.find((f) => f.id === node.type)
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
    existingWorkflow?.name || 'Multi-Content Pipeline'
  )
  const [nodeConfig, setNodeConfig] = useState<any>({})
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

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

  const addNode = (
    template: any,
    type: 'trigger' | 'action' | 'splitter' | 'merge'
  ) => {
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
        [type === 'trigger'
          ? 'triggerId'
          : type === 'action'
            ? 'actionId'
            : 'flowId']: template.id,
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

  const addPipelineTemplate = (templateKey: string) => {
    const template =
      PIPELINE_TEMPLATES[templateKey as keyof typeof PIPELINE_TEMPLATES]
    if (!template) return

    const startX = 400
    const startY =
      100 + Object.keys(PIPELINE_TEMPLATES).indexOf(templateKey) * 150

    let previousNodeId: string | null = null
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Create nodes for the pipeline
    template.nodes.forEach((nodeTemplate, index) => {
      const nodeId = `${templateKey}-${nodeTemplate.id}-${Date.now()}-${index}`
      const actionTemplate = NODE_TEMPLATES.actions.find(
        (a) => a.id === nodeTemplate.id
      )

      const newNode: Node = {
        id: nodeId,
        type: 'action',
        position: {
          x: startX + index * 200,
          y: startY,
        },
        data: {
          label: nodeTemplate.name,
          icon: actionTemplate?.icon || Sparkles,
          color: actionTemplate?.color || template.color,
          description: actionTemplate?.description || '',
          actionId: nodeTemplate.id,
          config: nodeTemplate.config || {},
          pipelineType: templateKey,
        },
      }

      // Set model for the node
      const isMediaAction = [
        'generate-image',
        'create-video',
        'generate-audio',
        'contextual-image',
      ].includes(nodeTemplate.id)
      const recommendedModel = isMediaAction
        ? getRecommendedReplicateModel(nodeTemplate.id)
        : getRecommendedModel(nodeTemplate.id)
      newNode.data.modelId = recommendedModel.id
      newNode.data.modelProvider = isMediaAction ? 'replicate' : 'openrouter'

      newNodes.push(newNode)

      // Create edge from previous node
      if (previousNodeId) {
        newEdges.push({
          id: `${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
        })
      }

      previousNodeId = nodeId
    })

    setNodes((nds) => nds.concat(newNodes))
    setEdges((eds) => eds.concat(newEdges))
  }

  const createParallelPipeline = () => {
    // Create trigger node
    const triggerId = `trigger-${Date.now()}`
    const triggerNode: Node = {
      id: triggerId,
      type: 'trigger',
      position: { x: 50, y: 300 },
      data: {
        label: 'Daily Batch',
        icon: Calendar,
        color: 'from-purple-500 to-pink-600',
        triggerId: 'schedule',
        config: {},
      },
    }

    // Create splitter node
    const splitterId = `splitter-${Date.now()}`
    const splitterNode: Node = {
      id: splitterId,
      type: 'splitter',
      position: { x: 250, y: 300 },
      data: {
        label: 'Content Splitter',
        icon: GitBranch,
        color: 'from-indigo-500 to-purple-600',
        flowId: 'splitter',
        config: {},
      },
    }

    // Create merge node
    const mergeId = `merge-${Date.now()}`
    const mergeNode: Node = {
      id: mergeId,
      type: 'merge',
      position: { x: 1400, y: 300 },
      data: {
        label: 'Collect Results',
        icon: GitMerge,
        color: 'from-teal-500 to-cyan-600',
        flowId: 'merge',
        config: {},
      },
    }

    // Create post node
    const postId = `post-${Date.now()}`
    const postNode: Node = {
      id: postId,
      type: 'action',
      position: { x: 1600, y: 300 },
      data: {
        label: 'Bulk Schedule',
        icon: Send,
        color: 'from-blue-500 to-cyan-600',
        actionId: 'post-social',
        config: { bulk: true },
      },
    }

    const newNodes = [triggerNode, splitterNode, mergeNode, postNode]
    const newEdges: Edge[] = [
      {
        id: `${triggerId}-${splitterId}`,
        source: triggerId,
        target: splitterId,
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      },
      {
        id: `${mergeId}-${postId}`,
        source: mergeId,
        target: postId,
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      },
    ]

    // Add pipelines and connect them
    Object.entries(PIPELINE_TEMPLATES).forEach(([key, template], index) => {
      const startY = 100 + index * 200
      let previousNodeId: string | null = null

      template.nodes.forEach((nodeTemplate, nodeIndex) => {
        const nodeId = `${key}-${nodeTemplate.id}-${Date.now()}-${nodeIndex}`
        const actionTemplate = NODE_TEMPLATES.actions.find(
          (a) => a.id === nodeTemplate.id
        )

        const newNode: Node = {
          id: nodeId,
          type: 'action',
          position: {
            x: 450 + nodeIndex * 200,
            y: startY,
          },
          data: {
            label: nodeTemplate.name,
            icon: actionTemplate?.icon || Sparkles,
            color: actionTemplate?.color || template.color,
            description: actionTemplate?.description || '',
            actionId: nodeTemplate.id,
            config: nodeTemplate.config || {},
            pipelineType: key,
          },
        }

        // Set model
        const isMediaAction = [
          'generate-image',
          'create-video',
          'generate-audio',
          'contextual-image',
        ].includes(nodeTemplate.id)
        const recommendedModel = isMediaAction
          ? getRecommendedReplicateModel(nodeTemplate.id)
          : getRecommendedModel(nodeTemplate.id)
        newNode.data.modelId = recommendedModel.id
        newNode.data.modelProvider = isMediaAction ? 'replicate' : 'openrouter'

        newNodes.push(newNode)

        // Connect nodes in pipeline
        if (previousNodeId) {
          newEdges.push({
            id: `${previousNodeId}-${nodeId}`,
            source: previousNodeId,
            target: nodeId,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          })
        } else {
          // Connect first node to splitter
          const outputId = `output-${index + 1}`
          newEdges.push({
            id: `${splitterId}-${nodeId}`,
            source: splitterId,
            sourceHandle: outputId,
            target: nodeId,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: ['#3b82f6', '#a855f7', '#10b981', '#f97316'][index],
            },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          })
        }

        // Connect last node to merge
        if (nodeIndex === template.nodes.length - 1) {
          const inputId = `input-${index + 1}`
          newEdges.push({
            id: `${nodeId}-${mergeId}`,
            source: nodeId,
            target: mergeId,
            targetHandle: inputId,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: ['#3b82f6', '#a855f7', '#10b981', '#f97316'][index],
            },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          })
        }

        previousNodeId = nodeId
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
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
      type: node.type as 'trigger' | 'action' | 'splitter' | 'merge',
      actionId: node.data.actionId,
      triggerId: node.data.triggerId,
      flowId: node.data.flowId,
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
          <Select
            value={selectedTemplate}
            onValueChange={(value) => {
              setSelectedTemplate(value)
              if (value === 'parallel') {
                createParallelPipeline()
              } else if (value) {
                addPipelineTemplate(value)
              }
            }}
          >
            <SelectTrigger className='h-8 w-48'>
              <SelectValue placeholder='Quick Templates' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='parallel'>
                <div className='flex items-center gap-2'>
                  <GitBranch className='h-4 w-4' />
                  Full Parallel Pipeline
                </div>
              </SelectItem>
              <SelectItem value='jesus'>
                <div className='flex items-center gap-2'>
                  <Church className='h-4 w-4' />
                  Jesus Content
                </div>
              </SelectItem>
              <SelectItem value='bible'>
                <div className='flex items-center gap-2'>
                  <Book className='h-4 w-4' />
                  Bible Verse
                </div>
              </SelectItem>
              <SelectItem value='testimony'>
                <div className='flex items-center gap-2'>
                  <Heart className='h-4 w-4' />
                  Testimony
                </div>
              </SelectItem>
              <SelectItem value='prayer'>
                <div className='flex items-center gap-2'>
                  <BookOpen className='h-4 w-4' />
                  Prayer
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
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

            {/* Flow Control */}
            <div>
              <h3 className='text-muted-foreground mb-2 text-sm font-medium'>
                FLOW CONTROL
              </h3>
              <div className='space-y-1'>
                {NODE_TEMPLATES.flow.map((flow) => (
                  <Card
                    key={flow.id}
                    className='hover:border-primary/50 cursor-pointer p-3 transition-all hover:shadow-md'
                    onClick={() =>
                      addNode(flow, flow.id as 'splitter' | 'merge')
                    }
                  >
                    <div className='flex items-center gap-2'>
                      <div
                        className={cn(
                          'rounded-md bg-gradient-to-br p-1.5 text-white',
                          flow.color
                        )}
                      >
                        <flow.icon className='h-3.5 w-3.5' />
                      </div>
                      <div className='flex-1'>
                        <div className='text-sm font-medium'>{flow.name}</div>
                        <div className='text-muted-foreground text-xs'>
                          {flow.description}
                        </div>
                      </div>
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
              {/* Splitter configuration */}
              {selectedNode.type === 'splitter' && (
                <div>
                  <Label className='text-xs'>Split Strategy</Label>
                  <select
                    className='mt-1 w-full rounded-md border p-2 text-sm'
                    value={nodeConfig.strategy || 'parallel'}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...nodeConfig,
                        strategy: e.target.value,
                      }
                      setNodeConfig(updatedConfig)
                      updateNodeConfig(selectedNode.id, updatedConfig)
                    }}
                  >
                    <option value='parallel'>Run all branches</option>
                    <option value='conditional'>Conditional routing</option>
                    <option value='random'>Random selection</option>
                  </select>
                </div>
              )}

              {/* Merge configuration */}
              {selectedNode.type === 'merge' && (
                <div>
                  <Label className='text-xs'>Merge Strategy</Label>
                  <select
                    className='mt-1 w-full rounded-md border p-2 text-sm'
                    value={nodeConfig.strategy || 'collect'}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...nodeConfig,
                        strategy: e.target.value,
                      }
                      setNodeConfig(updatedConfig)
                      updateNodeConfig(selectedNode.id, updatedConfig)
                    }}
                  >
                    <option value='collect'>Collect all results</option>
                    <option value='first'>First to complete</option>
                    <option value='best'>Best performing</option>
                  </select>
                </div>
              )}

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
                    <Label className='text-xs'>Style Preset</Label>
                    <select
                      className='mt-1 w-full rounded-md border p-2 text-sm'
                      value={nodeConfig.style || 'default'}
                      onChange={(e) => {
                        const updatedConfig = {
                          ...nodeConfig,
                          style: e.target.value,
                        }
                        setNodeConfig(updatedConfig)
                        updateNodeConfig(selectedNode.id, updatedConfig)
                      }}
                    >
                      <option value='default'>Default</option>
                      <option value='disney animated'>Disney Animated</option>
                      <option value='realistic'>Photorealistic</option>
                      <option value='typography'>Typography Design</option>
                      <option value='peaceful'>Peaceful/Meditative</option>
                    </select>
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

              {/* Script generation config */}
              {selectedNode.data.actionId === 'generate-script' && (
                <>
                  <div>
                    <Label className='text-xs'>Content Type</Label>
                    <select
                      className='mt-1 w-full rounded-md border p-2 text-sm'
                      value={nodeConfig.type || 'general'}
                      onChange={(e) => {
                        const updatedConfig = {
                          ...nodeConfig,
                          type: e.target.value,
                        }
                        setNodeConfig(updatedConfig)
                        updateNodeConfig(selectedNode.id, updatedConfig)
                      }}
                    >
                      <option value='general'>General</option>
                      <option value='viral_hook'>Viral Hook</option>
                      <option value='bible_verse'>Bible Verse</option>
                      <option value='testimony'>Testimony Story</option>
                      <option value='prayer'>Prayer Text</option>
                    </select>
                  </div>
                  {nodeConfig.type === 'viral_hook' && (
                    <div className='rounded-lg border border-blue-500/20 bg-blue-500/10 p-3'>
                      <p className='text-muted-foreground text-xs'>
                        Will generate 5-10 attention-grabbing hooks optimized
                        for social media
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Video generation config */}
              {selectedNode.data.actionId === 'create-video' && (
                <div>
                  <Label className='text-xs'>Motion Style</Label>
                  <select
                    className='mt-1 w-full rounded-md border p-2 text-sm'
                    value={nodeConfig.motion || 'cinematic'}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...nodeConfig,
                        motion: e.target.value,
                      }
                      setNodeConfig(updatedConfig)
                      updateNodeConfig(selectedNode.id, updatedConfig)
                    }}
                  >
                    <option value='cinematic'>Cinematic</option>
                    <option value='subtle'>Subtle Movement</option>
                    <option value='dynamic'>Dynamic Action</option>
                    <option value='slow'>Slow & Peaceful</option>
                  </select>
                </div>
              )}

              {/* Batch trigger config */}
              {selectedNode.data.triggerId === 'batch' && (
                <div>
                  <Label className='text-xs'>Batch Size</Label>
                  <Input
                    type='number'
                    min='1'
                    max='50'
                    value={nodeConfig.batchSize || 10}
                    onChange={(e) => {
                      const updatedConfig = {
                        ...nodeConfig,
                        batchSize: parseInt(e.target.value),
                      }
                      setNodeConfig(updatedConfig)
                      updateNodeConfig(selectedNode.id, updatedConfig)
                    }}
                    className='mt-1'
                  />
                  <p className='text-muted-foreground mt-2 text-xs'>
                    Number of variations to generate per pipeline
                  </p>
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
              <WorkflowTesterV4
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
