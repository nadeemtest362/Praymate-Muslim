import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Plus,
  Trash2,
  Image,
  Palette,
  Type,
  Settings,
  AlertCircle,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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

interface ScreenEditorV3Props {
  screen: {
    id: string
    type: string
    config: any
  }
  template?: any
  onUpdate: (config: any) => void
  onRemove: () => void
  onClose: () => void
}

export function ScreenEditorV3({
  screen,
  template,
  onUpdate,
  onRemove,
  onClose,
}: ScreenEditorV3Props) {
  const screenTemplate = template

  const [config, setConfig] = useState(() => {
    // Start with the screen's config, which should already have the defaults
    return screen.config || screenTemplate?.defaultConfig || {}
  })
  const [activeTab, setActiveTab] = useState('content')
  const [hasChanges, setHasChanges] = useState(false)

  // Update config when screen changes
  useEffect(() => {
    setConfig(screen.config || screenTemplate?.defaultConfig || {})
    setHasChanges(false)
  }, [screen.id, screen.type])

  // Auto-save on change
  useEffect(() => {
    if (!hasChanges) return

    const timer = setTimeout(() => {
      onUpdate(config)
      setHasChanges(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [config, hasChanges])

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value })
    setHasChanges(true)
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
    setHasChanges(true)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 z-40 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Editor Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 20 }}
        className='bg-background fixed top-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col border-l shadow-2xl'
      >
        {/* Header */}
        <div className='border-b p-6'>
          <div className='flex items-start justify-between'>
            <div className='space-y-1'>
              <div className='flex items-center gap-3'>
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-2xl',
                    screenTemplate?.color || 'from-gray-500 to-gray-600'
                  )}
                >
                  {config.emoji || screenTemplate?.emoji || '📱'}
                </div>
                <div>
                  <h2 className='text-2xl font-semibold'>
                    {config.screen_name || screenTemplate?.name || screen.type}
                  </h2>
                  <Badge variant='secondary' className='mt-1'>
                    {screenTemplate?.category || 'custom'}
                  </Badge>
                </div>
              </div>
              <p className='text-muted-foreground'>
                {screenTemplate?.description || 'Customize this screen'}
              </p>
            </div>
            <Button
              variant='ghost'
              size='icon'
              onClick={onClose}
              className='rounded-full'
            >
              <X className='h-5 w-5' />
            </Button>
          </div>

          {hasChanges && (
            <div className='mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950/50'>
              <AlertCircle className='h-4 w-4 text-amber-600' />
              <span className='text-sm text-amber-600'>Unsaved changes</span>
            </div>
          )}
        </div>

        {/* Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='flex flex-1 flex-col'
        >
          <TabsList className='mx-6 mt-2'>
            <TabsTrigger value='content' className='flex items-center gap-2'>
              <Type className='h-4 w-4' />
              Content
            </TabsTrigger>
            <TabsTrigger value='options' className='flex items-center gap-2'>
              <List className='h-4 w-4' />
              Options
              {(config.options ||
                config.moodOptions ||
                config.categories ||
                config.frequencies ||
                config.questionScreen?.options ||
                screenTemplate?.defaultConfig?.options ||
                screenTemplate?.defaultConfig?.moodOptions ||
                screenTemplate?.defaultConfig?.questionScreen?.options) && (
                <Badge variant='secondary' className='ml-1 h-5 px-1 text-xs'>
                  {config.options?.length ||
                    config.moodOptions?.length ||
                    config.categories?.length ||
                    config.frequencies?.length ||
                    config.questionScreen?.options?.length ||
                    screenTemplate?.defaultConfig?.options?.length ||
                    screenTemplate?.defaultConfig?.moodOptions?.length ||
                    screenTemplate?.defaultConfig?.questionScreen?.options
                      ?.length ||
                    '•'}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='design' className='flex items-center gap-2'>
              <Palette className='h-4 w-4' />
              Design
            </TabsTrigger>
            <TabsTrigger value='advanced' className='flex items-center gap-2'>
              <Settings className='h-4 w-4' />
              Advanced
            </TabsTrigger>
          </TabsList>

          <ScrollArea className='flex-1'>
            <div className='p-6'>
              <TabsContent value='content' className='mt-0 space-y-6'>
                <ContentEditor
                  screen={screen}
                  config={config}
                  updateConfig={updateConfig}
                  updateNestedConfig={updateNestedConfig}
                  screenTemplate={screenTemplate}
                />
              </TabsContent>

              <TabsContent value='options' className='mt-0 space-y-6'>
                <OptionsEditor
                  screen={screen}
                  config={config}
                  updateConfig={updateConfig}
                  updateNestedConfig={updateNestedConfig}
                  screenTemplate={screenTemplate}
                />
              </TabsContent>

              <TabsContent value='design' className='mt-0 space-y-6'>
                <DesignEditor
                  config={config}
                  updateConfig={updateConfig}
                  updateNestedConfig={updateNestedConfig}
                />
              </TabsContent>

              <TabsContent value='advanced' className='mt-0 space-y-6'>
                <AdvancedEditor
                  config={config}
                  updateConfig={updateConfig}
                  updateNestedConfig={updateNestedConfig}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        {/* Footer Actions */}
        <div className='flex gap-2 border-t p-4'>
          <Button variant='outline' className='flex-1' onClick={onClose}>
            Done
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => {
              if (confirm('Are you sure you want to remove this screen?')) {
                onRemove()
                onClose()
              }
            }}
            className='text-destructive hover:bg-destructive/10'
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      </motion.div>
    </>
  )
}

