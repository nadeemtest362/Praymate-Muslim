export interface ScreenTemplate {
  id: string
  name: string
  emoji: string
  color: string
  defaultConfig: {
    layout: string
    title: string
    subtitle?: string
    body?: string
    buttonText?: string
    image?: string
    fields?: Array<{
      id: string
      type: string
      label: string
      placeholder?: string
      required?: boolean
    }>
  }
}

export const prayerScreens: ScreenTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome',
    emoji: '🙏',
    color: 'from-blue-500 to-blue-600',
    defaultConfig: {
      layout: 'centered-icon',
      title: 'Welcome to Personal Prayers',
      subtitle: 'Your daily companion for meaningful prayer',
      buttonText: 'Get Started',
      image: '/images/jesus.png',
    },
  },
  {
    id: 'mood-check',
    name: 'Mood Check',
    emoji: '😊',
    color: 'from-purple-500 to-purple-600',
    defaultConfig: {
      layout: 'mood-selector',
      title: 'How are you feeling today?',
      subtitle: "Let's start with where you are right now",
      buttonText: 'Continue',
    },
  },
  {
    id: 'prayer-intentions',
    name: 'Prayer Intentions',
    emoji: '💭',
    color: 'from-green-500 to-green-600',
    defaultConfig: {
      layout: 'form',
      title: "What's on your heart?",
      subtitle: 'Share what you want to pray about',
      buttonText: 'Add Intention',
      fields: [
        {
          id: 'intention',
          type: 'textarea',
          label: 'Prayer Intention',
          placeholder: 'Type your prayer intention...',
          required: true,
        },
      ],
    },
  },
  {
    id: 'prayer-people',
    name: 'Prayer People',
    emoji: '👥',
    color: 'from-orange-500 to-orange-600',
    defaultConfig: {
      layout: 'people-selector',
      title: 'Who would you like to pray for?',
      subtitle: 'Select people or add new ones',
      buttonText: 'Continue',
    },
  },
  {
    id: 'faith-tradition',
    name: 'Faith Tradition',
    emoji: '⛪',
    color: 'from-indigo-500 to-indigo-600',
    defaultConfig: {
      layout: 'options',
      title: 'What faith tradition resonates with you?',
      subtitle: 'This helps us personalize your prayers',
      buttonText: 'Continue',
    },
  },
  {
    id: 'prayer-frequency',
    name: 'Prayer Frequency',
    emoji: '📅',
    color: 'from-pink-500 to-pink-600',
    defaultConfig: {
      layout: 'frequency-selector',
      title: 'How often would you like to pray?',
      subtitle: 'Set a goal that works for you',
      buttonText: 'Continue',
    },
  },
  {
    id: 'prayer-example',
    name: 'Prayer Example',
    emoji: '📖',
    color: 'from-teal-500 to-teal-600',
    defaultConfig: {
      layout: 'prayer-display',
      title: "Here's your first prayer",
      subtitle: 'Generated just for you',
      buttonText: 'Amen',
    },
  },
  {
    id: 'confirmation',
    name: 'Confirmation',
    emoji: '✅',
    color: 'from-emerald-500 to-emerald-600',
    defaultConfig: {
      layout: 'success',
      title: "You're all set!",
      subtitle: 'Your prayer journey begins now',
      buttonText: 'Start Praying',
    },
  },
]

export const getScreenById = (id: string) => {
  return prayerScreens.find((screen) => screen.id === id)
}

export const getScreenColor = (screenType: string) => {
  const screen = getScreenById(screenType)
  return screen?.color || 'from-gray-500 to-gray-600'
}
