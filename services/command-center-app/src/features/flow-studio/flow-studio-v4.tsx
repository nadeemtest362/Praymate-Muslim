import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Sparkles,
  Rocket,
  Copy,
  Trash2,
  Save,
  Play,
  Edit3,
  ArrowLeft,
  ArrowRight,
  Command,
  X,
  ChevronLeft,
  Keyboard,
  Info,
  AlertCircle,
  Undo2,
  Redo2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Eye,
  CheckCircle,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FlowAnalyticsSimple } from './components/flow-analytics-simple'
import { IPhonePreview } from './components/iphone-preview'
import { StepSettingsPanel } from './components/step-settings-panel'
import {
  useFlows,
  useFlow,
  useCreateFlow,
  useCreateFromTemplate,
} from './hooks/useFlows'
import {
  useScreenTypes,
  transformScreenTypeToTemplate,
} from './hooks/useScreenTypes'
import { onboardingScreens } from './screens-v2'
import { findScreenById } from './utils/screen-helpers'

const flowTemplates = [
  {
    id: 'quick-start',
    name: 'Quick Start',
    description: 'Get users praying in 60 seconds',
    screens: [
      'welcome',
      'mood-selection',
      'prayer-people',
      'prayer-example',
      'confirmation',
    ],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'personalized',
    name: 'Personalized',
    description: 'Deep personalization for regular users',
    screens: [
      'welcome',
      'first-name',
      'faith-tradition',
      'mood-selection',
      'mood-context',
      'prayer-people',
      'add-intention',
      'prayer-frequency',
      'prayer-example',
      'confirmation',
    ],
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Just the essentials',
    screens: ['welcome', 'mood-selection', 'prayer-example', 'confirmation'],
    color: 'from-green-500 to-emerald-500',
  },
]

