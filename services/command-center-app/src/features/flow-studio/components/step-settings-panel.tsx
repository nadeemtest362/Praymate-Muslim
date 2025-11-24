import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Type,
  Image,
  Palette,
  Settings,
  Smile,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

// Map lowercase screen IDs to PascalCase screen type names
const screenIdToTypeMap: Record<string, string> = {
  welcome: 'WelcomeScreen',
  'mood-selection': 'MoodSelectionScreen',
  'faith-tradition': 'FaithTraditionScreen',
  'prayer-example': 'PrayerExampleScreen',
  'first-name': 'FirstNameScreen',
  'prayer-people': 'PrayerPeopleCollectionScreen',
  'loading-spinner': 'LoadingSpinnerScreen',
  'prayer-generation-loading': 'PrayerGenerationLoadingScreen',
  'mood-context': 'MoodContextScreen',
  'prayer-needs': 'PrayerNeedsSelectionScreen',
  'add-intention': 'AddIntentionScreen',
  'prayer-frequency': 'PrayerFrequencyScreen',
  'streak-goal': 'StreakGoalScreen',
  'commitment-question': 'CommitmentQuestionScreen',
  confirmation: 'ConfirmationScreen',
  'intention-added-confirmation': 'IntentionAddedConfirmationScreen',
}

interface StepSettingsPanelProps {
  step: any
  onUpdate: (config: any) => void
  onClose: () => void
  onDelete?: () => void
  inline?: boolean
}

