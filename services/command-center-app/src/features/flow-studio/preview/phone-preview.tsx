import React from 'react'
import { motion } from 'framer-motion'
import { Battery, Wifi, Signal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScreenPreviewRenderer } from './screen-preview-renderer'

interface PhonePreviewProps {
  children: React.ReactNode
  className?: string
  showStatusBar?: boolean
}

export function PhonePreview({
  children,
  className,
  showStatusBar = true,
}: PhonePreviewProps) {
  return (
    <div
      className={cn('relative mx-auto', className)}
      style={{ width: '375px' }}
    >
      {/* Phone Frame */}
      <div className='absolute inset-0 rounded-[3rem] bg-gradient-to-b from-gray-800 to-gray-900 shadow-2xl' />

      {/* Screen */}
      <div
        className='relative overflow-hidden rounded-[2.5rem] bg-white shadow-inner dark:bg-gray-950'
        style={{ margin: '12px' }}
      >
        {/* Status Bar */}
        {showStatusBar && (
          <div className='flex h-6 items-center justify-between bg-black px-6 text-xs text-white'>
            <span>9:41</span>
            <div className='flex items-center gap-1'>
              <Signal className='h-3 w-3' />
              <Wifi className='h-3 w-3' />
              <Battery className='h-3 w-3' />
            </div>
          </div>
        )}

        {/* Screen Content */}
        <div className='h-[600px] overflow-hidden bg-white dark:bg-gray-900'>
          {children}
        </div>

        {/* Home Indicator */}
        <div className='flex h-8 items-end justify-center bg-white pb-2 dark:bg-gray-900'>
          <div className='h-1 w-32 rounded-full bg-black opacity-30 dark:bg-white' />
        </div>
      </div>
    </div>
  )
}

