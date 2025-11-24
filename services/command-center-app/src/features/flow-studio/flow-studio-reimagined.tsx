import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Sparkles,
  Rocket,
  Copy,
  Trash2,
  Search,
  Save,
  Play,
  Edit3,
  Eye,
  EyeOff,
  Command,
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
  CommandSeparator,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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
import { findScreenById, findScreensByCategory } from './utils/screen-helpers'

// Pre-built flow templates
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

export default function FlowStudioV2() {
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
  const [commandOpen, setCommandOpen] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(true)
  const [settingsVisible, setSettingsVisible] = useState(true)

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
    } else if (savedSteps) {
      setLocalSteps([])
    }
    setHasUnsavedChanges(false)
  }, [selectedFlowId, JSON.stringify(savedSteps)])

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const newSteps = Array.from(localSteps)
    const [reorderedItem] = newSteps.splice(result.source.index, 1)
    newSteps.splice(result.destination.index, 0, reorderedItem)

    setLocalSteps(newSteps)
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
    setLocalSteps([...localSteps, newStep])
    setHasUnsavedChanges(true)
    setSelectedStep(newStep)
  }

  const deleteStep = (stepId: string) => {
    setLocalSteps(localSteps.filter((s) => s.id !== stepId))
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
    setHasUnsavedChanges(true)
  }

  const updateStepConfig = (stepId: string, newConfig: any) => {
    setLocalSteps(
      localSteps.map((step) =>
        step.id === stepId ? { ...step, config: newConfig } : step
      )
    )
    setHasUnsavedChanges(true)

    // Update selected step if it's the one being edited
    if (selectedStep?.id === stepId) {
      setSelectedStep({ ...selectedStep, config: newConfig })
    }
  }

  const openSettings = (step: any) => {
    setSelectedStep(step)
    if (!settingsVisible) {
      setSettingsVisible(true)
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
      toast.success('Flow saved successfully')
    } catch (error) {
      console.error('Failed to save flow:', error)
      toast.error('Failed to save flow')
    }
  }

  const handleDeploy = async () => {
    if (!selectedFlowId) return

    try {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k') {
          e.preventDefault()
          setCommandOpen(true)
        }
        if (e.key === 's') {
          e.preventDefault()
          handleSave()
        }
        if (e.key === 'p') {
          e.preventDefault()
          setPreviewVisible(!previewVisible)
        }
        if (e.key === 'e') {
          e.preventDefault()
          setSettingsVisible(!settingsVisible)
        }
      }
      if (e.key === 'Escape') {
        if (commandOpen) {
          setCommandOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, previewVisible, settingsVisible, commandOpen])

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
      {/* Left Sidebar - Flow List */}
      <div className='from-muted/30 to-muted/10 w-72 space-y-6 border-r bg-gradient-to-b p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-bold'>Flow Studio</h2>
            <p className='text-muted-foreground mt-1 text-xs'>
              Build onboarding experiences
            </p>
          </div>
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

        <Separator />

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
                        variant={f.is_active ? 'default' : 'secondary'}
                        className='text-xs'
                      >
                        {f.is_active ? 'Live' : 'Draft'}
                      </Badge>
                      <span className='text-muted-foreground text-xs'>
                        Updated {new Date(f.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
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
          </div>

          <div className='flex items-center gap-2'>
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
        <div className='flex-1 overflow-y-auto p-6'>
          {selectedFlowId ? (
            localSteps.length > 0 ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId='steps'>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className='mx-auto max-w-3xl space-y-3'
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
                                  'group relative transition-all',
                                  snapshot.isDragging &&
                                    'scale-105 rotate-1 shadow-2xl'
                                )}
                              >
                                <div className='p-4'>
                                  <div className='flex items-center gap-4'>
                                    {/* Drag Handle */}
                                    <div
                                      {...provided.dragHandleProps}
                                      className='flex-shrink-0 cursor-move'
                                    >
                                      <div className='bg-muted flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium'>
                                        {index + 1}
                                      </div>
                                    </div>

                                    {/* Screen Info */}
                                    <div
                                      className={cn(
                                        'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl',
                                        step.color
                                      )}
                                    >
                                      {step.emoji}
                                    </div>

                                    <div className='flex-1'>
                                      <h3 className='font-semibold'>
                                        {step.name}
                                      </h3>
                                      {step.config.title && (
                                        <p className='text-muted-foreground truncate text-sm'>
                                          {step.config.title}
                                        </p>
                                      )}
                                    </div>

                                    {/* Actions */}
                                    <div className='flex items-center gap-1'>
                                      <Button
                                        size='icon'
                                        variant='ghost'
                                        className='h-8 w-8'
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedStep(
                                            selectedStep?.id === step.id
                                              ? null
                                              : step
                                          )
                                        }}
                                      >
                                        <Edit3 className='h-4 w-4' />
                                      </Button>
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
                                      <Button
                                        size='icon'
                                        variant='ghost'
                                        className='text-destructive h-8 w-8'
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteStep(step.id)
                                        }}
                                      >
                                        <Trash2 className='h-4 w-4' />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Inline editing */}
                                  {selectedStep?.id === step.id && (
                                    <div className='mt-4 grid grid-cols-2 gap-4'>
                                      <div className='space-y-4'>
                                        <StepSettingsPanel
                                          step={selectedStep}
                                          onUpdate={(newConfig) =>
                                            updateStepConfig(
                                              selectedStep.id,
                                              newConfig
                                            )
                                          }
                                          onClose={() => setSelectedStep(null)}
                                          inline={true}
                                        />
                                      </div>
                                      <div className='rounded-lg bg-gray-50 p-4'>
                                        <IPhonePreview
                                          step={step}
                                          className='h-[400px]'
                                        />
                                      </div>
                                    </div>
                                  )}
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
            ) : (
              <div className='mx-auto max-w-3xl'>
                <Card className='border-dashed p-12 text-center'>
                  <Sparkles className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                  <h3 className='mb-2 text-lg font-medium'>No screens yet</h3>
                  <p className='text-muted-foreground mb-4 text-sm'>
                    Add screens to build your flow
                  </p>
                  <Button onClick={() => setCommandOpen(true)}>
                    <Plus className='mr-2 h-4 w-4' />
                    Add Screen
                  </Button>
                </Card>
              </div>
            )
          ) : (
            <div className='mx-auto max-w-3xl'>
              <Card className='p-12 text-center'>
                <Rocket className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                <h3 className='mb-2 text-lg font-medium'>
                  Select or create a flow
                </h3>
                <p className='text-muted-foreground text-sm'>
                  Choose an existing flow or start with a template
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Command Palette for Adding Screens */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder='Search screens...' />
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
              {screens.map((screen) => (
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
