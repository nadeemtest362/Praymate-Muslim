/**
 * Prayer constants for the command center app
 * Subset of constants from the main app
 */

export const PRAYER_UI = {
  COLORS: {
    PRIMARY: '#6C63FF',
    SECONDARY: '#5762D5',
    TERTIARY: '#7B4D85',
    BACKGROUND_GRADIENT: ['#1A2151', '#3D3977', '#7B4D85'] as readonly string[],
    CARD_GRADIENT: ['#5762D5', '#7B4D85'] as readonly string[],
  },
}

export const PRAYER_TOPICS = {
  healing: {
    id: 'healing',
    label: 'healing',
    emoji: '❤️‍🩹',
  },
  wisdom: {
    id: 'wisdom',
    label: 'wisdom',
    emoji: '🧠',
  },
  peace: {
    id: 'peace',
    label: 'peace',
    emoji: '☮️',
  },
  strength: {
    id: 'strength',
    label: 'strength',
    emoji: '💪',
  },
  guidance: {
    id: 'guidance',
    label: 'guidance',
    emoji: '🧭',
  },
  faith: {
    id: 'faith',
    label: 'faith',
    emoji: '🙏',
  },
  financialHelp: {
    id: 'financialHelp',
    label: 'financial help',
    emoji: '💰',
  },
  forgiveness: {
    id: 'forgiveness',
    label: 'forgiveness',
    emoji: '🕊️',
  },
  gratitude: {
    id: 'gratitude',
    label: 'gratitude',
    emoji: '🙌',
  },
  protection: {
    id: 'protection',
    label: 'protection',
    emoji: '🛡️',
  },
  blessing: {
    id: 'blessing',
    label: 'blessing',
    emoji: '✨',
  },
  comfort: {
    id: 'comfort',
    label: 'comfort',
    emoji: '🤗',
  },
  joy: {
    id: 'joy',
    label: 'joy',
    emoji: '🎉',
  },
  patience: {
    id: 'patience',
    label: 'patience',
    emoji: '⏳',
  },
  love: {
    id: 'love',
    label: 'love',
    emoji: '💖',
  },
  hope: {
    id: 'hope',
    label: 'hope',
    emoji: '🌅',
  },
  success: {
    id: 'success',
    label: 'success',
    emoji: '🎯',
  },
  other: {
    id: 'other',
    label: 'Other',
    emoji: '💬',
  },
} as const
