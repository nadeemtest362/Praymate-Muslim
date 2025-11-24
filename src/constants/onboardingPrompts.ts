import { APP_MOOD_OPTIONS } from './moodConstants';

export interface MoodOption {
  id: string;
  emoji: string;
  label: string;
}

export interface PromptOption {
  id: string;
  text: string;
}

export interface PrayerNeedOption {
  id: string;
  text: string;
}

export interface PrayerNeedCategory {
  id: string;
  title: string;
  options: PrayerNeedOption[];
}

export interface TimeSlot {
  id: string;
  title: string;
  icon: string;
  timeRange: string;
  description: string;
}

export interface StreakGoal {
  id: string;
  days: number;
  title: string;
  description: string;
  icon: string;
}

export const MOOD_OPTIONS: MoodOption[] = APP_MOOD_OPTIONS;

export const GRATITUDE_PROMPTS: PromptOption[] = [
  { id: 'reached-out', text: 'reached out' },
  { id: 'supported-me', text: 'supported me' },
  { id: 'made-me-laugh', text: 'made me laugh' },
  { id: 'inspired-me', text: 'inspired me' },
  { id: 'listened', text: 'listened to me' },
  { id: 'showed-kindness', text: 'showed kindness' },
  { id: 'helped-others', text: 'helped others' },
  { id: 'shared-wisdom', text: 'shared wisdom' },
];

export const CHALLENGE_PROMPTS: PromptOption[] = [
  { id: 'struggling-with', text: 'struggling with' },
  { id: 'needs-strength', text: 'needing strength' },
  { id: 'facing-difficulty', text: 'facing difficulty' },
  { id: 'seeking-guidance', text: 'seeking guidance' },
  { id: 'needs-peace', text: 'needing peace' },
  { id: 'healing-from', text: 'healing from' },
  { id: 'needs-patience', text: 'needing patience' },
  { id: 'making-decision', text: 'making a decision' },
];

export const HOPE_PROMPTS: PromptOption[] = [
  { id: 'hope-peace', text: 'experience deep calm' },
  { id: 'hope-joy', text: 'find moments of joy' },
  { id: 'hope-courage', text: 'feel courageous' },
  { id: 'hope-security', text: 'feel safe and secure' },
  { id: 'hope-comfort', text: 'receive comfort' },
  { id: 'hope-hopeful', text: 'feel hopeful' },
  { id: 'hope-clarity', text: 'gain clarity' },
  { id: 'hope-wisdom', text: 'receive wisdom' },
  { id: 'hope-guidance', text: 'discern the right path' },
  { id: 'hope-resilience', text: 'find inner resilience' },
  { id: 'hope-perseverance', text: 'persevere through difficulty' },
  { id: 'hope-strength', text: 'discover their strength' },
  { id: 'hope-growth-patience', text: 'develop patience' },
  { id: 'hope-growth-faith', text: 'grow in faith' },
  { id: 'hope-purpose', text: 'find their purpose' },
  { id: 'hope-connection-god', text: "feel God's presence" },
  { id: 'hope-connection-others', text: 'find supportive community' },
  { id: 'hope-supported', text: 'feel supported & loved' },
  { id: 'hope-wholeness', text: 'find emotional wholeness' },
  { id: 'hope-renewal', text: 'feel renewed in spirit' },
  { id: 'hope-provision-needs', text: 'have their needs met' },
];

export const PRAYER_NEED_CATEGORIES: PrayerNeedCategory[] = [
  {
    id: 'strength',
    title: 'Strength & Guidance',
    options: [
      { id: 'decision-making', text: 'Important decision' },
      { id: 'clarity', text: 'Clarity of mind' },
      { id: 'patience', text: 'Patience' },
      { id: 'courage', text: 'Courage' },
      { id: 'wisdom', text: 'Wisdom' },
      { id: 'focus', text: 'Focus' },
    ],
  },
  {
    id: 'peace',
    title: 'Peace & Well-being',
    options: [
      { id: 'anxiety', text: 'Relief from anxiety' },
      { id: 'stress', text: 'Stress reduction' },
      { id: 'sleep', text: 'Better sleep' },
      { id: 'fear', text: 'Freedom from fear' },
      { id: 'calm', text: 'Inner calm' },
      { id: 'rest', text: 'Rest' },
    ],
  },
  {
    id: 'growth',
    title: 'Personal Growth',
    options: [
      { id: 'purpose', text: 'Sense of purpose' },
      { id: 'spiritual-growth', text: 'Spiritual growth' },
      { id: 'faith', text: 'Strengthened faith' },
      { id: 'gratitude', text: 'Grateful heart' },
      { id: 'discipline', text: 'Self-discipline' },
      { id: 'forgiveness', text: 'Ability to forgive' },
    ],
  },
  {
    id: 'relationships',
    title: 'Relationships',
    options: [
      { id: 'connection', text: 'Deeper connections' },
      { id: 'reconciliation', text: 'Reconciliation' },
      { id: 'boundaries', text: 'Healthy boundaries' },
      { id: 'communication', text: 'Better communication' },
      { id: 'trust', text: 'Rebuilding trust' },
      { id: 'community', text: 'Finding community' },
    ],
  },
  {
    id: 'practical',
    title: 'Practical Needs',
    options: [
      { id: 'finances', text: 'Financial provision' },
      { id: 'work', text: 'Work situation' },
      { id: 'housing', text: 'Housing' },
      { id: 'health', text: 'Physical health' },
      { id: 'guidance', text: 'Direction' },
      { id: 'balance', text: 'Life balance' },
    ],
  },
];

export const ALL_PRAYER_NEEDS: PrayerNeedOption[] = PRAYER_NEED_CATEGORIES.flatMap(
  (cat) => cat.options
);

export const TIME_SLOTS: TimeSlot[] = [
  { 
    id: 'morning',
    title: 'Morning',
    icon: 'bell-ring-outline',
    timeRange: '5am - 11am',
    description: 'Begin your day in prayer'
  },
  { 
    id: 'afternoon',
    title: 'Afternoon',
    icon: 'clock-time-four-outline',
    timeRange: '11am - 5pm',
    description: 'Reset with midday connection'
  },
  { 
    id: 'evening',
    title: 'Evening',
    icon: 'home-heart',
    timeRange: '5pm - 9pm',
    description: 'Evening devotion time'
  },
  { 
    id: 'night',
    title: 'Night',
    icon: 'sleep',
    timeRange: '9pm - 12am',
    description: 'Close your day in prayer'
  }
];

 