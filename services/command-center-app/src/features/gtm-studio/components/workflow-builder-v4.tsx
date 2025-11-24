import React, { useState, useRef, useCallback } from 'react'
import {
  Plus,
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
  Settings,
  X,
  Workflow as WorkflowIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  getRecommendedReplicateModel,
  REPLICATE_MODELS,
} from '../services/replicate-service'
import { WorkflowTester } from './workflow-tester'

// Node-based workflow builder inspired by n8n

interface WorkflowNode {
  id: string
  type: 'trigger' | 'action'
  category?: string
  name: string
  icon: any
  position: { x: number; y: number }
  data: {
    actionId?: string
    triggerId?: string
    config: Record<string, any>
    modelId?: string
    modelProvider?: 'openrouter' | 'replicate'
  }
}

interface WorkflowConnection {
  id: string
  source: string
  target: string
}

export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  createdAt: Date
  lastRun?: Date
  runCount: number
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
    },
    {
      id: 'create-video',
      name: 'Generate Video',
      icon: Video,
      color: 'from-purple-500 to-pink-600',
      category: 'media',
    },
    {
      id: 'contextual-image',
      name: 'Contextual Image',
      icon: Sparkles,
      color: 'from-indigo-500 to-purple-600',
      category: 'media',
    },
    {
      id: 'generate-audio',
      name: 'Generate Audio',
      icon: Music,
      color: 'from-yellow-500 to-orange-600',
      category: 'media',
    },
    {
      id: 'generate-script',
      name: 'Generate Script',
      icon: FileText,
      color: 'from-teal-500 to-cyan-600',
      category: 'content',
    },
    {
      id: 'post-social',
      name: 'Post to Social',
      icon: Send,
      color: 'from-blue-500 to-cyan-600',
      category: 'social',
    },
    {
      id: 'analyze-metrics',
      name: 'Analyze Metrics',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-600',
      category: 'analytics',
    },
  ],
}

// Simple node component
function WorkflowNode({
  node,
  isSelected,
  onSelect,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  node: WorkflowNode
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  const Icon = node.icon
  const isAction = node.type === 'action'
  const template = isAction
    ? NODE_TEMPLATES.actions.find((a) => a.id === node.data.actionId)
    : NODE_TEMPLATES.triggers.find((t) => t.id === node.data.triggerId)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        'absolute cursor-move transition-all',
        'bg-card w-48 rounded-lg border-2 shadow-md hover:shadow-lg',
        isSelected ? 'border-primary ring-primary/20 ring-2' : 'border-border',
        'select-none'
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
    >
      <div
        className={cn(
          'rounded-t-md bg-gradient-to-r px-3 py-2 text-white',
          template?.color || 'from-gray-500 to-gray-600'
        )}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Icon className='h-4 w-4' />
            <span className='text-sm font-medium'>{node.name}</span>
          </div>
          {isSelected && (
            <Button
              size='sm'
              variant='ghost'
              className='h-5 w-5 p-0 hover:bg-white/20'
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <X className='h-3 w-3' />
            </Button>
          )}
        </div>
      </div>
      <div className='p-2'>
        <p className='text-muted-foreground text-xs'>
          {node.type === 'trigger' ? 'Start workflow' : 'Process data'}
        </p>
      </div>

      {/* Connection points */}
      {node.type === 'action' && (
        <div className='bg-primary border-background absolute top-1/2 -left-2 h-4 w-4 -translate-y-1/2 rounded-full border-2' />
      )}
      <div className='bg-primary border-background absolute top-1/2 -right-2 h-4 w-4 -translate-y-1/2 rounded-full border-2' />
    </div>
  )
}

