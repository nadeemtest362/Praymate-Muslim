export interface ScreenTemplate {
  id: string
  name: string
  emoji: string
  color: string
  category:
    | 'welcome'
    | 'profile'
    | 'mood'
    | 'prayer'
    | 'commitment'
    | 'confirmation'
    | 'utility'
  description: string
  defaultConfig: any
}

export const onboardingScreens: ScreenTemplate[] = [
  // Welcome & Introduction
  {
    id: 'welcome',
    name: 'Welcome',
    emoji: '🙏',
    color: 'from-blue-500 to-blue-600',
    category: 'welcome',
    description: 'Welcome users to the app with branding and intro message',
    defaultConfig: {
      layout: 'centered-icon',
      title: 'Welcome to Personal Prayers',
      subtitle: 'Your daily companion for meaningful prayer',
      buttonText: 'Get Started',
      image: '/images/jesus.png',
      logo: {
        text: 'Personal Prayers',
        accent: 'Personal',
        emoji: '🙏',
      },
    },
  },
  {
    id: 'interstitial',
    name: 'Interstitial Message',
    emoji: '💬',
    color: 'from-indigo-500 to-indigo-600',
    category: 'welcome',
    description: 'Show a motivational or informational message',
    defaultConfig: {
      title: "Let's personalize your prayer experience",
      subtitle:
        "We'll ask a few questions to create prayers that speak to your heart",
      buttonText: 'Continue',
      backgroundImage: '/images/jesus-hand.png',
    },
  },

  // Profile & Personal Info
  {
    id: 'first-name',
    name: 'First Name',
    emoji: '👤',
    color: 'from-purple-500 to-purple-600',
    category: 'profile',
    description: "Collect user's first name",
    defaultConfig: {
      title: "What's your first name?",
      subtitle: "We'll use this to personalize your prayers",
      placeholder: 'Enter your first name...',
      buttonText: 'Continue',
      validation: {
        required: true,
        minLength: 2,
      },
    },
  },
  {
    id: 'faith-tradition',
    name: 'Faith Tradition',
    emoji: '⛪',
    color: 'from-amber-500 to-amber-600',
    category: 'profile',
    description: 'Ask about religious background and preferences',
    defaultConfig: {
      title: 'What faith tradition resonates with you?',
      subtitle: 'This helps us personalize your prayers',
      buttonText: 'Continue',
      options: [
        { id: 'christianity', label: 'Christianity', emoji: '✝️' },
        { id: 'catholic', label: 'Catholic', emoji: '📿' },
        { id: 'protestant', label: 'Protestant', emoji: '⛪' },
        { id: 'orthodox', label: 'Orthodox', emoji: '☦️' },
        { id: 'spiritual', label: 'Spiritual but not religious', emoji: '🕊️' },
        { id: 'other', label: 'Other', emoji: '🌟' },
      ],
      allowMultiple: false,
    },
  },
  {
    id: 'relationship-with-god',
    name: 'Relationship with God',
    emoji: '🤲',
    color: 'from-rose-500 to-rose-600',
    category: 'profile',
    description: "Understand user's spiritual journey stage",
    defaultConfig: {
      title: 'How would you describe your relationship with God?',
      subtitle: 'This helps us tailor prayers to where you are in your journey',
      buttonText: 'Continue',
      options: [
        { id: 'exploring', label: "I'm just exploring", emoji: '🔍' },
        { id: 'returning', label: "I'm returning to faith", emoji: '🚶' },
        { id: 'growing', label: "I'm growing in faith", emoji: '🌱' },
        { id: 'strong', label: 'I have a strong relationship', emoji: '💪' },
      ],
    },
  },

  // Mood & Emotional State
  {
    id: 'mood-selection',
    name: 'Mood Selection',
    emoji: '😊',
    color: 'from-purple-500 to-purple-600',
    category: 'mood',
    description: "Capture user's current emotional state",
    defaultConfig: {
      title: '🫥 how are you feeling?',
      subtitle: 'Share your current mood to personalize your prayer',
      moodOptions: [
        { id: 'peaceful', label: 'Peaceful', emoji: '😌' },
        { id: 'grateful', label: 'Grateful', emoji: '🙏' },
        { id: 'joyful', label: 'Joyful', emoji: '😊' },
        { id: 'hopeful', label: 'Hopeful', emoji: '✨' },
        { id: 'anxious', label: 'Anxious', emoji: '😟' },
        { id: 'weary', label: 'Weary', emoji: '😔' },
        { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😩' },
        { id: 'searching', label: 'Seeking', emoji: '🔍' },
      ],
      navigation: {
        action: 'NAVIGATE_WITH_PARAMS',
        navigateTo: 'mood-context',
      },
    },
  },
  {
    id: 'mood-context',
    name: 'Mood Context',
    emoji: '💭',
    color: 'from-purple-600 to-purple-700',
    category: 'mood',
    description: "Get more context about user's mood",
    defaultConfig: {
      title: 'Would you like to share more?',
      subtitle: 'This helps create a more personal prayer',
      placeholder: "What's on your mind? (optional)",
      buttonText: 'Continue',
      skipButtonText: 'Skip',
      maxLength: 200,
    },
  },

  // Prayer Preferences
  {
    id: 'prayer-people',
    name: 'Prayer People',
    emoji: '👥',
    color: 'from-orange-500 to-orange-600',
    category: 'prayer',
    description: 'Select who to pray for',
    defaultConfig: {
      title: 'Who would you like to pray for?',
      subtitle: 'You can always add more people later',
      categories: [
        { id: 'myself', label: 'Myself', emoji: '🙏' },
        { id: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
        { id: 'friends', label: 'Friends', emoji: '👫' },
        { id: 'community', label: 'Community', emoji: '🏘️' },
        { id: 'world', label: 'World', emoji: '🌍' },
      ],
      allowCustom: true,
      multipleSelection: true,
      buttonText: 'Continue',
      minSelection: 1,
    },
  },
  {
    id: 'prayer-needs',
    name: 'Prayer Needs',
    emoji: '🎯',
    color: 'from-green-500 to-green-600',
    category: 'prayer',
    description: 'Select prayer categories and topics',
    defaultConfig: {
      title: 'What would you like to pray about?',
      subtitle: 'Select all that apply',
      categories: [
        { id: 'healing', label: 'Healing', emoji: '🏥' },
        { id: 'peace', label: 'Peace', emoji: '☮️' },
        { id: 'guidance', label: 'Guidance', emoji: '🧭' },
        { id: 'strength', label: 'Strength', emoji: '💪' },
        { id: 'gratitude', label: 'Gratitude', emoji: '🙏' },
        { id: 'forgiveness', label: 'Forgiveness', emoji: '🤝' },
        { id: 'protection', label: 'Protection', emoji: '🛡️' },
        { id: 'wisdom', label: 'Wisdom', emoji: '🦉' },
      ],
      multipleSelection: true,
      buttonText: 'Continue',
    },
  },
  {
    id: 'add-intention',
    name: 'Add Prayer Intention',
    emoji: '💭',
    color: 'from-teal-500 to-teal-600',
    category: 'prayer',
    description: 'Add specific prayer intentions for people',
    defaultConfig: {
      intentionCollectionPhase: {
        introTitle: "what's on your ❤️ for {personName}?",
        introSubtitle:
          "Let's add a starting prayer focus for each person you've added.",
        intentionPrompt: {
          titleTemplate: 'What is your prayer for {personName}?',
          categorySelectorLabel: 'Select a starting category:',
          detailsInputPlaceholder: 'Add a few words about this prayer focus...',
          madlibConnectorNeeds: 'needs',
          madlibConnectorFor: 'for',
        },
        nextButtonText: 'Next Person',
        finishButtonText: 'Finish & Continue',
      },
    },
  },
  {
    id: 'prayer-example',
    name: 'Prayer Example',
    emoji: '📖',
    color: 'from-cyan-500 to-cyan-600',
    category: 'prayer',
    description: 'Show a generated prayer example',
    defaultConfig: {
      title: "Here's a prayer we created for you",
      subtitle: 'Based on what you shared',
      loadingText: 'Creating your personalized prayer...',
      buttonText: 'Amen',
      showRegenerate: true,
      allowEdit: false,
    },
  },

  // Commitment & Goals
  {
    id: 'prayer-frequency',
    name: 'Prayer Frequency',
    emoji: '📅',
    color: 'from-pink-500 to-pink-600',
    category: 'commitment',
    description: 'Set prayer frequency goals',
    defaultConfig: {
      title: 'How often would you like to pray?',
      subtitle: 'You can always adjust this later',
      options: [
        {
          id: 'daily',
          label: 'Daily',
          description: 'Build a consistent habit',
          emoji: '🌅',
        },
        {
          id: '3-4-week',
          label: '3-4 times a week',
          description: 'A balanced approach',
          emoji: '📆',
        },
        {
          id: 'weekly',
          label: 'Weekly',
          description: 'Start small',
          emoji: '🗓️',
        },
        {
          id: 'as-needed',
          label: 'As needed',
          description: 'Pray when inspired',
          emoji: '💫',
        },
      ],
      buttonText: 'Continue',
    },
  },
  {
    id: 'streak-goal',
    name: 'Streak Goal',
    emoji: '🔥',
    color: 'from-red-500 to-orange-500',
    category: 'commitment',
    description: 'Set a prayer streak goal',
    defaultConfig: {
      title: 'Set a prayer streak goal',
      subtitle: 'How many days in a row would you like to pray?',
      options: [
        { value: 7, label: '7 days', emoji: '📿' },
        { value: 21, label: '21 days', emoji: '🙏' },
        { value: 30, label: '30 days', emoji: '✨' },
        { value: 40, label: '40 days', emoji: '🕊️' },
      ],
      buttonText: 'Set Goal',
    },
  },
  {
    id: 'commitment-question',
    name: 'Commitment Question',
    emoji: '🤝',
    color: 'from-emerald-500 to-emerald-600',
    category: 'commitment',
    description: 'Ask for user commitment',
    defaultConfig: {
      title: 'Are you ready to start your prayer journey?',
      subtitle: "We'll be here to support you every step of the way",
      options: [
        { id: 'yes', label: "Yes, I'm ready!", emoji: '💪' },
        { id: 'maybe', label: 'I think so', emoji: '🤔' },
        { id: 'exploring', label: 'Just exploring', emoji: '👀' },
      ],
      buttonText: 'Continue',
    },
  },

  // Confirmation & Success
  {
    id: 'confirmation',
    name: 'Confirmation',
    emoji: '✅',
    color: 'from-emerald-500 to-emerald-600',
    category: 'confirmation',
    description: 'Success confirmation screen',
    defaultConfig: {
      title: "You're all set!",
      subtitle: 'Your prayer journey begins now',
      buttonText: 'Start Praying',
      successEmoji: '✨',
      showNextSteps: true,
      nextSteps: [
        '• Your first prayer is ready',
        "• We'll send daily reminders",
        '• Track your prayer streak',
      ],
    },
  },
  {
    id: 'intention-added-confirmation',
    name: 'Intention Added',
    emoji: '💚',
    color: 'from-green-500 to-emerald-500',
    category: 'confirmation',
    description: 'Confirm prayer intention was added',
    defaultConfig: {
      title: 'Prayer intention added!',
      subtitle: 'Your prayer has been saved',
      buttonText: 'Continue',
      successEmoji: '🙏',
    },
  },

  // Utility Screens
  {
    id: 'loading-spinner',
    name: 'Loading Screen',
    emoji: '⏳',
    color: 'from-gray-500 to-gray-600',
    category: 'utility',
    description: 'Show loading state',
    defaultConfig: {
      title: 'Creating your profile...',
      subtitle: 'This will just take a moment',
      showSpinner: true,
      autoAdvance: true,
      duration: 3000,
    },
  },
  {
    id: 'consent',
    name: 'Privacy Consent',
    emoji: '🔐',
    color: 'from-slate-500 to-slate-600',
    category: 'utility',
    description: 'Privacy and data consent',
    defaultConfig: {
      title: 'Your privacy matters',
      subtitle: 'We keep your prayers private and secure',
      consentText: 'I agree to the Terms of Service and Privacy Policy',
      buttonText: 'I Agree',
      showTermsLink: true,
      showPrivacyLink: true,
    },
  },
]

// Helper functions
export const getScreenById = (id: string) => {
  return onboardingScreens.find((screen) => screen.id === id)
}

export const getScreensByCategory = (category: string) => {
  return onboardingScreens.filter((screen) => screen.category === category)
}

export const getScreenColor = (screenType: string) => {
  const screen = getScreenById(screenType)
  return screen?.color || 'from-gray-500 to-gray-600'
}