// Content Editor Component
function ContentEditor({
  screen,
  config,
  updateConfig,
  updateNestedConfig,
  screenTemplate,
}: any) {
  const renderContentFields = () => {
    switch (screen.type) {
      case 'welcome':
      case 'WelcomeScreen':
        return (
          <>
            <div>
              <Label>Logo Configuration</Label>
              <div className='mt-2 grid grid-cols-3 gap-2'>
                <Input
                  value={config.logoScreen?.logoText || ''}
                  onChange={(e) =>
                    updateNestedConfig(
                      ['logoScreen', 'logoText'],
                      e.target.value
                    )
                  }
                  placeholder='personal'
                />
                <Input
                  value={config.logoScreen?.logoAccent || ''}
                  onChange={(e) =>
                    updateNestedConfig(
                      ['logoScreen', 'logoAccent'],
                      e.target.value
                    )
                  }
                  placeholder='prayers'
                />
                <Input
                  value={config.logoScreen?.logoEmoji || ''}
                  onChange={(e) =>
                    updateNestedConfig(
                      ['logoScreen', 'logoEmoji'],
                      e.target.value
                    )
                  }
                  placeholder='🙏'
                  className='text-center'
                />
              </div>
            </div>

            <div>
              <Label>Greeting</Label>
              <Input
                value={config.questionScreen?.greeting || ''}
                onChange={(e) =>
                  updateNestedConfig(
                    ['questionScreen', 'greeting'],
                    e.target.value
                  )
                }
                placeholder='welcome to {APP_LOGO}'
                className='mt-2'
              />
              <p className='text-muted-foreground mt-1 text-xs'>
                Use {'{APP_LOGO}'} as placeholder
              </p>
            </div>

            <div>
              <Label>Timer Settings</Label>
              <div className='mt-2 grid grid-cols-2 gap-2'>
                <div>
                  <Label className='text-xs'>Logo to Verse Delay (ms)</Label>
                  <Input
                    type='number'
                    value={config.timers?.logoToVerseDelay || 2500}
                    onChange={(e) =>
                      updateNestedConfig(
                        ['timers', 'logoToVerseDelay'],
                        parseInt(e.target.value)
                      )
                    }
                    className='mt-1'
                  />
                </div>
                <div>
                  <Label className='text-xs'>Verse Display Duration (ms)</Label>
                  <Input
                    type='number'
                    value={config.timers?.verseDisplayDuration || 5000}
                    onChange={(e) =>
                      updateNestedConfig(
                        ['timers', 'verseDisplayDuration'],
                        parseInt(e.target.value)
                      )
                    }
                    className='mt-1'
                  />
                </div>
              </div>
            </div>
          </>
        )

      case 'interstitial':
        return (
          <>
            <div>
              <Label>Logo Text</Label>
              <div className='mt-2 grid grid-cols-2 gap-2'>
                <Input
                  value={config.logo?.text || ''}
                  onChange={(e) =>
                    updateNestedConfig(['logo', 'text'], e.target.value)
                  }
                  placeholder='Personal Prayers'
                />
                <Input
                  value={config.logo?.accent || ''}
                  onChange={(e) =>
                    updateNestedConfig(['logo', 'accent'], e.target.value)
                  }
                  placeholder='Personal'
                />
              </div>
            </div>

            <div>
              <Label>Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder={screenTemplate?.defaultConfig.title}
                className='mt-2'
              />
            </div>

            <div>
              <Label>Subtitle</Label>
              <Textarea
                value={config.subtitle || ''}
                onChange={(e) => updateConfig('subtitle', e.target.value)}
                placeholder={screenTemplate?.defaultConfig.subtitle}
                className='mt-2'
                rows={2}
              />
            </div>

            <div>
              <Label>Image</Label>
              <div className='hover:bg-muted/50 mt-2 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition'>
                <Image className='text-muted-foreground mx-auto mb-2 h-8 w-8' />
                <p className='text-muted-foreground text-sm'>
                  {config.image ||
                    config.backgroundImage ||
                    'Click to upload image'}
                </p>
              </div>
            </div>
          </>
        )

      case 'mood-selection':
        return (
          <>
            <div>
              <Label>Question</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder='How are you feeling?'
                className='mt-2'
              />
            </div>

            <div>
              <Label>Subtitle</Label>
              <Input
                value={config.subtitle || ''}
                onChange={(e) => updateConfig('subtitle', e.target.value)}
                placeholder='Share your current mood'
                className='mt-2'
              />
            </div>

            <div>
              <Label>Mood Options</Label>
              <MoodOptionsEditor
                moods={
                  config.moodOptions ||
                  screenTemplate?.defaultConfig.moodOptions ||
                  []
                }
                onChange={(moods) => updateConfig('moodOptions', moods)}
              />
            </div>
          </>
        )

      case 'add-intention':
        return (
          <>
            <div>
              <Label>Intro Title Template</Label>
              <Input
                value={config.intentionCollectionPhase?.introTitle || ''}
                onChange={(e) =>
                  updateNestedConfig(
                    ['intentionCollectionPhase', 'introTitle'],
                    e.target.value
                  )
                }
                placeholder="what's on your ❤️ for {personName}?"
                className='mt-2'
              />
              <p className='text-muted-foreground mt-1 text-xs'>
                Use {'{personName}'} for dynamic name
              </p>
            </div>

            <div>
              <Label>Intro Subtitle</Label>
              <Textarea
                value={config.intentionCollectionPhase?.introSubtitle || ''}
                onChange={(e) =>
                  updateNestedConfig(
                    ['intentionCollectionPhase', 'introSubtitle'],
                    e.target.value
                  )
                }
                placeholder="Let's add a starting prayer focus..."
                className='mt-2'
                rows={2}
              />
            </div>

            <div>
              <Label>Category Selector Label</Label>
              <Input
                value={
                  config.intentionCollectionPhase?.intentionPrompt
                    ?.categorySelectorLabel || ''
                }
                onChange={(e) =>
                  updateNestedConfig(
                    [
                      'intentionCollectionPhase',
                      'intentionPrompt',
                      'categorySelectorLabel',
                    ],
                    e.target.value
                  )
                }
                placeholder='Select a starting category:'
                className='mt-2'
              />
            </div>

            <div>
              <Label>Details Input Placeholder</Label>
              <Input
                value={
                  config.intentionCollectionPhase?.intentionPrompt
                    ?.detailsInputPlaceholder || ''
                }
                onChange={(e) =>
                  updateNestedConfig(
                    [
                      'intentionCollectionPhase',
                      'intentionPrompt',
                      'detailsInputPlaceholder',
                    ],
                    e.target.value
                  )
                }
                placeholder='Add a few words about this prayer focus...'
                className='mt-2'
              />
            </div>
          </>
        )

      case 'prayer-frequency':
      case 'streak-goal':
      case 'faith-tradition':
        return (
          <>
            <div>
              <Label>Question</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder={screenTemplate?.defaultConfig.title}
                className='mt-2'
              />
            </div>

            <div>
              <Label>Subtitle</Label>
              <Input
                value={config.subtitle || ''}
                onChange={(e) => updateConfig('subtitle', e.target.value)}
                placeholder={screenTemplate?.defaultConfig.subtitle}
                className='mt-2'
              />
            </div>
          </>
        )

      default:
        return (
          <>
            <div>
              <Label>Title</Label>
              <Input
                value={config.title || ''}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder='Screen title'
                className='mt-2'
              />
            </div>

            <div>
              <Label>Subtitle</Label>
              <Textarea
                value={config.subtitle || ''}
                onChange={(e) => updateConfig('subtitle', e.target.value)}
                placeholder='Screen subtitle'
                className='mt-2'
                rows={2}
              />
            </div>
          </>
        )
    }
  }

  return (
    <>
      {renderContentFields()}

      <Separator />

      <div>
        <Label>Button Text</Label>
        <Input
          value={config.buttonText || ''}
          onChange={(e) => updateConfig('buttonText', e.target.value)}
          placeholder={screenTemplate?.defaultConfig.buttonText || 'Continue'}
          className='mt-2'
        />
      </div>

      {(screen.type === 'mood-context' || screen.type === 'first-name') && (
        <div>
          <Label>Skip Button Text</Label>
          <Input
            value={config.skipButtonText || ''}
            onChange={(e) => updateConfig('skipButtonText', e.target.value)}
            placeholder='Skip'
            className='mt-2'
          />
        </div>
      )}
    </>
  )
}