// Static preview components for each screen type
export function WelcomeScreenPreview({ config }: { config: any }) {
  return (
    <div className='flex h-full flex-col'>
      {/* Logo Screen */}
      <div className='flex flex-1 items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 text-6xl'>
            {config.logoScreen?.logoEmoji || '🙏'}
          </div>
          <h1 className='text-3xl font-bold'>
            <span className='text-primary'>
              {config.logoScreen?.logoText || 'personal'}
            </span>
            <span className='ml-2'>
              {config.logoScreen?.logoAccent || 'prayers'}
            </span>
          </h1>
        </div>
      </div>

      {/* Question Screen */}
      <div className='p-6 pb-8'>
        <h2 className='mb-2 text-xl font-semibold'>
          {config.questionScreen?.greeting || 'welcome to personal prayers'}
        </h2>
        <p className='text-muted-foreground mb-6 text-lg'>
          {config.questionScreen?.question || 'what brings you here today?'}
        </p>

        <div className='space-y-2'>
          {(config.questionScreen?.options || [])
            .slice(0, 3)
            .map((option: any, index: number) => (
              <div
                key={option.id || index}
                className='hover:bg-accent flex items-center gap-3 rounded-xl border p-4 transition-colors'
              >
                <span className='text-2xl'>{option.emoji}</span>
                <span className='flex-1 text-sm'>{option.text}</span>
              </div>
            ))}
          {config.questionScreen?.options?.length > 3 && (
            <p className='text-muted-foreground pt-2 text-center text-xs'>
              +{config.questionScreen.options.length - 3} more options
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function MoodSelectionScreenPreview({ config }: { config: any }) {
  return (
    <div className='flex h-full flex-col p-6'>
      <div className='flex-1'>
        <h1 className='mb-2 text-2xl font-bold'>
          {config.title || 'how are you feeling?'}
        </h1>
        <p className='text-muted-foreground mb-8'>
          {config.subtitle || 'Share your current mood'}
        </p>

        <div className='grid grid-cols-2 gap-4'>
          {(config.moodOptions || []).map((mood: any, index: number) => (
            <motion.div
              key={mood.id || index}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className='from-primary/10 to-primary/5 cursor-pointer rounded-2xl bg-gradient-to-br p-6 text-center transition-transform hover:scale-105'
            >
              <div className='mb-2 text-4xl'>{mood.emoji}</div>
              <p className='text-sm font-medium'>{mood.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CommitmentQuestionScreenPreview({ config }: { config: any }) {
  return (
    <div className='flex h-full flex-col p-6'>
      <div className='flex-1'>
        <h1 className='mb-8 text-center text-2xl font-bold'>
          {config.title || config.question || 'how committed are you?'}
        </h1>

        <div className='space-y-3'>
          {(config.options || []).map((option: any, index: number) => (
            <motion.div
              key={option.id || index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className='from-primary/10 hover:from-primary/20 cursor-pointer rounded-xl bg-gradient-to-r to-transparent p-4 transition-colors'
            >
              <p className='font-medium'>{option.text || option.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <button className='bg-primary text-primary-foreground w-full rounded-full py-4 font-semibold'>
        Continue
      </button>
    </div>
  )
}

export function FaithTraditionScreenPreview({ config }: { config: any }) {
  return (
    <div className='flex h-full flex-col p-6'>
      <div className='flex-1'>
        <h1 className='mb-2 text-2xl font-bold'>
          {config.title || 'What faith tradition resonates with you?'}
        </h1>
        <p className='text-muted-foreground mb-8'>
          {config.subtitle || 'This helps us personalize your prayers'}
        </p>

        <div className='space-y-2'>
          {(config.options || []).map((option: any, index: number) => (
            <div
              key={option.id || index}
              className='hover:bg-accent flex items-center gap-3 rounded-xl border p-4 transition-colors'
            >
              {option.emoji && <span className='text-xl'>{option.emoji}</span>}
              <span className='font-medium'>{option.label || option.text}</span>
            </div>
          ))}
        </div>
      </div>

      <button className='bg-primary text-primary-foreground w-full rounded-full py-4 font-semibold'>
        {config.buttonText || 'Continue'}
      </button>
    </div>
  )
}

export function GenericScreenPreview({
  config,
  type,
}: {
  config: any
  type: string
}) {
  return (
    <div className='flex h-full flex-col p-6'>
      <div className='flex-1'>
        <h1 className='mb-2 text-2xl font-bold'>{config.title || type}</h1>
        {config.subtitle && (
          <p className='text-muted-foreground mb-8'>{config.subtitle}</p>
        )}

        {config.body && (
          <p className='mb-6 text-sm leading-relaxed'>{config.body}</p>
        )}

        {config.options && (
          <div className='space-y-2'>
            {config.options.map((option: any, index: number) => (
              <div
                key={index}
                className='hover:bg-accent rounded-lg border p-3 transition-colors'
              >
                {option.label || option.text || option}
              </div>
            ))}
          </div>
        )}
      </div>

      {config.buttonText && (
        <button className='bg-primary text-primary-foreground w-full rounded-full py-4 font-semibold'>
          {config.buttonText}
        </button>
      )}
    </div>
  )
}

// Main preview component that renders the actual SDUI components
export function ScreenPreviewComponent({
  step,
  allSteps,
  onNavigate,
}: {
  step: any
  allSteps?: any[]
  onNavigate?: (stepId: string) => void
}) {
  // Ensure config has proper metadata
  const config = {
    ...step.config,
    metadata: {
      ...step.config?.metadata,
      screen_type: step.type,
    },
  }

  // Find the next step in the flow
  const currentStepIndex = allSteps?.findIndex((s) => s.id === step.id) ?? -1
  const nextStep =
    allSteps && currentStepIndex >= 0 && currentStepIndex < allSteps.length - 1
      ? allSteps[currentStepIndex + 1]
      : null

  return (
    <ScreenPreviewRenderer
      screenType={step.type}
      config={config}
      className='h-full'
      onButtonClick={() => {
        if (nextStep && onNavigate) {
          onNavigate(nextStep.id)
        }
      }}
    />
  )
}