export function StepSettingsPanel({
  step,
  onUpdate,
  onClose,
  onDelete,
  inline = false,
}: StepSettingsPanelProps) {
  const [config, setConfig] = useState(step.config || {})
  const [activeTab, setActiveTab] = useState('content')

  // Map step type to proper screen type
  const screenType = screenIdToTypeMap[step.type] || step.type

  // Get options based on screen type structure
  const getOptions = () => {
    if (screenType === 'WelcomeScreen') {
      return config.questionScreen?.options || []
    }
    return config.options || []
  }

  const setOptions = (newOptions: any[]) => {
    if (screenType === 'WelcomeScreen') {
      updateConfig({
        questionScreen: {
          ...config.questionScreen,
          options: newOptions,
        },
      })
    } else {
      updateConfig({ options: newOptions })
    }
  }

  // Determine which tabs to show based on screen type
  const hasOptions =
    getOptions().length > 0 ||
    step.type?.includes('Question') ||
    screenType === 'WelcomeScreen' ||
    screenType === 'FaithTraditionScreen' ||
    screenType === 'MoodSelectionScreen' ||
    screenType === 'PrayerNeedsSelectionScreen' ||
    screenType === 'CommitmentQuestionScreen' ||
    screenType === 'StreakGoalScreen' ||
    screenType === 'PrayerScheduleScreen' ||
    screenType === 'PrayerPeopleCollectionScreen'

  useEffect(() => {
    setConfig(step.config || {})
  }, [step.id])

  const updateConfig = (updates: any) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    onUpdate(newConfig)
  }

  const updateNestedConfig = (path: string[], value: any) => {
    const newConfig = { ...config }
    let current = newConfig

    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {}
      current = current[path[i]]
    }

    current[path[path.length - 1]] = value
    setConfig(newConfig)
    onUpdate(newConfig)
  }

  const addOption = () => {
    const currentOptions = getOptions()
    const newOption = {
      id: `option-${Date.now()}`,
      label: 'New Option',
      value: '',
      emoji: '⭐',
      text: 'New Option',
    }
    setOptions([...currentOptions, newOption])
  }

  const updateOption = (index: number, updates: any) => {
    const currentOptions = getOptions()
    const options = [...currentOptions]
    options[index] = { ...options[index], ...updates }
    setOptions(options)
  }

  const removeOption = (index: number) => {
    const currentOptions = getOptions()
    const options = [...currentOptions]
    options.splice(index, 1)
    setOptions(options)
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const currentOptions = getOptions()
    const options = [...currentOptions]
    const [reorderedItem] = options.splice(result.source.index, 1)
    options.splice(result.destination.index, 0, reorderedItem)
    setOptions(options)
  }

  const tabs = [
    { id: 'content', label: 'Content', icon: Type },
    ...(hasOptions ? [{ id: 'options', label: 'Options', icon: Smile }] : []),
    { id: 'style', label: 'Style', icon: Palette },
    { id: 'advanced', label: 'Advanced', icon: Settings },
  ]

  const renderContentTab = () => (
    <div className='space-y-6'>
      {/* Basic Content Fields */}
      <div className='space-y-4'>
        <div>
          <Label htmlFor='title'>Title</Label>
          <Input
            id='title'
            value={config.title || ''}
            onChange={(e) => updateConfig({ title: e.target.value })}
            placeholder='Screen title...'
            className='mt-2'
          />
        </div>

        <div>
          <Label htmlFor='subtitle'>Subtitle</Label>
          <Input
            id='subtitle'
            value={config.subtitle || ''}
            onChange={(e) => updateConfig({ subtitle: e.target.value })}
            placeholder='Screen subtitle...'
            className='mt-2'
          />
        </div>

        {config.hasOwnProperty('body') && (
          <div>
            <Label htmlFor='body'>Body Text</Label>
            <Textarea
              id='body'
              value={config.body || ''}
              onChange={(e) => updateConfig({ body: e.target.value })}
              placeholder='Main content...'
              className='mt-2 min-h-[100px]'
            />
          </div>
        )}

        <div>
          <Label htmlFor='buttonText'>Button Text</Label>
          <Input
            id='buttonText'
            value={config.button?.text || config.buttonText || ''}
            onChange={(e) => {
              if (config.button || screenType === 'InterstitialScreen') {
                updateNestedConfig(['button', 'text'], e.target.value)
              } else {
                updateConfig({ buttonText: e.target.value })
              }
            }}
            placeholder='Continue'
            className='mt-2'
          />
        </div>

        {config.hasOwnProperty('placeholder') && (
          <div>
            <Label htmlFor='placeholder'>Placeholder Text</Label>
            <Input
              id='placeholder'
              value={config.placeholder || ''}
              onChange={(e) => updateConfig({ placeholder: e.target.value })}
              placeholder='Placeholder text...'
              className='mt-2'
            />
          </div>
        )}
      </div>

      {/* Screen-specific fields */}
      {screenType === 'WelcomeScreen' && (
        <Card className='space-y-4 p-4'>
          <Label className='text-sm font-medium'>Logo Configuration</Label>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label className='text-xs'>Logo Text</Label>
              <Input
                value={config.logoScreen?.logoText || ''}
                onChange={(e) =>
                  updateNestedConfig(['logoScreen', 'logoText'], e.target.value)
                }
                placeholder='personal'
                className='mt-1'
              />
            </div>
            <div>
              <Label className='text-xs'>Logo Accent</Label>
              <Input
                value={config.logoScreen?.logoAccent || ''}
                onChange={(e) =>
                  updateNestedConfig(
                    ['logoScreen', 'logoAccent'],
                    e.target.value
                  )
                }
                placeholder='prayers'
                className='mt-1'
              />
            </div>
          </div>
          <div>
            <Label className='text-xs'>Logo Emoji</Label>
            <Input
              value={config.logoScreen?.logoEmoji || ''}
              onChange={(e) =>
                updateNestedConfig(['logoScreen', 'logoEmoji'], e.target.value)
              }
              placeholder='🙏'
              className='mt-1'
            />
          </div>

          <Separator className='my-4' />

          <Label className='text-sm font-medium'>
            Question Screen Configuration
          </Label>
          <div>
            <Label className='text-xs'>Greeting</Label>
            <Input
              value={config.questionScreen?.greeting || ''}
              onChange={(e) =>
                updateNestedConfig(
                  ['questionScreen', 'greeting'],
                  e.target.value
                )
              }
              placeholder='welcome to personal prayers'
              className='mt-1'
            />
          </div>
          <div>
            <Label className='text-xs'>Question</Label>
            <Input
              value={config.questionScreen?.question || ''}
              onChange={(e) =>
                updateNestedConfig(
                  ['questionScreen', 'question'],
                  e.target.value
                )
              }
              placeholder="what's your name?"
              className='mt-1'
            />
          </div>
        </Card>
      )}

      {screenType === 'InterstitialScreen' && (
        <Card className='space-y-4 p-4'>
          <Label className='text-sm font-medium'>
            InterstitialScreen Configuration
          </Label>
          <div>
            <Label className='text-xs'>Title Template</Label>
            <Input
              value={config.titleTemplate || ''}
              onChange={(e) => updateConfig({ titleTemplate: e.target.value })}
              placeholder="Now, let's talk about YOU, {displayName}..."
              className='mt-1'
            />
            <p className='text-muted-foreground mt-1 text-xs'>
              Use {'{displayName}'} for dynamic name insertion
            </p>
          </div>
          <div>
            <Label className='text-xs'>Emoji</Label>
            <Input
              value={config.emoji || ''}
              onChange={(e) => updateConfig({ emoji: e.target.value })}
              placeholder='🫵'
              className='mt-1'
            />
          </div>
          <div>
            <Label className='text-xs'>Background Image URL</Label>
            <Input
              value={config.backgroundImage || ''}
              onChange={(e) =>
                updateConfig({ backgroundImage: e.target.value })
              }
              placeholder='/images/jesus-hand.png'
              className='mt-1'
            />
          </div>
        </Card>
      )}
    </div>
  )

  const renderOptionsTab = () => {
    const currentOptions = getOptions()

    return (
      <div className='space-y-1'>
        {currentOptions && currentOptions.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId='options'>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {currentOptions.map((option: any, index: number) => (
                    <Draggable
                      key={option.id || index}
                      draggableId={String(option.id || index)}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            'group -mx-3 flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
                            'hover:bg-muted/50',
                            snapshot.isDragging && 'bg-muted shadow-sm'
                          )}
                        >
                          {/* Drag Handle - Linear style */}
                          <div
                            {...provided.dragHandleProps}
                            className='opacity-0 transition-opacity group-hover:opacity-100'
                          >
                            <GripVertical className='text-muted-foreground/50 h-4 w-4' />
                          </div>

                          {/* Number indicator */}
                          <span className='text-muted-foreground w-4 text-xs'>
                            {index + 1}
                          </span>

                          {/* Emoji picker */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className='hover:bg-muted flex h-8 w-8 items-center justify-center rounded text-xl transition-colors'>
                                {option.emoji || '😊'}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className='w-auto p-0'
                              align='start'
                            >
                              <EmojiPicker
                                onEmojiClick={(emojiData: EmojiClickData) => {
                                  updateOption(index, {
                                    emoji: emojiData.emoji,
                                  })
                                }}
                                height={350}
                                width={300}
                                previewConfig={{ showPreview: false }}
                                skinTonesDisabled
                                searchPlaceHolder='Search emoji...'
                                theme={Theme.DARK}
                              />
                            </PopoverContent>
                          </Popover>

                          {/* Text - Linear-style inline editing */}
                          <input
                            type='text'
                            value={option.label || option.text || ''}
                            onChange={(e) =>
                              updateOption(index, {
                                label: e.target.value,
                                text: e.target.value,
                              })
                            }
                            placeholder='Option text...'
                            className='flex-1 border-0 bg-transparent px-0 py-1 text-sm outline-none focus:ring-0'
                          />

                          {/* Delete - only on hover */}
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => removeOption(index)}
                            className='h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                          >
                            <X className='h-3 w-3' />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {/* Add option - Linear style */}
                  <button
                    onClick={addOption}
                    className='hover:bg-muted/50 text-muted-foreground -mx-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors'
                  >
                    <div className='w-4' /> {/* Spacer for drag handle */}
                    <span className='w-4 text-xs'>
                      {currentOptions.length + 1}
                    </span>
                    <Plus className='h-4 w-4' />
                    <span className='text-sm'>Add option</span>
                  </button>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <button
            onClick={addOption}
            className='hover:bg-muted/50 text-muted-foreground -mx-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors'
          >
            <div className='w-4' /> {/* Spacer */}
            <span className='w-4 text-xs'>1</span>
            <Plus className='h-4 w-4' />
            <span className='text-sm'>Add option</span>
          </button>
        )}
      </div>
    )
  }

  const renderStyleTab = () => (
    <div className='space-y-6'>
      <div className='space-y-4'>
        <div>
          <Label className='text-sm font-medium'>Screen Emoji</Label>
          <Input
            value={config.emoji || step.emoji || ''}
            onChange={(e) => updateConfig({ emoji: e.target.value })}
            placeholder='📱'
            className='mt-2'
          />
        </div>

        <div>
          <Label className='text-sm font-medium'>Background Color</Label>
          <select
            value={config.color || step.color || ''}
            onChange={(e) => updateConfig({ color: e.target.value })}
            className='mt-2 w-full rounded-md border p-2'
          >
            <option value='from-blue-500 to-blue-600'>Blue</option>
            <option value='from-purple-500 to-purple-600'>Purple</option>
            <option value='from-green-500 to-green-600'>Green</option>
            <option value='from-red-500 to-red-600'>Red</option>
            <option value='from-yellow-500 to-yellow-600'>Yellow</option>
            <option value='from-pink-500 to-pink-600'>Pink</option>
            <option value='from-indigo-500 to-indigo-600'>Indigo</option>
            <option value='from-gray-500 to-gray-600'>Gray</option>
          </select>
        </div>

        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>Allow Skip</Label>
          <Switch
            checked={config.allowSkip || false}
            onCheckedChange={(checked) => updateConfig({ allowSkip: checked })}
          />
        </div>

        <div className='flex items-center justify-between'>
          <Label className='text-sm font-medium'>Required Field</Label>
          <Switch
            checked={config.required || false}
            onCheckedChange={(checked) => updateConfig({ required: checked })}
          />
        </div>
      </div>
    </div>
  )

  const renderAdvancedTab = () => (
    <div className='space-y-6'>
      <div className='space-y-4'>
        <div>
          <Label className='text-sm font-medium'>Screen Name</Label>
          <Input
            value={config.screen_name || step.name || ''}
            onChange={(e) => updateConfig({ screen_name: e.target.value })}
            placeholder='Custom screen name'
            className='mt-2'
          />
        </div>

        <div>
          <Label className='text-sm font-medium'>Analytics Event</Label>
          <Input
            value={config.analytics_event || ''}
            onChange={(e) => updateConfig({ analytics_event: e.target.value })}
            placeholder='screen_viewed'
            className='mt-2'
          />
        </div>

        <Separator />

        <div>
          <Label className='text-sm font-medium'>Custom CSS Classes</Label>
          <Input
            value={config.customClasses || ''}
            onChange={(e) => updateConfig({ customClasses: e.target.value })}
            placeholder='custom-class another-class'
            className='mt-2'
          />
        </div>

        <div>
          <Label className='text-sm font-medium'>JSON Configuration</Label>
          <Textarea
            value={JSON.stringify(config, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                setConfig(parsed)
                onUpdate(parsed)
              } catch (err) {
                // Invalid JSON, don't update
              }
            }}
            className='mt-2 font-mono text-xs'
            rows={10}
          />
        </div>
      </div>
    </div>
  )

  // Question screens have a different layout - options are primary
  const isQuestionScreen = hasOptions

  const content = (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='border-b p-6'>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <div className='flex items-center gap-3'>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-lg',
                  step.color
                )}
              >
                {step.emoji}
              </div>
              <div>
                <h2 className='text-lg font-semibold'>{step.name}</h2>
                <Badge variant='secondary' className='text-xs'>
                  {step.type}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* For Question Screens - Options are primary content */}
      {isQuestionScreen ? (
        <div className='flex-1 overflow-y-auto'>
          {/* Compact Question Header */}
          <div className='bg-muted/30 border-b p-4'>
            <div className='space-y-3'>
              <div>
                <Input
                  value={
                    screenType === 'WelcomeScreen'
                      ? config.questionScreen?.question || ''
                      : config.question || config.title || ''
                  }
                  onChange={(e) => {
                    if (screenType === 'WelcomeScreen') {
                      updateConfig({
                        questionScreen: {
                          ...config.questionScreen,
                          question: e.target.value,
                        },
                      })
                    } else {
                      updateConfig({ question: e.target.value })
                    }
                  }}
                  placeholder={'What brings you here today?'}
                  className='text-lg font-medium'
                />
              </div>
              {(config.subtitle !== undefined ||
                screenType === 'MoodSelectionScreen') && (
                <Input
                  value={config.subtitle || ''}
                  onChange={(e) => updateConfig({ subtitle: e.target.value })}
                  placeholder='Add an optional subtitle...'
                  className='text-sm'
                />
              )}
            </div>
          </div>

          {/* Options - The main event */}
          <div className='p-4'>{renderOptionsTab()}</div>

          {/* Other settings in collapsible sections */}
          <div className='space-y-4 border-t p-6'>
            <details className='group'>
              <summary className='flex cursor-pointer items-center gap-2 text-sm font-medium'>
                <ChevronRight className='h-4 w-4 transition-transform group-open:rotate-90' />
                Style Settings
              </summary>
              <div className='mt-4 pl-6'>{renderStyleTab()}</div>
            </details>

            <details className='group'>
              <summary className='flex cursor-pointer items-center gap-2 text-sm font-medium'>
                <ChevronRight className='h-4 w-4 transition-transform group-open:rotate-90' />
                Advanced Settings
              </summary>
              <div className='mt-4 pl-6'>{renderAdvancedTab()}</div>
            </details>
          </div>
        </div>
      ) : (
        /* For non-question screens, keep the tab interface */
        <>
          <div className='border-b'>
            <div className='bg-muted mx-6 mt-4 flex rounded-lg p-1'>
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className='h-3 w-3' />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className='flex-1 overflow-y-auto p-6'>
            <AnimatePresence mode='wait'>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'content' && renderContentTab()}
                {activeTab === 'options' && renderOptionsTab()}
                {activeTab === 'style' && renderStyleTab()}
                {activeTab === 'advanced' && renderAdvancedTab()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Delete button for inline mode */}
          {inline && onDelete && (
            <div className='border-t p-6'>
              <Button
                variant='ghost'
                size='sm'
                className='text-destructive hover:text-destructive hover:bg-destructive/10 w-full'
                onClick={() => {
                  if (confirm(`Delete "${step.name}"?`)) {
                    onDelete()
                  }
                }}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete Step
              </Button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      {!inline && (
        <div className='border-t p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              {onDelete && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-destructive hover:text-destructive hover:bg-destructive/10'
                  onClick={() => {
                    if (confirm(`Delete "${step.name}"?`)) {
                      onDelete()
                      onClose()
                    }
                  }}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete Step
                </Button>
              )}
              <p className='text-muted-foreground text-sm'>
                Changes are saved automatically
              </p>
            </div>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </div>
  )

  if (inline) {
    return content
  }

  return (
    <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm'>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 20 }}
        className='bg-background absolute top-0 right-0 h-full w-full max-w-2xl border-l shadow-2xl'
      >
        {content}
      </motion.div>
    </div>
  )
}