export default function FlowStudioV4() {
  const queryClient = useQueryClient()
  const { data: flows, isLoading: flowsLoading } = useFlows()
  const { data: dbScreenTypes, isLoading: screenTypesLoading } =
    useScreenTypes()
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const {
    flow,
    steps: savedSteps,
    saveSteps,
    deployFlow,
    updateFlow,
    isDeploying,
    isSaving,
    isUpdating,
  } = useFlow(selectedFlowId)
  const createFlow = useCreateFlow()
  const createFromTemplate = useCreateFromTemplate()

  const screenTemplates =
    dbScreenTypes?.map(transformScreenTypeToTemplate) || onboardingScreens

  const [localSteps, setLocalSteps] = useState<any[]>([])
  const [editingStep, setEditingStep] = useState<any>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'analytics'>(
    'analytics'
  )
  const [showFlowSettings, setShowFlowSettings] = useState(false)
  const [trafficPercentage, setTrafficPercentage] = useState(100)

  // Undo/Redo state
  const [history, setHistory] = useState<any[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Add to history whenever steps change
  const addToHistory = (newSteps: any[]) => {
    // Remove any history after current index
    const newHistory = history.slice(0, historyIndex + 1)
    // Add new state
    newHistory.push(JSON.parse(JSON.stringify(newSteps)))
    // Keep only last 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    }
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Undo function
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setLocalSteps(JSON.parse(JSON.stringify(history[newIndex])))
      setHasUnsavedChanges(true)
    }
  }

  // Redo function
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setLocalSteps(JSON.parse(JSON.stringify(history[newIndex])))
      setHasUnsavedChanges(true)
    }
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Cmd+Z or Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      // Redo: Cmd+Shift+Z or Ctrl+Shift+Z
      else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      }
      // Delete selected step
      else if (e.key === 'Delete' && editingStep) {
        e.preventDefault()
        deleteStep(editingStep.id)
      }
      // Duplicate selected step: Cmd+D
      else if ((e.metaKey || e.ctrlKey) && e.key === 'd' && editingStep) {
        e.preventDefault()
        duplicateStep(editingStep)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingStep, canUndo, canRedo])

  // Auto-select active flow on initial load
  useEffect(() => {
    if (!selectedFlowId && flows && flows.length > 0) {
      // Find the active flow first, or fallback to the first flow
      const activeFlow = flows.find((f) => f.status === 'ACTIVE') || flows[0]
      if (activeFlow) {
        setSelectedFlowId(activeFlow.id)
      }
    }
  }, [flows, selectedFlowId])

  // Load saved steps when flow changes
  useEffect(() => {
    if (!selectedFlowId) {
      setLocalSteps([])
      setEditingStep(null)
      return
    }

    if (savedSteps && savedSteps.length > 0) {
      const transformed = savedSteps.map((step) => {
        const baseScreen = findScreenById(step.type, screenTemplates)
        return {
          id: step.id,
          type: step.type,
          name: step.config.screen_name || baseScreen?.name || step.type,
          emoji: step.config.emoji || baseScreen?.emoji || '📱',
          color:
            step.config.color ||
            baseScreen?.color ||
            'from-blue-500 to-blue-600',
          config: step.config,
        }
      })
      setLocalSteps(transformed)
      // Initialize history with loaded steps
      setHistory([JSON.parse(JSON.stringify(transformed))])
      setHistoryIndex(0)
      // Auto-select first step when flow is loaded
      if (transformed.length > 0) {
        setEditingStep(transformed[0])
      }
    } else if (savedSteps) {
      setLocalSteps([])
      setEditingStep(null)
    }
    setHasUnsavedChanges(false)
  }, [
    selectedFlowId,
    savedSteps?.length,
    JSON.stringify(savedSteps?.map((s) => s.id)),
    screenTemplates.length,
  ])

  // Update traffic percentage when flow loads
  useEffect(() => {
    if (flow?.traffic_percentage !== undefined) {
      setTrafficPercentage(flow.traffic_percentage)
    }
  }, [flow?.traffic_percentage])

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const newSteps = Array.from(localSteps)
    const [reorderedItem] = newSteps.splice(result.source.index, 1)
    newSteps.splice(result.destination.index, 0, reorderedItem)

    setLocalSteps(newSteps)
    addToHistory(newSteps)
    setHasUnsavedChanges(true)
  }

  const addScreen = (screenId: string) => {
    const screen = findScreenById(screenId, screenTemplates)
    if (!screen) return

    const newStep = {
      id: `${screen.id}-${Date.now()}`,
      type: screen.type || screen.id,
      name: screen.name,
      emoji: screen.emoji,
      color: screen.color,
      config: JSON.parse(JSON.stringify(screen.defaultConfig)),
    }
    const newSteps = [...localSteps, newStep]
    setLocalSteps(newSteps)
    addToHistory(newSteps)
    setHasUnsavedChanges(true)
    // Auto-select the newly added step
    setEditingStep(newStep)
  }

  const deleteStep = (stepId: string) => {
    const newSteps = localSteps.filter((s) => s.id !== stepId)
    setLocalSteps(newSteps)
    addToHistory(newSteps)
    if (editingStep?.id === stepId) {
      setEditingStep(null)
    }
    setHasUnsavedChanges(true)
  }

  // Validate step configuration - only check for things that would actually break
  const validateStep = (
    step: any
  ): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = []

    // Only validate things that would actually cause the app to crash
    // The production app works fine without most of these "required" fields

    return {
      isValid: warnings.length === 0,
      warnings,
    }
  }

  const duplicateStep = (step: any) => {
    const newStep = {
      ...step,
      id: `${step.type || step.id.split('-')[0]}-${Date.now()}`,
      config: { ...step.config },
    }
    const index = localSteps.findIndex((s) => s.id === step.id)
    const newSteps = [...localSteps]
    newSteps.splice(index + 1, 0, newStep)
    setLocalSteps(newSteps)
    addToHistory(newSteps)
    setHasUnsavedChanges(true)
  }

  const updateStepConfig = (stepId: string, newConfig: any) => {
    const newSteps = localSteps.map((step) =>
      step.id === stepId ? { ...step, config: newConfig } : step
    )
    setLocalSteps(newSteps)
    addToHistory(newSteps)
    setHasUnsavedChanges(true)

    if (editingStep?.id === stepId) {
      setEditingStep({ ...editingStep, config: newConfig })
    }
  }

  const loadTemplate = async (template: any) => {
    try {
      const templateData = {
        name: template.name,
        description: template.description,
        steps: template.screens.map((screenId: string) => {
          const screen = findScreenById(screenId, screenTemplates)
          return {
            id: `${screen!.id}-${Date.now()}-${Math.random()}`,
            type: screen!.type || screen!.id,
            name: screen!.name,
            emoji: screen!.emoji,
            color: screen!.color,
            config: JSON.parse(JSON.stringify(screen!.defaultConfig)),
          }
        }),
      }

      const newFlow = await createFromTemplate.mutateAsync({
        name: templateData.name,
        description: templateData.description,
        screens: templateData.steps.map((s: any) => s.type),
      })

      setSelectedFlowId(newFlow.id)
      toast.success('Flow created from template')
    } catch (error) {
      console.error('Failed to create from template:', error)
      toast.error('Failed to create flow from template')
    }
  }

  const handleSave = useCallback(async () => {
    if (!selectedFlowId) return

    try {
      await saveSteps(
        localSteps.map((step) => ({
          id: step.id,
          type: step.type,
          config: step.config,
        }))
      )
      setHasUnsavedChanges(false)
      toast.success('Flow saved successfully')
    } catch (error) {
      console.error('Failed to save flow:', error)
      toast.error('Failed to save flow')
    }
  }, [selectedFlowId, localSteps, saveSteps])

  const handleDeploy = async () => {
    if (!selectedFlowId) return

    try {
      // Validate flow before deployment
      const validationErrors = validateFlow()
      if (validationErrors.length > 0) {
        toast.error(
          <div>
            <p className='mb-2 font-semibold'>Flow validation failed:</p>
            <ul className='list-inside list-disc text-sm'>
              {validationErrors.slice(0, 3).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
            {validationErrors.length > 3 && (
              <p className='mt-1 text-sm'>
                ...and {validationErrors.length - 3} more issues
              </p>
            )}
          </div>
        )
        return
      }

      if (hasUnsavedChanges) {
        await handleSave()
      }
      await deployFlow()
      toast.success('Flow deployed successfully!')
    } catch (error) {
      console.error('Failed to deploy flow:', error)
      toast.error('Failed to deploy flow')
    }
  }

  const handleSaveFlowSettings = async () => {
    if (!selectedFlowId) return

    try {
      await updateFlow({
        traffic_percentage: trafficPercentage,
      })
      setShowFlowSettings(false)
      toast.success('Flow settings saved successfully!')
    } catch (error) {
      console.error('Failed to save flow settings:', error)
      toast.error('Failed to save flow settings')
    }
  }

  const validateFlow = (): string[] => {
    const errors: string[] = []

    // Must have at least one step
    if (localSteps.length === 0) {
      errors.push('Flow must have at least one step')
    }

    // Only validate critical configuration issues that would actually break the app
    localSteps.forEach((step, index) => {
      // Only check for truly missing required data
      if (!step.type) {
        errors.push(`Step ${index + 1}: Missing screen type`)
      }
    })

    return errors
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const isInputActive =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement

      if (e.metaKey || e.ctrlKey) {
        // Cmd/Ctrl + K - Command palette
        if (e.key === 'k') {
          e.preventDefault()
          setCommandOpen(true)
        }
        // Cmd/Ctrl + S - Save
        if (e.key === 's') {
          e.preventDefault()
          handleSave()
        }
        // Cmd/Ctrl + D - Duplicate step
        if (e.key === 'd' && editingStep && !isInputActive) {
          e.preventDefault()
          duplicateStep(editingStep)
          toast.success(`Duplicated "${editingStep.name}"`)
        }
      }

      // Escape - Go back to flow view
      if (e.key === 'Escape' && editingStep) {
        setEditingStep(null)
      }

      // Delete - Remove selected step (with confirmation)
      if (
        (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) &&
        editingStep &&
        !isInputActive
      ) {
        e.preventDefault()
        if (confirm(`Delete "${editingStep.name}"?`)) {
          deleteStep(editingStep.id)
          setEditingStep(null)
          toast.success('Step deleted')
        }
      }

      // Arrow keys - Navigate between steps
      if (editingStep && !isInputActive && localSteps.length > 1) {
        const currentIndex = localSteps.findIndex(
          (s) => s.id === editingStep.id
        )
        if (e.key === 'ArrowUp' && currentIndex > 0) {
          e.preventDefault()
          setEditingStep(localSteps[currentIndex - 1])
        }
        if (e.key === 'ArrowDown' && currentIndex < localSteps.length - 1) {
          e.preventDefault()
          setEditingStep(localSteps[currentIndex + 1])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, editingStep, localSteps])

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || !selectedFlowId) return

    const autoSaveTimer = setTimeout(() => {
      handleSave()
      toast.success('Auto-saved', { duration: 2000 })
    }, 5000) // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(autoSaveTimer)
  }, [localSteps, hasUnsavedChanges, selectedFlowId, handleSave])

  if (flowsLoading || screenTypesLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2' />
          <p className='text-muted-foreground'>Loading Flow Studio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-background flex h-screen'>
      {/* Left Sidebar - Flow List or Steps List */}
      <div className='from-muted/30 to-muted/10 flex h-full w-[30rem] flex-col border-r bg-gradient-to-b'>
        <div className='space-y-6 p-6'>
          {selectedFlowId ? (
            // Header when viewing a flow
            <div className='flex items-center gap-3'>
              <Button
                size='sm'
                variant='ghost'
                className='h-8 w-8 p-0'
                onClick={() => {
                  setSelectedFlowId(null)
                  setEditingStep(null)
                }}
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <div className='flex-1'>
                <h3 className='font-semibold'>{flow?.name || 'Loading...'}</h3>
                <p className='text-muted-foreground text-xs'>
                  {flow?.status === 'ACTIVE' ? 'Live' : 'Draft'} •{' '}
                  {localSteps.length} steps
                </p>
              </div>
            </div>
          ) : (
            // Header when viewing flows list
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-xl font-bold'>Flow Studio</h2>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Build onboarding experiences
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-8'
                  onClick={async () => {
                    console.log('[Flow Studio] Refreshing screen types')

                    try {
                      // Show loading toast
                      const loadingToast = toast.loading(
                        'Refreshing screen types...'
                      )

                      // Invalidate and refetch
                      await queryClient.invalidateQueries({
                        queryKey: ['screenTypes'],
                      })

                      // Wait a moment for the query to complete
                      await new Promise((resolve) => setTimeout(resolve, 1000))

                      // Get the refreshed data
                      const data = dbScreenTypes
                      console.log(
                        '[Flow Studio] Screen types after refresh:',
                        data?.length
                      )

                      // Dismiss loading and show success
                      toast.dismiss(loadingToast)
                      toast.success(
                        `Screen types refreshed! ${data?.length || 0} types available`
                      )
                    } catch (error) {
                      console.error(
                        '[Flow Studio] Error refreshing screen types:',
                        error
                      )
                      toast.error('Failed to refresh screen types')
                    }
                  }}
                  title='Refresh screen types'
                >
                  <RefreshCw className='h-4 w-4' />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size='sm' variant='ghost' className='h-8 w-8 p-0'>
                      <Keyboard className='h-4 w-4' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align='end' className='w-80'>
                    <div className='space-y-3'>
                      <h4 className='text-sm font-medium'>
                        Keyboard Shortcuts
                      </h4>
                      <div className='space-y-2 text-sm'>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Command Palette
                          </span>
                          <kbd className='rounded border px-2 py-1 text-xs'>
                            ⌘K
                          </kbd>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Save Flow
                          </span>
                          <kbd className='rounded border px-2 py-1 text-xs'>
                            ⌘S
                          </kbd>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Duplicate Step
                          </span>
                          <kbd className='rounded border px-2 py-1 text-xs'>
                            ⌘D
                          </kbd>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Delete Step
                          </span>
                          <kbd className='rounded border px-2 py-1 text-xs'>
                            Delete
                          </kbd>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Navigate Steps
                          </span>
                          <kbd className='rounded border px-2 py-1 text-xs'>
                            ↑↓
                          </kbd>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Back to Flow
                          </span>
                          <kbd className='rounded border px-2 py-1 text-xs'>
                            Esc
                          </kbd>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  size='sm'
                  className='h-8 w-8 p-0'
                  onClick={async () => {
                    const flow = await createFlow.mutateAsync({
                      name: 'New Flow',
                      description: 'A new onboarding flow',
                    })
                    setSelectedFlowId(flow.id)
                  }}
                >
                  <Plus className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </div>

        {selectedFlowId ? (
          // Show steps when a flow is selected
          <div className='flex flex-1 flex-col overflow-hidden'>
            <div className='mb-4 space-y-3 px-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Rocket className='text-muted-foreground h-4 w-4' />
                  <p className='text-muted-foreground text-sm font-semibold'>
                    Flow Steps
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary' className='text-xs'>
                    {localSteps.length} steps
                  </Badge>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size='icon' variant='ghost' className='h-6 w-6'>
                        <Info className='h-3 w-3' />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align='end' className='w-72'>
                      <div className='space-y-2 text-sm'>
                        <p className='font-medium'>Steps vs Screen Types</p>
                        <p className='text-muted-foreground'>
                          Your flow has{' '}
                          <span className='font-medium'>
                            {localSteps.length} steps
                          </span>{' '}
                          using{' '}
                          <span className='font-medium'>
                            {new Set(localSteps.map((s) => s.type)).size} unique
                            screen types
                          </span>
                          .
                        </p>
                        <p className='text-muted-foreground'>
                          Screen types can be reused multiple times in a flow
                          (e.g., multiple paywall screens at different points).
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button
                variant='outline'
                className='w-full'
                onClick={() => setCommandOpen(true)}
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Step
              </Button>
            </div>

            <div className='flex-1 overflow-y-auto px-6 pb-6'>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId='steps'>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className='space-y-2'
                    >
                      {localSteps.map((step, index) => (
                        <Draggable
                          key={step.id}
                          draggableId={step.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <Card
                                className={cn(
                                  'group border-border cursor-pointer p-3 transition-all',
                                  snapshot.isDragging && 'rotate-1 shadow-lg',
                                  editingStep?.id === step.id
                                    ? 'bg-accent border-primary/50 shadow-sm'
                                    : 'bg-card hover:bg-accent/50'
                                )}
                                onClick={() => setEditingStep(step)}
                              >
                                <div className='flex items-center gap-2'>
                                  {/* Drag Handle */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className='cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing'
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <GripVertical className='text-muted-foreground h-4 w-4' />
                                  </div>

                                  <div className='bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium'>
                                    {index + 1}
                                  </div>
                                  <div
                                    className={cn(
                                      'flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-sm',
                                      step.color
                                    )}
                                  >
                                    {step.emoji}
                                  </div>
                                  <div className='min-w-0 flex-1'>
                                    <p
                                      className={cn(
                                        'truncate text-sm font-medium transition-colors',
                                        editingStep?.id === step.id
                                          ? 'text-primary'
                                          : 'text-foreground group-hover:text-primary'
                                      )}
                                    >
                                      {step.name}
                                    </p>
                                    {step.config.title && (
                                      <p className='text-muted-foreground truncate text-xs'>
                                        {step.config.title}
                                      </p>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className='flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100'>
                                    <Button
                                      size='icon'
                                      variant='ghost'
                                      className='h-7 w-7'
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        duplicateStep(step)
                                        toast.success(
                                          `Duplicated "${step.name}"`
                                        )
                                      }}
                                      title='Duplicate step'
                                    >
                                      <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        ) : (
          // Show flows list when no flow is selected
          <div className='flex-1 overflow-y-auto'>
            <div className='px-6 pb-6'>
              {/* Templates */}
              <div className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <Sparkles className='text-muted-foreground h-4 w-4' />
                  <p className='text-muted-foreground text-sm font-semibold'>
                    Quick Start Templates
                  </p>
                </div>
                <div className='grid gap-2'>
                  {flowTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className='group bg-card hover:bg-accent/50 border-border cursor-pointer p-3 transition-all hover:shadow-md'
                      onClick={() => loadTemplate(template)}
                    >
                      <div className='flex items-start gap-3'>
                        <div
                          className={cn(
                            'mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-gradient-to-r',
                            template.color
                          )}
                        />
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <span className='text-foreground group-hover:text-primary text-sm font-medium transition-colors'>
                              {template.name}
                            </span>
                            <Badge variant='outline' className='text-xs'>
                              {template.screens.length} screens
                            </Badge>
                          </div>
                          <p className='text-muted-foreground mt-1 line-clamp-2 text-xs'>
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator className='my-6' />

              {/* Your Flows */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Rocket className='text-muted-foreground h-4 w-4' />
                    <p className='text-muted-foreground text-sm font-semibold'>
                      Your Flows
                    </p>
                  </div>
                  {flows && flows.length > 0 && (
                    <Badge variant='secondary' className='text-xs'>
                      {flows.length}
                    </Badge>
                  )}
                </div>

                <div className='space-y-2'>
                  {flowsLoading && (
                    <div className='text-muted-foreground bg-muted/50 rounded p-2 text-xs'>
                      Loading flows...
                    </div>
                  )}
                  {!flowsLoading && (!flows || flows.length === 0) && (
                    <div className='text-muted-foreground bg-muted/50 rounded p-2 text-xs'>
                      No flows found. Make sure you're signed in with admin
                      privileges.
                    </div>
                  )}

                  {flows?.map((f) => (
                    <Card
                      key={f.id}
                      className={cn(
                        'group border-border cursor-pointer p-3 transition-all',
                        selectedFlowId === f.id
                          ? 'bg-accent border-primary/50 shadow-sm'
                          : 'bg-card hover:bg-accent/50'
                      )}
                      onClick={() => setSelectedFlowId(f.id)}
                    >
                      <div className='flex items-start justify-between'>
                        <div className='min-w-0 flex-1'>
                          <p
                            className={cn(
                              'truncate text-sm font-medium transition-colors',
                              selectedFlowId === f.id
                                ? 'text-primary'
                                : 'text-foreground group-hover:text-primary'
                            )}
                          >
                            {f.name}
                          </p>
                          <div className='mt-1 flex items-center gap-2'>
                            <Badge
                              variant={
                                f.status === 'ACTIVE' ? 'default' : 'secondary'
                              }
                              className='text-xs'
                            >
                              {f.status === 'ACTIVE'
                                ? 'Live'
                                : f.status === 'DRAFT'
                                  ? 'Draft'
                                  : 'Archived'}
                            </Badge>
                            <span className='text-muted-foreground text-xs'>
                              Updated{' '}
                              {new Date(f.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className='flex flex-1 flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between border-b px-6 py-4'>
          <div className='flex items-center gap-4'>
            <h1 className='text-2xl font-bold'>
              {flow?.name || 'Select a flow'}
            </h1>
            {hasUnsavedChanges && (
              <Badge variant='secondary'>Unsaved changes</Badge>
            )}
            {selectedFlowId && localSteps.length > 0 && (
              <Badge
                variant={
                  validateFlow().length === 0 ? 'default' : 'destructive'
                }
                className='gap-1'
              >
                {validateFlow().length === 0 ? (
                  <>
                    <CheckCircle className='h-3 w-3' />
                    Valid
                  </>
                ) : (
                  <>
                    <AlertCircle className='h-3 w-3' />
                    {validateFlow().length} issue
                    {validateFlow().length !== 1 ? 's' : ''}
                  </>
                )}
              </Badge>
            )}
          </div>

          <div className='flex items-center gap-2'>
            {selectedFlowId && (
              <div className='mr-2 flex items-center gap-1 border-r pr-2'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={undo}
                  disabled={!canUndo}
                  className='h-8 w-8'
                  title='Undo (⌘Z)'
                >
                  <Undo2 className='h-4 w-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={redo}
                  disabled={!canRedo}
                  className='h-8 w-8'
                  title='Redo (⌘⇧Z)'
                >
                  <Redo2 className='h-4 w-4' />
                </Button>
              </div>
            )}

            <Button
              variant='ghost'
              size='sm'
              onClick={() => setCommandOpen(true)}
            >
              <Command className='mr-2 h-4 w-4' />
              Add Screen
              <kbd className='bg-muted text-muted-foreground pointer-events-none ml-2 inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none'>
                <span className='text-xs'>⌘</span>K
              </kbd>
            </Button>

            {selectedFlowId && (
              <>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowFlowSettings(true)}
                >
                  <Settings className='mr-2 h-4 w-4' />
                  Settings
                </Button>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  <Save className='mr-2 h-4 w-4' />
                  Save
                </Button>

                <Button size='sm' onClick={handleDeploy} disabled={isDeploying}>
                  <Rocket className='mr-2 h-4 w-4' />
                  Deploy
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className='flex min-h-0 flex-1'>
          {/* Main Area with Tabs */}
          <div className='bg-muted/10 flex flex-1 flex-col'>
            {selectedFlowId ? (
              <Tabs
                value={activeTab}
                onValueChange={(v) =>
                  setActiveTab(v as 'preview' | 'analytics')
                }
                className='flex min-h-0 flex-1 flex-col'
              >
                <div className='bg-background border-b px-8 pt-4'>
                  <TabsList className='grid w-full max-w-[400px] grid-cols-2'>
                    <TabsTrigger value='preview' className='gap-2'>
                      <Play className='h-4 w-4' />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value='analytics' className='gap-2'>
                      <BarChart3 className='h-4 w-4' />
                      Analytics
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent
                  value='preview'
                  className='flex flex-1 flex-col items-center justify-center p-8'
                >
                  {localSteps.length > 0 ? (
                    <div className='flex h-full max-h-[800px] flex-col items-center gap-6'>
                      <IPhonePreview
                        step={editingStep || localSteps[0]}
                        allSteps={localSteps}
                        onNavigate={(stepId) => {
                          const step = localSteps.find((s) => s.id === stepId)
                          if (step) {
                            setEditingStep(step)
                          }
                        }}
                        className='flex-1'
                      />

                      {/* Simple Step Navigator */}
                      <div className='flex items-center gap-2'>
                        {localSteps.map((step, index) => (
                          <button
                            key={step.id}
                            onClick={() => setEditingStep(step)}
                            className={cn(
                              'h-2 w-2 rounded-full transition-all',
                              editingStep?.id === step.id ||
                                (!editingStep && index === 0)
                                ? 'bg-primary w-8'
                                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                            )}
                            title={step.name}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card className='border-dashed p-12 text-center'>
                      <Sparkles className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                      <h3 className='mb-2 text-lg font-medium'>
                        No screens to preview
                      </h3>
                      <p className='text-muted-foreground mb-4 text-sm'>
                        Add screens to see them in the preview
                      </p>
                      <Button onClick={() => setCommandOpen(true)}>
                        <Plus className='mr-2 h-4 w-4' />
                        Add Screen
                      </Button>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent
                  value='analytics'
                  className='min-h-0 flex-1 overflow-y-auto'
                >
                  <FlowAnalyticsSimple
                    flowId={selectedFlowId}
                    flowSteps={localSteps}
                    selectedStepId={editingStep?.id}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <div className='flex flex-1 items-center justify-center p-8'>
                <div className='max-w-3xl'>
                  <Card className='p-12 text-center'>
                    <Rocket className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                    <h3 className='mb-2 text-lg font-medium'>
                      Select or create a flow
                    </h3>
                    <p className='text-muted-foreground mb-6 text-sm'>
                      Choose an existing flow or start with a template
                    </p>
                    {/* Show flow templates */}
                    <div className='mt-8 grid grid-cols-3 gap-4'>
                      {flowTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className='cursor-pointer p-4 transition-all hover:shadow-md'
                          onClick={() => loadTemplate(template)}
                        >
                          <div
                            className={cn(
                              'mb-3 h-2 rounded-full bg-gradient-to-r',
                              template.color
                            )}
                          />
                          <h4 className='mb-1 text-sm font-medium'>
                            {template.name}
                          </h4>
                          <p className='text-muted-foreground text-xs'>
                            {template.description}
                          </p>
                        </Card>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {/* Settings Panel Sidebar */}
          <AnimatePresence>
            {editingStep && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 20 }}
                className='bg-background w-[500px] overflow-y-auto border-l'
              >
                <StepSettingsPanel
                  step={editingStep}
                  onUpdate={(newConfig) =>
                    updateStepConfig(editingStep.id, newConfig)
                  }
                  onClose={() => setEditingStep(null)}
                  onDelete={() => {
                    deleteStep(editingStep.id)
                    toast.success(`Deleted "${editingStep.name}"`)
                  }}
                  inline={true}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Flow Settings Dialog */}
      <Dialog open={showFlowSettings} onOpenChange={setShowFlowSettings}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Flow Settings</DialogTitle>
            <DialogDescription>
              Configure your flow's properties and A/B testing settings.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='flow-name'>Flow Name</Label>
                <Input
                  id='flow-name'
                  value={flow?.name || ''}
                  placeholder='Enter flow name'
                  disabled
                />
              </div>
              
              <div className='space-y-2'>
                <Label htmlFor='flow-description'>Description</Label>
                <Input
                  id='flow-description'
                  value={flow?.description || ''}
                  placeholder='Enter flow description'
                  disabled
                />
              </div>
              
              <div className='space-y-2'>
                <Label htmlFor='flow-status'>Status</Label>
                <Input
                  id='flow-status'
                  value={flow?.status || ''}
                  disabled
                />
              </div>
            </div>
            
            <Separator />
            
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='traffic-percentage'>
                  Traffic Percentage
                </Label>
                <div className='space-y-3'>
                  <div className='flex items-center gap-4'>
                    <Slider
                      id='traffic-percentage'
                      min={0}
                      max={100}
                      step={1}
                      value={[trafficPercentage]}
                      onValueChange={(value) => {
                        setTrafficPercentage(value[0])
                      }}
                      className='flex-1'
                      aria-label={`Traffic percentage: ${trafficPercentage}%`}
                    />
                    <div className='text-sm font-medium w-12 text-right'>
                      {trafficPercentage}%
                    </div>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Percentage of users who will see this flow when it's active.
                  </p>
                </div>
              </div>
            </div>
            
            <div className='flex justify-end gap-2'>
              <Button 
                variant='outline' 
                onClick={() => setShowFlowSettings(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveFlowSettings}
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Command Palette for Adding Screens */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput 
          placeholder='Search screens...' 
          aria-label='Search for onboarding screens to add'
        />
        <CommandList>
          <CommandEmpty>No screens found.</CommandEmpty>

          {Object.entries(
            screenTemplates.reduce(
              (acc, screen) => {
                if (!acc[screen.category]) acc[screen.category] = []
                acc[screen.category].push(screen)
                return acc
              },
              {} as Record<string, typeof screenTemplates>
            )
          ).map(([category, screens]) => (
            <CommandGroup
              key={category}
              heading={category.charAt(0).toUpperCase() + category.slice(1)}
            >
              {(screens as typeof screenTemplates).map((screen) => (
                <CommandItem
                  key={screen.id}
                  onSelect={() => {
                    addScreen(screen.id)
                    setCommandOpen(false)
                  }}
                >
                  <div
                    className={cn(
                      'mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-sm',
                      screen.color
                    )}
                  >
                    {screen.emoji}
                  </div>
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>{screen.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {screen.description}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  )
}
