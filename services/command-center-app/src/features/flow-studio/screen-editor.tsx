import { useState } from 'react'
import { X, Plus, Trash2, GripVertical, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { ScreenTemplate } from './screens'

interface ScreenEditorProps {
  screen: {
    id: string
    type: string
    config: any
  }
  template: ScreenTemplate
  onUpdate: (config: any) => void
  onRemove: () => void
  onClose: () => void
}

export function ScreenEditor({
  screen,
  template,
  onUpdate,
  onRemove,
  onClose,
}: ScreenEditorProps) {
  const [config, setConfig] = useState(screen.config)
  const [hasChanges, setHasChanges] = useState(false)

  // Handle case where template is not found
  if (!template) {
    return (
      <Card>
        <CardContent className='p-6'>
          <p className='text-muted-foreground'>Screen template not found</p>
        </CardContent>
      </Card>
    )
  }

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    setHasChanges(true)
  }

  const handleSave = () => {
    onUpdate(config)
    setHasChanges(false)
  }

  // Options management
  const addOption = () => {
    const newOptions = [
      ...(config.options || []),
      {
        id: `option_${Date.now()}`,
        text: 'New Option',
        value: `option_${Date.now()}`,
      },
    ]
    updateConfig('options', newOptions)
  }

  const updateOption = (index: number, key: string, value: any) => {
    const newOptions = [...(config.options || [])]
    if (typeof newOptions[index] === 'string') {
      // Convert string to object format
      newOptions[index] = { text: value, value: value }
    } else {
      newOptions[index] = { ...newOptions[index], [key]: value }
    }
    updateConfig('options', newOptions)
  }

  const removeOption = (index: number) => {
    const newOptions = config.options.filter((_: any, i: number) => i !== index)
    updateConfig('options', newOptions)
  }

  // Fields management
  const addField = () => {
    const newFields = [
      ...(config.fields || []),
      {
        id: `field_${Date.now()}`,
        type: 'text',
        label: 'New Field',
        placeholder: '',
        required: false,
      },
    ]
    updateConfig('fields', newFields)
  }

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...(config.fields || [])]
    newFields[index] = { ...newFields[index], [key]: value }
    updateConfig('fields', newFields)
  }

  const removeField = (index: number) => {
    const newFields = config.fields.filter((_: any, i: number) => i !== index)
    updateConfig('fields', newFields)
  }

  return (
    <Card className='flex max-h-[90vh] w-full flex-col overflow-hidden'>
      <CardHeader className='flex shrink-0 flex-row items-center justify-between'>
        <div>
          <CardTitle className='flex items-center gap-2'>
            <span className='text-2xl'>{template.emoji}</span>
            {template.name}
          </CardTitle>
          <CardDescription>Configure this {screen.type} screen</CardDescription>
        </div>
        <div className='flex items-center gap-2'>
          {hasChanges && (
            <Button size='sm' onClick={handleSave} className='gap-2'>
              <Save className='h-4 w-4' />
              Save Changes
            </Button>
          )}
          <Button
            variant='ghost'
            size='icon'
            onClick={onClose}
            className='hover:bg-muted'
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      </CardHeader>

      <CardContent className='flex-1 overflow-y-auto'>
        <Tabs defaultValue='content' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='content'>Content</TabsTrigger>
            <TabsTrigger value='settings'>Settings</TabsTrigger>
          </TabsList>

          <TabsContent value='content' className='mt-4 space-y-4'>
            {/* Basic Fields */}
            <div className='space-y-4'>
              <div>
                <Label htmlFor='title'>Title</Label>
                <Input
                  id='title'
                  value={config.title || ''}
                  onChange={(e) => updateConfig('title', e.target.value)}
                  placeholder='Enter screen title'
                />
              </div>

              <div>
                <Label htmlFor='subtitle'>Subtitle</Label>
                <Input
                  id='subtitle'
                  value={config.subtitle || ''}
                  onChange={(e) => updateConfig('subtitle', e.target.value)}
                  placeholder='Enter subtitle (optional)'
                />
              </div>

              {template.defaultConfig.body !== undefined && (
                <div>
                  <Label htmlFor='body'>Body Text</Label>
                  <Textarea
                    id='body'
                    value={config.body || ''}
                    onChange={(e) => updateConfig('body', e.target.value)}
                    placeholder='Enter body text'
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Options for option-based screens */}
            {(screen.type === 'faith-tradition' ||
              screen.type === 'prayer-frequency' ||
              config.options) && (
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label>Options</Label>
                  <Button variant='outline' size='sm' onClick={addOption}>
                    <Plus className='mr-1 h-4 w-4' />
                    Add Option
                  </Button>
                </div>

                <div className='space-y-2'>
                  {(config.options || []).map((option: any, index: number) => (
                    <Card key={index} className='p-3'>
                      <div className='flex items-start gap-2'>
                        <GripVertical className='text-muted-foreground mt-2 h-5 w-5 cursor-move' />
                        <div className='flex-1 space-y-2'>
                          <Input
                            value={
                              typeof option === 'string'
                                ? option
                                : option.text || option.label || ''
                            }
                            onChange={(e) =>
                              updateOption(index, 'text', e.target.value)
                            }
                            placeholder='Option text'
                          />
                          {typeof option === 'object' && (
                            <Input
                              value={option.value || ''}
                              onChange={(e) =>
                                updateOption(index, 'value', e.target.value)
                              }
                              placeholder='Option value (optional)'
                              className='text-sm'
                            />
                          )}
                        </div>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => removeOption(index)}
                          className='h-8 w-8'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {(!config.options || config.options.length === 0) && (
                  <div className='text-muted-foreground py-8 text-center'>
                    No options yet. Click "Add Option" to create one.
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            {config.layout === 'form' && (
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label>Form Fields</Label>
                  <Button variant='outline' size='sm' onClick={addField}>
                    <Plus className='mr-1 h-4 w-4' />
                    Add Field
                  </Button>
                </div>
                {config.fields?.map((field: any, index: number) => (
                  <Card key={field.id} className='p-3'>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <Label>Field {index + 1}</Label>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => removeField(index)}
                          className='h-6 w-6'
                        >
                          <X className='h-3 w-3' />
                        </Button>
                      </div>
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          updateField(index, 'label', e.target.value)
                        }
                        placeholder='Field label'
                      />
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) =>
                          updateField(index, 'placeholder', e.target.value)
                        }
                        placeholder='Placeholder text'
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value) =>
                          updateField(index, 'type', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='text'>Text</SelectItem>
                          <SelectItem value='textarea'>Textarea</SelectItem>
                          <SelectItem value='email'>Email</SelectItem>
                          <SelectItem value='number'>Number</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className='flex items-center space-x-2'>
                        <Switch
                          id={`field-${field.id}-required`}
                          checked={field.required}
                          onCheckedChange={(checked) =>
                            updateField(index, 'required', checked)
                          }
                        />
                        <Label htmlFor={`field-${field.id}-required`}>
                          Required
                        </Label>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Button Text */}
            <div>
              <Label htmlFor='button'>Button Text</Label>
              <Input
                id='button'
                value={config.buttonText || ''}
                onChange={(e) => updateConfig('buttonText', e.target.value)}
                placeholder='Enter button text'
              />
            </div>
          </TabsContent>

          <TabsContent value='settings' className='mt-4 space-y-4'>
            <div>
              <Label htmlFor='layout'>Layout Style</Label>
              <Select
                value={config.layout || template.defaultConfig.layout}
                onValueChange={(value) => updateConfig('layout', value)}
              >
                <SelectTrigger id='layout'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='centered-icon'>
                    Centered with Icon
                  </SelectItem>
                  <SelectItem value='mood-selector'>Mood Selector</SelectItem>
                  <SelectItem value='form'>Form Layout</SelectItem>
                  <SelectItem value='people-selector'>
                    People Selector
                  </SelectItem>
                  <SelectItem value='options'>Options List</SelectItem>
                  <SelectItem value='frequency-selector'>
                    Frequency Selector
                  </SelectItem>
                  <SelectItem value='prayer-display'>Prayer Display</SelectItem>
                  <SelectItem value='success'>Success Screen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Screen-specific settings */}
            {screen.type === 'people-selector' && (
              <div className='flex items-center space-x-2'>
                <Switch
                  id='allowAddNew'
                  checked={config.allowAddNew || false}
                  onCheckedChange={(checked) =>
                    updateConfig('allowAddNew', checked)
                  }
                />
                <Label htmlFor='allowAddNew'>Allow adding new people</Label>
              </div>
            )}

            <div className='border-t pt-4'>
              <Button
                variant='destructive'
                onClick={onRemove}
                className='w-full'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete This Step
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
