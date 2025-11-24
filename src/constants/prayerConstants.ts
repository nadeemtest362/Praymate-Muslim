/**
 * Prayer intention constants
 */

export const MADLIB_TEMPLATES = {
  placeholder_topic: "what to pray for...",
  placeholder_person: "who...",
  placeholder_focus: "specific concern...",
  placeholder_situation: "situation...",
  placeholder_challenge: "details...",
} as const;

export const PRAYER_SITUATIONS = [
  { id: 'struggling', label: "struggling with" },
  { id: 'worried', label: "worried about" },
  { id: 'grieving', label: "grieving" },
  { id: 'dealing', label: "dealing with" },
  { id: 'facing', label: "facing" },
  { id: 'seeking', label: "seeking" },
] as const;

export const PRAYER_TOPICS = {
  healing: {
    id: 'healing',
    label: 'healing',
    emoji: '❤️‍🩹',
    focusPrompts: [
      { id: 'healing_physical', label: 'physical illness' },
      { id: 'healing_mental', label: 'mental health' },
      { id: 'healing_emotional', label: 'emotional wounds' },
      { id: 'healing_addiction', label: 'addiction' },
    ],
    customDetailPrompt: "Healing needs:",
    customDetailPlaceholder: "cancer, depression, grief...",
    suggestedChallenges: ['pain', 'diagnosis', 'treatment', 'recovery']
  },
  wisdom: {
    id: 'wisdom',
    label: 'wisdom',
    emoji: '🧠',
    focusPrompts: [
      { id: 'wisdom_decision', label: 'important decision' },
      { id: 'wisdom_relationship', label: 'relationship issue' },
      { id: 'wisdom_parenting', label: 'parenting challenge' },
      { id: 'wisdom_career', label: 'career choice' },
    ],
    customDetailPrompt: "Wisdom needs:",
    customDetailPlaceholder: "specific situation...",
    suggestedChallenges: ['uncertainty', 'complexity', 'consequences', 'timing']
  },
  peace: {
    id: 'peace',
    label: 'peace',
    emoji: '🕊️',
    focusPrompts: [
      { id: 'peace_anxiety', label: 'anxiety' },
      { id: 'peace_conflict', label: 'conflict resolution' },
      { id: 'peace_worry', label: 'overwhelming worry' },
      { id: 'peace_fear', label: 'fear' },
    ],
    customDetailPrompt: "Peace needs:",
    customDetailPlaceholder: "stress, relationship conflict...",
    suggestedChallenges: ['panic', 'insomnia', 'tension', 'restlessness']
  },
  strength: {
    id: 'strength',
    label: 'strength',
    emoji: '💪',
    focusPrompts: [
      { id: 'strength_endurance', label: 'difficult season' },
      { id: 'strength_temptation', label: 'resisting temptation' },
      { id: 'strength_adversity', label: 'facing adversity' },
      { id: 'strength_grief', label: 'grief process' },
    ],
    customDetailPrompt: "Strength needs:",
    customDetailPlaceholder: "specific challenge...",
    suggestedChallenges: ['exhaustion', 'burnout', 'discouragement', 'weakness']
  },
  guidance: {
    id: 'guidance',
    label: 'guidance',
    emoji: '🧭',
    focusPrompts: [
      { id: 'guidance_direction', label: 'life direction' },
      { id: 'guidance_purpose', label: 'finding purpose' },
      { id: 'guidance_future', label: 'uncertain future' },
      { id: 'guidance_calling', label: 'calling/vocation' },
    ],
    customDetailPrompt: "Seeking guidance about:",
    customDetailPlaceholder: "next steps, purpose in life...",
    suggestedChallenges: ['confusion', 'indecision', 'crossroads', 'clarity']
  },
  faith: {
    id: 'faith',
    label: 'faith',
    emoji: '🙏',
    focusPrompts: [
      { id: 'faith_doubt', label: 'doubt' },
      { id: 'faith_growth', label: 'spiritual growth' },
      { id: 'faith_intimacy', label: 'intimacy with God' },
      { id: 'faith_trust', label: 'trusting God' },
    ],
    customDetailPrompt: "Faith needs:",
    customDetailPlaceholder: "doubt, spiritual dryness...",
    suggestedChallenges: ['questions', 'dryness', 'distance', 'struggles']
  },
  financialHelp: {
    id: 'financialHelp',
    label: 'financial help',
    emoji: '💰',
    focusPrompts: [
      { id: 'financialHelp_needs', label: 'financial need' },
      { id: 'financialHelp_job', label: 'employment' },
      { id: 'financialHelp_housing', label: 'housing' },
      { id: 'financialHelp_bills', label: 'bills' },
    ],
    customDetailPrompt: "Financial help with:",
    customDetailPlaceholder: "bills, job search, housing...",
    suggestedChallenges: ['debt', 'unemployment', 'scarcity', 'uncertainty']
  },
  forgiveness: {
    id: 'forgiveness',
    label: 'forgiveness',
    emoji: '🤝',
    focusPrompts: [
      { id: 'forgiveness_self', label: 'self-forgiveness' },
      { id: 'forgiveness_others', label: 'forgiving someone' },
      { id: 'forgiveness_receiving', label: 'receiving forgiveness' },
      { id: 'forgiveness_reconciliation', label: 'reconciliation' },
    ],
    customDetailPrompt: "Forgive/be forgiven for:",
    customDetailPlaceholder: "specific relationship or situation...",
    suggestedChallenges: ['hurt', 'resentment', 'bitterness', 'guilt']
  },
  gratitude: {
    id: 'gratitude',
    label: 'gratitude',
    emoji: '🙌',
    focusPrompts: [
      { id: 'gratitude_blessing', label: 'specific blessing' },
      { id: 'gratitude_person', label: 'person in my life' },
      { id: 'gratitude_answered', label: 'answered prayer' },
      { id: 'gratitude_life', label: 'gift of life' },
    ],
    customDetailPrompt: "Thankful for:",
    customDetailPlaceholder: "specific blessing...",
    suggestedChallenges: []
  },
  protection: {
    id: 'protection',
    label: 'protection',
    emoji: '🛡️',
    focusPrompts: [
      { id: 'protection_safety', label: 'safety' },
      { id: 'protection_travel', label: 'during travel' },
      { id: 'protection_danger', label: 'from danger' },
    ],
    customDetailPrompt: "Protection from:",
    customDetailPlaceholder: "safety, travel, dangerous situation...",
    suggestedChallenges: ['threat', 'fear', 'uncertainty']
  },
  blessing: {
    id: 'blessing',
    label: 'blessing',
    emoji: '🌟',
    focusPrompts: [
      { id: 'blessing_event', label: 'upcoming event' },
      { id: 'blessing_opportunity', label: 'new opportunity' },
      { id: 'blessing_relationship', label: 'relationship' },
    ],
    customDetailPrompt: "Seeking blessing for:",
    customDetailPlaceholder: "wedding, new job, relationship...",
    suggestedChallenges: ['uncertainty', 'hope', 'anticipation']
  },
  comfort: {
    id: 'comfort',
    label: 'comfort',
    emoji: '🤗',
    focusPrompts: [
      { id: 'comfort_grief', label: 'in grief' },
      { id: 'comfort_loss', label: 'after loss' },
      { id: 'comfort_hardship', label: 'during hardship' },
    ],
    customDetailPrompt: "Comfort regarding:",
    customDetailPlaceholder: "loss, difficult news, hardship...",
    suggestedChallenges: ['sorrow', 'pain', 'loneliness']
  },
  joy: {
    id: 'joy',
    label: 'joy',
    emoji: '🎉',
    focusPrompts: [
      { id: 'joy_celebration', label: 'celebrating good news' },
      { id: 'joy_cultivating', label: 'cultivating joy' },
      { id: 'joy_sharing', label: 'sharing joy with others' },
    ],
    customDetailPrompt: "Joyful about:",
    customDetailPlaceholder: "good news, milestone...",
    suggestedChallenges: []
  },
  patience: {
    id: 'patience',
    label: 'patience',
    emoji: '⏳',
    focusPrompts: [
      { id: 'patience_waiting', label: 'while waiting' },
      { id: 'patience_difficulty', label: 'during difficulty' },
      { id: 'patience_relationships', label: 'in relationships' },
    ],
    customDetailPrompt: "Patience with:",
    customDetailPlaceholder: "waiting period, difficult person...",
    suggestedChallenges: ['frustration', 'anxiety', 'delay']
  },
  love: {
    id: 'love',
    label: 'love',
    emoji: '💖',
    focusPrompts: [
      { id: 'love_others', label: 'loving others better' },
      { id: 'love_relationships', label: 'strengthening relationships' },
      { id: 'love_difficult', label: 'loving difficult people' },
      { id: 'love_self', label: 'self-love/acceptance' },
    ],
    customDetailPrompt: "Your love intention:",
    customDetailPlaceholder: "family, friends, self...",
    suggestedChallenges: ['conflict', 'misunderstanding', 'self-criticism']
  },
  hope: {
    id: 'hope',
    label: 'hope',
    emoji: '🌅',
    focusPrompts: [
      { id: 'hope_future', label: 'for the future' },
      { id: 'hope_situation', label: 'in difficult situation' },
      { id: 'hope_dreams', label: 'for dreams to come true' },
      { id: 'hope_renewal', label: 'for renewal' },
    ],
    customDetailPrompt: "Hope needs:",
    customDetailPlaceholder: "future plans, difficult situation...",
    suggestedChallenges: ['despair', 'discouragement', 'uncertainty', 'darkness']
  },
  success: {
    id: 'success',
    label: 'success',
    emoji: '🎯',
    focusPrompts: [
      { id: 'success_work', label: 'in work/career' },
      { id: 'success_project', label: 'with important project' },
      { id: 'success_goals', label: 'achieving goals' },
      { id: 'success_endeavor', label: 'in new endeavor' },
    ],
    customDetailPrompt: "Seeking success in:",
    customDetailPlaceholder: "job interview, business, exam...",
    suggestedChallenges: ['obstacles', 'competition', 'pressure', 'doubt']
  },
  other: {
    id: 'other',
    label: 'Other',
    emoji: '💬',
    focusPrompts: [],
    customDetailPrompt: "Please specify your prayer focus:",
    customDetailPlaceholder: "e.g., new job, upcoming travel, a specific situation...",
    suggestedChallenges: []
  }
} as const;