// Options Editor Component
function OptionsEditor({
  screen,
  config,
  updateConfig,
  updateNestedConfig,
  screenTemplate,
}: any) {
  const renderOptionsFields = () => {
    switch (screen.type) {
      case 'welcome':
      case 'WelcomeScreen':
        return (
          <WelcomeScreenOptions
            config={config}
            updateNestedConfig={updateNestedConfig}
            screenTemplate={screenTemplate}
          />
        )

      case 'prayer-people':
        return (
          <PrayerPeopleOptions
            config={config}
            updateConfig={updateConfig}
            defaultCategories={screenTemplate?.defaultConfig.categories}
          />
        )

      case 'prayer-needs':
        return (
          <PrayerNeedsOptions
            config={config}
            updateConfig={updateConfig}
            defaultCategories={screenTemplate?.defaultConfig.categories}
          />
        )

      case 'prayer-frequency':
      case 'streak-goal':
        return (
          <FrequencyOptions
            options={
              config.options || screenTemplate?.defaultConfig.options || []
            }
            onChange={(options) => updateConfig('options', options)}
          />
        )

      case 'mood-selection':
        return (
          <MoodOptionsEditor
            moods={
              config.moodOptions ||
              screenTemplate?.defaultConfig.moodOptions ||
              []
            }
            onChange={(moods) => updateConfig('moodOptions', moods)}
          />
        )

      case 'faith-tradition':
      case 'relationship-with-god':
      case 'commitment-question':
        return (
          <SelectionOptions
            options={
              config.options || screenTemplate?.defaultConfig?.options || []
            }
            onChange={(options) => updateConfig('options', options)}
            allowMultiple={config.allowMultiple || false}
            onAllowMultipleChange={(value) =>
              updateConfig('allowMultiple', value)
            }
          />
        )

      case 'add-intention':
        return (
          <IntentionCategoryOptions
            categories={
              config.intentionCollectionPhase?.displayedCategoryIds || []
            }
            onChange={(categories) =>
              updateConfig('intentionCollectionPhase', {
                ...config.intentionCollectionPhase,
                displayedCategoryIds: categories,
              })
            }
          />
        )

      default:
        // Generic handler for any screen with options
        if (config.options || screenTemplate?.defaultConfig?.options) {
          return (
            <SelectionOptions
              options={
                config.options || screenTemplate?.defaultConfig.options || []
              }
              onChange={(options) => updateConfig('options', options)}
              allowMultiple={
                config.allowMultiple || config.multipleSelection || false
              }
              onAllowMultipleChange={(value) =>
                updateConfig('allowMultiple', value)
              }
            />
          )
        }

        // Check for mood options
        if (config.moodOptions || screenTemplate?.defaultConfig?.moodOptions) {
          return (
            <MoodOptionsEditor
              moods={
                config.moodOptions ||
                screenTemplate?.defaultConfig.moodOptions ||
                []
              }
              onChange={(moods) => updateConfig('moodOptions', moods)}
            />
          )
        }

        return (
          <div className='text-muted-foreground py-8 text-center'>
            <p>No options available for this screen type</p>
          </div>
        )
    }
  }

  return renderOptionsFields()
}

