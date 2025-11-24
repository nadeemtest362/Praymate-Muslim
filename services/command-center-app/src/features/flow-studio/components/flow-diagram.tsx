import React, { useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  AlertCircle,
  Plus,
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  Grid,
} from 'lucide-react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Position,
  NodeTypes,
  MarkerType,
  Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface FlowStep {
  id: string
  name: string
  type: string
  config: any
  emoji: string
  color: string
}

interface FlowDiagramProps {
  steps: FlowStep[]
  onStepClick: (step: FlowStep) => void
  onStepsChange: (steps: FlowStep[]) => void
  selectedStep?: FlowStep | null
  validateStep?: (step: FlowStep) => { isValid: boolean; warnings: string[] }
}

// Custom node component
const StepNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const validation = data.validation || { isValid: true, warnings: [] }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          'relative w-64 cursor-pointer transition-all duration-200',
          'from-background to-background/80 bg-gradient-to-br',
          'border-2',
          selected
            ? 'border-primary shadow-primary/20 shadow-lg'
            : 'border-border hover:border-primary/50',
          !validation.isValid && 'border-orange-500/50'
        )}
      >
        {/* Glow effect for selected node */}
        {selected && (
          <div className='bg-primary/20 absolute inset-0 -z-10 rounded-lg blur-xl' />
        )}

        <div className='p-4'>
          {/* Header */}
          <div className='mb-3 flex items-start gap-3'>
            <div
              className={cn(
                'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xl',
                'bg-gradient-to-br shadow-inner',
                data.color
              )}
            >
              {data.emoji}
            </div>
            <div className='min-w-0 flex-1'>
              <h4 className='text-sm leading-tight font-semibold'>
                {data.name}
              </h4>
              {data.title && (
                <p className='text-muted-foreground mt-1 line-clamp-2 text-xs'>
                  {data.title}
                </p>
              )}
            </div>
            {!validation.isValid && (
              <div className='group relative'>
                <AlertCircle className='h-4 w-4 text-orange-500' />
                <div className='bg-popover pointer-events-none absolute top-6 right-0 z-50 w-48 rounded-md border p-2 opacity-0 shadow-lg transition-opacity group-hover:opacity-100'>
                  <p className='mb-1 text-xs font-medium'>Issues:</p>
                  <ul className='space-y-0.5 text-xs'>
                    {validation.warnings.map((warning: string, i: number) => (
                      <li key={i} className='text-muted-foreground'>
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className='flex items-center gap-2'>
            <Badge variant='secondary' className='text-xs'>
              Step {data.index + 1}
            </Badge>
            {data.branches && data.branches.length > 1 && (
              <Badge variant='outline' className='text-xs'>
                <Layers className='mr-1 h-3 w-3' />
                {data.branches.length} paths
              </Badge>
            )}
          </div>
        </div>

        {/* React Flow Handles for connections */}
        <Handle
          type='target'
          position={Position.Left}
          id='target'
          style={{ background: '#555' }}
          isConnectable={true}
        />
        <Handle
          type='source'
          position={Position.Right}
          id='source'
          style={{ background: '#555' }}
          isConnectable={true}
        />
      </Card>
    </motion.div>
  )
}

// Custom edge with animation
const AnimatedEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: any) => {
  const path = `M ${sourceX},${sourceY} C ${sourceX + 100},${sourceY} ${targetX - 100},${targetY} ${targetX},${targetY}`

  return (
    <>
      <path
        style={style}
        className='react-flow__edge-path'
        d={path}
        markerEnd={markerEnd}
        strokeWidth={2}
        stroke='hsl(var(--primary))'
        strokeOpacity={0.3}
        fill='none'
      />
      <path
        style={style}
        className='react-flow__edge-path'
        d={path}
        strokeWidth={2}
        stroke='hsl(var(--primary))'
        strokeOpacity={0.6}
        fill='none'
        strokeDasharray='5 5'
      >
        <animate
          attributeName='stroke-dashoffset'
          values='10;0'
          dur='1s'
          repeatCount='indefinite'
        />
      </path>
    </>
  )
}

export function FlowDiagram({
  steps,
  onStepClick,
  onStepsChange,
  selectedStep,
  validateStep,
}: FlowDiagramProps) {
  const [showMinimap, setShowMinimap] = React.useState(true)
  const [showGrid, setShowGrid] = React.useState(true)

  // Memoize node and edge types to prevent React Flow warnings
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      stepNode: StepNode,
    }),
    []
  )

  const edgeTypes = useMemo(
    () => ({
      animated: AnimatedEdge,
    }),
    []
  )

  // Convert steps to nodes with fixed positions
  const nodes = useMemo(() => {
    return steps.map((step, index) => ({
      id: step.id,
      type: 'stepNode',
      position: { x: index * 350, y: 50 },
      data: {
        ...step,
        index,
        title: step.config.title || step.config.question,
        validation: validateStep
          ? validateStep(step)
          : { isValid: true, warnings: [] },
      },
      selected: selectedStep?.id === step.id,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      // Allow dragging for panning the view, but not for reordering
    }))
  }, [steps, selectedStep, validateStep])

  // Create edges between consecutive steps
  const edges = useMemo(() => {
    return steps.slice(0, -1).map((step, index) => ({
      id: `e${step.id}-${steps[index + 1].id}`,
      source: step.id,
      target: steps[index + 1].id,
      sourceHandle: 'source',
      targetHandle: 'target',
      type: 'animated',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'hsl(var(--primary))',
      },
    }))
  }, [steps])

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes)
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges)

  // Update nodes when steps or selection changes
  React.useEffect(() => {
    setNodes(nodes)
  }, [nodes, setNodes])

  React.useEffect(() => {
    setEdges(edges)
  }, [edges, setEdges])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const step = steps.find((s) => s.id === node.id)
      if (step) {
        onStepClick(step)
      }
    },
    [steps, onStepClick]
  )

  // Remove the onNodeDragStop handler - we'll let users reorder in list view instead
  // React Flow's node dragging is for visual positioning only

  return (
    <div className='relative h-full w-full'>
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.2}
        maxZoom={2}
        className='bg-background/50'
      >
        <Background
          color='hsl(var(--muted-foreground))'
          gap={showGrid ? 20 : 0}
          size={1}
          className='opacity-[0.03]'
        />

        <Controls
          className='bg-background/80 rounded-lg border shadow-lg backdrop-blur-sm'
          showInteractive={false}
        />

        {showMinimap && (
          <MiniMap
            className='bg-background/80 rounded-lg border shadow-lg backdrop-blur-sm'
            nodeColor={(node) =>
              node.selected ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
            }
            maskColor='hsl(var(--background))'
            pannable
            zoomable
          />
        )}

        <Panel position='top-left' className='flex gap-2'>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex gap-2'
          >
            <Button
              size='sm'
              variant={showMinimap ? 'secondary' : 'ghost'}
              onClick={() => setShowMinimap(!showMinimap)}
              className='h-8'
            >
              <Maximize2 className='mr-1 h-4 w-4' />
              Minimap
            </Button>
            <Button
              size='sm'
              variant={showGrid ? 'secondary' : 'ghost'}
              onClick={() => setShowGrid(!showGrid)}
              className='h-8'
            >
              <Grid className='mr-1 h-4 w-4' />
              Grid
            </Button>
          </motion.div>
        </Panel>

        <Panel position='bottom-center'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='bg-background/80 rounded-lg border px-4 py-2 shadow-lg backdrop-blur-sm'
          >
            <p className='text-muted-foreground flex items-center gap-2 text-xs'>
              <Sparkles className='h-3 w-3' />
              Click to edit • Scroll to zoom • Use list view to reorder steps
            </p>
          </motion.div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
