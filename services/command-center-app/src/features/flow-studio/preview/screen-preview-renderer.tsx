import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { screenStyles, animationKeyframes } from './screen-styles'

// Inject animation keyframes
if (
  typeof document !== 'undefined' &&
  !document.getElementById('preview-animations')
) {
  const style = document.createElement('style')
  style.id = 'preview-animations'
  style.textContent = animationKeyframes
  document.head.appendChild(style)
}

// Map screen IDs to screen type names
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
  consent: 'ConsentScreen',
  'validation-message': 'ValidationMessageScreen',
  interstitial: 'InterstitialScreen',
  'relationship-with-god': 'RelationshipWithGodScreen',
  confirmation: 'ConfirmationScreen',
  'intention-added-confirmation': 'IntentionAddedConfirmationScreen',
}

// Mock components using actual extracted styles
function getMockComponent(screenType: string) {
  // First check if screenType is a screen ID and map it to the actual type
  const actualScreenType = screenIdToTypeMap[screenType] || screenType

  const mockComponents: Record<
    string,
    React.ComponentType<{ config: any; onButtonClick?: () => void }>
  > = {
    WelcomeScreen: ({ config, onButtonClick }: any) => (
      <div
        className='flex h-full w-full flex-col overflow-hidden'
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
        }}
      >
        {/* Logo Screen */}
        <div
          className='relative flex flex-1 items-center justify-center'
          style={{
            background:
              'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%)',
          }}
        >
          <div className='text-center' style={{ padding: '0 24px' }}>
            <motion.div
              className='mb-6'
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
              style={{ fontSize: '72px', lineHeight: 1 }}
            >
              {config?.logoScreen?.logoEmoji || '🙏'}
            </motion.div>
            <motion.h1
              className='font-light text-white'
              style={{
                fontSize: '28px',
                fontWeight: '300',
                letterSpacing: '-0.5px',
                lineHeight: '32px',
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <span className='text-white'>
                {config?.logoScreen?.logoText || 'personal'}
              </span>
              <br />
              <span
                style={{
                  background:
                    'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {config?.logoScreen?.logoAccent || 'prayers'}
              </span>
            </motion.h1>
          </div>
        </div>

        {/* Question Screen */}
        <motion.div
          className='relative bg-white text-black'
          style={{
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '24px 24px 32px',
          }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.8, type: 'spring' }}
        >
          {/* Handle */}
          <div
            className='absolute top-3 left-1/2 -translate-x-1/2 transform rounded-full bg-gray-300'
            style={{ width: '32px', height: '4px' }}
          />

          <h2
            className='mb-3 font-medium text-black'
            style={{
              fontSize: '20px',
              fontWeight: '600',
              lineHeight: '24px',
              letterSpacing: '-0.2px',
            }}
          >
            {config?.questionScreen?.greeting || 'welcome to personal prayers'}
          </h2>
          <p
            className='mb-6 text-gray-600'
            style={{
              fontSize: '16px',
              fontWeight: '400',
              lineHeight: '20px',
            }}
          >
            {config?.questionScreen?.question || 'what brings you here today?'}
          </p>

          <div className='space-y-3'>
            {(
              config?.questionScreen?.options || [
                { emoji: '😌', text: 'I want to develop a prayer habit' },
                { emoji: '🤝', text: 'I need spiritual support' },
                { emoji: '💪', text: 'I want to strengthen my faith' },
              ]
            )
              .slice(0, 3)
              .map((option: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + index * 0.1, duration: 0.5 }}
                  className='cursor-pointer transition-all duration-200 active:scale-95'
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '20px', lineHeight: 1 }}>
                    {option.emoji}
                  </span>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#1a1a1a',
                      lineHeight: '18px',
                    }}
                  >
                    {option.text}
                  </span>
                </motion.div>
              ))}
          </div>
        </motion.div>
      </div>
    ),

    MoodSelectionScreen: ({ config, onButtonClick }: any) => (
      <div
        className='flex h-full w-full flex-col overflow-hidden'
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ padding: '32px 24px 24px', textAlign: 'center' }}>
          <motion.h1
            className='mb-3 font-bold text-white'
            style={{
              fontSize: '24px',
              fontWeight: '700',
              letterSpacing: '-0.3px',
              lineHeight: '28px',
            }}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {config?.title || 'how are you feeling?'}
          </motion.h1>
          <motion.p
            className='text-white/90'
            style={{
              fontSize: '16px',
              fontWeight: '400',
              lineHeight: '20px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {config?.subtitle || "let's start with what's on your heart"}
          </motion.p>
        </div>

        {/* Mood Grid */}
        <div className='flex-1' style={{ padding: '0 24px' }}>
          <div className='mx-auto grid max-w-xs grid-cols-2 gap-4'>
            {(
              config?.moodOptions || [
                { emoji: '😊', label: 'grateful' },
                { emoji: '😔', label: 'struggling' },
                { emoji: '😰', label: 'anxious' },
                { emoji: '🙏', label: 'hopeful' },
              ]
            ).map((mood: any, index: number) => (
              <motion.div
                key={mood.id || index}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{
                  delay: 0.4 + index * 0.1,
                  duration: 0.5,
                  type: 'spring',
                }}
                className='cursor-pointer'
              >
                <div
                  className='text-center transition-all duration-200 active:scale-95'
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '20px 16px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '36px',
                      lineHeight: 1,
                      marginBottom: '10px',
                    }}
                  >
                    {mood.emoji}
                  </div>
                  <p
                    className='font-medium text-white'
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      lineHeight: '16px',
                    }}
                  >
                    {mood.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Button */}
        <div style={{ padding: '16px 24px 32px' }}>
          <motion.button
            className='w-full text-center font-semibold transition-all duration-200 active:scale-95'
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: '#1a1a1a',
              padding: '14px 24px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            onClick={onButtonClick}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {config?.buttonText || 'Continue'}
          </motion.button>
        </div>
      </div>
    ),

    FaithTraditionScreen: ({ config, onButtonClick }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1 overflow-auto'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.question ||
              config?.title ||
              'What faith tradition resonates with you?'}
          </h1>
          <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
            {config?.subtitle || 'This helps us personalize your prayers'}
          </p>

          <div className='space-y-3'>
            {(
              config?.options || [
                { emoji: '✝️', label: 'Christian' },
                { emoji: '⛪', label: 'Catholic' },
                { emoji: '✡️', label: 'Jewish' },
                { emoji: '☪️', label: 'Muslim' },
                { emoji: '🙏', label: 'Spiritual' },
              ]
            ).map((option: any, index: number) => (
              <motion.div
                key={option.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className='flex cursor-pointer items-center gap-3 p-4 transition-all'
                style={screenStyles.card}
              >
                {option.emoji && (
                  <span className='text-xl'>{option.emoji}</span>
                )}
                <span className='font-medium'>
                  {option.label || option.text}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          className='mt-4 w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
          onClick={onButtonClick}
        >
          {config?.buttonText || 'Continue'}
        </button>
      </div>
    ),

    PrayerExampleScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.gradients.prayerExample.angle}, ${screenStyles.gradients.prayerExample.colors.join(', ')})`,
        }}
      >
        <div className='flex flex-1 flex-col justify-center'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h1 style={screenStyles.text.title} className='mb-8 text-center'>
              {config?.title || 'Your Prayer'}
            </h1>

            <div
              className='mb-8 rounded-2xl p-6'
              style={{
                ...screenStyles.card,
                background: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <p className='text-lg leading-relaxed italic'>
                {config?.prayerText ||
                  'Dear God, I come to you with a grateful heart...'}
              </p>
            </div>

            <p style={screenStyles.text.subtitle} className='text-center'>
              {config?.subtitle || 'Read this prayer or speak from your heart'}
            </p>
          </motion.div>
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Amen'}
        </button>
      </div>
    ),

    FirstNameScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex flex-1 flex-col justify-center'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.title || "What's your first name?"}
          </h1>
          <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
            {config?.subtitle || 'We want to make this personal'}
          </p>

          <div className='mx-auto w-full max-w-sm'>
            <input
              type='text'
              placeholder={config?.placeholder || 'Enter your first name'}
              className='w-full rounded-2xl p-4 text-center text-lg'
              style={{
                ...screenStyles.card,
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Continue'}
        </button>
      </div>
    ),

    PrayerPeopleCollectionScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.title || 'Who would you like to pray for?'}
          </h1>
          <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
            {config?.subtitle || 'Add people you care about'}
          </p>

          <div className='mb-6 space-y-3'>
            <div
              className='flex cursor-pointer items-center justify-center rounded-2xl p-4'
              style={screenStyles.card}
            >
              <span className='mr-3 text-2xl'>➕</span>
              <span>Add someone</span>
            </div>
          </div>

          {config?.showSkipOption && (
            <p className='text-center text-sm opacity-70'>
              {config?.skipText || 'You can skip this for now'}
            </p>
          )}
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Continue'}
        </button>
      </div>
    ),

    LoadingSpinnerScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col items-center justify-center text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className='mb-6 h-16 w-16 rounded-full border-4 border-white/20 border-t-white'
        />
        <h2 style={screenStyles.text.title}>
          {config?.title || 'Creating your prayer...'}
        </h2>
        <p style={screenStyles.text.subtitle} className='mt-2'>
          {config?.subtitle || 'This will just take a moment'}
        </p>
      </div>
    ),

    PrayerGenerationLoadingScreen: ({ config }: any) => {
      const [currentStage, setCurrentStage] = useState(0)
      const [progress, setProgress] = useState(0)

      // Prayer building stages
      const stages = [
        {
          title: 'setting your spiritual foundation',
          subtitle: `building on your ${config?.mockData?.faithTradition || 'faith'} tradition`,
        },
        {
          title: 'creating your daily rhythm',
          subtitle: 'your personal prayer schedule is taking shape',
        },
        {
          title: 'connecting hearts through prayer',
          subtitle: 'weaving your loved ones into your spiritual practice',
        },
        {
          title: 'your growth journey',
          subtitle: 'personal transformation through consistent prayer',
        },
        {
          title: `your ${config?.mockData?.streakGoalDays || 30}-day commitment`,
          subtitle: 'building a habit that will transform your faith',
        },
        {
          title: 'your complete prayer experience',
          subtitle: 'everything is ready for your spiritual journey',
        },
      ]

      useEffect(() => {
        const timer = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              return 100
            }
            return prev + 2
          })

          // Change stage every ~17% progress
          const stageIndex = Math.floor((progress / 100) * stages.length)
          if (stageIndex !== currentStage && stageIndex < stages.length) {
            setCurrentStage(stageIndex)
          }
        }, 100)

        return () => clearInterval(timer)
      }, [progress, currentStage])

      const currentStageData = stages[currentStage]

      return (
        <div
          className='relative flex h-full flex-col overflow-hidden text-white'
          style={{
            background: config?.backgroundGradient
              ? `linear-gradient(135deg, ${config.backgroundGradient.join(', ')})`
              : `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
          }}
        >
          {/* Floating particles */}
          <div className='absolute inset-0'>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className='absolute h-1 w-1 rounded-full bg-white'
                initial={{ opacity: 0.1, scale: 0 }}
                animate={{
                  opacity: [0.1, 0.3, 0.1],
                  scale: [0.5, 1, 0.5],
                  y: [-20, -100, -20],
                  x: [0, Math.random() * 40 - 20, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
                style={{
                  left: `${20 + i * 12}%`,
                  bottom: '20%',
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className='relative z-10 flex flex-1 flex-col items-center justify-center px-8'>
            {/* Title */}
            <motion.h1
              className='mb-12 text-center text-2xl font-bold'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {config?.title || 'Almost ready, friend!'}
            </motion.h1>

            {/* Progress bar */}
            {config?.progressBar?.enabled !== false && (
              <div className='mb-8 w-full max-w-xs'>
                <div
                  className='h-2 overflow-hidden rounded-full'
                  style={{
                    backgroundColor:
                      config?.progressBar?.backgroundColor ||
                      'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <motion.div
                    className='h-full rounded-full'
                    style={{
                      backgroundColor: config?.progressBar?.color || '#FFD700',
                      width: `${progress}%`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Stage info */}
            <motion.div
              key={currentStage}
              className='text-center'
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <p className='mb-2 text-lg font-semibold'>
                {currentStageData.title}
              </p>
              <p className='text-sm opacity-80'>{currentStageData.subtitle}</p>
            </motion.div>

            {/* People avatars preview */}
            {currentStage === 2 && config?.mockData?.prayerFocusPeople && (
              <motion.div
                className='mt-6 flex -space-x-3'
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                {config.mockData.prayerFocusPeople
                  .slice(0, 4)
                  .map((person: any, idx: number) => (
                    <div
                      key={idx}
                      className='h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-purple-300'
                      style={{ zIndex: 4 - idx }}
                    >
                      {person.imageUri && (
                        <img
                          src={person.imageUri}
                          alt={person.name}
                          className='h-full w-full object-cover'
                        />
                      )}
                    </div>
                  ))}
                {config.mockData.prayerFocusPeople.length > 4 && (
                  <div className='flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-purple-400 text-xs font-semibold'>
                    +{config.mockData.prayerFocusPeople.length - 4}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )
    },

    GeneralQuestionScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.question || config?.title || 'Question'}
          </h1>
          {config?.subtitle && (
            <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
              {config.subtitle}
            </p>
          )}

          <div className='space-y-3'>
            {(config?.options || []).map((option: any, index: number) => (
              <motion.div
                key={option.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className='cursor-pointer rounded-2xl p-4'
                style={screenStyles.card}
              >
                <p className='text-center font-medium'>
                  {option.text || option.label || option}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Continue'}
        </button>
      </div>
    ),

    MoodContextScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex flex-1 flex-col justify-center'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.title || "Tell us more about how you're feeling"}
          </h1>
          <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
            {config?.subtitle || 'This helps us personalize your prayer'}
          </p>

          <div className='mx-auto w-full max-w-full'>
            <textarea
              placeholder={config?.placeholder || "What's on your heart?"}
              className='min-h-32 w-full resize-none rounded-2xl p-4 text-base'
              style={{
                ...screenStyles.card,
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Continue'}
        </button>
      </div>
    ),

    PrayerNeedsSelectionScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.title || 'What would you like to pray about?'}
          </h1>
          <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
            {config?.subtitle || 'Select all that apply'}
          </p>

          <div className='grid grid-cols-2 gap-3'>
            {(
              config?.options || [
                { emoji: '🙏', label: 'Gratitude' },
                { emoji: '💪', label: 'Strength' },
                { emoji: '🏥', label: 'Health' },
                { emoji: '💼', label: 'Work' },
                { emoji: '❤️', label: 'Relationships' },
                { emoji: '🎯', label: 'Guidance' },
              ]
            ).map((need: any, index: number) => (
              <motion.div
                key={need.id || index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className='cursor-pointer rounded-2xl p-4 text-center'
                style={screenStyles.card}
              >
                <div className='mb-2 text-3xl'>{need.emoji}</div>
                <p className='text-sm font-medium'>{need.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Continue'}
        </button>
      </div>
    ),

    AddIntentionScreen: ({ config }: any) => {
      const [selectedNeed, setSelectedNeed] = useState<string | null>(null)
      const [showDetails, setShowDetails] = useState(false)
      const [details, setDetails] = useState('')

      // Prayer topics mapping from actual constants
      const PRAYER_TOPICS_MAP: Record<
        string,
        { label: string; emoji: string }
      > = {
        healing: { label: 'healing', emoji: '❤️‍🩹' },
        wisdom: { label: 'wisdom', emoji: '🧠' },
        peace: { label: 'peace', emoji: '☮️' },
        strength: { label: 'strength', emoji: '💪' },
        guidance: { label: 'guidance', emoji: '🧭' },
        faith: { label: 'faith', emoji: '🙏' },
        financialHelp: { label: 'financial help', emoji: '💰' },
        forgiveness: { label: 'forgiveness', emoji: '🕊️' },
        gratitude: { label: 'gratitude', emoji: '🙌' },
        protection: { label: 'protection', emoji: '🛡️' },
        blessing: { label: 'blessing', emoji: '✨' },
        comfort: { label: 'comfort', emoji: '🤗' },
        joy: { label: 'joy', emoji: '🎉' },
        patience: { label: 'patience', emoji: '⏳' },
        love: { label: 'love', emoji: '💖' },
        other: { label: 'Other', emoji: '💬' },
      }

      // Get categories to display from config or use defaults
      const displayedCategoryIds = config?.intentionCollectionPhase
        ?.displayedCategoryIds || [
        'healing',
        'peace',
        'protection',
        'guidance',
        'wisdom',
        'strength',
      ]

      // Filter categories based on config
      const categories = displayedCategoryIds
        .filter((id: string) => PRAYER_TOPICS_MAP[id])
        .map((id: string) => ({
          id,
          label: PRAYER_TOPICS_MAP[id].label,
          emoji: PRAYER_TOPICS_MAP[id].emoji,
        }))

      const selectedCategory = categories.find((c) => c.id === selectedNeed)
      const isForSelf = config?.isForSelfIntention === true

      return (
        <div className='relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-[#1A1B4B] via-[#2D1B69] to-[#4A4E83] text-white'>
          {/* Floating particles effect */}
          <div className='absolute inset-0'>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className='animate-float absolute h-1 w-1 rounded-full bg-white opacity-20'
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${10 + Math.random() * 5}s`,
                }}
              />
            ))}
          </div>

          {/* Header */}
          <div className='relative z-10 px-6 pt-12 pb-6 text-center'>
            <h2 className='text-3xl font-extrabold'>
              {isForSelf
                ? config?.intentionCollectionPhase?.introTitle ||
                  'My Prayer Focus'
                : config?.intentionCollectionPhase?.introTitle?.replace(
                    '{personName}',
                    'John'
                  ) || 'Prayer for John'}
            </h2>
            {!isForSelf && <p className='mt-2 text-white/80'>(person 1/3)</p>}
          </div>

          {/* Mad-lib sentence */}
          <div className='relative z-10 mb-6 px-6'>
            <div className='flex flex-wrap items-center justify-center gap-2 text-lg'>
              {/* Person pill (only show if not self mode) */}
              {!isForSelf && (
                <div className='flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2'>
                  <div className='h-5 w-5 rounded-full bg-purple-300' />
                  <span className='font-semibold'>John</span>
                </div>
              )}

              <span className='font-medium'>
                {isForSelf
                  ? config?.intentionCollectionPhase?.intentionPrompt
                      ?.madlibConnectorNeeds || 'I want to focus on'
                  : config?.intentionCollectionPhase?.intentionPrompt
                      ?.madlibConnectorNeeds || 'needs'}
              </span>

              {/* Category pill */}
              <button
                onClick={() => setShowDetails(false)}
                className='rounded-full border border-white/25 bg-white/10 px-4 py-2 transition-colors hover:bg-white/20'
              >
                {selectedCategory ? (
                  <span className='flex items-center gap-2'>
                    <span>{selectedCategory.emoji}</span>
                    <span className='font-semibold'>
                      {selectedCategory.label}
                    </span>
                  </span>
                ) : (
                  <span className='italic opacity-70'>
                    {config?.intentionCollectionPhase?.intentionPrompt
                      ?.madlibPlaceholderWhat || 'what...'}
                  </span>
                )}
              </button>

              {selectedNeed && (
                <>
                  <span className='font-medium'>
                    {config?.intentionCollectionPhase?.intentionPrompt
                      ?.madlibConnectorFor || 'for'}
                  </span>
                  <button
                    onClick={() => setShowDetails(true)}
                    className='rounded-full border border-white/25 bg-white/10 px-4 py-2 transition-colors hover:bg-white/20'
                  >
                    {details ? (
                      <span className='font-semibold'>
                        {details.length > 20
                          ? details.substring(0, 20) + '...'
                          : details}
                      </span>
                    ) : (
                      <span className='italic opacity-70'>
                        {config?.intentionCollectionPhase?.intentionPrompt
                          ?.madlibPlaceholderDetails || 'details...'}
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className='relative z-10 flex-1 overflow-y-auto px-6'>
            {!showDetails ? (
              /* Category grid */
              <div className='grid grid-cols-3 gap-3 pb-4'>
                {categories.map((category) => (
                  <motion.button
                    key={category.id}
                    onClick={() => {
                      setSelectedNeed(category.id)
                      setShowDetails(true)
                    }}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`border-1.5 flex aspect-square flex-col items-center justify-center rounded-2xl p-3 transition-all duration-200 ${
                      selectedNeed === category.id
                        ? 'scale-105 border-purple-400 bg-purple-500/45 shadow-lg shadow-purple-500/30'
                        : 'border-white/30 bg-white/18 hover:bg-white/25'
                    } `}
                  >
                    <span className='mb-2 text-3xl'>{category.emoji}</span>
                    <span className='text-center text-xs leading-tight font-bold'>
                      {category.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : (
              /* Details input */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className='rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md'
              >
                <p className='mb-4 text-lg font-bold'>
                  Details about this {selectedCategory?.label} need:
                </p>
                <div className='rounded-2xl border border-white/20 bg-white/15 p-1'>
                  <textarea
                    className='w-full resize-none bg-transparent p-4 text-white placeholder-white/40 outline-none'
                    placeholder={
                      config?.intentionCollectionPhase?.intentionPrompt
                        ?.detailsInputPlaceholder ||
                      'Add specific details here...'
                    }
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>
                <p className='mt-2 text-right text-sm text-white/70'>
                  {200 - details.length}
                </p>
              </motion.div>
            )}
          </div>

          {/* Save button */}
          <div className='relative z-10 px-6 pt-4 pb-8'>
            <button
              className={`w-full rounded-full py-5 text-lg font-bold transition-all duration-200 ${
                selectedNeed && details.trim()
                  ? 'bg-white text-[#1A1B4B] shadow-lg'
                  : 'bg-white/70 text-[#1A1B4B]/70'
              } `}
              disabled={!selectedNeed || !details.trim()}
            >
              {isForSelf
                ? config?.intentionCollectionPhase?.finishButtonText ||
                  'Save & Continue'
                : config?.intentionCollectionPhase?.nextButtonText ||
                  'Next Person'}
            </button>
          </div>
        </div>
      )
    },

    PrayerFrequencyScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.title || 'How often would you like to pray?'}
          </h1>
          <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
            {config?.subtitle || "We'll send gentle reminders"}
          </p>

          <div className='space-y-3'>
            {(
              config?.options || [
                {
                  id: 'daily',
                  label: 'Daily',
                  description: 'Build a consistent habit',
                },
                {
                  id: 'weekly',
                  label: 'Few times a week',
                  description: 'Stay connected regularly',
                },
                {
                  id: 'occasionally',
                  label: 'Occasionally',
                  description: 'When you need it most',
                },
              ]
            ).map((option: any, index: number) => (
              <motion.div
                key={option.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className='cursor-pointer rounded-2xl p-4'
                style={screenStyles.card}
              >
                <p className='text-lg font-semibold'>{option.label}</p>
                {option.description && (
                  <p className='mt-1 text-sm opacity-80'>
                    {option.description}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Continue'}
        </button>
      </div>
    ),

    StreakGoalScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.title || 'Set your prayer streak goal'}
          </h1>
          <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
            {config?.subtitle || 'Start small and build momentum'}
          </p>

          <div className='space-y-3'>
            {(
              config?.options || [
                { days: 7, label: '7 days', emoji: '🌱' },
                { days: 21, label: '21 days', emoji: '🌿' },
                { days: 30, label: '30 days', emoji: '🌳' },
              ]
            ).map((option: any, index: number) => (
              <motion.div
                key={option.days || index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className='cursor-pointer rounded-2xl p-6 text-center'
                style={screenStyles.card}
              >
                <div className='mb-2 text-4xl'>{option.emoji}</div>
                <p className='text-2xl font-bold'>{option.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Set Goal'}
        </button>
      </div>
    ),

    CommitmentQuestionScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex flex-1 flex-col justify-center'>
          <h1 style={screenStyles.text.title} className='mb-8 text-center'>
            {config?.question ||
              config?.title ||
              'Are you ready to commit to your spiritual journey?'}
          </h1>

          <div className='space-y-3'>
            {(
              config?.options || [
                { id: 'yes', text: "Yes, I'm ready!", emoji: '✨' },
                { id: 'maybe', text: "I'll try my best", emoji: '🤔' },
                { id: 'unsure', text: "I'm not sure yet", emoji: '💭' },
              ]
            ).map((option: any, index: number) => (
              <motion.div
                key={option.id || index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className='flex cursor-pointer items-center justify-center gap-3 rounded-2xl p-5'
                style={screenStyles.card}
              >
                <span className='text-2xl'>{option.emoji}</span>
                <p className='text-lg font-semibold'>
                  {option.text || option.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    ),

    ConsentScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.title || 'Your privacy matters'}
          </h1>
          <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
            {config?.subtitle || 'We keep your prayers private and secure'}
          </p>

          <div
            className='mb-6 rounded-2xl p-6'
            style={{
              ...screenStyles.card,
              background: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className='space-y-4'>
              <div className='flex items-start gap-3'>
                <span className='text-xl text-green-400'>✓</span>
                <p className='text-sm'>
                  Your prayers are encrypted and private
                </p>
              </div>
              <div className='flex items-start gap-3'>
                <span className='text-xl text-green-400'>✓</span>
                <p className='text-sm'>
                  We never share your personal information
                </p>
              </div>
              <div className='flex items-start gap-3'>
                <span className='text-xl text-green-400'>✓</span>
                <p className='text-sm'>You can delete your data anytime</p>
              </div>
            </div>
          </div>

          <div className='mb-4 flex items-center gap-3'>
            <input type='checkbox' className='h-5 w-5' />
            <p className='text-sm opacity-80'>
              I agree to the Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Continue'}
        </button>
      </div>
    ),

    ValidationMessageScreen: ({ config, onButtonClick }: any) => (
      <div
        className='relative flex h-full flex-col overflow-hidden'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
        }}
      >
        {/* Overlay gradient for depth */}
        <div
          className='absolute inset-0'
          style={{
            background:
              'linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, transparent 50%, rgba(30, 144, 255, 0.1) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Floating particles effect */}
        <div
          className='absolute inset-0 overflow-hidden'
          style={{ pointerEvents: 'none' }}
        >
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className='absolute h-1 w-1 rounded-full bg-white/30'
              style={{
                left: `${20 + i * 20}%`,
                bottom: -10,
              }}
              animate={{
                y: [-10, -400],
                x: [0, i % 2 === 0 ? 20 : -20, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 8 + i * 2,
                repeat: Infinity,
                delay: i * 1.5,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Illustration if provided */}
        {config?.illustration && (
          <motion.div
            className='absolute flex items-center justify-center'
            style={{
              top:
                config.illustration.position === 'top'
                  ? '10%'
                  : config.illustration.position === 'bottom'
                    ? 'auto'
                    : '15%',
              bottom:
                config.illustration.position === 'bottom' ? '40%' : 'auto',
              left: 0,
              right: 0,
              zIndex: 1,
              height: '180px',
            }}
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{
              scale: 1,
              rotate: 0,
              opacity: 1,
              y: config.illustration.animation === 'float' ? [0, -10, 0] : 0,
            }}
            transition={{
              scale: { type: 'spring', duration: 0.8, delay: 0.2 },
              rotate: { type: 'spring', duration: 0.8, delay: 0.2 },
              opacity: { duration: 1.2, delay: 0.8 },
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            {(() => {
              const source = config.illustration.source

              // Map known local images to public folder
              let imageSrc = source
              if (source === 'jesus-iphone') {
                imageSrc = '/images/jesus-iphone.png'
              } else if (source.includes('jesus-iphone')) {
                imageSrc = '/images/jesus-iphone.png'
              } else if (source.startsWith('/') && !source.startsWith('http')) {
                // Try to map other local paths
                const filename = source.split('/').pop()
                imageSrc = `/images/${filename}`
              }

              // Check if it's an image (URL or path)
              const isImage =
                imageSrc.startsWith('http') ||
                imageSrc.includes('.png') ||
                imageSrc.includes('.jpg') ||
                imageSrc.includes('/')

              if (isImage) {
                return (
                  <img
                    src={imageSrc}
                    alt='Illustration'
                    style={{
                      width: '180px',
                      height: '180px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
                    }}
                  />
                )
              } else {
                // It's an emoji
                return (
                  <div
                    style={{
                      fontSize: '120px',
                      lineHeight: 1,
                      textShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                  >
                    {source}
                  </div>
                )
              }
            })()}
          </motion.div>
        )}

        {/* Main Content */}
        <div
          className='flex flex-1 items-end'
          style={{ padding: '24px', zIndex: 2 }}
        >
          <motion.div
            className='w-full'
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
          >
            <div
              className='w-full text-center'
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '16px',
                paddingLeft: '24px',
                paddingRight: '24px',
                paddingTop: '28px',
                paddingBottom: '28px',
                boxShadow: '0 6px 10px rgba(0, 0, 0, 0.15)',
              }}
            >
              {/* Decorative bar */}
              <div
                className='mx-auto'
                style={{
                  width: '48px',
                  height: '3px',
                  backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  borderRadius: '1.5px',
                  marginBottom: '20px',
                }}
              />

              <motion.h1
                className='font-bold text-white'
                style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  letterSpacing: '-0.5px',
                  lineHeight: '30px',
                  marginBottom: '16px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                {config?.title || "You're all set!"}
              </motion.h1>

              <motion.p
                className='text-white'
                style={{
                  fontSize: '15px',
                  fontWeight: '500',
                  lineHeight: '22px',
                  letterSpacing: '-0.2px',
                  marginBottom: '24px',
                  opacity: 0.95,
                  textShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.6 }}
              >
                {config?.message || 'Your prayer journey begins now'}
              </motion.p>

              {/* Button Container */}
              <div style={{ alignItems: 'center', marginBottom: '6px' }}>
                <motion.button
                  className='font-semibold transition-all duration-200 active:scale-95'
                  style={{
                    minWidth: '70%',
                    background:
                      'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)',
                    color: '#1a1a1a',
                    paddingTop: '14px',
                    paddingBottom: '14px',
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    borderRadius: '22px',
                    fontSize: '16px',
                    fontWeight: '700',
                    border: 'none',
                    boxShadow: '0 6px 12px rgba(0,0,0,0.25)',
                    letterSpacing: '-0.3px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={onButtonClick}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4, duration: 0.6, type: 'spring' }}
                >
                  {config?.actionButton?.text ||
                    config?.buttonText ||
                    'Continue'}
                  <span
                    style={{
                      marginLeft: '10px',
                      opacity: 0.7,
                      fontSize: '15px',
                      fontWeight: '600',
                    }}
                  >
                    →
                  </span>
                </motion.button>
              </div>

              {/* Bottom decoration */}
              <div
                className='mx-auto'
                style={{
                  width: '32px',
                  height: '2px',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '1px',
                  marginTop: '16px',
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    ),

    InterstitialScreen: ({ config }: any) => (
      <div
        className='relative flex h-full w-full flex-col overflow-hidden'
        style={{
          background: config?.backgroundImage
            ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${config.backgroundImage})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
        }}
      >
        {/* Content Area */}
        <div
          className='flex flex-1 flex-col items-center justify-center'
          style={{ padding: '24px' }}
        >
          {config?.emoji && (
            <motion.div
              className='mb-6'
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
              style={{ fontSize: '56px', lineHeight: 1 }}
            >
              {config.emoji}
            </motion.div>
          )}

          <motion.h1
            className='mb-4 text-center leading-tight font-bold text-white'
            style={{
              fontSize: '24px',
              fontWeight: '700',
              letterSpacing: '-0.3px',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              maxWidth: '280px',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {config?.titleTemplate ||
              config?.title ||
              "Let's personalize your prayer experience"}
          </motion.h1>

          <motion.p
            className='text-center leading-relaxed text-white/90'
            style={{
              fontSize: '16px',
              fontWeight: '400',
              lineHeight: '22px',
              maxWidth: '260px',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {config?.subtitle ||
              "We'll ask a few questions to create prayers that speak to your heart"}
          </motion.p>
        </div>

        {/* Bottom Button Area */}
        <div style={{ padding: '16px 24px 32px' }}>
          <motion.button
            className='w-full text-center font-semibold transition-all duration-200 active:scale-95'
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: '#1a1a1a',
              padding: '14px 24px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(10px)',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            {config?.button?.text || config?.buttonText || 'Continue'}
          </motion.button>
        </div>
      </div>
    ),

    RelationshipWithGodScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1'>
          <h1 style={screenStyles.text.title} className='mb-3 text-center'>
            {config?.title ||
              'How would you describe your relationship with God?'}
          </h1>
          <p style={screenStyles.text.subtitle} className='mb-8 text-center'>
            {config?.subtitle || "There's no wrong answer"}
          </p>

          <div className='space-y-3'>
            {(
              config?.options || [
                { id: 'close', label: 'Close and personal', emoji: '❤️' },
                { id: 'growing', label: 'Growing stronger', emoji: '🌱' },
                { id: 'distant', label: 'Feeling distant', emoji: '💭' },
                { id: 'exploring', label: 'Just exploring', emoji: '🔍' },
              ]
            ).map((option: any, index: number) => (
              <motion.div
                key={option.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className='flex cursor-pointer items-center gap-3 rounded-2xl p-4'
                style={screenStyles.card}
              >
                <span className='text-2xl'>{option.emoji}</span>
                <p className='font-medium'>{option.label || option.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Continue'}
        </button>
      </div>
    ),

    ConfirmationScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col items-center justify-center p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className='mb-6 text-8xl'
        >
          {config?.icon || '🎉'}
        </motion.div>

        <h1 style={screenStyles.text.title} className='mb-3 text-center'>
          {config?.title || "You're all set!"}
        </h1>

        <p
          style={screenStyles.text.subtitle}
          className='mb-8 max-w-md text-center'
        >
          {config?.subtitle || 'Your prayer journey begins now'}
        </p>

        {config?.message && (
          <p className='mb-8 text-center opacity-80'>{config.message}</p>
        )}

        <button
          className='w-full max-w-sm rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
        >
          {config?.buttonText || 'Begin Praying'}
        </button>
      </div>
    ),

    IntentionAddedConfirmationScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col items-center justify-center p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className='mb-6 text-6xl'
        >
          💖
        </motion.div>

        <h1 style={screenStyles.text.title} className='mb-3 text-center'>
          {config?.title || 'Intention Added'}
        </h1>

        <p style={screenStyles.text.subtitle} className='max-w-sm text-center'>
          {config?.message || 'Your prayer intention has been saved'}
        </p>
      </div>
    ),

    OnboardingIntentionsSetConfirmationScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col items-center justify-center p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6, delay: 0.2 }}
          className='mb-6 text-6xl'
        >
          {config?.icon || '🎯'}
        </motion.div>

        <motion.h1
          style={screenStyles.text.title}
          className='mb-3 text-center'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {config?.title || 'Intentions Set!'}
        </motion.h1>

        <motion.p
          style={screenStyles.text.subtitle}
          className='mb-8 max-w-sm text-center'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          {config?.subtitle ||
            'Your prayer intentions have been saved and will be included in your prayers'}
        </motion.p>

        {config?.intentionsList && (
          <motion.div
            className='mb-6 w-full max-w-sm space-y-2'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {config.intentionsList
              .slice(0, 3)
              .map((intention: string, index: number) => (
                <div
                  key={index}
                  className='rounded-xl p-3 text-sm'
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  • {intention}
                </div>
              ))}
            {config.intentionsList.length > 3 && (
              <div className='text-center text-sm opacity-70'>
                +{config.intentionsList.length - 3} more
              </div>
            )}
          </motion.div>
        )}

        <motion.button
          className='w-full max-w-sm rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          {config?.buttonText || 'Continue'}
        </motion.button>
      </div>
    ),

    OnboardingSummaryScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1'>
          <motion.h1
            style={screenStyles.text.title}
            className='mb-3 text-center'
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {config?.title || 'Your Prayer Journey'}
          </motion.h1>

          <motion.p
            style={screenStyles.text.subtitle}
            className='mb-8 text-center'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {config?.subtitle || 'Just one more step before your first prayer'}
          </motion.p>

          <div className='space-y-4'>
            {(config?.sections || []).map((section: any, index: number) => {
              // Map icon names to emojis for preview
              const getIconEmoji = (section: any) => {
                const iconName = section?.icon?.name
                if (iconName === 'account-group') return '👥'
                if (iconName === 'heart-pulse') return '💓'
                if (iconName === 'calendar-clock') return '📅'
                return '⚙️'
              }

              return (
                <motion.div
                  key={section.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                  className='relative'
                >
                  <div
                    className='flex items-start gap-4 rounded-2xl p-4'
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <div className='mt-1 text-2xl'>{getIconEmoji(section)}</div>
                    <div className='flex-1'>
                      <div className='mb-2 flex items-center justify-between'>
                        <p className='text-base font-semibold'>
                          {section.title}
                        </p>
                        <button
                          className='rounded px-2 py-1 text-xs opacity-70'
                          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                        >
                          {config?.editButtonText || 'Edit'}
                        </button>
                      </div>

                      {section.id === 'prayerPeople' && (
                        <p className='text-sm opacity-80'>
                          {section.emptyStateText || 'No one added yet'}
                        </p>
                      )}

                      {section.id === 'personalFocus' && (
                        <div className='space-y-1'>
                          <p className='text-xs opacity-70'>Current Mood</p>
                          <p className='text-sm'>🤔 Not Set</p>
                          <p className='mt-2 text-xs opacity-70'>
                            Prayer Needs
                          </p>
                          <p className='text-sm opacity-80'>
                            None specified yet
                          </p>
                        </div>
                      )}

                      {section.id === 'prayerSchedule' && (
                        <p className='text-sm opacity-80'>
                          {section.emptyStateText || 'No prayer times selected'}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <motion.button
          className='flex w-full items-center justify-center gap-2 rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <span>
            {config?.continueButton?.text || 'Create My First Prayer'}
          </span>
          <span>→</span>
        </motion.button>
      </div>
    ),

    BenefitsHighlightScreen: ({ config }: any) => (
      <div
        className='flex h-full flex-col p-6 text-white'
        style={{
          background: `linear-gradient(${screenStyles.primaryGradient.angle}, ${screenStyles.primaryGradient.colors.join(', ')})`,
        }}
      >
        <div className='flex-1'>
          <motion.h1
            style={screenStyles.text.title}
            className='mb-8 text-center'
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {config?.title || 'Unlock Your Personal Prayer Journey'}
          </motion.h1>

          <div className='space-y-4'>
            {(
              config?.benefits || [
                {
                  icon: { name: 'account-heart-outline' },
                  title: 'Truly Personal Prayers',
                  description:
                    'Prayers crafted uniquely for you and your loved ones',
                },
                {
                  icon: { name: 'meditation' },
                  title: 'Guided Reflection',
                  description:
                    'Find peace and clarity with prompts that deepen your connection',
                },
                {
                  icon: { name: 'calendar-check' },
                  title: 'Build a Consistent Habit',
                  description:
                    'Stay on track with gentle reminders and meaningful goals',
                },
                {
                  icon: { name: 'church' },
                  title: 'Strengthen Your Faith',
                  description: 'Grow closer to God through intentional prayer',
                },
              ]
            ).map((benefit: any, index: number) => {
              // Map icon names to emojis for preview
              const getIconEmoji = (iconName: string) => {
                if (iconName === 'account-heart-outline') return '💖'
                if (iconName === 'meditation') return '🧘'
                if (iconName === 'calendar-check') return '✅'
                if (iconName === 'church') return '⛪'
                return '✨'
              }

              return (
                <motion.div
                  key={benefit.id || index}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                  className='flex items-start gap-4 rounded-2xl p-4'
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className='mt-1 text-3xl'>
                    {getIconEmoji(benefit.icon?.name)}
                  </div>
                  <div className='flex-1'>
                    <h3 className='mb-2 text-lg font-semibold'>
                      {benefit.title}
                    </h3>
                    <p className='text-sm leading-relaxed opacity-80'>
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <motion.button
          className='w-full rounded-full py-4 font-semibold'
          style={screenStyles.button.primary}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {config?.continueButton?.text || 'See Subscription Plans'}
        </motion.button>
      </div>
    ),
  }

  return mockComponents[actualScreenType]
}

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: string) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Preview error:', error, errorInfo)
    this.props.onError(error.message || 'Failed to render preview')
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}

interface ScreenPreviewRendererProps {
  screenType?: string
  config?: any
  className?: string
  onButtonClick?: () => void
}

export const ScreenPreviewRenderer: React.FC<ScreenPreviewRendererProps> = ({
  screenType,
  config,
  className,
  onButtonClick,
}) => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Reset error state when config changes
    setError(null)
    setIsLoading(true)

    // Simulate component loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [config, screenType])

  // Determine screen type from config or prop
  const resolvedScreenType = screenType || config?.metadata?.screen_type

  if (!resolvedScreenType) {
    return (
      <Card className='flex h-full w-full items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <AlertCircle className='mx-auto mb-4 h-12 w-12 text-gray-400' />
          <p className='text-gray-600'>No screen type specified</p>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className='flex h-full w-full items-center justify-center bg-gray-50'>
        <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
      </Card>
    )
  }

  // Use styled mock component
  const MockComponent = getMockComponent(resolvedScreenType)

  if (!MockComponent) {
    return (
      <Card className='flex h-full w-full items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <AlertCircle className='mx-auto mb-4 h-12 w-12 text-gray-400' />
          <p className='text-gray-600'>
            Preview not available for {resolvedScreenType}
          </p>
          <p className='mt-2 text-xs text-gray-500'>
            Screen type: {resolvedScreenType}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div
      className={`relative isolate h-full w-full overflow-hidden rounded-lg ${className || ''}`}
    >
      <ErrorBoundary onError={setError}>
        <MockComponent config={config} onButtonClick={onButtonClick} />
      </ErrorBoundary>

      {error && (
        <div className='absolute inset-0 flex items-center justify-center bg-red-50'>
          <div className='p-4 text-center'>
            <AlertCircle className='mx-auto mb-4 h-12 w-12 text-red-400' />
            <p className='text-sm text-red-600'>{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
