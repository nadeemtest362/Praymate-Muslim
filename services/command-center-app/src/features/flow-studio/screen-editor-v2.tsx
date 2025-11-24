import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Image,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface ScreenEditorProps {
  screen: {
    id: string
    type: string
    config: any
  }
  template: any
  onUpdate: (config: any) => void
  onRemove: () => void
  onClose: () => void
}

export function ScreenEditorV2({
  screen,
  template,
  onUpdate,
  onRemove,
  onClose,
}: ScreenEditorProps) {
  const [config, setConfig] = useState(screen.config)
  const [expandedSection, setExpandedSection] = useState<string | null>(
    'content'
  )

  // Auto-save on change
  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate(config)
    }, 500)
    return () => clearTimeout(timer)
  }, [config])

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value })
  }

  // Screen type specific UI
  const renderScreenSpecific = () => {
    // Log to see what we're actually working with
    console.log('Editing screen type:', screen.type)
    console.log('Current config:', config)

    switch (screen.type) {
      case 'welcome':
        return <WelcomeEditor config={config} updateConfig={updateConfig} />
      case 'mood':
      case 'mood-check':
        return <MoodEditor config={config} updateConfig={updateConfig} />
      case 'prayer-intentions':
      case 'add-intention':
        return <IntentionsEditor config={config} updateConfig={updateConfig} />
      case 'faith-tradition':
        return (
          <FaithTraditionEditor config={config} updateConfig={updateConfig} />
        )
      case 'prayer-frequency':
        return <FrequencyEditor config={config} updateConfig={updateConfig} />
      case 'prayer-people':
        return <PeopleEditor config={config} updateConfig={updateConfig} />
      case 'prayer-example':
        return (
          <PrayerExampleEditor config={config} updateConfig={updateConfig} />
        )
      case 'confirmation':
        return (
          <ConfirmationEditor config={config} updateConfig={updateConfig} />
        )
      default:
        return <GenericEditor config={config} updateConfig={updateConfig} />
    }
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
        className='bg-background fixed top-0 right-0 z-50 flex h-full w-full max-w-xl flex-col border-l shadow-2xl'
      >
        {/* Header */}
        <div className='flex items-center justify-between border-b p-6'>
          <div>
            <h2 className='flex items-center gap-3 text-2xl font-semibold'>
              <span className='text-3xl'>
                {screen.config?.emoji || template?.emoji || '📱'}
              </span>
              {screen.config?.screen_name || screen.type}
            </h2>
            <p className='text-muted-foreground mt-1'>Customize this screen</p>
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

        {/* Content */}
        <div className='flex-1 overflow-y-auto'>{renderScreenSpecific()}</div>

        {/* Footer Actions */}
        <div className='flex gap-2 border-t p-4'>
          <Button variant='outline' className='flex-1' onClick={onClose}>
            Done
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={onRemove}
            className='text-destructive hover:bg-destructive/10'
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      </motion.div>
    </>
  )
}

// Welcome Screen Editor
function WelcomeEditor({ config, updateConfig }: any) {
  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Title</label>
        <Input
          value={config.title || ''}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder='Welcome to Personal Prayers'
          className='text-lg'
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Subtitle</label>
        <Textarea
          value={config.subtitle || ''}
          onChange={(e) => updateConfig('subtitle', e.target.value)}
          placeholder='Your daily companion for meaningful prayer'
          className='resize-none'
          rows={2}
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Image</label>
        <div className='hover:bg-muted/50 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition'>
          <Image className='text-muted-foreground mx-auto mb-2 h-8 w-8' />
          <p className='text-muted-foreground text-sm'>Click to upload image</p>
        </div>
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Button</label>
        <Input
          value={config.buttonText || ''}
          onChange={(e) => updateConfig('buttonText', e.target.value)}
          placeholder='Get Started'
        />
      </div>
    </div>
  )
}