// Type Helper for Topic IDs
export type PrayerTopicId = keyof typeof PRAYER_TOPICS;

export type PrayerTopic = (typeof PRAYER_TOPICS)[PrayerTopicId];

// Type for Situation IDs
export type PrayerSituationId = typeof PRAYER_SITUATIONS[number]['id'];

// --- Relationship Chips for Manual Person Creation ---
export interface RelationshipChipData {
  id: string;
  label: string;
  emoji: string;
  needsCustomName: boolean;
  defaultGender?: 'he' | 'she' | 'name' | null;
  hidePronounStep?: boolean;
  iconName: string;
}

export const RELATIONSHIP_CHIPS: RelationshipChipData[] = [
  // Immediate Family
  { id: 'mom', label: 'Mom', emoji: '👩', needsCustomName: false, defaultGender: 'she', hidePronounStep: true, iconName: 'human-female' },
  { id: 'dad', label: 'Dad', emoji: '👨', needsCustomName: false, defaultGender: 'he', hidePronounStep: true, iconName: 'human-male' },
  { id: 'wife', label: 'Wife', emoji: '💍', needsCustomName: false, defaultGender: 'she', hidePronounStep: true, iconName: 'face-woman-outline' },
  { id: 'husband', label: 'Husband', emoji: '🤵', needsCustomName: false, defaultGender: 'he', hidePronounStep: true, iconName: 'face-man-outline' },
  { id: 'daughter', label: 'Daughter', emoji: '👧', needsCustomName: true, defaultGender: 'she', hidePronounStep: true, iconName: 'human-female-girl' },
  { id: 'son', label: 'Son', emoji: '👦', needsCustomName: true, defaultGender: 'he', hidePronounStep: true, iconName: 'human-male-boy' },
  
  // Extended Family
  { id: 'sister', label: 'Sister', emoji: '👩', needsCustomName: true, defaultGender: 'she', hidePronounStep: true, iconName: 'human-female' },
  { id: 'brother', label: 'Brother', emoji: '👨', needsCustomName: true, defaultGender: 'he', hidePronounStep: true, iconName: 'human-male' },
  { id: 'grandma', label: 'Grandma', emoji: '👵', needsCustomName: true, defaultGender: 'she', hidePronounStep: true, iconName: 'human-female' },
  { id: 'grandpa', label: 'Grandpa', emoji: '👴', needsCustomName: true, defaultGender: 'he', hidePronounStep: true, iconName: 'human-male' },
  { id: 'grandson', label: 'Grandson', emoji: '👦', needsCustomName: true, defaultGender: 'he', hidePronounStep: true, iconName: 'human-male-boy' },
  { id: 'granddaughter', label: 'Granddaughter', emoji: '👧', needsCustomName: true, defaultGender: 'she', hidePronounStep: true, iconName: 'human-female-girl' },
  { id: 'relative', label: 'Family', emoji: '👨‍👩‍👧‍👦', needsCustomName: true, defaultGender: null, hidePronounStep: false, iconName: 'account-group' },
  
  // Friends & Others
  { id: 'friend', label: 'Friend', emoji: '🤝', needsCustomName: true, defaultGender: null, hidePronounStep: false, iconName: 'account-heart-outline' },
  { id: 'bff', label: 'BFF', emoji: '💖', needsCustomName: true, defaultGender: null, hidePronounStep: false, iconName: 'heart-multiple' },
  { id: 'coworker', label: 'Coworker', emoji: '💼', needsCustomName: true, defaultGender: null, hidePronounStep: false, iconName: 'account-tie' },
  { id: 'neighbor', label: 'Neighbor', emoji: '🏠', needsCustomName: true, defaultGender: null, hidePronounStep: false, iconName: 'home-account' },
  { id: 'pet', label: 'Pet', emoji: '🐾', needsCustomName: true, defaultGender: 'name', hidePronounStep: true, iconName: 'paw' },
  
  // Community & Groups  
  { id: 'church', label: 'Church', emoji: '⛪', needsCustomName: false, defaultGender: 'name', hidePronounStep: true, iconName: 'church' },
  { id: 'community', label: 'Community', emoji: '🏘️', needsCustomName: false, defaultGender: 'name', hidePronounStep: true, iconName: 'account-group' },
  { id: 'country', label: 'Country', emoji: '🇺🇸', needsCustomName: false, defaultGender: 'name', hidePronounStep: true, iconName: 'flag' },
  { id: 'those_suffering', label: 'Those Who Suffer', emoji: '💔', needsCustomName: false, defaultGender: 'name', hidePronounStep: true, iconName: 'heart-broken' },
  { id: 'family_group', label: 'Family', emoji: '👨‍👩‍👧‍👦', needsCustomName: false, defaultGender: 'name', hidePronounStep: true, iconName: 'account-group' },
  { id: 'team', label: 'Team', emoji: '⚽', needsCustomName: false, defaultGender: 'name', hidePronounStep: true, iconName: 'account-multiple' },
  { id: 'school', label: 'School', emoji: '🏫', needsCustomName: false, defaultGender: 'name', hidePronounStep: true, iconName: 'school' },
  { id: 'workplace', label: 'Workplace', emoji: '🏢', needsCustomName: false, defaultGender: 'name', hidePronounStep: true, iconName: 'office-building' },
  
  // Other
  { id: 'x', label: 'Ex', emoji: '👋', needsCustomName: true, defaultGender: null, hidePronounStep: false, iconName: 'account-plus-outline' },
  { id: 'crush', label: 'Crush', emoji: '😍', needsCustomName: true, defaultGender: null, hidePronounStep: false, iconName: 'heart-outline' },
  { id: 'custom', label: 'Someone Else', emoji: '✨', needsCustomName: true, defaultGender: null, hidePronounStep: false, iconName: 'account-plus-outline' },
  { id: 'other_group', label: 'Other Group', emoji: '🌐', needsCustomName: true, defaultGender: 'name', hidePronounStep: true, iconName: 'web' },
];

// Type for Relationship IDs
export type RelationshipChipId = typeof RELATIONSHIP_CHIPS[number]['id'];

// --- Person Interface ---
export interface PrayerPerson {
  id: string;
  name: string;
  image_uri?: string | null;
  relationship: string | null;
}

// --- UI Constants ---
export const PRAYER_UI = {
  COLORS: {
    PRIMARY: '#6C63FF',
    SECONDARY: '#5762D5',
    TERTIARY: '#7B4D85',
    BACKGROUND_GRADIENT: ['#1A2151', '#3D3977', '#7B4D85'] as readonly string[],
    CARD_GRADIENT: ['#5762D5', '#7B4D85'] as readonly string[],
  },
  LAYOUT: {
    // ... layout constants if needed
  }
}; 