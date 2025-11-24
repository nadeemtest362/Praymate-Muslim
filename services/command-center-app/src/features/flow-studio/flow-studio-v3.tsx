import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Sparkles,
  Rocket,
  Copy,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
  Undo2,
  Redo2,
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle2,
  Loader2,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { IPhonePreview } from './components/iphone-preview'
import { ScreenPicker } from './components/screen-picker'
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

// Quick action templates
const quickActions = [
  {
    id: 'add-paywall',
    label: 'Add Paywall',
    icon: Zap,
    screens: ['benefits-highlight', 'paywall'],
  },
  {
    id: 'add-personalization',
    label: 'Add Personalization',
    icon: Wand2,
    screens: ['first-name', 'mood-selection', 'prayer-people'],
  },
  {
    id: 'quick-flow',
    label: '60 Second Flow',
    icon: Rocket,
    screens: ['welcome', 'mood-selection', 'prayer-example', 'confirmation'],
  },
]

// Simplified flow templates
const flowTemplates = [
  {
    id: 'quick-start',
    name: 'Quick Start',
    description: 'Get users praying in 60 seconds',
    screens: ['welcome', 'mood-selection', 'prayer-example', 'confirmation'],
    duration: '60 sec',
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
      'prayer-frequency',
      'prayer-example',
      'confirmation',
    ],
    duration: '3-5 min',
    color: 'from-purple-500 to-pink-500',
  },
]

