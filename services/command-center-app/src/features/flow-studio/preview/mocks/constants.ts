// Mock constants for preview environment

export const MOOD_OPTIONS = [
  { id: 'grateful', emoji: '😊', label: 'grateful' },
  { id: 'struggling', emoji: '😔', label: 'struggling' },
  { id: 'anxious', emoji: '😰', label: 'anxious' },
  { id: 'hopeful', emoji: '🙏', label: 'hopeful' },
  { id: 'joyful', emoji: '😄', label: 'joyful' },
  { id: 'peaceful', emoji: '😌', label: 'peaceful' },
]

export type MoodOption = (typeof MOOD_OPTIONS)[0]

export const FAITH_TRADITIONS = [
  { id: 'christian', label: 'Christian', emoji: '✝️' },
  { id: 'catholic', label: 'Catholic', emoji: '⛪' },
  { id: 'jewish', label: 'Jewish', emoji: '✡️' },
  { id: 'muslim', label: 'Muslim', emoji: '☪️' },
  { id: 'buddhist', label: 'Buddhist', emoji: '☸️' },
  { id: 'hindu', label: 'Hindu', emoji: '🕉️' },
  { id: 'spiritual', label: 'Spiritual', emoji: '🙏' },
  { id: 'other', label: 'Other', emoji: '💫' },
]

export const PRAYER_FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'occasionally', label: 'Occasionally' },
  { id: 'rarely', label: 'Rarely' },
]
