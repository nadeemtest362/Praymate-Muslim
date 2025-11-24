import { useState } from 'react'
import {
  Smartphone,
  Monitor,
  Tablet,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  RotateCw,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FlowPreviewProps {
  flow: any
  isOpen: boolean
  onClose: () => void
}

export function FlowPreview({ flow, isOpen, onClose }: FlowPreviewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>(
    'mobile'
  )
  const [isPlaying, setIsPlaying] = useState(false)

  const currentStep = flow.steps?.[currentStepIndex]

  const handleNext = () => {
    if (currentStepIndex < flow.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleAutoPlay = () => {
    setIsPlaying(true)
    let index = 0
    const interval = setInterval(() => {
      if (index < flow.steps.length - 1) {
        index++
        setCurrentStepIndex(index)
      } else {
        clearInterval(interval)
        setIsPlaying(false)
        setCurrentStepIndex(0)
      }
    }, 2000)
  }

  const deviceSizes = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-[1024px]',
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='h-[90vh] max-w-6xl'>
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <DialogTitle>{flow.name} - Preview</DialogTitle>
            <div className='flex items-center gap-2'>
              <Select value={device} onValueChange={(v: any) => setDevice(v)}>
                <SelectTrigger className='w-[140px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='mobile'>
                    <div className='flex items-center gap-2'>
                      <Smartphone className='h-4 w-4' />
                      Mobile
                    </div>
                  </SelectItem>
                  <SelectItem value='tablet'>
                    <div className='flex items-center gap-2'>
                      <Tablet className='h-4 w-4' />
                      Tablet
                    </div>
                  </SelectItem>
                  <SelectItem value='desktop'>
                    <div className='flex items-center gap-2'>
                      <Monitor className='h-4 w-4' />
                      Desktop
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant='outline'
                size='sm'
                onClick={handleAutoPlay}
                disabled={isPlaying}
              >
                {isPlaying ? (
                  <>
                    <RotateCw className='mr-2 h-4 w-4 animate-spin' />
                    Playing...
                  </>
                ) : (
                  <>
                    <Play className='mr-2 h-4 w-4' />
                    Auto Play
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='flex h-full flex-col'>
          {/* Progress Bar */}
          <div className='flex items-center gap-2 border-b p-4'>
            {flow.steps?.map((step: any, index: number) => (
              <div
                key={step.id}
                className={cn(
                  'h-2 flex-1 cursor-pointer rounded-full transition-all',
                  index <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                )}
                onClick={() => setCurrentStepIndex(index)}
              />
            ))}
          </div>

          {/* Device Frame */}
          <div className='bg-muted/20 flex flex-1 items-center justify-center p-8'>
            <div
              className={cn(
                'bg-background rounded-lg border shadow-2xl transition-all duration-300',
                deviceSizes[device]
              )}
            >
              {/* Device Status Bar */}
              <div className='bg-foreground/5 text-muted-foreground flex h-6 items-center justify-between border-b px-4 text-xs'>
                <span>9:41 AM</span>
                <div className='flex items-center gap-1'>
                  <div className='h-3 w-4 rounded-sm border' />
                  <div className='h-3 w-4 rounded-sm border' />
                  <div className='bg-foreground/50 h-3 w-5 rounded-sm' />
                </div>
              </div>

              {/* Screen Content */}
              <div className='min-h-[500px] p-6'>
                {currentStep && <MockScreen step={currentStep} />}
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className='border-t p-4'>
            <div className='flex items-center justify-between'>
              <Button
                variant='outline'
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className='mr-2 h-4 w-4' />
                Previous
              </Button>

              <div className='text-center'>
                <p className='text-sm font-medium'>{currentStep?.name}</p>
                <p className='text-muted-foreground text-xs'>
                  Step {currentStepIndex + 1} of {flow.steps?.length || 0}
                </p>
              </div>

              <Button
                onClick={handleNext}
                disabled={currentStepIndex === flow.steps?.length - 1}
              >
                Next
                <ChevronRight className='ml-2 h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Mock screen component to render different screen types
function MockScreen({ step }: { step: any }) {
  switch (step.screenType) {
    case 'welcome':
      return (
        <div className='space-y-6 text-center'>
          <div className='bg-primary/20 mx-auto flex h-20 w-20 items-center justify-center rounded-full'>
            <span className='text-3xl'>🙏</span>
          </div>
          <div>
            <h2 className='mb-2 text-2xl font-bold'>
              {step.config?.title || 'Welcome'}
            </h2>
            <p className='text-muted-foreground'>
              {step.config?.subtitle || 'Your journey begins here'}
            </p>
          </div>
          <Button className='w-full' size='lg'>
            {step.config?.buttonText || 'Get Started'}
          </Button>
        </div>
      )

    case 'mood':
      return (
        <div className='space-y-6'>
          <div>
            <h2 className='mb-2 text-xl font-bold'>
              {step.config?.title || 'How are you feeling?'}
            </h2>
            <p className='text-muted-foreground text-sm'>
              Select the mood that best describes you
            </p>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            {['😊 Grateful', '😔 Anxious', '😌 Peaceful', '🙏 Hopeful'].map(
              (mood) => (
                <Button
                  key={mood}
                  variant='outline'
                  className='h-20 flex-col gap-2'
                >
                  <span className='text-2xl'>{mood.split(' ')[0]}</span>
                  <span className='text-sm'>{mood.split(' ')[1]}</span>
                </Button>
              )
            )}
          </div>
        </div>
      )

    case 'input':
      return (
        <div className='space-y-6'>
          <div>
            <h2 className='mb-2 text-xl font-bold'>
              {step.config?.label || 'Tell us about yourself'}
            </h2>
          </div>
          <div className='space-y-4'>
            <div className='rounded-lg border p-3'>
              <input
                type='text'
                placeholder={step.config?.placeholder || 'Type here...'}
                className='w-full bg-transparent outline-none'
              />
            </div>
            <Button className='w-full'>Continue</Button>
          </div>
        </div>
      )

    case 'selection':
      return (
        <div className='space-y-6'>
          <div>
            <h2 className='mb-2 text-xl font-bold'>
              {step.config?.title || 'Make a selection'}
            </h2>
          </div>
          <div className='space-y-3'>
            {['Option 1', 'Option 2', 'Option 3'].map((option) => (
              <div
                key={option}
                className='hover:bg-accent cursor-pointer rounded-lg border p-4'
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return (
        <div className='py-12 text-center'>
          <p className='text-muted-foreground'>
            Preview not available for this screen type
          </p>
        </div>
      )
  }
}