// Mood Editor
function MoodEditor({ config, updateConfig }: any) {
  const defaultMoods = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '😔', label: 'Sad' },
    { emoji: '😰', label: 'Anxious' },
    { emoji: '😤', label: 'Angry' },
    { emoji: '🙏', label: 'Grateful' },
    { emoji: '😴', label: 'Tired' },
  ]

  const moods = config.moods || defaultMoods

  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Question</label>
        <Input
          value={config.title || ''}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder='How are you feeling today?'
          className='text-lg'
        />
      </div>

      <div>
        <label className='mb-4 block text-sm font-medium'>Moods</label>
        <div className='grid grid-cols-3 gap-3'>
          {moods.map((mood: any, index: number) => (
            <div key={index} className='rounded-lg border p-3 text-center'>
              <div className='mb-1 text-2xl'>{mood.emoji}</div>
              <input
                type='text'
                value={mood.label}
                onChange={(e) => {
                  const newMoods = [...moods]
                  newMoods[index] = { ...mood, label: e.target.value }
                  updateConfig('moods', newMoods)
                }}
                className='w-full border-0 bg-transparent text-center text-sm focus:outline-none'
                placeholder='Label'
              />
            </div>
          ))}
          <button className='hover:bg-muted/50 rounded-lg border-2 border-dashed p-3 text-center transition'>
            <Plus className='text-muted-foreground mx-auto h-6 w-6' />
          </button>
        </div>
      </div>
    </div>
  )
}

// Faith Tradition Editor
function FaithTraditionEditor({ config, updateConfig }: any) {
  const defaultOptions = [
    'Christianity',
    'Catholic',
    'Protestant',
    'Orthodox',
    'Judaism',
    'Islam',
    'Buddhism',
    'Hinduism',
    'Spiritual but not religious',
    'Other',
  ]

  const options = config.options || config.faithTraditions || defaultOptions

  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Question</label>
        <Input
          value={config.title || 'What faith tradition resonates with you?'}
          onChange={(e) => updateConfig('title', e.target.value)}
          className='text-lg'
        />
      </div>

      <div>
        <label className='mb-4 block text-sm font-medium'>
          Faith Traditions
        </label>
        <div className='space-y-2'>
          {options.map((option: any, index: number) => (
            <div key={index} className='flex items-center gap-2'>
              <Input
                value={typeof option === 'string' ? option : option.text}
                onChange={(e) => {
                  const newOptions = [...options]
                  newOptions[index] = e.target.value
                  updateConfig('options', newOptions)
                }}
              />
              <Button
                size='icon'
                variant='ghost'
                onClick={() => {
                  updateConfig(
                    'options',
                    options.filter((_: any, i: number) => i !== index)
                  )
                }}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          ))}
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              updateConfig('options', [...options, 'New Tradition'])
            }
          >
            <Plus className='mr-1 h-4 w-4' />
            Add Tradition
          </Button>
        </div>
      </div>

      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium'>Allow multiple selection</label>
        <Switch
          checked={config.multipleSelection || false}
          onCheckedChange={(checked) =>
            updateConfig('multipleSelection', checked)
          }
        />
      </div>
    </div>
  )
}

