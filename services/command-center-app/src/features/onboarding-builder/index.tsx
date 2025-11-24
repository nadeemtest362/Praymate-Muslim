import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Save,
  Eye,
  GitBranch,
  Layers,
  Move,
  Settings,
  ChevronRight,
  Code,
  Smartphone,
  Monitor,
  Palette,
  Type,
  Image,
  CheckSquare,
  List,
  MessageSquare,
  ArrowUpDown,
  MoreVertical,
  Zap,
  FlaskConical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { FlowPreview } from './components/flow-preview'
import { JsonPreview } from './components/json-preview'

interface FlowStep {
  id: string
  type: 'screen' | 'action' | 'condition'
  screenType?: string
  name: string
  description?: string
  config: any
  nextStep?: string
  conditionalNext?: {
    condition: string
    trueStep: string
    falseStep: string
  }
}

interface Flow {
  id: string
  name: string
  description: string
  version: number
  status: 'draft' | 'active' | 'archived'
  steps: FlowStep[]
  variants?: FlowVariant[]
  createdAt: Date
  updatedAt: Date
}

interface FlowVariant {
  id: string
  name: string
  trafficPercentage: number
  steps: FlowStep[]
}

const screenTypes = [
  { id: 'welcome', name: 'Welcome', icon: MessageSquare, color: 'bg-blue-500' },
  { id: 'input', name: 'Text Input', icon: Type, color: 'bg-purple-500' },
  {
    id: 'selection',
    name: 'Selection',
    icon: CheckSquare,
    color: 'bg-green-500',
  },
  { id: 'mood', name: 'Mood Selector', icon: Palette, color: 'bg-yellow-500' },
  { id: 'image', name: 'Image Display', icon: Image, color: 'bg-pink-500' },
  { id: 'list', name: 'List Selection', icon: List, color: 'bg-indigo-500' },
  {
    id: 'confirmation',
    name: 'Confirmation',
    icon: CheckSquare,
    color: 'bg-emerald-500',
  },
  { id: 'loader', name: 'Loading State', icon: Zap, color: 'bg-orange-500' },
]

