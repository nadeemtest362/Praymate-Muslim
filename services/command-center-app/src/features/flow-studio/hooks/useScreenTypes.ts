import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

interface ScreenType {
  type: string
  name: string
  description: string
  category: string
  defaultConfig: Record<string, any>
  icon?: string
  color?: string
  requiredFields?: string[]
  capabilities?: string[]
}

// Fallback screen types if database fails
const fallbackScreenTypes: ScreenType[] = [
  {
    type: 'WelcomeScreen',
    name: 'Welcome',
    description: 'Welcome screen for onboarding',
    category: 'welcome',
    defaultConfig: { screen_name: 'Welcome', title: 'Welcome to Just Pray' },
    icon: '👋',
    color: 'from-purple-500 to-pink-500',
  },
  {
    type: 'MoodSelectionScreen',
    name: 'Mood Selection',
    description: 'Select current mood',
    category: 'personalization',
    defaultConfig: { screen_name: 'Mood Selection' },
    icon: '😊',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    type: 'PaywallScreen',
    name: 'Paywall',
    description: 'Subscription screen',
    category: 'conversion',
    defaultConfig: { screen_name: 'Paywall' },
    icon: '💎',
    color: 'from-gold-500 to-yellow-500',
  },
]

export function useScreenTypes() {
  return useQuery({
    queryKey: ['screenTypes'],
    queryFn: async () => {
      console.log('[Flow Studio] Loading screen types from main database')

      // Use already imported supabase client

      try {
        const { data, error } = await supabase
          .from('onboarding_flow_steps')
          .select('screen_type, config, updated_at')
          .order('updated_at', { ascending: false })

        if (error) {
          console.error('[Flow Studio] Error loading screen types:', error)
          console.log('[Flow Studio] Using fallback screen types')
          return fallbackScreenTypes
        }

        console.log(
          '[Flow Studio] Screen types query completed, rows:',
          data?.length
        )

        if (!data || data.length === 0) {
          console.log('[Flow Studio] No screen types found, using fallback')
          return fallbackScreenTypes
        }

        // Group by screen type and return unique types
        const screenTypes = new Map<string, ScreenType>()
        console.log('[useScreenTypes] Total steps from database:', data?.length)

        data?.forEach((step: any) => {
          if (!screenTypes.has(step.screen_type)) {
            const config = step.config || {}
            screenTypes.set(step.screen_type, {
              type: step.screen_type,
              name: config.screen_name || step.screen_type,
              description: config.description || '',
              category: config.category || 'general',
              defaultConfig: config,
              icon: config.emoji || config.icon,
              color: config.color,
            })
          }
        })

        const uniqueTypes = Array.from(screenTypes.values())
        console.log('[useScreenTypes] Unique screen types:', uniqueTypes.length)
        console.log(
          '[useScreenTypes] Screen types:',
          uniqueTypes.map((t) => t.type)
        )
        return uniqueTypes
      } catch (error) {
        console.error('[Flow Studio] Screen types query failed:', error)
        console.log('[Flow Studio] Using fallback screen types due to error')
        return fallbackScreenTypes
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

export function transformScreenTypeToTemplate(screenType: ScreenType) {
  // If screen type came from iOS sync, it already has all the metadata
  if (screenType.icon && screenType.color && screenType.category) {
    return {
      id: screenType.type.toLowerCase().replace('screen', ''),
      type: screenType.type,
      name: screenType.name,
      description: screenType.description,
      category: screenType.category,
      emoji: screenType.icon,
      color: screenType.color,
      defaultConfig: screenType.defaultConfig,
      requiredFields: screenType.requiredFields,
      capabilities: screenType.capabilities,
    }
  }

  // Fallback for legacy database screen types without full metadata
  const screenTypeMap: Record<string, any> = {
    WelcomeScreen: {
      id: 'welcome',
      emoji: '👋',
      color: 'from-purple-500 to-pink-500',
      category: 'welcome',
    },
    MoodSelectionScreen: {
      id: 'mood-selection',
      emoji: '😊',
      color: 'from-yellow-500 to-orange-500',
      category: 'personalization',
    },
    FirstNameScreen: {
      id: 'first-name',
      emoji: '✏️',
      color: 'from-blue-500 to-cyan-500',
      category: 'data-collection',
    },
    BenefitsHighlightScreen: {
      id: 'benefits-highlight',
      emoji: '✨',
      color: 'from-purple-500 to-indigo-500',
      category: 'conversion',
    },
    PaywallScreen: {
      id: 'paywall',
      emoji: '💎',
      color: 'from-gold-500 to-yellow-500',
      category: 'conversion',
    },
    // Add more mappings as needed
  }

  const baseInfo = screenTypeMap[screenType.type] || {
    id: screenType.type.toLowerCase().replace('screen', ''),
    emoji: '📱',
    color: 'from-gray-500 to-gray-600',
    category: 'general',
  }

  return {
    ...baseInfo,
    type: screenType.type,
    name: screenType.name || screenType.type,
    description: screenType.description || `${screenType.type} screen`,
    defaultConfig: screenType.defaultConfig || {},
  }
}
