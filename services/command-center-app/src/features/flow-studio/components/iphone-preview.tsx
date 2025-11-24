import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ScreenPreviewRenderer } from '../preview/screen-preview-renderer'

interface IPhonePreviewProps {
  step: any
  className?: string
  allSteps?: any[]
  onNavigate?: (stepId: string) => void
}

export function IPhonePreview({
  step,
  className,
  allSteps,
  onNavigate,
}: IPhonePreviewProps) {
  return (
    <div className={cn('relative flex h-full items-center', className)}>
      {/* Full size container - fills height */}
      <div
        className='relative h-full overflow-hidden rounded-[2.5rem] bg-gray-200 shadow-2xl dark:bg-gray-900'
        style={{
          width: 'auto',
          aspectRatio: '9/19.5',
        }}
      >
        {/* Simple status bar */}
        <div className='absolute top-0 right-0 left-0 z-10 flex h-12 items-end justify-between bg-black/20 px-8 pb-2 text-sm font-medium text-black backdrop-blur-sm dark:bg-black/40 dark:text-white'>
          <span>9:41</span>
          <div className='flex items-center gap-2'>
            <div className='flex gap-0.5'>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className='w-1 rounded-full bg-black dark:bg-white'
                  style={{ height: `${8 + i * 2}px` }}
                />
              ))}
            </div>
            <svg
              className='h-4 w-4 fill-black dark:fill-white'
              viewBox='0 0 24 24'
            >
              <path d='M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z' />
            </svg>
            <div className='h-3 w-6 rounded-sm border border-black dark:border-white'>
              <div className='h-full w-4 rounded-sm bg-black dark:bg-white' />
            </div>
          </div>
        </div>

        {/* Screen Content with enforced safe area */}
        <div className='absolute inset-0 pt-12 pb-8'>
          <div className='relative h-full w-full overflow-hidden'>
            {step && (
              <ScreenPreviewRenderer
                screenType={step.type}
                config={step.config}
                onButtonClick={() => {
                  // If there's a navigation callback and we have next steps
                  if (onNavigate && allSteps) {
                    const currentIndex = allSteps.findIndex(
                      (s) => s.id === step.id
                    )
                    if (currentIndex < allSteps.length - 1) {
                      onNavigate(allSteps[currentIndex + 1].id)
                    }
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Home indicator */}
        <div className='absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-black/20 dark:bg-white/20' />
      </div>
    </div>
  )
}