// Connection line component
function ConnectionLine({
  from,
  to,
}: {
  from: WorkflowNode
  to: WorkflowNode
}) {
  const x1 = from.position.x + 192 // node width + connection point
  const y1 = from.position.y + 40 // half node height
  const x2 = to.position.x - 8
  const y2 = to.position.y + 40

  // Simple bezier curve
  const cx1 = x1 + (x2 - x1) / 2
  const cy1 = y1
  const cx2 = x1 + (x2 - x1) / 2
  const cy2 = y2

  return (
    <svg className='pointer-events-none absolute inset-0' style={{ zIndex: 0 }}>
      <path
        d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
        stroke='hsl(var(--primary))'
        strokeWidth='2'
        fill='none'
        opacity='0.5'
      />
    </svg>
  )
}

export function WorkflowBuilderV4({ task, onClose }: any) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [workflow, setWorkflow] = useState<Workflow>({
    id: `wf-${Date.now()}`,
    name: 'New Workflow',
    nodes: [],
    connections: [],
    createdAt: new Date(),
    runCount: 0,
  })
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showNodeConfig, setShowNodeConfig] = useState(false)
  const [showTester, setShowTester] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId)

  // Add node to canvas
  const addNode = (template: any, type: 'trigger' | 'action') => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      name: template.name,
      icon: template.icon,
      position: {
        x: workflow.nodes.length * 220 + 20,
        y: type === 'trigger' ? 50 : 150,
      },
      data: {
        [type === 'trigger' ? 'triggerId' : 'actionId']: template.id,
        config: {},
        modelProvider:
          type === 'action' &&
          [
            'generate-image',
            'create-video',
            'generate-audio',
            'contextual-image',
          ].includes(template.id)
            ? 'replicate'
            : 'openrouter',
      },
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

    setWorkflow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }))

    // Auto-connect to previous node
    if (workflow.nodes.length > 0) {
      const lastNode = workflow.nodes[workflow.nodes.length - 1]
      setWorkflow((prev) => ({
        ...prev,
        connections: [
          ...prev.connections,
          {
            id: `conn-${Date.now()}`,
            source: lastNode.id,
            target: newNode.id,
          },
        ],
      }))
    }

    // Select and configure the new node
    setSelectedNodeId(newNode.id)
    setShowNodeConfig(true)
  }

  // Handle node drag
  const handleNodeDragStart = (e: React.DragEvent, nodeId: string) => {
    const node = workflow.nodes.find((n) => n.id === nodeId)
    if (!node) return

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setIsDragging(true)
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!selectedNodeId) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left - dragOffset.x
    const y = e.clientY - rect.top - dragOffset.y

    setWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === selectedNodeId
          ? { ...n, position: { x: Math.max(0, x), y: Math.max(0, y) } }
          : n
      ),
    }))
  }

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Delete node
  const deleteNode = (nodeId: string) => {
    setWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      connections: prev.connections.filter(
        (c) => c.source !== nodeId && c.target !== nodeId
      ),
    }))
    setSelectedNodeId(null)
    setShowNodeConfig(false)
  }

  // Update node config
  const updateNodeConfig = (config: any) => {
    if (!selectedNodeId) return

    setWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, config } } : n
      ),
    }))
  }

  // Convert to old workflow format for execution
  const convertToExecutableWorkflow = () => {
    const steps = workflow.nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      actionId: node.data.actionId,
      triggerId: node.data.triggerId,
      config: node.data.config,
      modelId: node.data.modelId,
      modelProvider: node.data.modelProvider,
    }))

    return {
      ...workflow,
      steps,
    }
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b p-4'>
        <div className='flex items-center gap-3'>
          <WorkflowIcon className='h-5 w-5' />
          <Input
            value={workflow.name}
            onChange={(e) =>
              setWorkflow((prev) => ({ ...prev, name: e.target.value }))
            }
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
          <Button size='sm' onClick={() => toast.success('Workflow saved!')}>
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
        <div className='w-64 overflow-y-auto border-r p-4'>
          <div className='space-y-4'>
            {/* Triggers */}
            <div>
              <h3 className='mb-2 text-sm font-medium'>Triggers</h3>
              <div className='space-y-1'>
                {NODE_TEMPLATES.triggers.map((trigger) => (
                  <Button
                    key={trigger.id}
                    variant='outline'
                    size='sm'
                    className='w-full justify-start'
                    onClick={() => addNode(trigger, 'trigger')}
                  >
                    <trigger.icon className='mr-2 h-4 w-4' />
                    {trigger.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className='mb-2 text-sm font-medium'>Actions</h3>
              <div className='space-y-1'>
                {NODE_TEMPLATES.actions.map((action) => (
                  <Button
                    key={action.id}
                    variant='outline'
                    size='sm'
                    className='w-full justify-start'
                    onClick={() => addNode(action, 'action')}
                  >
                    <action.icon className='mr-2 h-4 w-4' />
                    {action.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className='bg-muted/20 relative flex-1 overflow-auto'>
          <div
            ref={canvasRef}
            className='relative h-full min-h-[600px] w-full min-w-[800px]'
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
          >
            {/* Grid background */}
            <div
              className='absolute inset-0 opacity-5'
              style={{
                backgroundImage:
                  'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Connections */}
            {workflow.connections.map((conn) => {
              const fromNode = workflow.nodes.find((n) => n.id === conn.source)
              const toNode = workflow.nodes.find((n) => n.id === conn.target)
              if (!fromNode || !toNode) return null
              return (
                <ConnectionLine key={conn.id} from={fromNode} to={toNode} />
              )
            })}

            {/* Nodes */}
            {workflow.nodes.map((node) => (
              <WorkflowNode
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onSelect={() => {
                  setSelectedNodeId(node.id)
                  setShowNodeConfig(true)
                }}
                onDelete={() => deleteNode(node.id)}
                onDragStart={(e) => handleNodeDragStart(e, node.id)}
                onDragEnd={() => setIsDragging(false)}
              />
            ))}

            {/* Empty state */}
            {workflow.nodes.length === 0 && (
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='text-center'>
                  <WorkflowIcon className='text-muted-foreground/30 mx-auto mb-4 h-12 w-12' />
                  <h3 className='mb-2 text-lg font-medium'>
                    Start building your workflow
                  </h3>
                  <p className='text-muted-foreground mb-4 text-sm'>
                    Add a trigger from the left sidebar to begin
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - Node config */}
        {showNodeConfig && selectedNode && (
          <div className='w-80 overflow-y-auto border-l p-4'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='flex items-center gap-2 font-semibold'>
                <selectedNode.icon className='h-4 w-4' />
                {selectedNode.name}
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
                      value={selectedNode.data.config.prompt || ''}
                      onChange={(e) =>
                        updateNodeConfig({
                          ...selectedNode.data.config,
                          prompt: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className='text-xs'>Aspect Ratio</Label>
                    <select
                      className='mt-1 w-full rounded-md border p-2 text-sm'
                      value={selectedNode.data.config.aspectRatio || '9:16'}
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

                        updateNodeConfig({
                          ...selectedNode.data.config,
                          aspectRatio: ratio,
                          width,
                          height,
                        })
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
                    value={selectedNode.data.config.video_prompt || ''}
                    onChange={(e) =>
                      updateNodeConfig({
                        ...selectedNode.data.config,
                        video_prompt: e.target.value,
                      })
                    }
                  />
                  <p className='text-muted-foreground mt-2 text-xs'>
                    • 81 frames at 16 FPS (~5 seconds) • Generation takes 2-4
                    minutes
                  </p>
                </div>
              )}

              {/* Social post config */}
              {selectedNode.data.actionId === 'post-social' && (
                <div>
                  <Label className='text-xs'>Platform</Label>
                  <select
                    className='mt-1 w-full rounded-md border p-2 text-sm'
                    value={selectedNode.data.config.platform || 'tiktok'}
                    onChange={(e) =>
                      updateNodeConfig({
                        ...selectedNode.data.config,
                        platform: e.target.value,
                      })
                    }
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
              <WorkflowTester
                workflow={convertToExecutableWorkflow()}
                task={task}
                onClose={() => setShowTester(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
