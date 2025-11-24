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
  Grid3x3,
  Layers,
  Copy,
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
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { getRecommendedModel } from '../services/openrouter-service'
import { getRecommendedReplicateModel } from '../services/replicate-service'
import { WorkflowTesterV5 } from './workflow-tester-v5'

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
          <div className='text-xs text-muted-foreground'>
            {data.triggerType}
          </div>
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
        'hover:shadow-md',
        data.status === 'running' && 'animate-pulse border-orange-500',
        data.status === 'success' && 'border-green-500',
        data.status === 'error' && 'border-red-500'
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
            data.color || 'from-blue-500 to-indigo-600'
          )}
        >
          {data.status === 'running' ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Icon className='h-4 w-4' />
          )}
        </div>
        <div>
          <div className='text-sm font-medium'>{data.label}</div>
          <div className='text-xs text-muted-foreground'>
            {data.actionType}
          </div>
        </div>
      </div>
    </div>
  )
}

function SplitterNode({ data, selected }: any) {
  return (
    <div
      className={cn(
        'bg-card min-w-[140px] rounded-lg border-2 px-4 py-3 shadow-sm',
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
      {/* 4 output handles for parallel branches */}
      <Handle
        type='source'
        position={Position.Right}
        id='output-1'
        style={{ top: '20%' }}
        className='!bg-orange-500 !border-background !h-3 !w-3 !border-2'
      />
      <Handle
        type='source'
        position={Position.Right}
        id='output-2'
        style={{ top: '40%' }}
        className='!bg-blue-500 !border-background !h-3 !w-3 !border-2'
      />
      <Handle
        type='source'
        position={Position.Right}
        id='output-3'
        style={{ top: '60%' }}
        className='!bg-green-500 !border-background !h-3 !w-3 !border-2'
      />
      <Handle
        type='source'
        position={Position.Right}
        id='output-4'
        style={{ top: '80%' }}
        className='!bg-purple-500 !border-background !h-3 !w-3 !border-2'
      />
      <div className='flex items-center gap-2'>
        <div className='rounded-md bg-gradient-to-br from-amber-500 to-orange-600 p-2 text-white'>
          <GitBranch className='h-4 w-4' />
        </div>
        <div>
          <div className='text-sm font-medium'>{data.label}</div>
          <div className='text-xs text-muted-foreground'>Split to 4</div>
        </div>
      </div>
    </div>
  )
}

function MergeNode({ data, selected }: any) {
  return (
    <div
      className={cn(
        'bg-card min-w-[140px] rounded-lg border-2 px-4 py-3 shadow-sm',
        'transition-all duration-200',
        selected ? 'border-primary shadow-lg' : 'border-border',
        'hover:shadow-md'
      )}
    >
      {/* 4 input handles for parallel branches */}
      <Handle
        type='target'
        position={Position.Left}
        id='input-1'
        style={{ top: '20%' }}
        className='!bg-orange-500 !border-background !h-3 !w-3 !border-2'
      />
      <Handle
        type='target'
        position={Position.Left}
        id='input-2'
        style={{ top: '40%' }}
        className='!bg-blue-500 !border-background !h-3 !w-3 !border-2'
      />
      <Handle
        type='target'
        position={Position.Left}
        id='input-3'
        style={{ top: '60%' }}
        className='!bg-green-500 !border-background !h-3 !w-3 !border-2'
      />
      <Handle
        type='target'
        position={Position.Left}
        id='input-4'
        style={{ top: '80%' }}
        className='!bg-purple-500 !border-background !h-3 !w-3 !border-2'
      />
      <Handle
        type='source'
        position={Position.Right}
        className='!bg-primary !border-background !h-3 !w-3 !border-2'
      />
      <div className='flex items-center gap-2'>
        <div className='rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 p-2 text-white'>
          <GitMerge className='h-4 w-4' />
        </div>
        <div>
          <div className='text-sm font-medium'>{data.label}</div>
          <div className='text-xs text-muted-foreground'>Merge results</div>
        </div>
      </div>
    </div>
  )
}

function BatchNode({ data, selected }: any) {
  return (
    <div
      className={cn(
        'bg-card min-w-[200px] rounded-lg border-2 px-4 py-3 shadow-sm',
        'transition-all duration-200',
        selected ? 'border-primary shadow-lg' : 'border-border',
        'hover:shadow-md',
        data.status === 'running' && 'animate-pulse border-orange-500',
        data.status === 'success' && 'border-green-500',
        data.status === 'error' && 'border-red-500'
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
        <div className='rounded-md bg-gradient-to-br from-purple-500 to-pink-600 p-2 text-white'>
          {data.status === 'running' ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Grid3x3 className='h-4 w-4' />
          )}
        </div>
        <div className='flex-1'>
          <div className='text-sm font-medium'>{data.label}</div>
          <div className='text-xs text-muted-foreground'>
            {data.variations || 10}x variations
          </div>
          {data.progress !== undefined && (
            <div className='mt-1'>
              <div className='h-1 w-full bg-muted rounded-full overflow-hidden'>
                <div
                  className='h-full bg-primary transition-all duration-300'
                  style={{ width: `${data.progress}%` }}
                />
              </div>
              <div className='text-xs text-muted-foreground mt-0.5'>
                {data.completedCount || 0}/{data.totalCount || 10}
              </div>
            </div>
          )}
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
  batch: BatchNode,
}

// Pipeline templates for different content types
const PIPELINE_TEMPLATES = {
  jesus: {
    name: 'Jesus Content',
    icon: Church,
    color: 'from-amber-500 to-orange-600',
    nodes: [
      { id: 'prompt', type: 'action', label: 'Generate Prompt', actionId: 'prompt_generation' },
      { id: 'image', type: 'action', label: 'Create Thumbnail', actionId: 'image_generation' },
      { id: 'video', type: 'action', label: 'Create Video', actionId: 'video_generation' },
      { id: 'music', type: 'action', label: 'Add Music', actionId: 'music_generation' }
    ]
  },
  bible: {
    name: 'Bible Verse',
    icon: Book,
    color: 'from-blue-500 to-indigo-600',
    nodes: [
      { id: 'prompt', type: 'action', label: 'Generate Prompt', actionId: 'prompt_generation' },
      { id: 'image', type: 'action', label: 'Create Visual', actionId: 'image_generation' },
      { id: 'video', type: 'action', label: 'Create Video', actionId: 'video_generation' },
      { id: 'music', type: 'action', label: 'Add Audio', actionId: 'music_generation' }
    ]
  },
  testimony: {
    name: 'Testimony',
    icon: Heart,
    color: 'from-pink-500 to-rose-600',
    nodes: [
      { id: 'prompt', type: 'action', label: 'Generate Story', actionId: 'prompt_generation' },
      { id: 'image', type: 'action', label: 'Create Cover', actionId: 'image_generation' },
      { id: 'video', type: 'action', label: 'Create Video', actionId: 'video_generation' },
      { id: 'music', type: 'action', label: 'Add Background', actionId: 'music_generation' }
    ]
  },
  prayer: {
    name: 'Prayer',
    icon: BookOpen,
    color: 'from-purple-500 to-violet-600',
    nodes: [
      { id: 'prompt', type: 'action', label: 'Generate Prayer', actionId: 'prompt_generation' },
      { id: 'image', type: 'action', label: 'Create Background', actionId: 'image_generation' },
      { id: 'video', type: 'action', label: 'Create Video', actionId: 'video_generation' },
      { id: 'music', type: 'action', label: 'Add Ambience', actionId: 'music_generation' }
    ]
  }
}

// Helper function to get icon based on id
function getIconFromId(id: string, type: 'trigger' | 'action') {
  const iconMap: Record<string, any> = {
    // Triggers
    manual: Play,
    schedule: Calendar,
    webhook: Send,
    // Actions
    prompt_generation: FileText,
    image_generation: Image,
    video_generation: Video,
    music_generation: Music,
    social_media_post: Send,
    analytics_tracking: TrendingUp,
    audience_segmentation: Users,
    completion: CheckCircle2,
  }
  return iconMap[id] || Sparkles
}

// Initial nodes and edges for demonstration
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 250, y: 300 },
    data: {
      label: 'Manual Trigger',
      triggerId: 'manual',
      triggerType: 'Manual',
      icon: Play,
      color: 'from-green-500 to-emerald-600',
    },
  },
]

const initialEdges: Edge[] = []

interface WorkflowBuilderV7Props {
  className?: string
}

export function WorkflowBuilderV7({ className }: WorkflowBuilderV7Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isTesterOpen, setIsTesterOpen] = useState(false)
  const [nodeIdCounter, setNodeIdCounter] = useState(2)

  const selectedNodeData = selectedNode
    ? nodes.find((n) => n.id === selectedNode)
    : null

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: {
              strokeWidth: 2,
            },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id)
      setIsConfigOpen(true)
    },
    []
  )

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
              id: `${source}->${target}`,
              source,
              target,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
              },
              style: {
                strokeWidth: 2,
              },
            }))
          )

          return [...remainingEdges, ...createdEdges]
        }, edges)
      )
    },
    [nodes, edges, setEdges]
  )

  const addNode = useCallback(
    (type: string, actionId?: string, label?: string) => {
      const newNode: Node = {
        id: `${nodeIdCounter}`,
        type,
        position: { x: 300 + nodeIdCounter * 50, y: 150 + nodeIdCounter * 30 },
        data: {
          label: label || `${type} ${nodeIdCounter}`,
          [`${type}Id`]: actionId || type,
          [`${type}Type`]: label || type,
          icon: actionId ? getIconFromId(actionId, 'action') : Sparkles,
          color:
            type === 'trigger'
              ? 'from-green-500 to-emerald-600'
              : type === 'splitter'
              ? 'from-amber-500 to-orange-600'
              : type === 'merge'
              ? 'from-indigo-500 to-purple-600'
              : type === 'batch'
              ? 'from-purple-500 to-pink-600'
              : 'from-blue-500 to-indigo-600',
        },
      }
      setNodes((nds) => [...nds, newNode])
      setNodeIdCounter((c) => c + 1)
      return newNode
    },
    [nodeIdCounter, setNodes]
  )

  const addBatchNode = useCallback(() => {
    const batchNode = addNode('batch', 'batch_generation', 'Batch Generator')
    // Update node with batch-specific data
    setNodes((nds) =>
      nds.map((n) =>
        n.id === batchNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                variations: 10,
                strategy: 'parallel',
                templates: ['jesus', 'bible', 'testimony', 'prayer'],
              },
            }
          : n
      )
    )
  }, [addNode, setNodes])

  const createPipeline = useCallback((templateKey: string) => {
    const template = PIPELINE_TEMPLATES[templateKey as keyof typeof PIPELINE_TEMPLATES]
    if (!template) return

    const startX = 300 + nodeIdCounter * 50
    const startY = 150 + (Object.keys(PIPELINE_TEMPLATES).indexOf(templateKey) * 120)
    
    let prevNodeId = null
    template.nodes.forEach((nodeTemplate, index) => {
      const newNode: Node = {
        id: `${nodeIdCounter + index}`,
        type: 'action',
        position: { x: startX + index * 200, y: startY },
        data: {
          label: nodeTemplate.label,
          actionId: nodeTemplate.actionId,
          actionType: nodeTemplate.label,
          icon: getIconFromId(nodeTemplate.actionId, 'action'),
          color: template.color,
          pipelineType: templateKey,
        },
      }
      setNodes((nds) => [...nds, newNode])
      
      if (prevNodeId) {
        setEdges((eds) => [...eds, {
          id: `${prevNodeId}->${newNode.id}`,
          source: prevNodeId,
          target: newNode.id,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: {
            strokeWidth: 2,
          },
        }])
      }
      
      prevNodeId = newNode.id
    })
    
    setNodeIdCounter((c) => c + template.nodes.length)
  }, [nodeIdCounter, setNodes, setEdges])

  const createParallelPipelines = useCallback(() => {
    // Clear existing nodes except trigger
    setNodes((nds) => nds.filter(n => n.type === 'trigger'))
    setEdges([])
    
    // Create batch node connected to trigger
    const triggerId = nodes.find(n => n.type === 'trigger')?.id || '1'
    const batchNode: Node = {
      id: 'batch-1',
      type: 'batch',
      position: { x: 250, y: 280 },
      data: {
        label: 'Batch Generator',
        variations: 10,
        strategy: 'parallel',
        templates: ['jesus', 'bible', 'testimony', 'prayer'],
      },
    }
    
    // Create splitter
    const splitterNode: Node = {
      id: 'splitter-1',
      type: 'splitter',
      position: { x: 500, y: 300 },
      data: { label: 'Content Splitter' },
    }
    
    // Add nodes
    setNodes((nds) => [...nds, batchNode, splitterNode])
    
    // Connect trigger -> batch -> splitter
    setEdges([
      {
        id: `${triggerId}->batch-1`,
        source: triggerId,
        target: 'batch-1',
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        style: { strokeWidth: 2 },
      },
      {
        id: 'batch-1->splitter-1',
        source: 'batch-1',
        target: 'splitter-1',
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        style: { strokeWidth: 2 },
      },
    ])
    
    // Create 4 parallel pipelines
    const pipelineTypes = ['jesus', 'bible', 'testimony', 'prayer']
    const mergeNodes: string[] = []
    
    pipelineTypes.forEach((type, pipelineIndex) => {
      const template = PIPELINE_TEMPLATES[type as keyof typeof PIPELINE_TEMPLATES]
      const startX = 700
      const startY = 100 + pipelineIndex * 150
      
      let prevNodeId = null
      let firstNodeId = null
      
      template.nodes.forEach((nodeTemplate, nodeIndex) => {
        const nodeId = `${type}-${nodeIndex}`
        const newNode: Node = {
          id: nodeId,
          type: 'action',
          position: { x: startX + nodeIndex * 180, y: startY },
          data: {
            label: nodeTemplate.label,
            actionId: nodeTemplate.actionId,
            actionType: nodeTemplate.label,
            icon: getIconFromId(nodeTemplate.actionId, 'action'),
            color: template.color,
            pipelineType: type,
          },
        }
        setNodes((nds) => [...nds, newNode])
        
        if (nodeIndex === 0) {
          firstNodeId = nodeId
          // Connect splitter to first node
          setEdges((eds) => [...eds, {
            id: `splitter-1->${nodeId}`,
            source: 'splitter-1',
            sourceHandle: `output-${pipelineIndex + 1}`,
            target: nodeId,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            style: { strokeWidth: 2 },
          }])
        }
        
        if (prevNodeId) {
          setEdges((eds) => [...eds, {
            id: `${prevNodeId}->${nodeId}`,
            source: prevNodeId,
            target: nodeId,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            style: { strokeWidth: 2 },
          }])
        }
        
        prevNodeId = nodeId
      })
      
      mergeNodes.push(prevNodeId!)
    })
    
    // Create merge node
    const mergeNode: Node = {
      id: 'merge-1',
      type: 'merge',
      position: { x: 1600, y: 300 },
      data: { label: 'Collect Results' },
    }
    setNodes((nds) => [...nds, mergeNode])
    
    // Connect all pipelines to merge
    mergeNodes.forEach((nodeId, index) => {
      setEdges((eds) => [...eds, {
        id: `${nodeId}->merge-1`,
        source: nodeId,
        target: 'merge-1',
        targetHandle: `input-${index + 1}`,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        style: { strokeWidth: 2 },
      }])
    })
    
    // Add final completion node
    const completionNode: Node = {
      id: 'completion-1',
      type: 'action',
      position: { x: 1800, y: 300 },
      data: {
        label: 'Process Results',
        actionId: 'completion',
        actionType: 'Completion',
        icon: CheckCircle2,
        color: 'from-green-500 to-emerald-600',
      },
    }
    setNodes((nds) => [...nds, completionNode])
    
    setEdges((eds) => [...eds, {
      id: 'merge-1->completion-1',
      source: 'merge-1',
      target: 'completion-1',
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      style: { strokeWidth: 2 },
    }])
    
    setNodeIdCounter((c) => c + 50)
    toast.success('Created batch processing pipeline with 4 parallel content types!')
  }, [nodes, setNodes, setEdges, setNodeIdCounter])

  const updateNodeConfig = useCallback(
    (nodeId: string, config: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, config } }
            : node
        )
      )
      toast.success('Node configuration updated')
    },
    [setNodes]
  )

  const nodeActions = useMemo(
    () => [
      {
        id: 'prompt_generation',
        label: 'Generate Prompt',
        icon: FileText,
      },
      {
        id: 'image_generation',
        label: 'Generate Image',
        icon: Image,
      },
      {
        id: 'video_generation',
        label: 'Generate Video',
        icon: Video,
      },
      {
        id: 'music_generation',
        label: 'Generate Music',
        icon: Music,
      },
      {
        id: 'social_media_post',
        label: 'Post to Social',
        icon: Send,
      },
      {
        id: 'analytics_tracking',
        label: 'Track Analytics',
        icon: TrendingUp,
      },
      {
        id: 'audience_segmentation',
        label: 'Segment Audience',
        icon: Users,
      },
      {
        id: 'completion',
        label: 'Complete Workflow',
        icon: CheckCircle2,
      },
    ],
    []
  )

  return (
    <div className={cn('relative h-[800px] w-full bg-slate-900 rounded-lg overflow-hidden', className)}>
      <div className='absolute left-4 top-4 z-10 flex flex-wrap gap-2'>
        <Card className='p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsTesterOpen(true)}
            >
              <Play className='mr-2 h-4 w-4' />
              Test Workflow
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => toast.success('Workflow saved!')}
            >
              <Save className='mr-2 h-4 w-4' />
              Save
            </Button>
          </div>
        </Card>
        <Select onValueChange={createPipeline}>
          <SelectTrigger className='w-[200px] bg-background/95 backdrop-blur'>
            <SelectValue placeholder='Add pipeline template' />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PIPELINE_TEMPLATES).map(([key, template]) => {
              const Icon = template.icon
              return (
                <SelectItem key={key} value={key}>
                  <div className='flex items-center gap-2'>
                    <Icon className='h-4 w-4' />
                    {template.name}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <Button
          size='sm'
          variant='outline'
          onClick={createParallelPipelines}
          className='bg-background/95 backdrop-blur'
        >
          <Layers className='mr-2 h-4 w-4' />
          Create Batch Pipeline
        </Button>
        <Button
          size='sm'
          variant='outline'
          onClick={addBatchNode}
          className='bg-background/95 backdrop-blur'
        >
          <Grid3x3 className='mr-2 h-4 w-4' />
          Add Batch Node
        </Button>
      </div>

      <div className='absolute right-4 top-4 z-10'>
        <Card className='p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-[200px]'>
          <div className='flex items-center justify-between px-2 py-1'>
            <h3 className='text-xs font-medium'>Add Nodes</h3>
          </div>
          <div className='space-y-1 max-h-[300px] overflow-y-auto'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full justify-start h-8 text-xs'
              onClick={() => addNode('trigger', 'manual', 'Manual Trigger')}
            >
              <Play className='mr-2 h-3 w-3' />
              Add Trigger
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='w-full justify-start h-8 text-xs'
              onClick={() => addNode('splitter', 'splitter', 'Splitter')}
            >
              <GitBranch className='mr-2 h-3 w-3' />
              Add Splitter
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='w-full justify-start h-8 text-xs'
              onClick={() => addNode('merge', 'merge', 'Merge')}
            >
              <GitMerge className='mr-2 h-3 w-3' />
              Add Merge
            </Button>
            <div className='border-t pt-1'>
              {nodeActions.map((action) => (
                <Button
                  key={action.id}
                  variant='ghost'
                  size='sm'
                  className='w-full justify-start h-8 text-xs'
                  onClick={() =>
                    addNode('action', action.id, action.label)
                  }
                >
                  <action.icon className='mr-2 h-3 w-3' />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>

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
        className='bg-slate-950'
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color='#475569'
          gap={16}
          size={1}
        />
        <Controls className='bg-background/95 backdrop-blur' />
        <MiniMap 
          className='bg-background/95 backdrop-blur'
          nodeColor='#64748b'
          maskColor='rgb(15, 23, 42, 0.8)'
        />
      </ReactFlow>

      <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <SheetContent className='sm:max-w-[540px]'>
          <SheetHeader>
            <SheetTitle>Configure {selectedNodeData?.data.label}</SheetTitle>
            <SheetDescription>
              Set up the configuration for this workflow node
            </SheetDescription>
          </SheetHeader>
          {selectedNodeData && (
            <div className='mt-6 space-y-4'>
              {selectedNodeData.type === 'batch' ? (
                // Batch node configuration
                <div className='space-y-4'>
                  <div>
                    <Label>Number of Variations</Label>
                    <div className='flex items-center gap-4 mt-2'>
                      <Slider
                        value={[selectedNodeData.data.variations || 10]}
                        onValueChange={(value) => {
                          setNodes((nds) =>
                            nds.map((n) =>
                              n.id === selectedNodeData.id
                                ? {
                                    ...n,
                                    data: { ...n.data, variations: value[0] },
                                  }
                                : n
                            )
                          )
                        }}
                        min={1}
                        max={50}
                        step={1}
                        className='flex-1'
                      />
                      <span className='w-12 text-right text-sm font-medium'>
                        {selectedNodeData.data.variations || 10}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label>Generation Strategy</Label>
                    <Select
                      value={selectedNodeData.data.strategy || 'parallel'}
                      onValueChange={(value) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNodeData.id
                              ? {
                                  ...n,
                                  data: { ...n.data, strategy: value },
                                }
                              : n
                          )
                        )
                      }}
                    >
                      <SelectTrigger className='mt-2'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='parallel'>
                          Parallel (Fast, Higher Cost)
                        </SelectItem>
                        <SelectItem value='sequential'>
                          Sequential (Slower, Lower Cost)
                        </SelectItem>
                        <SelectItem value='adaptive'>
                          Adaptive (Smart Balance)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Base Prompt Template</Label>
                    <Textarea
                      className='mt-2'
                      rows={4}
                      placeholder='Enter base prompt that will be varied...'
                      value={selectedNodeData.data.basePrompt || ''}
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === selectedNodeData.id
                              ? {
                                  ...n,
                                  data: { ...n.data, basePrompt: e.target.value },
                                }
                              : n
                          )
                        )
                      }}
                    />
                  </div>

                  <div>
                    <Label>Variation Parameters</Label>
                    <div className='space-y-2 mt-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm'>Tone Variations</span>
                        <Switch
                          checked={selectedNodeData.data.varyTone !== false}
                          onCheckedChange={(checked) => {
                            setNodes((nds) =>
                              nds.map((n) =>
                                n.id === selectedNodeData.id
                                  ? {
                                      ...n,
                                      data: { ...n.data, varyTone: checked },
                                    }
                                  : n
                              )
                            )
                          }}
                        />
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm'>Style Variations</span>
                        <Switch
                          checked={selectedNodeData.data.varyStyle !== false}
                          onCheckedChange={(checked) => {
                            setNodes((nds) =>
                              nds.map((n) =>
                                n.id === selectedNodeData.id
                                  ? {
                                      ...n,
                                      data: { ...n.data, varyStyle: checked },
                                    }
                                  : n
                              )
                            )
                          }}
                        />
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm'>Hook Variations</span>
                        <Switch
                          checked={selectedNodeData.data.varyHook !== false}
                          onCheckedChange={(checked) => {
                            setNodes((nds) =>
                              nds.map((n) =>
                                n.id === selectedNodeData.id
                                  ? {
                                      ...n,
                                      data: { ...n.data, varyHook: checked },
                                    }
                                  : n
                              )
                            )
                          }}
                        />
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm'>Length Variations</span>
                        <Switch
                          checked={selectedNodeData.data.varyLength !== false}
                          onCheckedChange={(checked) => {
                            setNodes((nds) =>
                              nds.map((n) =>
                                n.id === selectedNodeData.id
                                  ? {
                                      ...n,
                                      data: { ...n.data, varyLength: checked },
                                    }
                                  : n
                              )
                            )
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Target Pipelines</Label>
                    <div className='space-y-2 mt-2'>
                      {Object.entries(PIPELINE_TEMPLATES).map(([key, template]) => {
                        const Icon = template.icon
                        return (
                          <div
                            key={key}
                            className='flex items-center justify-between'
                          >
                            <div className='flex items-center gap-2'>
                              <Icon className='h-4 w-4' />
                              <span className='text-sm'>{template.name}</span>
                            </div>
                            <Switch
                              checked={
                                selectedNodeData.data.templates?.includes(key) !==
                                false
                              }
                              onCheckedChange={(checked) => {
                                const currentTemplates =
                                  selectedNodeData.data.templates || []
                                const newTemplates = checked
                                  ? [...currentTemplates, key]
                                  : currentTemplates.filter((t: string) => t !== key)
                                setNodes((nds) =>
                                  nds.map((n) =>
                                    n.id === selectedNodeData.id
                                      ? {
                                          ...n,
                                          data: {
                                            ...n.data,
                                            templates: newTemplates,
                                          },
                                        }
                                      : n
                                  )
                                )
                              }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : selectedNodeData.data.actionId === 'prompt_generation' ? (
                <div>
                  <Label>Prompt Template</Label>
                  <Textarea
                    className='mt-2'
                    rows={6}
                    placeholder='Enter your prompt template...'
                    defaultValue={selectedNodeData.data.config?.prompt || ''}
                    onChange={(e) =>
                      updateNodeConfig(selectedNodeData.id, {
                        prompt: e.target.value,
                      })
                    }
                  />
                </div>
              ) : selectedNodeData.data.actionId === 'image_generation' ? (
                <div className='space-y-4'>
                  <div>
                    <Label>Image Model</Label>
                    <Select
                      defaultValue={
                        selectedNodeData.data.config?.model ||
                        getRecommendedReplicateModel('image')
                      }
                      onValueChange={(value) =>
                        updateNodeConfig(selectedNodeData.id, {
                          ...selectedNodeData.data.config,
                          model: value,
                        })
                      }
                    >
                      <SelectTrigger className='mt-2'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='flux-pro'>FLUX Pro</SelectItem>
                        <SelectItem value='flux-dev'>FLUX Dev</SelectItem>
                        <SelectItem value='sdxl'>SDXL</SelectItem>
                        <SelectItem value='dalle-3'>DALL-E 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Style</Label>
                    <Input
                      className='mt-2'
                      placeholder='e.g., cinematic, realistic, artistic'
                      defaultValue={selectedNodeData.data.config?.style || ''}
                      onChange={(e) =>
                        updateNodeConfig(selectedNodeData.id, {
                          ...selectedNodeData.data.config,
                          style: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ) : selectedNodeData.data.actionId === 'video_generation' ? (
                <div className='space-y-4'>
                  <div>
                    <Label>Video Model</Label>
                    <Select
                      defaultValue={
                        selectedNodeData.data.config?.model ||
                        getRecommendedReplicateModel('video')
                      }
                      onValueChange={(value) =>
                        updateNodeConfig(selectedNodeData.id, {
                          ...selectedNodeData.data.config,
                          model: value,
                        })
                      }
                    >
                      <SelectTrigger className='mt-2'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='minimax'>MiniMax</SelectItem>
                        <SelectItem value='cogvideox'>CogVideoX</SelectItem>
                        <SelectItem value='stable-video'>
                          Stable Video
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration (seconds)</Label>
                    <Input
                      type='number'
                      className='mt-2'
                      min='1'
                      max='60'
                      defaultValue={
                        selectedNodeData.data.config?.duration || '10'
                      }
                      onChange={(e) =>
                        updateNodeConfig(selectedNodeData.id, {
                          ...selectedNodeData.data.config,
                          duration: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              ) : selectedNodeData.data.actionId === 'music_generation' ? (
                <div className='space-y-4'>
                  <div>
                    <Label>Music Style</Label>
                    <Input
                      className='mt-2'
                      placeholder='e.g., ambient, uplifting, dramatic'
                      defaultValue={selectedNodeData.data.config?.style || ''}
                      onChange={(e) =>
                        updateNodeConfig(selectedNodeData.id, {
                          ...selectedNodeData.data.config,
                          style: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Duration (seconds)</Label>
                    <Input
                      type='number'
                      className='mt-2'
                      min='10'
                      max='300'
                      defaultValue={
                        selectedNodeData.data.config?.duration || '30'
                      }
                      onChange={(e) =>
                        updateNodeConfig(selectedNodeData.id, {
                          ...selectedNodeData.data.config,
                          duration: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className='text-sm text-muted-foreground'>
                  No configuration needed for this node type.
                </div>
              )}

              <div className='flex justify-end gap-2 pt-4'>
                <Button
                  variant='outline'
                  onClick={() => setIsConfigOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setIsConfigOpen(false)}>
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <WorkflowTesterV5
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        nodes={nodes}
        edges={edges}
        onNodeUpdate={(nodeId, updates) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, ...updates } }
                : node
            )
          )
        }}
      />
    </div>
  )
}