// Design Editor Component
function DesignEditor({ config, updateConfig }: any) {
  return (
    <>
      <div>
        <Label>Screen Emoji</Label>
        <Input
          value={config.emoji || ''}
          onChange={(e) => updateConfig('emoji', e.target.value)}
          placeholder='📱'
          className='mt-2 text-center text-2xl'
        />
      </div>

      <div>
        <Label>Color Scheme</Label>
        <Select
          value={config.color || ''}
          onValueChange={(value) => updateConfig('color', value)}
        >
          <SelectTrigger className='mt-2'>
            <SelectValue placeholder='Select color scheme' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='from-blue-500 to-blue-600'>Blue</SelectItem>
            <SelectItem value='from-purple-500 to-purple-600'>
              Purple
            </SelectItem>
            <SelectItem value='from-green-500 to-green-600'>Green</SelectItem>
            <SelectItem value='from-orange-500 to-orange-600'>
              Orange
            </SelectItem>
            <SelectItem value='from-pink-500 to-pink-600'>Pink</SelectItem>
            <SelectItem value='from-indigo-500 to-indigo-600'>
              Indigo
            </SelectItem>
            <SelectItem value='from-teal-500 to-teal-600'>Teal</SelectItem>
            <SelectItem value='from-red-500 to-red-600'>Red</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Layout Style</Label>
        <Select
          value={config.layout || ''}
          onValueChange={(value) => updateConfig('layout', value)}
        >
          <SelectTrigger className='mt-2'>
            <SelectValue placeholder='Select layout' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='centered-icon'>Centered Icon</SelectItem>
            <SelectItem value='mood-selector'>Mood Selector</SelectItem>
            <SelectItem value='form'>Form</SelectItem>
            <SelectItem value='options'>Options List</SelectItem>
            <SelectItem value='people-selector'>People Selector</SelectItem>
            <SelectItem value='success'>Success Message</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

// Advanced Editor Component
function AdvancedEditor({ config, updateConfig, updateNestedConfig }: any) {
  return (
    <>
      <div>
        <Label>Screen Name (Internal)</Label>
        <Input
          value={config.screen_name || ''}
          onChange={(e) => updateConfig('screen_name', e.target.value)}
          placeholder='Custom screen name'
          className='mt-2'
        />
      </div>

      <div>
        <Label>Navigation</Label>
        <Card className='mt-2 space-y-3 p-4'>
          <div>
            <Label className='text-sm'>Action Type</Label>
            <Select
              value={config.navigation?.action || 'NAVIGATE'}
              onValueChange={(value) =>
                updateNestedConfig(['navigation', 'action'], value)
              }
            >
              <SelectTrigger className='mt-1'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='NAVIGATE'>Navigate</SelectItem>
                <SelectItem value='NAVIGATE_WITH_PARAMS'>
                  Navigate with Params
                </SelectItem>
                <SelectItem value='COMPLETE'>Complete Flow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.navigation?.action !== 'COMPLETE' && (
            <div>
              <Label className='text-sm'>Navigate To</Label>
              <Input
                value={config.navigation?.navigateTo || ''}
                onChange={(e) =>
                  updateNestedConfig(
                    ['navigation', 'navigateTo'],
                    e.target.value
                  )
                }
                placeholder='next-screen-id'
                className='mt-1'
              />
            </div>
          )}
        </Card>
      </div>

      <div>
        <Label>Tracking Events</Label>
        <Card className='mt-2 space-y-3 p-4'>
          <div>
            <Label className='text-sm'>Screen View Event</Label>
            <Input
              value={config.tracking?.screenViewEvent || ''}
              onChange={(e) =>
                updateNestedConfig(
                  ['tracking', 'screenViewEvent'],
                  e.target.value
                )
              }
              placeholder='onboarding_screen_viewed'
              className='mt-1'
            />
          </div>
        </Card>
      </div>

      <div>
        <Label>Validation</Label>
        <Card className='mt-2 space-y-3 p-4'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm'>Required</Label>
            <Switch
              checked={config.validation?.required || false}
              onCheckedChange={(checked) =>
                updateNestedConfig(['validation', 'required'], checked)
              }
            />
          </div>

          <div>
            <Label className='text-sm'>Min Length</Label>
            <Input
              type='number'
              value={config.validation?.minLength || ''}
              onChange={(e) =>
                updateNestedConfig(
                  ['validation', 'minLength'],
                  parseInt(e.target.value)
                )
              }
              placeholder='2'
              className='mt-1'
            />
          </div>

          <div>
            <Label className='text-sm'>Max Length</Label>
            <Input
              type='number'
              value={config.validation?.maxLength || config.maxLength || ''}
              onChange={(e) =>
                updateConfig('maxLength', parseInt(e.target.value))
              }
              placeholder='200'
              className='mt-1'
            />
          </div>
        </Card>
      </div>
    </>
  )
}

// Helper Components
function WelcomeScreenOptions({ config, updateNestedConfig }: any) {
  const options = config.questionScreen?.options || []

  const updateOption = (index: number, field: string, value: any) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    updateNestedConfig(['questionScreen', 'options'], newOptions)
  }

  const addOption = () => {
    const newOptions = [
      ...options,
      {
        id: `option_${Date.now()}`,
        text: 'New option',
        emoji: '✨',
        action: 'set_initial_motivation_and_navigate',
        navigateTo: '/onboarding/understanding-validation',
      },
    ]
    updateNestedConfig(['questionScreen', 'options'], newOptions)
  }

  const removeOption = (index: number) => {
    updateNestedConfig(
      ['questionScreen', 'options'],
      options.filter((_: any, i: number) => i !== index)
    )
  }

  return (
    <div className='space-y-4'>
      <div>
        <Label>Welcome Screen Options</Label>
        <p className='text-muted-foreground mt-1 text-sm'>
          Options shown on the "What brings you here today?" screen
        </p>
      </div>

      <div>
        <Label>Question Text</Label>
        <Input
          value={config.questionScreen?.question || ''}
          onChange={(e) =>
            updateNestedConfig(['questionScreen', 'question'], e.target.value)
          }
          placeholder='what brings you here today?'
          className='mt-2'
        />
      </div>

      <Separator />

      <div>
        <Label>Answer Options</Label>
        <div className='mt-2 space-y-2'>
          {options.map((option: any, index: number) => (
            <Card key={option.id || index} className='p-3'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <Input
                    value={option.emoji || ''}
                    onChange={(e) =>
                      updateOption(index, 'emoji', e.target.value)
                    }
                    className='w-12 text-center text-xl'
                    placeholder='😊'
                  />
                  <Input
                    value={option.text || ''}
                    onChange={(e) =>
                      updateOption(index, 'text', e.target.value)
                    }
                    placeholder='Option text'
                    className='flex-1'
                  />
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={() => removeOption(index)}
                    className='h-8 w-8'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
                <div className='flex items-center gap-2 pl-14'>
                  <Input
                    value={option.id || ''}
                    onChange={(e) => updateOption(index, 'id', e.target.value)}
                    placeholder='option_id'
                    className='flex-1 text-xs'
                  />
                  <Input
                    value={option.navigateTo || ''}
                    onChange={(e) =>
                      updateOption(index, 'navigateTo', e.target.value)
                    }
                    placeholder='/onboarding/next-screen'
                    className='flex-1 text-xs'
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={addOption}
          className='mt-2 w-full'
        >
          <Plus className='mr-1 h-4 w-4' />
          Add Option
        </Button>
      </div>

      <Separator />

      <div>
        <Label>Verses</Label>
        <p className='text-muted-foreground mt-1 text-sm'>
          Bible verses shown during the welcome sequence
        </p>
        <div className='bg-muted mt-2 rounded-lg p-3'>
          <p className='text-muted-foreground text-xs'>
            {config.verseScreen?.verses?.length || 0} verses configured
          </p>
        </div>
      </div>
    </div>
  )
}

function MoodOptionsEditor({
  moods,
  onChange,
}: {
  moods: any[]
  onChange: (moods: any[]) => void
}) {
  const addMood = () => {
    onChange([
      ...moods,
      { id: `mood_${Date.now()}`, emoji: '😊', label: 'New Mood' },
    ])
  }

  const updateMood = (index: number, field: string, value: string) => {
    const newMoods = [...moods]
    newMoods[index] = { ...newMoods[index], [field]: value }
    onChange(newMoods)
  }

  const removeMood = (index: number) => {
    onChange(moods.filter((_: any, i: number) => i !== index))
  }

  return (
    <div className='space-y-4'>
      <div>
        <Label>Mood Options</Label>
        <p className='text-muted-foreground mt-1 text-sm'>
          Configure the moods users can select from
        </p>
      </div>

      <div className='grid grid-cols-2 gap-2'>
        {moods.map((mood: any, index: number) => (
          <Card key={mood.id || index} className='p-3'>
            <div className='flex items-center gap-2'>
              <Input
                value={mood.emoji}
                onChange={(e) => updateMood(index, 'emoji', e.target.value)}
                className='w-12 text-center text-xl'
              />
              <Input
                value={mood.label}
                onChange={(e) => updateMood(index, 'label', e.target.value)}
                className='flex-1'
                placeholder='Mood label'
              />
              <Button
                size='icon'
                variant='ghost'
                onClick={() => removeMood(index)}
                className='h-8 w-8'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button variant='outline' size='sm' onClick={addMood} className='w-full'>
        <Plus className='mr-1 h-4 w-4' />
        Add Mood
      </Button>
    </div>
  )
}

function PrayerPeopleOptions({ config, updateConfig, defaultCategories }: any) {
  const categories = config.categories || defaultCategories || []

  return (
    <div className='space-y-4'>
      <div>
        <Label>People Categories</Label>
        <div className='mt-2 space-y-2'>
          {['myself', 'family', 'friends', 'community', 'world'].map(
            (category) => {
              const cat = defaultCategories?.find((c: any) => c.id === category)
              return (
                <div
                  key={category}
                  className='flex items-center justify-between rounded border p-2'
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-lg'>{cat?.emoji}</span>
                    <span>{cat?.label || category}</span>
                  </div>
                  <Switch
                    checked={categories.some((c: any) => c.id === category)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateConfig('categories', [...categories, cat])
                      } else {
                        updateConfig(
                          'categories',
                          categories.filter((c: any) => c.id !== category)
                        )
                      }
                    }}
                  />
                </div>
              )
            }
          )}
        </div>
      </div>

      <Separator />

      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label>Allow Custom People</Label>
          <Switch
            checked={config.allowCustom !== false}
            onCheckedChange={(checked) => updateConfig('allowCustom', checked)}
          />
        </div>

        <div className='flex items-center justify-between'>
          <Label>Multiple Selection</Label>
          <Switch
            checked={config.multipleSelection !== false}
            onCheckedChange={(checked) =>
              updateConfig('multipleSelection', checked)
            }
          />
        </div>

        <div className='flex items-center justify-between'>
          <Label>Minimum Selection</Label>
          <Input
            type='number'
            value={config.minSelection || 1}
            onChange={(e) =>
              updateConfig('minSelection', parseInt(e.target.value))
            }
            className='w-20'
          />
        </div>
      </div>
    </div>
  )
}

function PrayerNeedsOptions({ config, updateConfig, defaultCategories }: any) {
  const categories = config.categories || defaultCategories || []

  return (
    <div className='space-y-4'>
      <div>
        <Label>Prayer Categories</Label>
        <div className='mt-2 grid grid-cols-2 gap-2'>
          {defaultCategories?.map((category: any) => (
            <div
              key={category.id}
              className='flex items-center gap-2 rounded border p-2'
            >
              <Switch
                checked={categories.some((c: any) => c.id === category.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateConfig('categories', [...categories, category])
                  } else {
                    updateConfig(
                      'categories',
                      categories.filter((c: any) => c.id !== category.id)
                    )
                  }
                }}
              />
              <span className='text-lg'>{category.emoji}</span>
              <span className='text-sm'>{category.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className='flex items-center justify-between'>
        <Label>Multiple Selection</Label>
        <Switch
          checked={config.multipleSelection !== false}
          onCheckedChange={(checked) =>
            updateConfig('multipleSelection', checked)
          }
        />
      </div>
    </div>
  )
}

function FrequencyOptions({
  options,
  onChange,
}: {
  options: any[]
  onChange: (options: any[]) => void
}) {
  const updateOption = (index: number, field: string, value: any) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    onChange(newOptions)
  }

  return (
    <div className='space-y-3'>
      {options.map((option: any, index: number) => (
        <Card key={index} className='p-4'>
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Input
                value={option.emoji || ''}
                onChange={(e) => updateOption(index, 'emoji', e.target.value)}
                className='w-12 text-center text-xl'
                placeholder='📅'
              />
              <Input
                value={option.label || option.text || ''}
                onChange={(e) => updateOption(index, 'label', e.target.value)}
                placeholder='Frequency label'
                className='flex-1'
              />
              {option.value !== undefined && (
                <Input
                  type='number'
                  value={option.value}
                  onChange={(e) =>
                    updateOption(index, 'value', parseInt(e.target.value))
                  }
                  className='w-20'
                  placeholder='Days'
                />
              )}
            </div>
            {option.description !== undefined && (
              <Input
                value={option.description}
                onChange={(e) =>
                  updateOption(index, 'description', e.target.value)
                }
                placeholder='Description (optional)'
                className='text-sm'
              />
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function SelectionOptions({
  options,
  onChange,
  allowMultiple,
  onAllowMultipleChange,
}: {
  options: any[]
  onChange: (options: any[]) => void
  allowMultiple: boolean
  onAllowMultipleChange: (value: boolean) => void
}) {
  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : []

  const addOption = () => {
    onChange([
      ...safeOptions,
      { id: `option_${Date.now()}`, label: 'New Option', emoji: '✨' },
    ])
  }

  const updateOption = (index: number, field: string, value: string) => {
    const newOptions = [...safeOptions]
    newOptions[index] = { ...newOptions[index], [field]: value }
    onChange(newOptions)
  }

  const removeOption = (index: number) => {
    onChange(safeOptions.filter((_: any, i: number) => i !== index))
  }

  return (
    <div className='space-y-4'>
      <div>
        <Label>Answer Options</Label>
        <p className='text-muted-foreground mt-1 text-sm'>
          Configure the options users can choose from
        </p>
      </div>

      <div className='space-y-2'>
        {safeOptions.length === 0 ? (
          <div className='text-muted-foreground rounded-lg border-2 border-dashed py-4 text-center'>
            <p className='text-sm'>No options yet</p>
          </div>
        ) : (
          safeOptions.map((option: any, index: number) => (
            <Card key={`option-${index}-${option.id || index}`} className='p-3'>
              <div className='flex items-center gap-2'>
                <Input
                  value={option.emoji || ''}
                  onChange={(e) => updateOption(index, 'emoji', e.target.value)}
                  className='w-12 text-center text-xl'
                  placeholder='✨'
                />
                <Input
                  value={option.label || option.text || ''}
                  onChange={(e) => {
                    // Update both label and text to maintain compatibility
                    const newOptions = [...safeOptions]
                    newOptions[index] = {
                      ...newOptions[index],
                      label: e.target.value,
                      text: e.target.value,
                    }
                    onChange(newOptions)
                  }}
                  placeholder='Option label'
                  className='flex-1'
                />
                <Button
                  size='icon'
                  variant='ghost'
                  onClick={() => removeOption(index)}
                  className='h-8 w-8'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Button
        variant='outline'
        size='sm'
        onClick={addOption}
        className='w-full'
      >
        <Plus className='mr-1 h-4 w-4' />
        Add Option
      </Button>

      <Separator />

      <div className='flex items-center justify-between'>
        <Label>Allow Multiple Selection</Label>
        <Switch
          checked={allowMultiple}
          onCheckedChange={onAllowMultipleChange}
        />
      </div>
    </div>
  )
}

function IntentionCategoryOptions({
  categories,
  onChange,
}: {
  categories: string[]
  onChange: (categories: string[]) => void
}) {
  const allCategories = [
    { id: 'healing', label: 'Healing', emoji: '🏥' },
    { id: 'peace', label: 'Peace', emoji: '☮️' },
    { id: 'protection', label: 'Protection', emoji: '🛡️' },
    { id: 'guidance', label: 'Guidance', emoji: '🧭' },
    { id: 'wisdom', label: 'Wisdom', emoji: '🦉' },
    { id: 'strength', label: 'Strength', emoji: '💪' },
    { id: 'faith', label: 'Faith', emoji: '✝️' },
    { id: 'love', label: 'Love', emoji: '❤️' },
    { id: 'forgiveness', label: 'Forgiveness', emoji: '🤝' },
    { id: 'joy', label: 'Joy', emoji: '😊' },
    { id: 'comfort', label: 'Comfort', emoji: '🤗' },
    { id: 'gratitude', label: 'Gratitude', emoji: '🙏' },
    { id: 'financialHelp', label: 'Financial Help', emoji: '💰' },
    { id: 'blessing', label: 'Blessing', emoji: '✨' },
    { id: 'other', label: 'Other', emoji: '📝' },
  ]

  return (
    <div>
      <Label>Available Prayer Categories</Label>
      <div className='mt-2 grid grid-cols-2 gap-2'>
        {allCategories.map((category) => (
          <div
            key={category.id}
            className='flex items-center gap-2 rounded border p-2'
          >
            <Switch
              checked={categories.includes(category.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...categories, category.id])
                } else {
                  onChange(categories.filter((c: string) => c !== category.id))
                }
              }}
            />
            <span className='text-lg'>{category.emoji}</span>
            <span className='text-sm'>{category.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