// Prayer Frequency Editor
function FrequencyEditor({ config, updateConfig }: any) {
  const defaultFrequencies = [
    { text: 'Daily', value: 'daily', description: 'Every day' },
    { text: '3-4 times a week', value: '3-4-week', description: 'Most days' },
    { text: 'Weekly', value: 'weekly', description: 'Once a week' },
    {
      text: 'Occasionally',
      value: 'occasional',
      description: 'When I need it',
    },
  ]

  const frequencies = config.frequencies || config.options || defaultFrequencies

  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Question</label>
        <Input
          value={config.title || 'How often would you like to pray?'}
          onChange={(e) => updateConfig('title', e.target.value)}
          className='text-lg'
        />
      </div>

      <div>
        <label className='mb-4 block text-sm font-medium'>
          Frequency Options
        </label>
        <div className='space-y-3'>
          {frequencies.map((freq: any, index: number) => (
            <div key={index} className='space-y-2 rounded-lg border p-3'>
              <Input
                value={freq.text || freq}
                onChange={(e) => {
                  const newFreqs = [...frequencies]
                  if (typeof freq === 'string') {
                    newFreqs[index] = {
                      text: e.target.value,
                      value: e.target.value,
                    }
                  } else {
                    newFreqs[index] = { ...freq, text: e.target.value }
                  }
                  updateConfig('frequencies', newFreqs)
                }}
                placeholder='Frequency'
              />
              {typeof freq === 'object' && (
                <Input
                  value={freq.description || ''}
                  onChange={(e) => {
                    const newFreqs = [...frequencies]
                    newFreqs[index] = { ...freq, description: e.target.value }
                    updateConfig('frequencies', newFreqs)
                  }}
                  placeholder='Description (optional)'
                  className='text-sm'
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium'>Set default reminder</label>
        <Switch
          checked={config.setReminder || false}
          onCheckedChange={(checked) => updateConfig('setReminder', checked)}
        />
      </div>
    </div>
  )
}

// People Editor
function PeopleEditor({ config, updateConfig }: any) {
  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Question</label>
        <Input
          value={config.title || 'Who would you like to pray for?'}
          onChange={(e) => updateConfig('title', e.target.value)}
          className='text-lg'
        />
      </div>

      <div>
        <label className='mb-4 block text-sm font-medium'>
          Default People Categories
        </label>
        <div className='space-y-2'>
          {['Family', 'Friends', 'Myself', 'Community', 'World'].map(
            (category) => (
              <div
                key={category}
                className='flex items-center justify-between rounded border p-2'
              >
                <span>{category}</span>
                <Switch
                  checked={config.categories?.includes(category) || true}
                  onCheckedChange={(checked) => {
                    const cats = config.categories || [
                      'Family',
                      'Friends',
                      'Myself',
                      'Community',
                      'World',
                    ]
                    updateConfig(
                      'categories',
                      checked
                        ? [...cats, category]
                        : cats.filter((c: string) => c !== category)
                    )
                  }}
                />
              </div>
            )
          )}
        </div>
      </div>

      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <label className='text-sm font-medium'>
            Allow adding custom people
          </label>
          <Switch
            checked={config.allowCustom !== false}
            onCheckedChange={(checked) => updateConfig('allowCustom', checked)}
          />
        </div>

        <div className='flex items-center justify-between'>
          <label className='text-sm font-medium'>Multiple selection</label>
          <Switch
            checked={config.multipleSelection !== false}
            onCheckedChange={(checked) =>
              updateConfig('multipleSelection', checked)
            }
          />
        </div>

        <div className='flex items-center justify-between'>
          <label className='text-sm font-medium'>
            Show "Pray for all" option
          </label>
          <Switch
            checked={config.showPrayForAll || false}
            onCheckedChange={(checked) =>
              updateConfig('showPrayForAll', checked)
            }
          />
        </div>
      </div>
    </div>
  )
}

// Prayer Example Editor
function PrayerExampleEditor({ config, updateConfig }: any) {
  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Title</label>
        <Input
          value={config.title || "Here's your personalized prayer"}
          onChange={(e) => updateConfig('title', e.target.value)}
          className='text-lg'
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>
          Loading Message
        </label>
        <Input
          value={config.loadingText || 'Creating your prayer...'}
          onChange={(e) => updateConfig('loadingText', e.target.value)}
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>
          Example Prayer Template
        </label>
        <Textarea
          value={config.exampleTemplate || ''}
          onChange={(e) => updateConfig('exampleTemplate', e.target.value)}
          placeholder='Dear God, {{mood_context}}...'
          rows={6}
          className='font-mono text-sm'
        />
      </div>

      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <label className='text-sm font-medium'>Show regenerate button</label>
          <Switch
            checked={config.showRegenerate !== false}
            onCheckedChange={(checked) =>
              updateConfig('showRegenerate', checked)
            }
          />
        </div>

        <div className='flex items-center justify-between'>
          <label className='text-sm font-medium'>Allow editing</label>
          <Switch
            checked={config.allowEdit || false}
            onCheckedChange={(checked) => updateConfig('allowEdit', checked)}
          />
        </div>
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Button Text</label>
        <Input
          value={config.buttonText || 'Amen'}
          onChange={(e) => updateConfig('buttonText', e.target.value)}
        />
      </div>
    </div>
  )
}

// Confirmation Editor
function ConfirmationEditor({ config, updateConfig }: any) {
  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>
          Success Message
        </label>
        <Input
          value={config.title || "You're all set!"}
          onChange={(e) => updateConfig('title', e.target.value)}
          className='text-lg'
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Subtitle</label>
        <Textarea
          value={config.subtitle || 'Your prayer journey begins now'}
          onChange={(e) => updateConfig('subtitle', e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>
          Success Icon/Emoji
        </label>
        <Input
          value={config.successEmoji || '✅'}
          onChange={(e) => updateConfig('successEmoji', e.target.value)}
          className='text-center text-2xl'
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>
          Next Steps (optional)
        </label>
        <Textarea
          value={config.nextSteps || ''}
          onChange={(e) => updateConfig('nextSteps', e.target.value)}
          placeholder='• Check your email for daily prayers\n• Set up notification preferences\n• Explore the prayer bank'
          rows={4}
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Button Text</label>
        <Input
          value={config.buttonText || 'Start Praying'}
          onChange={(e) => updateConfig('buttonText', e.target.value)}
        />
      </div>

      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium'>Auto-redirect to app</label>
        <Switch
          checked={config.autoRedirect || false}
          onCheckedChange={(checked) => updateConfig('autoRedirect', checked)}
        />
      </div>
    </div>
  )
}

// Options Editor (generic for other option-based screens)
function OptionsEditor({ config, updateConfig }: any) {
  const options = config.options || []

  const addOption = () => {
    updateConfig('options', [
      ...options,
      { text: 'New Option', value: `option_${Date.now()}` },
    ])
  }

  const updateOption = (index: number, field: string, value: string) => {
    const newOptions = [...options]
    if (typeof newOptions[index] === 'string') {
      newOptions[index] = { text: value, value }
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value }
    }
    updateConfig('options', newOptions)
  }

  const removeOption = (index: number) => {
    updateConfig(
      'options',
      options.filter((_: any, i: number) => i !== index)
    )
  }

  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Question</label>
        <Input
          value={config.title || ''}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder='What faith tradition resonates with you?'
          className='text-lg'
        />
      </div>

      <div>
        <div className='mb-4 flex items-center justify-between'>
          <label className='text-sm font-medium'>Options</label>
          <Button size='sm' variant='ghost' onClick={addOption}>
            <Plus className='mr-1 h-4 w-4' />
            Add
          </Button>
        </div>

        <div className='space-y-2'>
          {options.map((option: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className='group flex items-center gap-2'
            >
              <div className='relative flex-1'>
                <Input
                  value={
                    typeof option === 'string' ? option : option.text || ''
                  }
                  onChange={(e) => updateOption(index, 'text', e.target.value)}
                  placeholder='Option text'
                  className='pr-10'
                />
                <Button
                  size='icon'
                  variant='ghost'
                  onClick={() => removeOption(index)}
                  className='absolute top-1 right-1 h-8 w-8 opacity-0 transition group-hover:opacity-100'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {options.length === 0 && (
          <div className='text-muted-foreground py-8 text-center'>
            <p>No options yet</p>
            <Button
              size='sm'
              variant='outline'
              onClick={addOption}
              className='mt-2'
            >
              <Plus className='mr-1 h-4 w-4' />
              Add First Option
            </Button>
          </div>
        )}
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Button</label>
        <Input
          value={config.buttonText || ''}
          onChange={(e) => updateConfig('buttonText', e.target.value)}
          placeholder='Continue'
        />
      </div>
    </div>
  )
}

// Intentions Editor
function IntentionsEditor({ config, updateConfig }: any) {
  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Title</label>
        <Input
          value={config.title || ''}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder="What's on your heart?"
          className='text-lg'
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Subtitle</label>
        <Input
          value={config.subtitle || ''}
          onChange={(e) => updateConfig('subtitle', e.target.value)}
          placeholder='Share what you want to pray about'
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>
          Placeholder Text
        </label>
        <Input
          value={config.placeholder || ''}
          onChange={(e) => updateConfig('placeholder', e.target.value)}
          placeholder='Type your prayer intention...'
        />
      </div>

      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium'>Allow multiple intentions</label>
        <Switch
          checked={config.allowMultiple || false}
          onCheckedChange={(checked) => updateConfig('allowMultiple', checked)}
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Button</label>
        <Input
          value={config.buttonText || ''}
          onChange={(e) => updateConfig('buttonText', e.target.value)}
          placeholder='Add Intention'
        />
      </div>
    </div>
  )
}

// Generic Editor for other screens
function GenericEditor({ config, updateConfig }: any) {
  return (
    <div className='space-y-6 p-6'>
      <div>
        <label className='mb-2 block text-sm font-medium'>Title</label>
        <Input
          value={config.title || ''}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder='Screen title'
          className='text-lg'
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium'>Subtitle</label>
        <Textarea
          value={config.subtitle || ''}
          onChange={(e) => updateConfig('subtitle', e.target.value)}
          placeholder='Screen subtitle'
          className='resize-none'
          rows={2}
        />
      </div>

      {config.body !== undefined && (
        <div>
          <label className='mb-2 block text-sm font-medium'>Body Text</label>
          <Textarea
            value={config.body || ''}
            onChange={(e) => updateConfig('body', e.target.value)}
            placeholder='Additional content'
            className='resize-none'
            rows={4}
          />
        </div>
      )}

      <div>
        <label className='mb-2 block text-sm font-medium'>Button</label>
        <Input
          value={config.buttonText || ''}
          onChange={(e) => updateConfig('buttonText', e.target.value)}
          placeholder='Continue'
        />
      </div>
    </div>
  )
}
