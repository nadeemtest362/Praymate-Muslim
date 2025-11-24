import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Sparkles,
  Rocket,
  ChevronRight,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Wand2,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { PhonePreview, ScreenPreviewComponent } from './preview/phone-preview'
import { ScreenEditorV3 } from './screen-editor-v3'
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
  {
    id: 'comprehensive',
    name: 'Comprehensive',
    description: 'Full onboarding experience',
    screens: [
      'welcome',
      'first-name',
      'faith-tradition',
      'relationship-with-god',
      'mood-selection',
      'mood-context',
      'prayer-people',
      'prayer-needs',
      'add-intention',
      'prayer-frequency',
      'streak-goal',
      'commitment-question',
      'prayer-example',
      'confirmation',
    ],
    color: 'from-indigo-500 to-purple-500',
  },
]

export default function FlowStudio() {
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
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [currentPreviewStep, setCurrentPreviewStep] = useState(0)
  const [editingScreen, setEditingScreen] = useState<any>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load saved steps when flow changes
  useEffect(() => {
    if (!selectedFlowId) {
      setLocalSteps([])
      return
    }

    if (savedSteps && savedSteps.length > 0) {
      console.log('Raw saved steps from DB:', savedSteps)
      // Transform saved steps to local format
      const transformed = savedSteps.map((step) => {
        const baseScreen = findScreenById(step.type, screenTemplates)
        console.log('Step config:', step.type, step.config)
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

    // Deep clone the defaultConfig to ensure all nested properties are copied
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
      id: `${step.screenType || step.id.split('-')[0]}-${Date.now()}`,
    }
    const index = localSteps.findIndex((s) => s.id === step.id)
    const newSteps = [...localSteps]
    newSteps.splice(index + 1, 0, newStep)
    setLocalSteps(newSteps)
    setHasUnsavedChanges(true)
  }

  const loadTemplate = async (template: any) => {
    try {
      // Create template structure
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

      // Create flow from template
      const newFlow = await createFromTemplate.mutateAsync({
        name: templateData.name,
        description: templateData.description,
        screens: templateData.steps.map((s: any) => s.type),
      })

      // Select the new flow
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
      console.error('Failed to save:', error)
      toast.error('Failed to save flow')
    }
  }

  const handleDeploy = async () => {
    if (!selectedFlowId) return

    try {
      // Save first if there are unsaved changes
      if (hasUnsavedChanges) {
        await handleSave()
      }

      await deployFlow()
      toast.success('Flow deployed successfully! 🚀')
    } catch (error) {
      console.error('Failed to deploy:', error)
      toast.error('Failed to deploy flow')
    }
  }

  const updateScreenConfig = (stepId: string, newConfig: any) => {
    setLocalSteps(
      localSteps.map((step) =>
        step.id === stepId ? { ...step, config: newConfig } : step
      )
    )
    setHasUnsavedChanges(true)
  }

  const removeScreen = (stepId: string) => {
    setLocalSteps(localSteps.filter((step) => step.id !== stepId))
    setHasUnsavedChanges(true)
  }

  const handleCreateNewFlow = async () => {
    const name = prompt('Enter flow name:')
    if (!name) return

    try {
      const newFlow = await createFlow.mutateAsync({
        name,
        description: 'Custom onboarding flow',
      })
      setSelectedFlowId(newFlow.id)
      toast.success('Flow created successfully')
    } catch (error) {
      console.error('Failed to create flow:', error)
      toast.error('Failed to create flow')
    }
  }

  const handleCreateNewVersion = async () => {
    if (!flow || !selectedFlowId) return

    try {
      // Create a new draft flow based on the current active one
      const newFlow = await createFlow.mutateAsync({
        name: `${flow.name} v${parseInt(flow.version.toString()) + 1}`,
        description: flow.description || 'New version',
      })

      // Copy all steps to the new flow
      const { data: existingSteps } = await supabase
        .from('onboarding_flow_steps')
        .select('*')
        .eq('flow_id', selectedFlowId)
        .order('step_order')

      if (existingSteps && existingSteps.length > 0) {
        const stepsToInsert = existingSteps.map((step: any) => ({
          flow_id: newFlow.id,
          step_order: step.step_order,
          screen_type: step.screen_type,
          config: step.config,
          tracking_event_name: step.tracking_event_name,
        }))

        await supabase.from('onboarding_flow_steps').insert(stepsToInsert)
      }

      // Switch to the new flow
      setSelectedFlowId(newFlow.id)
      toast.success('New version created! You can now edit this draft.')
    } catch (error) {
      console.error('Failed to create new version:', error)
      toast.error('Failed to create new version')
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950'>
      {/* Header */}
      <header className='sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md dark:bg-gray-950/80'>
        <div className='mx-auto max-w-7xl px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-2'>
                <Sparkles className='h-5 w-5 text-white' />
              </div>
              <div>
                <h1 className='text-xl font-bold'>Flow Studio</h1>
                <p className='text-muted-foreground text-sm'>
                  {flow ? flow.name : 'Prayer onboarding made simple'}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              {hasUnsavedChanges && (
                <Badge variant='outline' className='text-orange-600'>
                  Unsaved changes
                </Badge>
              )}

              {flow?.status === 'active' && (
                <Badge variant='default' className='bg-green-600'>
                  Live (Read-Only)
                </Badge>
              )}

              <Button
                variant='outline'
                size='sm'
                onClick={handleSave}
                disabled={
                  !hasUnsavedChanges || isSaving || flow?.status === 'active'
                }
              >
                {isSaving ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Save className='mr-2 h-4 w-4' />
                )}
                Save
              </Button>

              <Button
                variant={isPreviewMode ? 'default' : 'outline'}
                size='sm'
                onClick={() => {
                  setIsPreviewMode(!isPreviewMode)
                  setCurrentPreviewStep(0)
                }}
              >
                {isPreviewMode ? (
                  <>
                    <EyeOff className='mr-2 h-4 w-4' />
                    Exit Preview
                  </>
                ) : (
                  <>
                    <Eye className='mr-2 h-4 w-4' />
                    Preview
                  </>
                )}
              </Button>

              {flow?.status === 'active' ? (
                <Button
                  size='sm'
                  onClick={handleCreateNewVersion}
                  className='bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Create New Version
                </Button>
              ) : (
                <Button
                  size='sm'
                  onClick={handleDeploy}
                  disabled={localSteps.length === 0 || isDeploying}
                  className='bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className='mr-2 h-4 w-4' />
                      Deploy to App
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className='mx-auto max-w-7xl px-6 py-8'>
        <AnimatePresence mode='wait'>
          {!isPreviewMode ? (
            <motion.div
              key='editor'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className='grid grid-cols-12 gap-6'>
                {/* Flow Selector / Templates */}
                <div className='col-span-3'>
                  <Card className='mb-4 p-4'>
                    <div className='mb-4 flex items-center justify-between'>
                      <h3 className='font-medium'>Flows</h3>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={handleCreateNewFlow}
                      >
                        <Plus className='h-4 w-4' />
                      </Button>
                    </div>

                    {flowsLoading ? (
                      <div className='space-y-2'>
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className='bg-muted h-12 animate-pulse rounded-lg'
                          />
                        ))}
                      </div>
                    ) : (
                      <div className='mb-4 space-y-2'>
                        {flows?.map((f: any) => (
                          <button
                            key={f.id}
                            onClick={() => setSelectedFlowId(f.id)}
                            className={cn(
                              'w-full rounded-lg border p-3 text-left transition-colors',
                              selectedFlowId === f.id
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-accent'
                            )}
                          >
                            <div className='flex items-center justify-between'>
                              <div>
                                <p className='text-sm font-medium'>{f.name}</p>
                                <p className='text-muted-foreground text-xs'>
                                  v{f.version}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  f.status === 'ACTIVE'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className='text-xs'
                              >
                                {f.status}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!selectedFlowId && (
                      <>
                        <div className='relative my-4'>
                          <div className='absolute inset-0 flex items-center'>
                            <span className='w-full border-t' />
                          </div>
                          <div className='relative flex justify-center text-xs uppercase'>
                            <span className='bg-background text-muted-foreground px-2'>
                              Or start with
                            </span>
                          </div>
                        </div>

                        <div className='space-y-2'>
                          {flowTemplates.map((template) => (
                            <Button
                              key={template.id}
                              variant='outline'
                              className='w-full justify-start'
                              onClick={() => loadTemplate(template)}
                            >
                              <Wand2 className='mr-2 h-4 w-4' />
                              {template.name}
                            </Button>
                          ))}
                        </div>
                      </>
                    )}
                  </Card>

                  {/* Screen Library */}
                  {selectedFlowId && (
                    <Card className='p-4'>
                      <h3 className='mb-4 flex items-center gap-2 font-medium'>
                        <Plus className='h-4 w-4' />
                        Add Screens
                      </h3>
                      <ScrollArea className='h-[calc(100vh-400px)]'>
                        <div className='space-y-4'>
                          {[
                            'welcome',
                            'profile',
                            'mood',
                            'prayer',
                            'commitment',
                            'confirmation',
                            'utility',
                          ].map((category) => {
                            const categoryScreens = findScreensByCategory(
                              category,
                              screenTemplates
                            )
                            if (categoryScreens.length === 0) return null

                            return (
                              <div key={category}>
                                <h4 className='text-muted-foreground mb-2 text-xs font-medium uppercase'>
                                  {category}
                                </h4>
                                <div className='space-y-2'>
                                  {categoryScreens.map((screen) => (
                                    <motion.button
                                      key={screen.id}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() =>
                                        flow?.status !== 'active' &&
                                        addScreen(screen.id)
                                      }
                                      className={cn(
                                        'w-full text-left',
                                        flow?.status === 'active' &&
                                          'cursor-not-allowed opacity-50'
                                      )}
                                      disabled={flow?.status === 'active'}
                                    >
                                      <div className='bg-card hover:bg-accent rounded-lg border p-3 transition-colors'>
                                        <div className='flex items-center gap-3'>
                                          <div
                                            className={cn(
                                              'flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-lg',
                                              screen.color
                                            )}
                                          >
                                            {screen.emoji}
                                          </div>
                                          <div className='min-w-0 flex-1'>
                                            <p className='text-sm font-medium'>
                                              {screen.name}
                                            </p>
                                            <p className='text-muted-foreground truncate text-xs'>
                                              {screen.description}
                                            </p>
                                          </div>
                                          <Plus className='text-muted-foreground h-4 w-4' />
                                        </div>
                                      </div>
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </Card>
                  )}
                </div>

                {/* Flow Builder */}
                <div className='col-span-9'>
                  {selectedFlowId ? (
                    <>
                      <div className='mb-4'>
                        <h2 className='mb-2 text-2xl font-bold'>
                          {flow?.name || 'Loading...'}
                        </h2>
                        <p className='text-muted-foreground'>
                          {localSteps.length === 0
                            ? 'Add screens to build your flow'
                            : `${localSteps.length} screens • ~${Math.ceil(localSteps.length * 15)} seconds to complete`}
                        </p>
                      </div>

                      {localSteps.length > 0 ? (
                        <DragDropContext
                          onDragEnd={
                            flow?.status !== 'active' ? handleDragEnd : () => {}
                          }
                        >
                          <Droppable
                            droppableId='steps'
                            isDropDisabled={flow?.status === 'active'}
                          >
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className='space-y-3'
                              >
                                {localSteps.map((step, index) => (
                                  <Draggable
                                    key={step.id}
                                    draggableId={step.id}
                                    index={index}
                                    isDragDisabled={flow?.status === 'active'}
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                      >
                                        <Card
                                          className={cn(
                                            'group relative cursor-pointer transition-all hover:shadow-md',
                                            snapshot.isDragging &&
                                              'scale-105 rotate-1 shadow-2xl',
                                            selectedStep?.id === step.id &&
                                              'ring-primary ring-2'
                                          )}
                                          onClick={() =>
                                            flow?.status !== 'active' &&
                                            setEditingScreen(step)
                                          }
                                        >
                                          <div className='p-4'>
                                            <div className='flex items-center gap-4'>
                                              {/* Drag Handle */}
                                              <div
                                                {...provided.dragHandleProps}
                                                className={cn(
                                                  'flex-shrink-0',
                                                  flow?.status === 'active'
                                                    ? 'cursor-not-allowed opacity-50'
                                                    : 'cursor-move'
                                                )}
                                              >
                                                <div className='bg-muted flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium'>
                                                  {index + 1}
                                                </div>
                                              </div>

                                              {/* Screen Icon */}
                                              <div
                                                className={cn(
                                                  'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl',
                                                  step.color
                                                )}
                                              >
                                                {step.emoji}
                                              </div>

                                              {/* Content Preview */}
                                              <div className='min-w-0 flex-1'>
                                                <h3 className='font-semibold'>
                                                  {step.name || step.type}
                                                </h3>
                                                {step.config.title && (
                                                  <p className='text-muted-foreground truncate text-sm'>
                                                    {step.config.title}
                                                  </p>
                                                )}

                                                {/* Welcome Screen specific preview */}
                                                {(step.type === 'welcome' ||
                                                  step.type ===
                                                    'WelcomeScreen') &&
                                                  step.config
                                                    .questionScreen && (
                                                    <div className='mt-1 space-y-1'>
                                                      <p className='text-muted-foreground text-xs italic'>
                                                        "
                                                        {
                                                          step.config
                                                            .questionScreen
                                                            .question
                                                        }
                                                        "
                                                      </p>
                                                      {step.config
                                                        .questionScreen
                                                        .options && (
                                                        <div className='text-muted-foreground text-xs'>
                                                          {
                                                            step.config
                                                              .questionScreen
                                                              .options.length
                                                          }{' '}
                                                          answer options
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                {/* Screen-specific content preview */}
                                                {step.config.options && (
                                                  <div className='mt-1 space-y-1'>
                                                    {step.config.options
                                                      .slice(0, 3)
                                                      .map(
                                                        (
                                                          option: any,
                                                          i: number
                                                        ) => (
                                                          <div
                                                            key={i}
                                                            className='flex items-center gap-1'
                                                          >
                                                            <div className='bg-muted-foreground/50 h-1.5 w-1.5 rounded-full' />
                                                            <span className='text-muted-foreground truncate text-xs'>
                                                              {option.text ||
                                                                option.label ||
                                                                option}
                                                            </span>
                                                          </div>
                                                        )
                                                      )}
                                                    {step.config.options
                                                      .length > 3 && (
                                                      <span className='text-muted-foreground pl-2.5 text-xs'>
                                                        +
                                                        {step.config.options
                                                          .length - 3}{' '}
                                                        more
                                                      </span>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Mood options preview */}
                                                {step.config.moodOptions && (
                                                  <div className='mt-1 flex gap-1'>
                                                    {step.config.moodOptions
                                                      .slice(0, 4)
                                                      .map(
                                                        (
                                                          mood: any,
                                                          i: number
                                                        ) => (
                                                          <span
                                                            key={i}
                                                            className='text-sm'
                                                          >
                                                            {mood.emoji}
                                                          </span>
                                                        )
                                                      )}
                                                    {step.config.moodOptions
                                                      .length > 4 && (
                                                      <span className='text-muted-foreground text-xs'>
                                                        +
                                                        {step.config.moodOptions
                                                          .length - 4}
                                                      </span>
                                                    )}
                                                  </div>
                                                )}

                                                {step.config.fields && (
                                                  <div className='mt-1 space-y-1'>
                                                    {step.config.fields
                                                      .slice(0, 2)
                                                      .map(
                                                        (
                                                          field: any,
                                                          i: number
                                                        ) => (
                                                          <div
                                                            key={i}
                                                            className='flex items-center gap-1'
                                                          >
                                                            <div className='border-muted-foreground/30 h-3 w-3 rounded border' />
                                                            <span className='text-muted-foreground text-xs'>
                                                              {field.label ||
                                                                field.name}{' '}
                                                              {field.required &&
                                                                '*'}
                                                            </span>
                                                          </div>
                                                        )
                                                      )}
                                                    {step.config.fields.length >
                                                      2 && (
                                                      <span className='text-muted-foreground pl-4 text-xs'>
                                                        +
                                                        {step.config.fields
                                                          .length - 2}{' '}
                                                        more fields
                                                      </span>
                                                    )}
                                                  </div>
                                                )}

                                                {step.config.people && (
                                                  <div className='text-muted-foreground mt-1 flex items-center gap-1 text-xs'>
                                                    <span>People selector</span>
                                                    {step.config
                                                      .allowAddNew && (
                                                      <span className='text-xs'>
                                                        • Can add new
                                                      </span>
                                                    )}
                                                  </div>
                                                )}

                                                {step.config.frequencies && (
                                                  <div className='text-muted-foreground mt-1 text-xs'>
                                                    {
                                                      step.config.frequencies
                                                        .length
                                                    }{' '}
                                                    frequency options
                                                  </div>
                                                )}

                                                {step.config.buttonText && (
                                                  <div className='mt-1 flex items-center gap-1'>
                                                    <ChevronRight className='text-muted-foreground h-3 w-3' />
                                                    <span className='text-primary text-xs'>
                                                      {step.config.buttonText}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>

                                              {/* Actions */}
                                              <div
                                                className={cn(
                                                  'flex items-center gap-1 transition-opacity',
                                                  flow?.status === 'active'
                                                    ? 'opacity-0'
                                                    : 'opacity-0 group-hover:opacity-100'
                                                )}
                                              >
                                                {flow?.status !== 'active' && (
                                                  <>
                                                    <Button
                                                      size='icon'
                                                      variant='ghost'
                                                      className='h-8 w-8'
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        const newStep = {
                                                          ...step,
                                                          id: `${step.type}-${Date.now()}`,
                                                          name: `${step.name} (Copy)`,
                                                        }
                                                        const newSteps = [
                                                          ...localSteps,
                                                        ]
                                                        newSteps.splice(
                                                          index + 1,
                                                          0,
                                                          newStep
                                                        )
                                                        setLocalSteps(newSteps)
                                                        setHasUnsavedChanges(
                                                          true
                                                        )
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
                                                        removeScreen(step.id)
                                                      }}
                                                    >
                                                      <Trash2 className='h-4 w-4' />
                                                    </Button>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Flow Line */}
                                          {index < localSteps.length - 1 && (
                                            <div className='absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 transform'>
                                              <ChevronRight className='text-muted-foreground h-6 w-6 rotate-90' />
                                            </div>
                                          )}
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
                        <Card className='border-dashed p-12 text-center'>
                          <Wand2 className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                          <h3 className='mb-2 text-lg font-medium'>
                            No screens yet
                          </h3>
                          <p className='text-muted-foreground text-sm'>
                            Add screens from the library to build your flow
                          </p>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card className='p-12 text-center'>
                      <Sparkles className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                      <h3 className='mb-2 text-lg font-medium'>
                        Select or create a flow
                      </h3>
                      <p className='text-muted-foreground mb-6 text-sm'>
                        Choose an existing flow or start with a template
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key='preview'
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className='mx-auto max-w-md'
            >
              {/* Preview Mode */}
              <div className='mb-8 text-center'>
                <Badge variant='secondary' className='mb-2'>
                  Preview Mode
                </Badge>
                <h2 className='text-2xl font-bold'>Test Your Flow</h2>
                <p className='text-muted-foreground mt-1'>
                  Experience it like your users will
                </p>
              </div>

              {/* Phone Frame with Real Preview */}
              <PhonePreview>
                <AnimatePresence mode='wait'>
                  {localSteps[currentPreviewStep] && (
                    <motion.div
                      key={currentPreviewStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className='h-full'
                    >
                      <ScreenPreviewComponent
                        step={localSteps[currentPreviewStep]}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </PhonePreview>

              {/* Progress Dots */}
              <div className='mt-6 flex justify-center gap-2'>
                {localSteps.map((_, index) => (
                  <button
                    key={index}
                    className={cn(
                      'h-2 w-2 rounded-full transition-all',
                      index === currentPreviewStep
                        ? 'bg-primary w-8'
                        : 'bg-gray-300 dark:bg-gray-700'
                    )}
                    onClick={() => setCurrentPreviewStep(index)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Screen Editor Modal */}
      <AnimatePresence>
        {editingScreen && (
          <ScreenEditorV3
            screen={editingScreen}
            template={findScreenById(editingScreen.type, screenTemplates)}
            onUpdate={(newConfig) => {
              updateScreenConfig(editingScreen.id, newConfig)
            }}
            onRemove={() => {
              removeScreen(editingScreen.id)
              setEditingScreen(null)
            }}
            onClose={() => setEditingScreen(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