export default function FlowStudioV3() {
  const { data: flows, isLoading: flowsLoading } = useFlows()
  const { data: dbScreenTypes, isLoading: screenTypesLoading } =
    useScreenTypes()
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const {
    flow,
    steps: savedSteps,
    saveSteps,
    deployFlow,
    isDeploying,
    isSaving,
  } = useFlow(selectedFlowId)
  const createFlow = useCreateFlow()
  const createFromTemplate = useCreateFromTemplate()

  // Transform database screen types to our template format
  const screenTemplates =
    dbScreenTypes?.map(transformScreenTypeToTemplate) || onboardingScreens

  const [localSteps, setLocalSteps] = useState<any[]>([])
  const [selectedStep, setSelectedStep] = useState<any>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(true)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [autoSave, setAutoSave] = useState(true)
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [deployStatus, setDeployStatus] = useState<
    'idle' | 'deploying' | 'success' | 'error'
  >('idle')
  const [screenPickerOpen, setScreenPickerOpen] = useState(false)

  // Load saved steps when flow changes
  useEffect(() => {
    if (!selectedFlowId) {
      setLocalSteps([])
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
      setHistory([transformed])
      setHistoryIndex(0)
    } else if (savedSteps) {
      setLocalSteps([])
      setHistory([[]])
      setHistoryIndex(0)
    }
    setHasUnsavedChanges(false)
  }, [selectedFlowId, JSON.stringify(savedSteps)])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges || !selectedFlowId) return

    const timer = setTimeout(() => {
      handleSave()
    }, 2000)

    return () => clearTimeout(timer)
  }, [localSteps, autoSave, hasUnsavedChanges])

  const addToHistory = (newSteps: any[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newSteps)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setLocalSteps(history[historyIndex - 1])
      setHasUnsavedChanges(true)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setLocalSteps(history[historyIndex + 1])
      setHasUnsavedChanges(true)
    }
  }

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
    setSelectedStep(newStep)
  }

  const deleteStep = (stepId: string) => {
    const newSteps = localSteps.filter((s) => s.id !== stepId)
    setLocalSteps(newSteps)
    addToHistory(newSteps)
    if (selectedStep?.id === stepId) {
      setSelectedStep(null)
    }
    setHasUnsavedChanges(true)
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

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const index = localSteps.findIndex((s) => s.id === stepId)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === localSteps.length - 1)
    ) {
      return
    }

    const newSteps = [...localSteps]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const [movedStep] = newSteps.splice(index, 1)
    newSteps.splice(newIndex, 0, movedStep)

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

    if (selectedStep?.id === stepId) {
      setSelectedStep({ ...selectedStep, config: newConfig })
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

  const handleQuickAction = (action: any) => {
    action.screens.forEach((screenId: string) => {
      addScreen(screenId)
    })
    toast.success(`Added ${action.label} screens`)
  }

  const handleSave = async () => {
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
      toast.success('Flow saved')
    } catch (error) {
      console.error('Failed to save flow:', error)
      toast.error('Failed to save flow')
    }
  }

  const handleDeploy = async () => {
    if (!selectedFlowId) return

    try {
      setDeployStatus('deploying')
      if (hasUnsavedChanges) {
        await handleSave()
      }
      await deployFlow()
      setDeployStatus('success')
      toast.success('Flow deployed successfully!')
      setTimeout(() => setDeployStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to deploy flow:', error)
      setDeployStatus('error')
      toast.error('Failed to deploy flow')
      setTimeout(() => setDeployStatus('idle'), 3000)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') {
          e.preventDefault()
          handleSave()
        }
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault()
          redo()
        }
        if (e.key === 'd') {
          e.preventDefault()
          handleDeploy()
        }
        if (e.key === 'p') {
          e.preventDefault()
          setPreviewVisible(!previewVisible)
        }
      }
      if (e.key === 'Delete' && selectedStep) {
        deleteStep(selectedStep.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, selectedStep, previewVisible, historyIndex])

  if (flowsLoading || screenTypesLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='text-primary mx-auto mb-4 h-12 w-12 animate-spin' />
          <p className='text-muted-foreground'>Loading Flow Studio...</p>
        </div>
      </div>
    )
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <div className='bg-background flex h-screen'>
      {/* Left Sidebar */}
      <div className='bg-muted/10 flex w-80 flex-col border-r'>
        {/* Header */}
        <div className='border-b p-6'>
          <h2 className='mb-2 text-2xl font-bold'>Flow Studio</h2>
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='default'
              onClick={async () => {
                const flow = await createFlow.mutateAsync({
                  name: 'New Flow',
                  description: 'A new onboarding flow',
                })
                setSelectedFlowId(flow.id)
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              New Flow
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setSelectedFlowId(null)}
            >
              Templates
            </Button>
          </div>
        </div>

        {/* Flow List or Templates */}
        <div className='flex-1 overflow-y-auto p-4'>
          {selectedFlowId ? (
            <div className='space-y-2'>
              <p className='text-muted-foreground mb-3 text-sm font-medium'>
                Your Flows
              </p>
              {flows?.map((f) => (
                <Card
                  key={f.id}
                  className={cn(
                    'cursor-pointer p-4 transition-all',
                    selectedFlowId === f.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedFlowId(f.id)}
                >
                  <div className='flex items-start justify-between'>
                    <div>
                      <p className='font-medium'>{f.name}</p>
                      <div className='mt-1 flex items-center gap-2'>
                        <Badge
                          variant={f.is_active ? 'default' : 'secondary'}
                          className='text-xs'
                        >
                          {f.is_active ? 'Live' : 'Draft'}
                        </Badge>
                        <span className='text-muted-foreground text-xs'>
                          {f.step_count || 0} steps
                        </span>
                      </div>
                    </div>
                    {selectedFlowId === f.id && (
                      <CheckCircle2 className='text-primary h-4 w-4' />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className='space-y-4'>
              <p className='text-muted-foreground text-sm font-medium'>
                Start with a template
              </p>
              {flowTemplates.map((template) => (
                <Card
                  key={template.id}
                  className='hover:border-primary cursor-pointer p-4 transition-all'
                  onClick={() => loadTemplate(template)}
                >
                  <div className='flex items-start gap-3'>
                    <div
                      className={cn(
                        'mt-2 h-2 w-2 rounded-full bg-gradient-to-r',
                        template.color
                      )}
                    />
                    <div className='flex-1'>
                      <p className='font-medium'>{template.name}</p>
                      <p className='text-muted-foreground mt-1 text-sm'>
                        {template.description}
                      </p>
                      <div className='mt-2 flex items-center gap-3'>
                        <Badge variant='outline' className='text-xs'>
                          {template.screens.length} screens
                        </Badge>
                        <span className='text-muted-foreground text-xs'>
                          ~{template.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Auto-save toggle */}
        <div className='border-t p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Save className='text-muted-foreground h-4 w-4' />
              <span className='text-sm'>Auto-save</span>
            </div>
            <Switch checked={autoSave} onCheckedChange={setAutoSave} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex flex-1 flex-col'>
        {/* Top Action Bar */}
        {selectedFlowId && (
          <div className='bg-card border-b'>
            <div className='px-6 py-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-4'>
                  <h1 className='text-xl font-semibold'>
                    {flow?.name || 'Loading...'}
                  </h1>
                  <div className='flex items-center gap-2'>
                    {hasUnsavedChanges && !autoSave && (
                      <Badge variant='secondary' className='text-xs'>
                        <div className='mr-2 h-2 w-2 animate-pulse rounded-full bg-orange-500' />
                        Unsaved
                      </Badge>
                    )}
                    {isSaving && (
                      <Badge variant='secondary' className='text-xs'>
                        <Loader2 className='mr-2 h-3 w-3 animate-spin' />
                        Saving
                      </Badge>
                    )}
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  {/* Undo/Redo */}
                  <div className='mr-2 flex items-center gap-1'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={undo}
                          disabled={!canUndo}
                          className='h-8 w-8'
                        >
                          <Undo2 className='h-4 w-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Undo (⌘Z)</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={redo}
                          disabled={!canRedo}
                          className='h-8 w-8'
                        >
                          <Redo2 className='h-4 w-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Redo (⌘⇧Z)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <Separator orientation='vertical' className='h-8' />

                  {/* Preview Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => setPreviewVisible(!previewVisible)}
                        className='h-8 w-8'
                      >
                        {previewVisible ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle Preview (⌘P)</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Save Button */}
                  {!autoSave && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleSave}
                      disabled={!hasUnsavedChanges || isSaving}
                    >
                      <Save className='mr-2 h-4 w-4' />
                      Save
                    </Button>
                  )}

                  {/* Deploy Button */}
                  <Button
                    size='sm'
                    onClick={handleDeploy}
                    disabled={deployStatus === 'deploying'}
                    className={cn(
                      'min-w-[100px]',
                      deployStatus === 'success' &&
                        'bg-green-600 hover:bg-green-700',
                      deployStatus === 'error' && 'bg-red-600 hover:bg-red-700'
                    )}
                  >
                    {deployStatus === 'idle' && (
                      <>
                        <Rocket className='mr-2 h-4 w-4' />
                        Deploy
                      </>
                    )}
                    {deployStatus === 'deploying' && (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Deploying
                      </>
                    )}
                    {deployStatus === 'success' && (
                      <>
                        <CheckCircle2 className='mr-2 h-4 w-4' />
                        Deployed!
                      </>
                    )}
                    {deployStatus === 'error' && (
                      <>
                        <X className='mr-2 h-4 w-4' />
                        Failed
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className='mt-3 flex items-center gap-2'>
                <p className='text-muted-foreground mr-2 text-sm'>
                  Quick actions:
                </p>
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    variant='outline'
                    size='sm'
                    onClick={() => handleQuickAction(action)}
                    className='h-7'
                  >
                    <action.icon className='mr-1 h-3 w-3' />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className='flex flex-1 overflow-hidden'>
          {/* Flow Builder */}
          <div className='flex-1 overflow-y-auto'>
            {selectedFlowId ? (
              <div className='p-6'>
                {localSteps.length > 0 ? (
                  <>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId='steps'>
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className='mx-auto max-w-3xl space-y-2'
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
                                    <motion.div
                                      layout
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -20 }}
                                    >
                                      <Card
                                        className={cn(
                                          'group relative transition-all',
                                          snapshot.isDragging &&
                                            'scale-[1.02] shadow-2xl',
                                          selectedStep?.id === step.id &&
                                            'ring-primary ring-2'
                                        )}
                                      >
                                        <div
                                          className='cursor-pointer p-4'
                                          onClick={() => {
                                            setSelectedStep(step)
                                            setSettingsVisible(true)
                                          }}
                                        >
                                          <div className='flex items-center gap-3'>
                                            {/* Drag Handle */}
                                            <div
                                              {...provided.dragHandleProps}
                                              className='flex-shrink-0 cursor-move'
                                            >
                                              <div className='flex flex-col gap-1'>
                                                <div className='bg-muted-foreground/50 h-1 w-1 rounded-full' />
                                                <div className='bg-muted-foreground/50 h-1 w-1 rounded-full' />
                                                <div className='bg-muted-foreground/50 h-1 w-1 rounded-full' />
                                              </div>
                                            </div>

                                            {/* Step Number */}
                                            <div className='bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium'>
                                              {index + 1}
                                            </div>

                                            {/* Screen Info */}
                                            <div
                                              className={cn(
                                                'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg',
                                                step.color
                                              )}
                                            >
                                              {step.emoji}
                                            </div>

                                            <div className='flex-1'>
                                              <p className='font-medium'>
                                                {step.name}
                                              </p>
                                              {step.config.title && (
                                                <p className='text-muted-foreground truncate text-sm'>
                                                  {step.config.title}
                                                </p>
                                              )}
                                            </div>

                                            {/* Quick Actions */}
                                            <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='h-8 w-8'
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      moveStep(step.id, 'up')
                                                    }}
                                                    disabled={index === 0}
                                                  >
                                                    <ChevronUp className='h-4 w-4' />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  Move Up
                                                </TooltipContent>
                                              </Tooltip>

                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='h-8 w-8'
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      moveStep(step.id, 'down')
                                                    }}
                                                    disabled={
                                                      index ===
                                                      localSteps.length - 1
                                                    }
                                                  >
                                                    <ChevronDown className='h-4 w-4' />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  Move Down
                                                </TooltipContent>
                                              </Tooltip>

                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='h-8 w-8'
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      duplicateStep(step)
                                                    }}
                                                  >
                                                    <Copy className='h-4 w-4' />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  Duplicate
                                                </TooltipContent>
                                              </Tooltip>

                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    className='text-destructive hover:text-destructive h-8 w-8'
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      deleteStep(step.id)
                                                    }}
                                                  >
                                                    <Trash2 className='h-4 w-4' />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  Delete
                                                </TooltipContent>
                                              </Tooltip>
                                            </div>
                                          </div>
                                        </div>
                                      </Card>
                                    </motion.div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    <div className='mx-auto mt-4 max-w-3xl'>
                      <Button
                        variant='outline'
                        className='h-12 w-full border-dashed'
                        onClick={() => setScreenPickerOpen(true)}
                      >
                        <Plus className='mr-2 h-4 w-4' />
                        Add Screen
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className='mx-auto max-w-3xl'>
                    <Card className='border-dashed p-12 text-center'>
                      <Sparkles className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                      <h3 className='mb-2 text-lg font-medium'>
                        Start building your flow
                      </h3>
                      <p className='text-muted-foreground mb-4 text-sm'>
                        Add screens to create your onboarding experience
                      </p>
                      <div className='flex items-center justify-center gap-2'>
                        {quickActions.map((action) => (
                          <Button
                            key={action.id}
                            variant='outline'
                            onClick={() => handleQuickAction(action)}
                          >
                            <action.icon className='mr-2 h-4 w-4' />
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            ) : (
              <div className='flex h-full items-center justify-center'>
                <div className='text-center'>
                  <Rocket className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                  <h3 className='mb-2 text-lg font-medium'>
                    Select a flow to edit
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    Choose from your flows or start with a template
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview */}
          {previewVisible && selectedStep && (
            <div className='bg-muted/10 w-[320px] border-l p-6'>
              <div className='sticky top-0'>
                <div className='mb-4 flex items-center justify-between'>
                  <h3 className='text-sm font-medium'>Live Preview</h3>
                  <Badge variant='outline' className='text-xs'>
                    Step{' '}
                    {localSteps.findIndex((s) => s.id === selectedStep.id) + 1}
                  </Badge>
                </div>
                <IPhonePreview step={selectedStep} />

                {/* Navigation */}
                <div className='mt-4 flex items-center justify-between'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      const currentIndex = localSteps.findIndex(
                        (s) => s.id === selectedStep.id
                      )
                      if (currentIndex > 0) {
                        setSelectedStep(localSteps[currentIndex - 1])
                      }
                    }}
                    disabled={
                      localSteps.findIndex((s) => s.id === selectedStep.id) ===
                      0
                    }
                  >
                    Previous
                  </Button>
                  <span className='text-muted-foreground text-xs'>
                    {localSteps.findIndex((s) => s.id === selectedStep.id) + 1}{' '}
                    / {localSteps.length}
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      const currentIndex = localSteps.findIndex(
                        (s) => s.id === selectedStep.id
                      )
                      if (currentIndex < localSteps.length - 1) {
                        setSelectedStep(localSteps[currentIndex + 1])
                      }
                    }}
                    disabled={
                      localSteps.findIndex((s) => s.id === selectedStep.id) ===
                      localSteps.length - 1
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Settings Panel */}
          <AnimatePresence>
            {settingsVisible && selectedStep && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 400 }}
                exit={{ width: 0 }}
                className='bg-background overflow-hidden border-l'
              >
                <StepSettingsPanel
                  step={selectedStep}
                  onUpdate={(newConfig) =>
                    updateStepConfig(selectedStep.id, newConfig)
                  }
                  onClose={() => setSettingsVisible(false)}
                  inline={true}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Screen Picker Dialog */}
      <ScreenPicker
        open={screenPickerOpen}
        onOpenChange={setScreenPickerOpen}
        onSelect={addScreen}
        screens={screenTemplates}
      />
    </div>
  )
}