export default function OnboardingBuilder() {
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [flows, setFlows] = useState<Flow[]>([
    {
      id: '1',
      name: 'Default Onboarding',
      description: 'Standard onboarding flow for new users',
      version: 1,
      status: 'active',
      steps: [
        {
          id: 'welcome-1',
          type: 'screen',
          screenType: 'welcome',
          name: 'Welcome Screen',
          config: {
            title: 'Welcome to Personal Prayers',
            subtitle: 'Your daily companion for meaningful prayer',
            buttonText: 'Get Started',
          },
        },
        {
          id: 'mood-1',
          type: 'screen',
          screenType: 'mood',
          name: 'Mood Selection',
          config: {
            title: 'How are you feeling today?',
            moods: ['Grateful', 'Anxious', 'Joyful', 'Weary', 'Hopeful'],
          },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])

  const handleDragEnd = (result: any) => {
    if (!result.destination || !selectedFlow) return

    const newSteps = Array.from(selectedFlow.steps)
    const [reorderedItem] = newSteps.splice(result.source.index, 1)
    newSteps.splice(result.destination.index, 0, reorderedItem)

    setSelectedFlow({
      ...selectedFlow,
      steps: newSteps,
    })
  }

  const addNewStep = (type: string) => {
    if (!selectedFlow) return

    const newStep: FlowStep = {
      id: `${type}-${Date.now()}`,
      type: 'screen',
      screenType: type,
      name: `New ${screenTypes.find((s) => s.id === type)?.name}`,
      config: {},
    }

    setSelectedFlow({
      ...selectedFlow,
      steps: [...selectedFlow.steps, newStep],
    })
  }

  const deleteStep = (stepId: string) => {
    if (!selectedFlow) return

    setSelectedFlow({
      ...selectedFlow,
      steps: selectedFlow.steps.filter((s) => s.id !== stepId),
    })
    setSelectedStep(null)
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Onboarding Flow Builder
            </h1>
            <p className='text-muted-foreground'>
              Create and manage SDUI-driven onboarding experiences
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline'>
              <FlaskConical className='mr-2 h-4 w-4' />
              A/B Test
            </Button>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              New Flow
            </Button>
          </div>
        </div>

        <div className='grid gap-6 lg:grid-cols-12'>
          {/* Flow List Sidebar */}
          <Card className='lg:col-span-3'>
            <CardHeader>
              <CardTitle className='text-lg'>Flows</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              <ScrollArea className='h-[600px]'>
                {flows.map((flow) => (
                  <div
                    key={flow.id}
                    className={cn(
                      'hover:bg-accent cursor-pointer border-b p-4 transition-colors',
                      selectedFlow?.id === flow.id && 'bg-accent'
                    )}
                    onClick={() => setSelectedFlow(flow)}
                  >
                    <div className='mb-1 flex items-center justify-between'>
                      <h3 className='font-medium'>{flow.name}</h3>
                      <Badge
                        variant={
                          flow.status === 'active' ? 'default' : 'secondary'
                        }
                      >
                        {flow.status}
                      </Badge>
                    </div>
                    <p className='text-muted-foreground text-sm'>
                      {flow.description}
                    </p>
                    <div className='mt-2 flex items-center gap-2'>
                      <span className='text-muted-foreground text-xs'>
                        v{flow.version} • {flow.steps.length} steps
                      </span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Flow Canvas */}
          <Card className='lg:col-span-6'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-lg'>
                  {selectedFlow ? selectedFlow.name : 'Select a flow'}
                </CardTitle>
                {selectedFlow && (
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className='mr-2 h-4 w-4' />
                      Preview
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setShowJson(!showJson)}
                    >
                      <Code className='mr-2 h-4 w-4' />
                      {showJson ? 'Hide' : 'Show'} JSON
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedFlow ? (
                <>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId='steps'>
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className='space-y-2'
                        >
                          {selectedFlow.steps.map((step, index) => {
                            const screenType = screenTypes.find(
                              (s) => s.id === step.screenType
                            )
                            return (
                              <Draggable
                                key={step.id}
                                draggableId={step.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      'group relative',
                                      snapshot.isDragging && 'opacity-50'
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'bg-card cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md',
                                        selectedStep?.id === step.id &&
                                          'ring-primary ring-2'
                                      )}
                                      onClick={() => setSelectedStep(step)}
                                    >
                                      <div className='flex items-center gap-3'>
                                        <div
                                          {...provided.dragHandleProps}
                                          className='opacity-0 transition-opacity group-hover:opacity-100'
                                        >
                                          <Move className='text-muted-foreground h-4 w-4' />
                                        </div>
                                        {screenType && (
                                          <div
                                            className={cn(
                                              'rounded p-2',
                                              screenType.color
                                            )}
                                          >
                                            <screenType.icon className='h-4 w-4 text-white' />
                                          </div>
                                        )}
                                        <div className='flex-1'>
                                          <h4 className='font-medium'>
                                            {step.name}
                                          </h4>
                                          {step.description && (
                                            <p className='text-muted-foreground text-sm'>
                                              {step.description}
                                            </p>
                                          )}
                                        </div>
                                        <Button
                                          variant='ghost'
                                          size='sm'
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            deleteStep(step.id)
                                          }}
                                          className='opacity-0 group-hover:opacity-100'
                                        >
                                          <Trash2 className='text-destructive h-4 w-4' />
                                        </Button>
                                      </div>
                                    </div>
                                    {index < selectedFlow.steps.length - 1 && (
                                      <div className='flex justify-center py-2'>
                                        <ChevronRight className='text-muted-foreground h-4 w-4 rotate-90' />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            )
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  {/* Add Step Section */}
                  <Separator className='my-6' />
                  <div>
                    <h4 className='mb-3 text-sm font-medium'>Add Step</h4>
                    <div className='grid grid-cols-4 gap-2'>
                      {screenTypes.map((type) => (
                        <Button
                          key={type.id}
                          variant='outline'
                          className='h-20 flex-col gap-2 p-2'
                          onClick={() => addNewStep(type.id)}
                        >
                          <type.icon className='h-5 w-5' />
                          <span className='text-xs'>{type.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className='text-muted-foreground py-12 text-center'>
                  Select a flow to start editing
                </div>
              )}
            </CardContent>
          </Card>

          {/* Properties Panel */}
          <Card className='lg:col-span-3'>
            <CardHeader>
              <CardTitle className='text-lg'>
                {selectedStep ? 'Step Properties' : 'Flow Properties'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedStep ? (
                <div className='space-y-4'>
                  <div>
                    <Label htmlFor='step-name'>Step Name</Label>
                    <Input
                      id='step-name'
                      value={selectedStep.name}
                      onChange={(e) => {
                        if (!selectedFlow) return
                        const updatedSteps = selectedFlow.steps.map((s) =>
                          s.id === selectedStep.id
                            ? { ...s, name: e.target.value }
                            : s
                        )
                        setSelectedFlow({
                          ...selectedFlow,
                          steps: updatedSteps,
                        })
                        setSelectedStep({
                          ...selectedStep,
                          name: e.target.value,
                        })
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor='step-description'>Description</Label>
                    <Textarea
                      id='step-description'
                      value={selectedStep.description || ''}
                      onChange={(e) => {
                        if (!selectedFlow) return
                        const updatedSteps = selectedFlow.steps.map((s) =>
                          s.id === selectedStep.id
                            ? { ...s, description: e.target.value }
                            : s
                        )
                        setSelectedFlow({
                          ...selectedFlow,
                          steps: updatedSteps,
                        })
                        setSelectedStep({
                          ...selectedStep,
                          description: e.target.value,
                        })
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Dynamic Properties based on screen type */}
                  <div>
                    <h4 className='mb-3 text-sm font-medium'>
                      Screen Configuration
                    </h4>
                    {selectedStep.screenType === 'welcome' && (
                      <div className='space-y-3'>
                        <div>
                          <Label htmlFor='title'>Title</Label>
                          <Input
                            id='title'
                            value={selectedStep.config.title || ''}
                            placeholder='Welcome to...'
                          />
                        </div>
                        <div>
                          <Label htmlFor='subtitle'>Subtitle</Label>
                          <Input
                            id='subtitle'
                            value={selectedStep.config.subtitle || ''}
                            placeholder='Your journey begins...'
                          />
                        </div>
                        <div>
                          <Label htmlFor='button-text'>Button Text</Label>
                          <Input
                            id='button-text'
                            value={selectedStep.config.buttonText || ''}
                            placeholder='Get Started'
                          />
                        </div>
                      </div>
                    )}

                    {selectedStep.screenType === 'mood' && (
                      <div className='space-y-3'>
                        <div>
                          <Label htmlFor='mood-title'>Title</Label>
                          <Input
                            id='mood-title'
                            value={selectedStep.config.title || ''}
                            placeholder='How are you feeling?'
                          />
                        </div>
                        <div>
                          <Label>Mood Options</Label>
                          <div className='mt-2 space-y-2'>
                            {['Grateful', 'Anxious', 'Joyful', 'Weary'].map(
                              (mood) => (
                                <div
                                  key={mood}
                                  className='flex items-center space-x-2'
                                >
                                  <Switch defaultChecked />
                                  <Label>{mood}</Label>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedStep.screenType === 'input' && (
                      <div className='space-y-3'>
                        <div>
                          <Label htmlFor='input-label'>Input Label</Label>
                          <Input
                            id='input-label'
                            value={selectedStep.config.label || ''}
                            placeholder='Enter your name'
                          />
                        </div>
                        <div>
                          <Label htmlFor='placeholder'>Placeholder</Label>
                          <Input
                            id='placeholder'
                            value={selectedStep.config.placeholder || ''}
                          />
                        </div>
                        <div className='flex items-center space-x-2'>
                          <Switch id='required' />
                          <Label htmlFor='required'>Required field</Label>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className='flex justify-end gap-2'>
                    <Button variant='outline' size='sm'>
                      <Copy className='mr-2 h-4 w-4' />
                      Duplicate
                    </Button>
                    <Button size='sm'>
                      <Save className='mr-2 h-4 w-4' />
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : selectedFlow ? (
                <div className='space-y-4'>
                  <div>
                    <Label htmlFor='flow-name'>Flow Name</Label>
                    <Input
                      id='flow-name'
                      value={selectedFlow.name}
                      onChange={(e) =>
                        setSelectedFlow({
                          ...selectedFlow,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor='flow-description'>Description</Label>
                    <Textarea
                      id='flow-description'
                      value={selectedFlow.description}
                      onChange={(e) =>
                        setSelectedFlow({
                          ...selectedFlow,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor='status'>Status</Label>
                    <Select value={selectedFlow.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='draft'>Draft</SelectItem>
                        <SelectItem value='active'>Active</SelectItem>
                        <SelectItem value='archived'>Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div>
                    <h4 className='mb-3 text-sm font-medium'>A/B Testing</h4>
                    <Button variant='outline' className='w-full'>
                      <GitBranch className='mr-2 h-4 w-4' />
                      Create Variant
                    </Button>
                  </div>

                  <Separator />

                  <div className='flex justify-end gap-2'>
                    <Button variant='outline' size='sm'>
                      Archive
                    </Button>
                    <Button size='sm'>
                      <Save className='mr-2 h-4 w-4' />
                      Save Flow
                    </Button>
                  </div>
                </div>
              ) : (
                <div className='text-muted-foreground py-8 text-center'>
                  Select a flow or step to edit properties
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* JSON Preview Panel */}
        {showJson && selectedFlow && (
          <div className='mt-6'>
            <JsonPreview
              flow={selectedFlow}
              onImport={(json) => {
                // Handle importing a new flow
                setSelectedFlow(json)
              }}
            />
          </div>
        )}

        {/* Flow Preview Modal */}
        {selectedFlow && (
          <FlowPreview
            flow={selectedFlow}
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
          />
        )}
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Dashboard',
    href: '/',
    isActive: false,
    disabled: false,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    isActive: false,
    disabled: false,
  },
  {
    title: 'Flow Builder',
    href: '/onboarding-builder',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Prayer Studio',
    href: '/prayer-studio',
    isActive: false,
    disabled: false,
  },
]
